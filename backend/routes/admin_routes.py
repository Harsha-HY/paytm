import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from database import get_db
from models import (
    User,
    MerchantProfile,
    Transaction,
    TransactionSettlement,
    UserQR,
    BusinessCategory,
    BusinessSubcategory,
    MDRRule,
    AdminAuditLog
)
from schemas import (
    UserResponse,
    AdminStatsResponse,
    TransactionResponse,
    CategoryResponse,
    MDRRuleResponse,
    MDRRulePublishRequest,
    MDRRulePreviewRequest,
    MDRRulePreviewResponse,
    QRManagementItem,
    MerchantCategoryUpdateRequest
)
from auth import get_current_admin
from rules_engine import calculate_mdr
from events import emit_event_sync

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

def log_audit(
    db: Session,
    admin: User,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    previous_value: Optional[str] = None,
    new_value: Optional[str] = None
):
    """Safely logs an administrative action into the database."""
    try:
        log_entry = AdminAuditLog(
            admin_id=admin.id,
            admin_email=admin.email,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id else None,
            previous_value=str(previous_value) if previous_value else None,
            new_value=str(new_value) if new_value else None,
            timestamp=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Audit Log Error]: {e}")

# =========================================================================
# 1. LIVE DATABASE STATISTICS
# =========================================================================
@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Returns actual real-time database counts and aggregated financial metrics."""
    total_users = db.query(User).count()
    total_merchants = db.query(User).filter(User.account_type == "merchant").count()
    total_personal = db.query(User).filter(User.account_type == "personal").count()

    pending_merchants = db.query(MerchantProfile).filter(MerchantProfile.verification_status == "Pending").count()
    verified_merchants = db.query(MerchantProfile).filter(MerchantProfile.verification_status == "Verified").count()
    rejected_merchants = db.query(MerchantProfile).filter(MerchantProfile.verification_status == "Rejected").count()

    # QR Codes
    total_qrs = db.query(UserQR).count()
    active_qrs = db.query(UserQR).filter(UserQR.is_active == True, UserQR.qr_status == "ACTIVE").count()
    inactive_qrs = total_qrs - active_qrs

    # Transactions
    all_txns = db.query(Transaction).all()
    total_txns = len(all_txns)
    successful_txns = sum(1 for t in all_txns if t.status == "SUCCESS")
    pending_txns = sum(1 for t in all_txns if t.status == "PENDING")
    failed_txns = sum(1 for t in all_txns if t.status == "FAILED")

    total_gross = sum(t.amount for t in all_txns if t.status == "SUCCESS")

    # Aggregate settlements
    all_settlements = db.query(TransactionSettlement).all()
    total_mdr = sum(s.mdr_amount for s in all_settlements)
    total_gst = sum(s.gst_amount for s in all_settlements)
    total_net = sum(s.net_settlement for s in all_settlements)

    return AdminStatsResponse(
        total_users=total_users,
        total_personal=total_personal,
        total_merchants=total_merchants,
        pending_merchants=pending_merchants,
        verified_merchants=verified_merchants,
        rejected_merchants=rejected_merchants,
        total_qrs=total_qrs,
        active_qrs=active_qrs,
        inactive_qrs=inactive_qrs,
        total_transactions=total_txns,
        successful_transactions=successful_txns,
        pending_transactions=pending_txns,
        failed_transactions=failed_txns,
        total_gross_volume=round(total_gross, 2),
        total_calculated_mdr=round(total_mdr, 2),
        total_gst=round(total_gst, 2),
        total_expected_settlement=round(total_net, 2)
    )

# =========================================================================
# 2. CATEGORY & SUBCATEGORY MANAGEMENT
# =========================================================================
@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Lists all approved business categories and subcategories."""
    cats = db.query(BusinessCategory).filter(BusinessCategory.is_active == True).all()
    return cats

