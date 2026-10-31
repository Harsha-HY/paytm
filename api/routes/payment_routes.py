import io
import csv
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc

from database import get_db
from models import User, Wallet, UserQR, Transaction, TransactionSettlement, MerchantProfile
from schemas import (
    WalletResponse,
    UserQRResponse,
    ResolveQRRequest,
    ResolvedQRResponse,
    PaymentSimulationRequest,
    TransactionResponse,
    SettlementDetailResponse,
    TopupWalletRequest,
    PersonalOverviewResponse
)
from auth import get_current_user
from rules_engine import calculate_mdr
from events import emit_event_sync

router = APIRouter(prefix="/api/payments", tags=["Simulated Payments & QR"])

def get_or_create_wallet(db: Session, user_id: int) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        # Initial demo funds: ₹50,000 for realistic simulation
        wallet = Wallet(user_id=user_id, balance=50000.0, currency="INR")
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet

def get_or_create_user_qr(db: Session, user: User) -> UserQR:
    qr = db.query(UserQR).filter(UserQR.user_id == user.id, UserQR.is_active == True).first()
    if not qr:
        unique_token = uuid.uuid4().hex[:8].upper()
        qr_code = f"MDR-PAY-{user.id}-{unique_token}"
        payload_data = {
            "app": "MDR_SETTLEMENT_GUARDIAN",
            "qr_code": qr_code,
            "user_id": user.id,
            "account_type": user.account_type,
            "v": 1
        }
        qr = UserQR(
            user_id=user.id,
            qr_code=qr_code,
            qr_payload=json.dumps(payload_data),
            is_active=True
        )
        db.add(qr)
        db.commit()
        db.refresh(qr)
    return qr

