import os
import yaml
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

def quantize_curr(val: Decimal) -> Decimal:
    """Rounds to 2 decimal places using standard financial round half up."""
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def calculate_mdr(
    amount: float,
    merchant_category: Optional[str] = None,
    merchant_subcategory: Optional[str] = None,
    payment_type: str = "P2M",
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Central Database-Backed MDR Rules Engine.
    Uses exact decimal arithmetic. Never trusts frontend amounts.
    Never invents unverified pitch-deck rates.
    """
    dec_amount = quantize_curr(Decimal(str(amount)))

    # Rule 1: P2P payments are strictly exempt from merchant MDR and GST
    if payment_type == "P2P":
        return {
            "gross_amount": float(dec_amount),
            "mdr_rule": "P2P Personal Exemption (0% MDR)",
            "rule_id": "P2P_EXEMPTION",
            "rule_version": 1,
            "business_category": "Personal",
            "business_subcategory": None,
            "calculation_type": "ZERO",
            "applied_rate": "0%",
            "applied_cap": None,
            "mdr_rate": "0%",
            "mdr_amount": 0.0,
            "gst_rate": 0.0,
            "gst_amount": 0.0,
            "total_deductions": 0.0,
            "net_settlement": float(dec_amount),
            "tax_treatment": "EXEMPT",
            "is_pending_config": False,
            "explanation": "Personal person-to-person (P2P) transfers are 100% exempt from MDR fees and GST under RBI/NPCI regulations.",
            "is_simulated": True
        }

    # If database session is available, fetch the active rule from DB
    if db:
        from models import MDRRule

        cat_clean = (merchant_category or "").strip()
        sub_clean = (merchant_subcategory or "").strip()

        # Step 1: Attempt to match exact category AND subcategory
        active_rule = None
        if sub_clean and sub_clean != "General":
            active_rule = db.query(MDRRule).filter(
                MDRRule.business_category.ilike(cat_clean),
                MDRRule.business_subcategory.ilike(sub_clean),
                MDRRule.status == "ACTIVE"
            ).order_by(MDRRule.version.desc()).first()

        # Step 2: Fallback to category level rule (where subcategory is None or General)
        if not active_rule:
            active_rule = db.query(MDRRule).filter(
                MDRRule.business_category.ilike(cat_clean),
                MDRRule.status.in_(["ACTIVE", "PENDING_CONFIG"])
            ).order_by(MDRRule.version.desc()).first()

        # If a rule was found in DB
        if active_rule:
            return execute_rule_calculation(dec_amount, active_rule)

    # Fallback to standard regulatory calculation if rule not in DB
    return calculate_default_regulatory_mdr(dec_amount, merchant_category, merchant_subcategory)

def execute_rule_calculation(amount: Decimal, rule) -> Dict[str, Any]:
    """Applies decimal-safe calculations based on the MDRRule model."""
    calc_type = rule.calculation_type or "PERCENTAGE"
    rate_pct = Decimal(str(rule.rate_percentage or 0.0))
    fixed_fee = Decimal(str(rule.fixed_fee or 0.0))
    min_amt = Decimal(str(rule.min_amount or 0.0)) if rule.min_amount is not None else None
    max_cap = Decimal(str(rule.max_cap or 0.0)) if rule.max_cap is not None else None
    gst_pct = Decimal(str(rule.gst_rate or 0.18))
    if gst_pct > Decimal("1.0"):
        gst_pct = gst_pct / Decimal("100.0")
    tax_treatment = rule.tax_treatment or "TAXABLE_18"

    # Case A: Pending Configuration
    if rule.status == "PENDING_CONFIG" or calc_type == "PENDING_CONFIG":
        return {
            "gross_amount": float(amount),
            "mdr_rule": f"{rule.business_category} (Pending Configuration)",
            "rule_id": rule.rule_id,
            "rule_version": rule.version,
            "business_category": rule.business_category,
            "business_subcategory": rule.business_subcategory,
            "calculation_type": "PENDING_CONFIG",
            "applied_rate": "Pending Verification",
            "applied_cap": None,
            "mdr_rate": "0% (Verification Pending)",
            "mdr_amount": 0.0,
            "gst_rate": 0.0,
            "gst_amount": 0.0,
            "total_deductions": 0.0,
            "net_settlement": float(amount),
            "tax_treatment": "NON_TAXABLE",
            "is_pending_config": True,
            "explanation": "MDR rate is pending regulatory verification for this business category. Safe policy applied: zero fee deducted.",
            "is_simulated": True
        }

    # Case B: Zero MDR tier under minimum transaction amount (e.g. <= ₹2,000 mandate)
    if min_amt is not None and amount <= min_amt:
        return {
            "gross_amount": float(amount),
            "mdr_rule": f"{rule.rule_id} — Zero MDR Tier (≤ ₹{int(min_amt):,})",
            "rule_id": rule.rule_id,
            "rule_version": rule.version,
            "business_category": rule.business_category,
            "business_subcategory": rule.business_subcategory,
            "calculation_type": "ZERO",
            "applied_rate": "0% (Government Mandate)",
            "applied_cap": float(max_cap) if max_cap else None,
            "mdr_rate": "0%",
            "mdr_amount": 0.0,
            "gst_rate": 0.0,
            "gst_amount": 0.0,
            "total_deductions": 0.0,
            "net_settlement": float(amount),
            "tax_treatment": "EXEMPT",
            "is_pending_config": False,
            "explanation": f"Under NPCI regulations, transactions up to ₹{int(min_amt):,} carry 0% MDR.",
            "is_simulated": True
        }

    # Case C: Fixed Fee MDR
    if calc_type == "FIXED":
        mdr_fee = quantize_curr(fixed_fee)
        applied_rate_str = f"Flat ₹{float(fixed_fee):.2f}"
    # Case D: Percentage or Capped
    else:
        raw_mdr = quantize_curr(amount * (rate_pct / Decimal("100")))
        if max_cap is not None and max_cap > 0 and raw_mdr > max_cap:
            mdr_fee = quantize_curr(max_cap)
            applied_rate_str = f"{float(rate_pct):.2f}% (Capped at ₹{float(max_cap):.2f})"
        else:
            mdr_fee = raw_mdr
            applied_rate_str = f"{float(rate_pct):.2f}%"

    # GST Calculation: only if tax_treatment is taxable and MDR > 0
    if tax_treatment == "TAXABLE_18" and mdr_fee > Decimal("0.00"):
        gst_fee = quantize_curr(mdr_fee * gst_pct)
        gst_pct_float = float(gst_pct)
    else:
        gst_fee = Decimal("0.00")
        gst_pct_float = 0.0

    total_deductions = quantize_curr(mdr_fee + gst_fee)
    net_settlement = quantize_curr(amount - total_deductions)

    return {
        "gross_amount": float(amount),
        "mdr_rule": f"{rule.rule_id} v{rule.version}",
        "rule_id": rule.rule_id,
        "rule_version": rule.version,
        "business_category": rule.business_category,
        "business_subcategory": rule.business_subcategory,
        "calculation_type": calc_type,
        "applied_rate": applied_rate_str,
        "applied_cap": float(max_cap) if max_cap else None,
        "mdr_rate": applied_rate_str,
        "mdr_amount": float(mdr_fee),
        "gst_rate": gst_pct_float,
        "gst_amount": float(gst_fee),
        "total_deductions": float(total_deductions),
        "net_settlement": float(net_settlement),
        "tax_treatment": tax_treatment,
        "is_pending_config": False,
        "explanation": f"Applied {applied_rate_str} on ₹{float(amount):.2f} = ₹{float(mdr_fee):.2f} MDR + ₹{float(gst_fee):.2f} GST ({int(gst_pct_float * 100)}%). Net bank credit: ₹{float(net_settlement):.2f}.",
        "is_simulated": True
    }

def calculate_default_regulatory_mdr(
    amount: Decimal,
    category: Optional[str] = None,
    subcategory: Optional[str] = None
) -> Dict[str, Any]:
    """Default regulatory fallback using decimal arithmetic."""
    cat_lower = (category or "").lower()
    sub_lower = (subcategory or "").lower()

    # Petrol bunk special agreement
    if "petrol" in cat_lower or "petrol" in sub_lower or "fuel" in sub_lower:
        if amount <= Decimal("2000"):
            mdr_amt = Decimal("0.00")
            rate_str = "0%"
        else:
            mdr_amt = Decimal("5.00")
            rate_str = "Flat ₹5"
    elif amount <= Decimal("2000"):
        mdr_amt = Decimal("0.00")
        rate_str = "0%"
    elif amount >= Decimal("75000"):
        mdr_amt = Decimal("300.00")
        rate_str = "0.40% (Capped at ₹300)"
    else:
        mdr_amt = quantize_curr(amount * Decimal("0.004"))
        rate_str = "0.40%"

    gst_amt = quantize_curr(mdr_amt * Decimal("0.18")) if mdr_amt > Decimal("0.00") else Decimal("0.00")
    total_ded = quantize_curr(mdr_amt + gst_amt)
    net_settlement = quantize_curr(amount - total_ded)

    return {
        "gross_amount": float(amount),
        "mdr_rule": "Standard NPCI Regulatory Schedule",
        "rule_id": "DEFAULT_NPCI_V1",
        "rule_version": 1,
        "business_category": category or "Retail",
        "business_subcategory": subcategory,
        "calculation_type": "CAPPED",
        "applied_rate": rate_str,
        "applied_cap": 300.0,
        "mdr_rate": rate_str,
        "mdr_amount": float(mdr_amt),
        "gst_rate": 0.18 if mdr_amt > Decimal("0.00") else 0.0,
        "gst_amount": float(gst_amt),
        "total_deductions": float(total_ded),
        "net_settlement": float(net_settlement),
        "tax_treatment": "TAXABLE_18",
        "is_pending_config": False,
        "explanation": f"Calculated {rate_str} on ₹{float(amount):.2f}. Deductions: ₹{float(total_ded):.2f}. Net: ₹{float(net_settlement):.2f}.",
        "is_simulated": True
    }