# =========================================================================
# 3. MERCHANT MANAGEMENT & KYC VERIFICATION
# =========================================================================
@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    q: Optional[str] = Query(None, description="Search query by name or email"),
    account_type: Optional[str] = Query(None, description="Filter by account type: personal, merchant, admin"),
    verification_status: Optional[str] = Query(None, description="Filter merchants by status: Pending, Verified, Rejected"),
    category: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Search and filter registered users ordered by most recent registration."""
    query = db.query(User)

    if q and q.strip():
        search_filter = f"%{q.strip()}%"
        query = query.filter(or_(User.full_name.ilike(search_filter), User.email.ilike(search_filter)))

    if account_type and account_type != "all":
        query = query.filter(User.account_type == account_type.lower())

    if verification_status and verification_status != "all":
        query = query.join(MerchantProfile, User.id == MerchantProfile.user_id).filter(
            MerchantProfile.verification_status == verification_status
        )

    if category and category != "all":
        query = query.join(MerchantProfile, User.id == MerchantProfile.user_id).filter(
            MerchantProfile.business_category.ilike(f"%{category.strip()}%")
        )

    users = query.order_by(desc(User.created_at)).offset(offset).limit(limit).all()
    return [UserResponse.model_validate(u) for u in users]

@router.patch("/merchants/{user_id}/status", response_model=UserResponse)
def update_merchant_status(
    user_id: int,
    status: str = Query(..., pattern="^(Pending|Verified|Rejected)$"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin approves or rejects merchant KYC verification status."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.merchant_profile:
        raise HTTPException(status_code=404, detail="Merchant account not found")

    prev_status = user.merchant_profile.verification_status
    user.merchant_profile.verification_status = status

    # If verified, ensure QR is active
    if status == "Verified":
        user.merchant_profile.qr_status = "ACTIVE"
        if user.qr_profile:
            user.qr_profile.qr_status = "ACTIVE"
            user.qr_profile.is_active = True

    db.commit()
    db.refresh(user)

    log_audit(
        db, admin,
        action="MERCHANT_VERIFICATION_STATUS_CHANGED",
        target_type="MERCHANT",
        target_id=str(user.id),
        previous_value=prev_status,
        new_value=status
    )

    emit_event_sync("MERCHANT_STATUS_UPDATED", {
        "user_id": user.id,
        "merchant_name": user.merchant_profile.business_name,
        "new_status": status
    })

    return UserResponse.model_validate(user)

@router.patch("/merchants/{user_id}/category", response_model=UserResponse)
def update_merchant_category(
    user_id: int,
    req: MerchantCategoryUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin updates merchant's approved business category and subcategory."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.merchant_profile:
        raise HTTPException(status_code=404, detail="Merchant account not found")

    prev_val = f"{user.merchant_profile.business_category} / {user.merchant_profile.business_subcategory}"
    new_val = f"{req.business_category} / {req.business_subcategory}"

    user.merchant_profile.business_category = req.business_category
    user.merchant_profile.business_subcategory = req.business_subcategory or "General"
    db.commit()
    db.refresh(user)

    log_audit(
        db, admin,
        action="MERCHANT_CATEGORY_CHANGED",
        target_type="MERCHANT",
        target_id=str(user.id),
        previous_value=prev_val,
        new_value=new_val
    )

    emit_event_sync("MERCHANT_CATEGORY_UPDATED", {
        "user_id": user.id,
        "new_category": req.business_category,
        "new_subcategory": req.business_subcategory
    })

    return UserResponse.model_validate(user)

# =========================================================================
# 4. MDR RULES MANAGEMENT (VERSIONING & PREVIEW)
# =========================================================================
@router.get("/mdr-rules", response_model=List[MDRRuleResponse])
def get_all_mdr_rules(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Returns all MDR rules across categories including previous versions."""
    query = db.query(MDRRule)

    if category and category != "all":
        query = query.filter(MDRRule.business_category.ilike(f"%{category.strip()}%"))

    if status and status != "all":
        query = query.filter(MDRRule.status == status.upper())

    rules = query.order_by(desc(MDRRule.updated_at)).all()
    return rules