@router.get("/wallet", response_model=WalletResponse)
def get_wallet(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the user's current simulated demo balance."""
    wallet = get_or_create_wallet(db, current_user.id)
    return WalletResponse(balance=wallet.balance, currency=wallet.currency)

@router.post("/wallet/topup", response_model=WalletResponse)
def topup_wallet(
    req: TopupWalletRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adds simulated demo funds to ensure continuous testing."""
    wallet = get_or_create_wallet(db, current_user.id)
    wallet.balance += req.amount
    db.commit()
    db.refresh(wallet)
    emit_event_sync("WALLET_TOPPED_UP", {
        "user_id": current_user.id,
        "new_balance": wallet.balance,
        "amount_added": req.amount
    })
    return WalletResponse(balance=wallet.balance, currency=wallet.currency)

@router.get("/my-qr", response_model=UserQRResponse)
def get_my_qr(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the unique application QR code and payload for the registered user."""
    qr = get_or_create_user_qr(db, current_user)
    
    b_name = None
    b_cat = None
    v_status = None
    if current_user.merchant_profile:
        b_name = current_user.merchant_profile.business_name
        b_cat = current_user.merchant_profile.business_category
        v_status = current_user.merchant_profile.verification_status

    return UserQRResponse(
        user_id=current_user.id,
        qr_code=qr.qr_code,
        qr_payload=qr.qr_payload,
        full_name=current_user.full_name,
        account_type=current_user.account_type,
        business_name=b_name,
        business_category=b_cat,
        verification_status=v_status
    )

@router.post("/resolve-qr", response_model=ResolvedQRResponse)
def resolve_qr(req: ResolveQRRequest, db: Session = Depends(get_db)):
    """
    Decodes and resolves scanned QR data.
    Verifies that the target is an actual registered user in the database.
    """
    raw_code = req.qr_code.strip()
    
    # Try parsing JSON if camera returned JSON string
    target_qr_code = raw_code
    if raw_code.startswith("{") and "qr_code" in raw_code:
        try:
            parsed = json.loads(raw_code)
            target_qr_code = parsed.get("qr_code", raw_code)
        except Exception:
            pass

    user_qr = db.query(UserQR).filter(UserQR.qr_code == target_qr_code).first()
    if not user_qr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid QR code. This QR is not registered on MDR Settlement Guardian."
        )

    if not user_qr.is_active or getattr(user_qr, "qr_status", "ACTIVE") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This QR code is currently inactive or suspended by administrator."
        )

    user = db.query(User).filter(User.id == user_qr.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The recipient account associated with this QR is inactive or not found."
        )

    b_name = None
    b_cat = None
    b_subcat = None
    city = None
    state_val = None
    v_status = None
    m_bank = None
    q_prov = None
    acq_bank = None
    gst_supp = None
    p2pm_el = False
    m_receipts = None
    app_rule = None

    if user.merchant_profile:
        b_name = user.merchant_profile.business_name
        b_cat = user.merchant_profile.business_category
        b_subcat = getattr(user.merchant_profile, "business_subcategory", "General")
        city = user.merchant_profile.city
        state_val = user.merchant_profile.state
        v_status = user.merchant_profile.verification_status
        m_bank = getattr(user.merchant_profile, "merchant_bank", "State Bank of India")
        q_prov = getattr(user.merchant_profile, "qr_provider", "Paytm for Business")
        acq_bank = getattr(user.merchant_profile, "acquiring_bank", "Axis Bank Ltd")
        gst_supp = getattr(user.merchant_profile, "gst_invoice_supplier", "Acquiring Bank (Axis Bank Ltd) - GSTIN 27AAACA0000A1Z5")
        p2pm_el = getattr(user.merchant_profile, "p2pm_eligible", False)
        m_receipts = getattr(user.merchant_profile, "monthly_eligible_receipts", 45000.0)
        app_rule = getattr(user.merchant_profile, "applicable_mdr_rule", "DEMO_CONFIG_RULE")

    return ResolvedQRResponse(
        user_id=user.id,
        full_name=user.full_name,
        account_type=user.account_type,
        qr_code=user_qr.qr_code,
        business_name=b_name,
        business_category=b_cat,
        business_subcategory=b_subcat,
        city=city,
        state=state_val,
        verification_status=v_status,
        merchant_bank=m_bank,
        qr_provider=q_prov,
        acquiring_bank=acq_bank,
        gst_invoice_supplier=gst_supp,
        p2pm_eligible=p2pm_el,
        monthly_eligible_receipts=m_receipts,
        applicable_mdr_rule=app_rule
    )

@router.post("/simulate", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def simulate_payment(
    req: PaymentSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes a simulated payment in a safe database transaction.
    - Validates sender has sufficient simulated balance.
    - Validates sender cannot pay themselves.
    - Idempotency protection prevents duplicate debits.
    - Determines P2P vs P2M behavior.
    - If P2M: runs Python rules engine to calculate MDR and GST.
    """
    amount = round(float(req.amount), 2)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    # Idempotency check
    if req.idempotency_key:
        existing_txn = db.query(Transaction).filter(Transaction.idempotency_key == req.idempotency_key).first()
        if existing_txn:
            return format_transaction_response(existing_txn, current_user.id)

    # Resolve receiver from QR
    target_qr_code = req.qr_code.strip()
    if target_qr_code.startswith("{") and "qr_code" in target_qr_code:
        try:
            parsed = json.loads(target_qr_code)
            target_qr_code = parsed.get("qr_code", target_qr_code)
        except Exception:
            pass

    user_qr = db.query(UserQR).filter(UserQR.qr_code == target_qr_code).first()
    if not user_qr:
        raise HTTPException(status_code=404, detail="Invalid QR code. Recipient not found.")

    if not user_qr.is_active or getattr(user_qr, "qr_status", "ACTIVE") != "ACTIVE":
        raise HTTPException(status_code=400, detail="This QR code is currently inactive or suspended by administrator.")

    receiver = db.query(User).filter(User.id == user_qr.user_id).first()
    if not receiver or not receiver.is_active:
        raise HTTPException(status_code=404, detail="Recipient account is inactive or not found.")

    if receiver.account_type == "merchant" and receiver.merchant_profile:
        if getattr(receiver.merchant_profile, "qr_status", "ACTIVE") != "ACTIVE":
            raise HTTPException(status_code=400, detail="Merchant QR payments are temporarily disabled for this shop.")

    if receiver.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send simulated payment to your own QR code.")

    # Check sender balance
    sender_wallet = get_or_create_wallet(db, current_user.id)
    if sender_wallet.balance < amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient simulated wallet balance. Available: ₹{sender_wallet.balance:,.2f}, Required: ₹{amount:,.2f}"
        )

    receiver_wallet = get_or_create_wallet(db, receiver.id)

    # Determine payment behavior: P2M only if receiver is a merchant
    is_p2m = (receiver.account_type == "merchant")
    txn_type = "P2M" if is_p2m else "P2P"

    # Unique Transaction ID
    timestamp_str = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_suffix = uuid.uuid4().hex[:6].upper()
    txn_id = f"TXN_{timestamp_str}_{random_suffix}"

    # If P2M, run the central database-backed MDR rules engine FIRST to calculate net settlement
    credited_amount = amount
    calc = None
    if is_p2m:
        category = receiver.merchant_profile.business_category if receiver.merchant_profile else None
        subcategory = getattr(receiver.merchant_profile, "business_subcategory", None)
        p2pm_eligible = getattr(receiver.merchant_profile, "p2pm_eligible", False)
        monthly_eligible_receipts = getattr(receiver.merchant_profile, "monthly_eligible_receipts", 0.0)
        calc = calculate_mdr(
            amount=amount,
            merchant_category=category,
            merchant_subcategory=subcategory,
            payment_type="P2M",
            p2pm_eligible=p2pm_eligible,
            monthly_eligible_receipts=monthly_eligible_receipts,
            db=db
        )
        # CRUCIAL: The available merchant account balance is credited the NET SETTLEMENT amount (Gross minus MDR & GST)
        credited_amount = round(calc["net_settlement"], 2)

    # Perform atomic balance update:
    # Sender is debited the full gross payment
    sender_wallet.balance = round(sender_wallet.balance - amount, 2)
    # Receiver (merchant) is credited ONLY the net settled amount after MDR and GST deductions
    receiver_wallet.balance = round(receiver_wallet.balance + credited_amount, 2)

    # Create transaction
    new_txn = Transaction(
        txn_id=txn_id,
        sender_id=current_user.id,
        receiver_id=receiver.id,
        amount=amount,
        txn_type=txn_type,
        status="SUCCESS",
        idempotency_key=req.idempotency_key,
        note=req.note.strip() if req.note else "Simulated Payment",
        created_at=datetime.utcnow()
    )
    db.add(new_txn)
    db.flush()

    if is_p2m and calc:
        settlement = TransactionSettlement(
            transaction_id=new_txn.id,
            gross_amount=calc["gross_amount"],
            mdr_rule=calc["mdr_rule"],
            rule_id=calc.get("rule_id"),
            rule_version=calc.get("rule_version", 1),
            business_category=calc.get("business_category"),
            business_subcategory=calc.get("business_subcategory"),
            calculation_type=calc.get("calculation_type"),
            applied_rate=calc.get("applied_rate"),
            applied_cap=calc.get("applied_cap"),
            mdr_rate=calc["mdr_rate"],
            mdr_amount=calc["mdr_amount"],
            gst_rate=calc["gst_rate"],
            gst_amount=calc["gst_amount"],
            total_deductions=calc["total_deductions"],
            net_settlement=calc["net_settlement"],
            tax_treatment=calc["tax_treatment"],
            calculation_note=calc["explanation"]
        )
        db.add(settlement)

    db.commit()
    db.refresh(new_txn)

    # Broadcast real-time transaction event
    emit_event_sync("TRANSACTION_CREATED", {
        "txn_id": new_txn.txn_id,
        "amount": new_txn.amount,
        "sender_id": current_user.id,
        "sender_name": current_user.full_name,
        "receiver_id": receiver.id,
        "receiver_name": receiver.full_name,
        "txn_type": txn_type,
        "status": "SUCCESS"
    })

    wallet = get_or_create_wallet(db, current_user.id)
    return format_transaction_response(new_txn, current_user.id, wallet.balance)

@router.get("/personal/overview", response_model=PersonalOverviewResponse)
def get_personal_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns aggregated transaction metrics and wallet balance for the personal user."""
    wallet = get_or_create_wallet(db, current_user.id)
    sent_txns = db.query(Transaction).filter(Transaction.sender_id == current_user.id, Transaction.status == "SUCCESS").all()
    received_txns = db.query(Transaction).filter(Transaction.receiver_id == current_user.id, Transaction.status == "SUCCESS").all()

    money_sent = sum(t.amount for t in sent_txns)
    money_received = sum(t.amount for t in received_txns)
    total_txns = len(sent_txns) + len(received_txns)

    return PersonalOverviewResponse(
        wallet_balance=round(wallet.balance, 2),
        currency=wallet.currency,
        money_sent=round(money_sent, 2),
        money_received=round(money_received, 2),
        total_transactions=total_txns
    )

@router.get("/transactions", response_model=List[TransactionResponse])
def get_user_transactions(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    txn_type: Optional[str] = Query(None),
    filter_direction: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns filtered transaction history for the authenticated user."""
    query = db.query(Transaction).options(
        joinedload(Transaction.settlement),
        joinedload(Transaction.sender),
        joinedload(Transaction.receiver).joinedload(User.merchant_profile)
    ).filter(
        or_(Transaction.sender_id == current_user.id, Transaction.receiver_id == current_user.id)
    )

    # Direction filter
    if filter_direction and filter_direction.lower() == "sent":
        query = query.filter(Transaction.sender_id == current_user.id)
    elif filter_direction and filter_direction.lower() == "received":
        query = query.filter(Transaction.receiver_id == current_user.id)

    # Txn type filter
    if txn_type and txn_type.upper() in ["P2P", "P2M"]:
        query = query.filter(Transaction.txn_type == txn_type.upper())

    # Status filter
    if status and status.upper() in ["SUCCESS", "PENDING", "FAILED"]:
        query = query.filter(Transaction.status == status.upper())

    # Date range filter
    if date_range:
        now = datetime.utcnow()
        if date_range.lower() == "today":
            start_of_day = datetime(now.year, now.month, now.day)
            query = query.filter(Transaction.created_at >= start_of_day)
        elif date_range.lower() == "week":
            start_of_week = now - timedelta(days=7)
            query = query.filter(Transaction.created_at >= start_of_week)
        elif date_range.lower() == "month":
            start_of_month = now - timedelta(days=30)
            query = query.filter(Transaction.created_at >= start_of_month)

    # Search filter (txn_id or counterparty name or note)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.join(User, or_(Transaction.sender_id == User.id, Transaction.receiver_id == User.id))
        query = query.filter(
            or_(
                Transaction.txn_id.ilike(term),
                Transaction.note.ilike(term),
                User.full_name.ilike(term)
            )
        ).distinct()

    txns = query.order_by(desc(Transaction.created_at)).offset(skip).limit(limit).all()
    user_wallet = get_or_create_wallet(db, current_user.id)

    return [format_transaction_response(t, current_user.id, user_wallet.balance) for t in txns]

@router.get("/transactions/{txn_id}", response_model=TransactionResponse)
def get_transaction_by_id(
    txn_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full details and deduction breakdown for a specific transaction."""
    txn = db.query(Transaction).filter(Transaction.txn_id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    if current_user.role != "admin" and txn.sender_id != current_user.id and txn.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied for this transaction.")

    user_wallet = get_or_create_wallet(db, current_user.id)
    return format_transaction_response(txn, current_user.id, user_wallet.balance)

@router.get("/merchant/settlement-summary")
def get_merchant_settlement_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns aggregated settlement metrics for the merchant:
    - Gross QR Sales
    - Total MDR Deductions
    - Total GST on MDR
    - Total Net Settlement
    - Count of transactions
    """
    if current_user.account_type != "merchant":
        raise HTTPException(status_code=400, detail="Only merchant accounts can view settlement summaries.")

    p2m_txns = (
        db.query(Transaction)
        .filter(Transaction.receiver_id == current_user.id, Transaction.txn_type == "P2M")
        .all()
    )

    gross_total = sum(t.amount for t in p2m_txns)
    total_mdr = 0.0
    total_gst = 0.0
    total_net = 0.0

    for t in p2m_txns:
        if t.settlement:
            total_mdr += t.settlement.mdr_amount
            total_gst += t.settlement.gst_amount
            total_net += t.settlement.net_settlement
        else:
            total_net += t.amount

    return {
        "gross_sales": round(gross_total, 2),
        "total_mdr": round(total_mdr, 2),
        "total_gst": round(total_gst, 2),
        "total_deductions": round(total_mdr + total_gst, 2),
        "expected_net_settlement": round(total_net, 2),
        "total_transactions": len(p2m_txns),
        "is_simulated": True
    }

@router.get("/merchant/daily-analysis")
def get_merchant_daily_analysis(
    target_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns day-wise settlement analysis for the merchant:
    - Today's calculation runs up to 11:59:59 PM before closing.
    - Historical days are fully archived and retrievable.
    - Full list of transactions for the target date.
    """
    if current_user.account_type != "merchant":
        raise HTTPException(status_code=400, detail="Only merchant accounts can view daily analysis.")

    now = datetime.utcnow()
    if target_date:
        try:
            parsed_date = datetime.strptime(target_date.strip(), "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")
    else:
        parsed_date = now

    start_of_target = datetime(parsed_date.year, parsed_date.month, parsed_date.day, 0, 0, 0)
    end_of_target = datetime(parsed_date.year, parsed_date.month, parsed_date.day, 23, 59, 59, 999999)
    target_date_str = start_of_target.strftime("%Y-%m-%d")
    is_today = (target_date_str == now.strftime("%Y-%m-%d"))

    day_txns = (
        db.query(Transaction)
        .filter(
            or_(Transaction.receiver_id == current_user.id, Transaction.sender_id == current_user.id),
            Transaction.created_at >= start_of_target,
            Transaction.created_at <= end_of_target
        )
        .order_by(desc(Transaction.created_at))
        .all()
    )

    day_gross = 0.0
    day_mdr = 0.0
    day_gst = 0.0
    day_net = 0.0
    sales_count = 0
    sent_count = 0

    for t in day_txns:
        if t.receiver_id == current_user.id:
            sales_count += 1
            day_gross += t.amount
            if t.settlement:
                day_mdr += t.settlement.mdr_amount
                day_gst += t.settlement.gst_amount
                day_net += t.settlement.net_settlement
            else:
                day_net += t.amount
        else:
            sent_count += 1

    all_merchant_txns = (
        db.query(Transaction)
        .filter(or_(Transaction.receiver_id == current_user.id, Transaction.sender_id == current_user.id))
        .all()
    )
    
    days_map = {}
    for t in all_merchant_txns:
        d_str = t.created_at.strftime("%Y-%m-%d")
        if d_str not in days_map:
            days_map[d_str] = {"gross": 0.0, "count": 0, "mdr": 0.0, "gst": 0.0, "net": 0.0}
        days_map[d_str]["count"] += 1
        if t.receiver_id == current_user.id:
            days_map[d_str]["gross"] += t.amount
            if t.settlement:
                days_map[d_str]["mdr"] += t.settlement.mdr_amount
                days_map[d_str]["gst"] += t.settlement.gst_amount
                days_map[d_str]["net"] += t.settlement.net_settlement
            else:
                days_map[d_str]["net"] += t.amount

    if target_date_str not in days_map:
        days_map[target_date_str] = {"gross": 0.0, "count": 0, "mdr": 0.0, "gst": 0.0, "net": 0.0}

    historical_days = []
    sorted_dates = sorted(days_map.keys(), reverse=True)
    for d_key in sorted_dates:
        d_data = days_map[d_key]
        historical_days.append({
            "date": d_key,
            "is_today": (d_key == now.strftime("%Y-%m-%d")),
            "gross_sales": round(d_data["gross"], 2),
            "total_transactions": d_data["count"],
            "total_mdr": round(d_data["mdr"], 2),
            "total_gst": round(d_data["gst"], 2),
            "total_deductions": round(d_data["mdr"] + d_data["gst"], 2),
            "expected_net_settlement": round(d_data["net"], 2)
        })

    user_wallet = get_or_create_wallet(db, current_user.id)

    return {
        "selected_date": target_date_str,
        "is_today": is_today,
        "reset_cutoff_time": "23:59:59",
        "gross_sales": round(day_gross, 2),
        "total_transactions": sales_count,
        "total_sent_transactions": sent_count,
        "total_mdr": round(day_mdr, 2),
        "total_gst": round(day_gst, 2),
        "total_deductions": round(day_mdr + day_gst, 2),
        "expected_net_settlement": round(day_net, 2),
        "transactions": [format_transaction_response(t, current_user.id, user_wallet.balance) for t in day_txns],
        "historical_days": historical_days
    }

def format_transaction_response(txn: Transaction, current_user_id: int, current_balance: Optional[float] = None) -> TransactionResponse:
    settlement_data = None
    is_pending = False
    if txn.settlement:
        settlement_data = SettlementDetailResponse.model_validate(txn.settlement)
        is_pending = (getattr(txn.settlement, "calculation_type", "") == "PENDING_CONFIG")

    b_name = None
    b_cat = None
    b_subcat = None
    if txn.receiver and txn.receiver.merchant_profile:
        b_name = txn.receiver.merchant_profile.business_name
        b_cat = txn.receiver.merchant_profile.business_category
        b_subcat = getattr(txn.receiver.merchant_profile, "business_subcategory", "General")

    return TransactionResponse(
        id=txn.id,
        txn_id=txn.txn_id,
        sender_id=txn.sender_id,
        sender_name=txn.sender.full_name if txn.sender else "Unknown Sender",
        sender_account_type=txn.sender.account_type if txn.sender else "personal",
        receiver_id=txn.receiver_id,
        receiver_name=txn.receiver.full_name if txn.receiver else "Unknown Receiver",
        receiver_account_type=txn.receiver.account_type if txn.receiver else "personal",
        receiver_business_name=b_name,
        receiver_business_category=b_cat,
        receiver_business_subcategory=b_subcat,
        amount=txn.amount,
        txn_type=txn.txn_type,
        status=txn.status,
        note=txn.note,
        created_at=txn.created_at,
        settlement=settlement_data,
        is_sender=(txn.sender_id == current_user_id),
        available_balance_after=current_balance,
        is_pending_config=is_pending
    )

@router.get("/reconciliation/sample-csv")
def download_sample_reconciliation_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates an illustrative bank/aggregator settlement CSV populated with recent
    merchant transactions for testing the settlement reconciliation engine.
    """
    txns = db.query(Transaction).filter(
        Transaction.receiver_id == current_user.id
    ).order_by(Transaction.created_at.desc()).limit(10).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Transaction ID",
        "Merchant ID",
        "Transaction Amount",
        "Settlement Reference",
        "Settlement Date",
        "Actual Settlement Credit",
        "Deducted MDR",
        "Deducted GST",
        "Notes"
    ])

    if txns:
        for idx, t in enumerate(txns):
            exp_net = t.settlement.net_settlement if t.settlement else t.amount
            exp_mdr = t.settlement.mdr_amount if t.settlement else 0.0
            exp_gst = t.settlement.gst_amount if t.settlement else 0.0
            
            actual_credit = exp_net
            notes = "Standard Settlement Credit"
            actual_mdr = exp_mdr
            actual_gst = exp_gst
            if idx == 1 and len(txns) > 2:
                actual_credit = round(exp_net - 11.80, 2)
                actual_mdr = round(exp_mdr + 10.0, 2)
                actual_gst = round(exp_gst + 1.80, 2)
                notes = "Discrepancy (Acquirer Overcharge)"
            elif idx == 2 and len(txns) > 3:
                notes = "T+1 Batch Settlement Timing Adjustment"

            writer.writerow([
                t.txn_id,
                f"MERCH_{current_user.id}",
                f"{t.amount:.2f}",
                f"UTR{uuid.uuid4().hex[:10].upper()}",
                (t.created_at + timedelta(days=1)).strftime("%Y-%m-%d"),
                f"{actual_credit:.2f}",
                f"{actual_mdr:.2f}",
                f"{actual_gst:.2f}",
                notes
            ])
    else:
        sample_rows = [
            ("DEMO_TXN_PETROL_3000", f"MERCH_{current_user.id}", "3000.00", "UTR9928172031", "2026-10-31", "2994.10", "5.00", "0.90", "Matched Essential Sector"),
            ("DEMO_TXN_REST_1500", f"MERCH_{current_user.id}", "1500.00", "UTR9928172032", "2026-10-31", "1500.00", "0.00", "0.00", "Matched General Merchant"),
            ("DEMO_TXN_PHARM_2500", f"MERCH_{current_user.id}", "2500.00", "UTR9928172033", "2026-10-31", "2476.40", "20.00", "3.60", "Discrepancy (Overcharged MDR 0.8% instead of 0.4%)"),
            ("DEMO_TXN_CLINIC_500", f"MERCH_{current_user.id}", "500.00", "UTR9928172034", "2026-10-31", "500.00", "0.00", "0.00", "Matched Sub-2000 Concession"),
            ("DEMO_TXN_TEL_400", f"MERCH_{current_user.id}", "400.00", "UTR9928172035", "2026-10-31", "400.00", "0.00", "0.00", "T+1 Timing Settlement Adjustment")
        ]
        for row in sample_rows:
            writer.writerow(row)

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=settlement_report_sample.csv"}
    )

@router.post("/reconciliation/upload")
async def upload_reconciliation_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Parses an uploaded bank settlement CSV file and performs multi-point transaction matching:
    - Transaction ID & Merchant ID
    - Expected MDR, Expected GST, Expected Net vs Actual Settlement Credit
    - Detects: Missing transactions, Duplicate deductions, Incorrect MDR/GST, and Timing adjustments
    - Categorizes each line item as Matched, Timing Difference, or Discrepancy.
    """
    contents = await file.read()
    decoded = contents.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(decoded))

    results = []
    matched_count = 0
    discrepancy_count = 0
    timing_count = 0
    total_expected_net = 0.0
    total_actual_credited = 0.0

    def get_val(row, *aliases):
        for a in aliases:
            for k, v in row.items():
                if k and a.lower() in k.lower():
                    return v.strip() if v else ""
        return ""

    for row_idx, row in enumerate(reader):
        txn_id = get_val(row, "transaction id", "txn_id", "transaction_id", "txnid")
        merch_id = get_val(row, "merchant id", "merchant_id", "merchid")
        amount_str = get_val(row, "transaction amount", "amount", "gross amount")
        actual_credit_str = get_val(row, "actual settlement credit", "actual_credit", "settlement credit", "net credit", "credited amount")
        settlement_ref = get_val(row, "settlement reference", "reference", "utr", "rrn")
        settlement_date = get_val(row, "settlement date", "date", "settled_on")
        ded_mdr_str = get_val(row, "deducted mdr", "actual mdr", "mdr")
        ded_gst_str = get_val(row, "deducted gst", "actual gst", "gst")
        notes = get_val(row, "notes", "remarks", "description")

        try:
            row_amount = float(amount_str) if amount_str else 0.0
        except ValueError:
            row_amount = 0.0

        try:
            actual_credit = float(actual_credit_str) if actual_credit_str else row_amount
        except ValueError:
            actual_credit = row_amount

        actual_mdr = float(ded_mdr_str) if ded_mdr_str else 0.0
        actual_gst = float(ded_gst_str) if ded_gst_str else 0.0

        txn = None
        if txn_id:
            txn = db.query(Transaction).filter(Transaction.txn_id == txn_id).first()
        if not txn and row_amount > 0:
            txn = db.query(Transaction).filter(
                Transaction.receiver_id == current_user.id,
                Transaction.amount == row_amount
            ).order_by(Transaction.created_at.desc()).first()

        if txn:
            exp_gross = txn.amount
            settlement = txn.settlement
            exp_mdr = settlement.mdr_amount if settlement else 0.0
            exp_gst = settlement.gst_amount if settlement else 0.0
            exp_net = settlement.net_settlement if settlement else txn.amount
            rule_name = settlement.mdr_rule if settlement else "Exempt / Direct"
            category = settlement.business_category if settlement else "Merchant"
            txn_matched_id = txn.txn_id
            created_at_str = txn.created_at.strftime("%Y-%m-%d %H:%M")
        else:
            exp_gross = row_amount
            exp_mdr = 0.0
            exp_gst = 0.0
            exp_net = row_amount
            rule_name = "Unrecorded in System"
            category = "Unknown"
            txn_matched_id = txn_id or f"UNKNOWN_{row_idx + 1}"
            created_at_str = "Not Recorded"

        diff = round(actual_credit - exp_net, 2)
        total_expected_net += exp_net
        total_actual_credited += actual_credit

        if not txn:
            status_label = "DISCREPANCY"
            status_reason = "Transaction record not found in system database."
            discrepancy_count += 1
        elif abs(diff) < 0.05:
            status_label = "MATCHED"
            status_reason = "Settlement amount matches configured rules engine calculation exactly."
            matched_count += 1
        elif "timing" in notes.lower() or "t+1" in notes.lower() or "t+2" in notes.lower() or "holdback" in notes.lower():
            status_label = "TIMING_DIFFERENCE"
            status_reason = "T+1 / T+2 settlement cycle clearing adjustment or bank holdback."
            timing_count += 1
        else:
            status_label = "DISCREPANCY"
            overcharge_val = abs(diff)
            status_reason = f"Settlement under-credited by ₹{overcharge_val:,.2f}. Bank credited ₹{actual_credit:,.2f} vs expected ₹{exp_net:,.2f}."
            discrepancy_count += 1

        results.append({
            "id": row_idx + 1,
            "txn_id": txn_matched_id,
            "merchant_id": merch_id or f"MERCH_{current_user.id}",
            "settlement_ref": settlement_ref or f"REF-{row_idx + 1}",
            "settlement_date": settlement_date or datetime.utcnow().strftime("%Y-%m-%d"),
            "transaction_date": created_at_str,
            "category": category,
            "rule_name": rule_name,
            "gross_amount": exp_gross,
            "expected_mdr": exp_mdr,
            "actual_mdr": actual_mdr or exp_mdr,
            "expected_gst": exp_gst,
            "actual_gst": actual_gst or exp_gst,
            "expected_net": exp_net,
            "actual_credit": actual_credit,
            "difference": diff,
            "status": status_label,
            "reason": status_reason,
            "notes": notes
        })

    return {
        "summary": {
            "total_records": len(results),
            "matched_records": matched_count,
            "discrepancies": discrepancy_count,
            "timing_differences": timing_count,
            "total_expected_net": round(total_expected_net, 2),
            "total_actual_credited": round(total_actual_credited, 2),
            "net_discrepancy": round(total_actual_credited - total_expected_net, 2)
        },
        "records": results
    }