@router.post("/mdr-rules/preview", response_model=MDRRulePreviewResponse)
def preview_mdr_rule_calculation(
    req: MDRRulePreviewRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Simulates proposed rule change before publishing:
    - Resolves previous active rule
    - Counts affected merchants in database
    - Runs calculations across sample payment tiers
    """
    # Find previous rule
    prev_rule = db.query(MDRRule).filter(
        MDRRule.business_category == req.business_category,
        MDRRule.status == "ACTIVE"
    ).order_by(MDRRule.version.desc()).first()

    # Count affected merchants
    m_count = db.query(MerchantProfile).filter(
        MerchantProfile.business_category == req.business_category
    ).count()

    # Create dummy rule object for simulation
    class TempRule:
        rule_id = "PREVIEW_SIM"
        version = (prev_rule.version + 1) if prev_rule else 1
        business_category = req.business_category
        business_subcategory = req.business_subcategory
        calculation_type = req.calculation_type
        rate_percentage = req.rate_percentage
        fixed_fee = req.fixed_fee
        min_amount = req.min_amount
        max_cap = req.max_cap
        gst_rate = req.gst_rate
        tax_treatment = req.tax_treatment
        status = "ACTIVE"

    sample_calcs = []
    from rules_engine import execute_rule_calculation, quantize_curr
    from decimal import Decimal

    for amt in req.sample_amounts:
        calc_res = execute_rule_calculation(quantize_curr(Decimal(str(amt))), TempRule())
        sample_calcs.append(calc_res)

    return MDRRulePreviewResponse(
        previous_rule=MDRRuleResponse.model_validate(prev_rule) if prev_rule else None,
        proposed_rule={
            "calculation_type": req.calculation_type,
            "rate_percentage": req.rate_percentage,
            "fixed_fee": req.fixed_fee,
            "min_amount": req.min_amount,
            "max_cap": req.max_cap,
            "gst_rate": req.gst_rate,
            "tax_treatment": req.tax_treatment
        },
        affected_category=req.business_category,
        affected_subcategory=req.business_subcategory,
        affected_merchants_count=m_count,
        effective_date=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        sample_calculations=sample_calcs
    )

@router.post("/mdr-rules/publish", response_model=MDRRuleResponse)
def publish_mdr_rule(
    req: MDRRulePublishRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Publishes a new versioned MDR rule into the central engine.
    - Preserves historical versions (never overwrites).
    - Deactivates previous active rule for the category/subcategory.
    - Creates audit log and broadcasts real-time event.
    """
    # Check for existing active rule
    query = db.query(MDRRule).filter(
        MDRRule.business_category == req.business_category,
        MDRRule.status == "ACTIVE"
    )
    if req.business_subcategory:
        query = query.filter(MDRRule.business_subcategory == req.business_subcategory)

    prev_rule = query.order_by(MDRRule.version.desc()).first()
    new_version = (prev_rule.version + 1) if prev_rule else 1
    base_id = f"MDR_RULE_{req.business_category.upper().replace(' ', '_')[:16]}"
    rule_id = f"{base_id}_V{new_version}"

    # Deactivate previous active rule
    if prev_rule:
        prev_rule.status = "SUPERSEDED"
        prev_rule.effective_end_date = datetime.utcnow()

    # Create new rule
    new_rule = MDRRule(
        rule_id=rule_id,
        version=new_version,
        business_category=req.business_category,
        business_subcategory=req.business_subcategory,
        payment_type="P2M",
        calculation_type=req.calculation_type,
        rate_percentage=req.rate_percentage,
        fixed_fee=req.fixed_fee,
        min_amount=req.min_amount,
        max_cap=req.max_cap,
        gst_rate=req.gst_rate,
        tax_treatment=req.tax_treatment,
        eligibility_conditions=req.eligibility_conditions,
        status="ACTIVE",
        created_by=admin.email,
        change_summary=req.change_summary,
        effective_start_date=datetime.utcnow()
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    log_audit(
        db, admin,
        action="MDR_RULE_PUBLISHED",
        target_type="MDR_RULE",
        target_id=new_rule.rule_id,
        previous_value=f"v{prev_rule.version} ({prev_rule.rate_percentage}%)" if prev_rule else "None",
        new_value=f"v{new_rule.version} ({new_rule.rate_percentage}%, Cap: ₹{new_rule.max_cap})"
    )

    emit_event_sync("MDR_RULE_UPDATED", {
        "rule_id": new_rule.rule_id,
        "category": new_rule.business_category,
        "version": new_rule.version,
        "rate": new_rule.rate_percentage
    })

    return new_rule

# =========================================================================
# 5. QR CODE MANAGEMENT
# =========================================================================
@router.get("/qrs", response_model=List[QRManagementItem])
def get_all_merchant_qrs(
    q: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Lists all registered merchant QR codes with activation status and assigned shop info."""
    query = db.query(UserQR).join(User, UserQR.user_id == User.id).filter(User.account_type == "merchant")

    if status and status != "all":
        query = query.filter(UserQR.qr_status == status.upper())

    qrs = query.order_by(desc(UserQR.created_at)).all()
    results = []
    for qr in qrs:
        mp = qr.user.merchant_profile if qr.user else None
        b_name = mp.business_name if mp else (qr.user.full_name if qr.user else "Unknown")
        b_cat = mp.business_category if mp else "Retail"
        b_subcat = getattr(mp, "business_subcategory", "General") if mp else "General"

        if q and q.strip():
            term = q.strip().lower()
            if term not in b_name.lower() and term not in qr.qr_code.lower():
                continue

        results.append(QRManagementItem(
            id=qr.id,
            user_id=qr.user_id,
            merchant_name=b_name,
            business_category=b_cat,
            business_subcategory=b_subcat,
            qr_code=qr.qr_code,
            qr_status=getattr(qr, "qr_status", "ACTIVE"),
            is_active=qr.is_active,
            created_at=qr.created_at,
            last_generated_at=getattr(qr, "last_generated_at", qr.created_at)
        ))

    return results

@router.patch("/qrs/{qr_id}/status")
def toggle_qr_status(
    qr_id: int,
    status: str = Query(..., pattern="^(ACTIVE|INACTIVE|SUSPENDED)$"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin activates or deactivates a merchant QR code."""
    qr = db.query(UserQR).filter(UserQR.id == qr_id).first()
    if not qr:
        raise HTTPException(status_code=404, detail="QR code record not found")

    prev_status = getattr(qr, "qr_status", "ACTIVE")
    qr.qr_status = status
    qr.is_active = (status == "ACTIVE")

    # Also sync merchant profile status
    if qr.user and qr.user.merchant_profile:
        qr.user.merchant_profile.qr_status = status

    db.commit()

    log_audit(
        db, admin,
        action="QR_STATUS_CHANGED",
        target_type="QR",
        target_id=qr.qr_code,
        previous_value=prev_status,
        new_value=status
    )

    emit_event_sync("QR_STATUS_UPDATED", {
        "qr_code": qr.qr_code,
        "new_status": status
    })

    return {"message": f"QR {qr.qr_code} status updated to {status}", "qr_status": status}

@router.post("/qrs/{user_id}/regenerate")
def regenerate_merchant_qr(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Regenerates a fresh secure QR code for a merchant without duplicate accounts."""
    user = db.query(User).filter(User.id == user_id, User.account_type == "merchant").first()
    if not user:
        raise HTTPException(status_code=404, detail="Merchant not found")

    import json
    unique_token = uuid.uuid4().hex[:8].upper()
    new_qr_code = f"MDR-PAY-{user.id}-{unique_token}"
    payload_data = {
        "app": "MDR_SETTLEMENT_GUARDIAN",
        "qr_code": new_qr_code,
        "user_id": user.id,
        "account_type": "merchant",
        "v": 2
    }

    qr = user.qr_profile
    prev_qr = qr.qr_code if qr else "None"
    if qr:
        qr.qr_code = new_qr_code
        qr.qr_payload = json.dumps(payload_data)
        qr.qr_status = "ACTIVE"
        qr.is_active = True
        qr.last_generated_at = datetime.utcnow()
    else:
        qr = UserQR(
            user_id=user.id,
            qr_code=new_qr_code,
            qr_payload=json.dumps(payload_data),
            is_active=True,
            qr_status="ACTIVE"
        )
        db.add(qr)

    if user.merchant_profile:
        user.merchant_profile.assigned_qr_id = new_qr_code

    db.commit()

    log_audit(
        db, admin,
        action="QR_REGENERATED",
        target_type="QR",
        target_id=new_qr_code,
        previous_value=prev_qr,
        new_value=new_qr_code
    )

    emit_event_sync("QR_REGENERATED", {
        "user_id": user.id,
        "new_qr_code": new_qr_code
    })

    return {"message": "QR regenerated successfully", "qr_code": new_qr_code}

# =========================================================================
# 6. AUDIT LOGS
# =========================================================================
@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Retrieves immutable administrative audit trail."""
    logs = db.query(AdminAuditLog).order_by(desc(AdminAuditLog.timestamp)).limit(limit).all()
    return logs

# =========================================================================
# 7. PLATFORM TRANSACTIONS
# =========================================================================
@router.get("/transactions", response_model=List[TransactionResponse])
def get_all_platform_transactions(
    search: Optional[str] = Query(None),
    txn_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None, description="Filter by category e.g. petrol, hotel, grocery, electronics"),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Returns all transactions across the entire platform with full credit/debit records and category filtering."""
    from routes.payment_routes import format_transaction_response

    query = db.query(Transaction)

    if txn_type and txn_type != "all":
        query = query.filter(Transaction.txn_type == txn_type.upper())

    if status and status != "all":
        query = query.filter(Transaction.status == status.upper())

    if category and category != "all":
        cat_lower = category.lower().strip()
        query = query.join(TransactionSettlement, Transaction.id == TransactionSettlement.transaction_id, isouter=True)
        if "hotel" in cat_lower or "restaurant" in cat_lower or "food" in cat_lower:
            query = query.filter(
                or_(
                    TransactionSettlement.business_category.ilike("%Restaurant%"),
                    TransactionSettlement.business_category.ilike("%Food%"),
                    TransactionSettlement.business_subcategory.ilike("%Restaurant%"),
                    TransactionSettlement.business_subcategory.ilike("%Food%"),
                    TransactionSettlement.business_subcategory.ilike("%Dining%"),
                    TransactionSettlement.business_subcategory.ilike("%QSR%")
                )
            )
        elif "petrol" in cat_lower or "fuel" in cat_lower:
            query = query.filter(
                or_(
                    TransactionSettlement.business_subcategory.ilike("%Petrol%"),
                    TransactionSettlement.business_subcategory.ilike("%Fuel%")
                )
            )
        elif "grocery" in cat_lower or "kirana" in cat_lower:
            query = query.filter(
                or_(
                    TransactionSettlement.business_category.ilike("%Grocery%"),
                    TransactionSettlement.business_category.ilike("%Kirana%"),
                    TransactionSettlement.business_subcategory.ilike("%Kirana%"),
                    TransactionSettlement.business_subcategory.ilike("%Supermarket%")
                )
            )
        elif "telecom" in cat_lower or "recharge" in cat_lower or "broadband" in cat_lower:
            query = query.filter(
                or_(
                    TransactionSettlement.business_subcategory.ilike("%Telecom%"),
                    TransactionSettlement.business_subcategory.ilike("%Recharge%"),
                    TransactionSettlement.business_subcategory.ilike("%Broadband%")
                )
            )
        elif "electronic" in cat_lower or "mobile" in cat_lower or "device" in cat_lower:
            query = query.filter(
                or_(
                    TransactionSettlement.business_category.ilike("%Electronic%"),
                    TransactionSettlement.business_subcategory.ilike("%Mobile%"),
                    TransactionSettlement.business_subcategory.ilike("%Appliance%")
                )
            )
        elif "health" in cat_lower or "pharmacy" in cat_lower or "medical" in cat_lower:
            query = query.filter(
                or_(
                    TransactionSettlement.business_category.ilike("%Health%"),
                    TransactionSettlement.business_category.ilike("%Pharmacy%"),
                    TransactionSettlement.business_subcategory.ilike("%Pharmacy%")
                )
            )
        elif "apparel" in cat_lower or "clothing" in cat_lower or "footwear" in cat_lower:
            query = query.filter(
                or_(
                    TransactionSettlement.business_category.ilike("%Apparel%"),
                    TransactionSettlement.business_subcategory.ilike("%Clothing%"),
                    TransactionSettlement.business_subcategory.ilike("%Footwear%")
                )
            )
        else:
            term = f"%{category.strip()}%"
            query = query.filter(
                or_(
                    TransactionSettlement.business_category.ilike(term),
                    TransactionSettlement.business_subcategory.ilike(term)
                )
            )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.join(User, or_(Transaction.sender_id == User.id, Transaction.receiver_id == User.id))
        query = query.filter(
            or_(
                Transaction.txn_id.ilike(term),
                Transaction.note.ilike(term),
                User.full_name.ilike(term),
                User.email.ilike(term)
            )
        ).distinct()

    if sort_by == "amount":
        order_col = Transaction.amount.asc() if sort_order == "asc" else Transaction.amount.desc()
    else:
        order_col = Transaction.created_at.asc() if sort_order == "asc" else Transaction.created_at.desc()

    txns = query.order_by(order_col).offset(offset).limit(limit).all()
    return [format_transaction_response(t, admin.id) for t in txns]
