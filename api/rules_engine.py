import os
import yaml
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

def quantize_curr(val: Decimal) -> Decimal:
    """Rounds to 2 decimal places using standard financial round half up."""
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def is_essential_sector(category: str, subcategory: Optional[str] = None) -> bool:
    """Detects essential sectors based on demo policy specifications."""
    text = f"{category or ''} {subcategory or ''}".lower()
    keywords = [
        "essential", "petrol", "fuel", "gas station", "omc",
        "telecom", "mobile recharge", "recharge",
        "insurance", "life insurance", "general insurance",
        "railway", "railways", "irctc", "train",
        "utility", "utilities", "electricity", "water", "gas utility",
        "agri", "agriculture", "fertilizer", "seeds"
    ]
    return any(k in text for k in keywords)

def is_capital_markets(category: str, subcategory: Optional[str] = None) -> bool:
    """Detects capital markets based on demo policy specifications."""
    text = f"{category or ''} {subcategory or ''}".lower()
    keywords = [
        "capital market", "capital markets", "asset management", "amc",
        "mutual fund", "stockbroker", "stock broker", "brokerage",
        "securities", "securities dealer", "equity trading"
    ]
    return any(k in text for k in keywords)

def calculate_mdr(
    amount: float,
    merchant_category: Optional[str] = None,
    merchant_subcategory: Optional[str] = None,
    payment_type: str = "P2M",
    p2pm_eligible: bool = False,
    monthly_eligible_receipts: float = 0.0,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Central Database-Backed MDR Rules Engine.
    Uses exact decimal arithmetic. Never trusts frontend amounts.
    Implements configurable demo policy assumptions with verified rates:
    - Essential Sectors: <= ₹2,000 = 0% MDR; > ₹2,000 = Flat ₹5 MDR
    - Capital Markets: <= ₹2,000 = 0% MDR; > ₹2,000 = 0.02% MDR, Cap ₹300
    - P2PM Small Merchants (≤ ₹1 Lakh receipts): 0% MDR
    - P2P Transfers: 0% MDR, 0% GST (strictly exempt)
    - General Merchants: <= ₹2,000 = 0% MDR; > ₹2,000 = 0.40% MDR
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

    # Rule 2: Eligible Small Merchants - P2PM Exemption (Monthly receipts <= 1 Lakh)
    if p2pm_eligible and Decimal(str(monthly_eligible_receipts)) <= Decimal("100000.00"):
        return {
            "gross_amount": float(dec_amount),
            "mdr_rule": "Small Merchant P2PM Exemption (0% MDR)",
            "rule_id": "P2PM_SMALL_MERCHANT_EXEMPTION",
            "rule_version": 1,
            "business_category": merchant_category or "Small Merchant P2PM",
            "business_subcategory": merchant_subcategory,
            "calculation_type": "ZERO",
            "applied_rate": "0% (P2PM Concession)",
            "applied_cap": None,
            "mdr_rate": "0%",
            "mdr_amount": 0.0,
            "gst_rate": 0.0,
            "gst_amount": 0.0,
            "total_deductions": 0.0,
            "net_settlement": float(dec_amount),
            "tax_treatment": "EXEMPT",
            "is_pending_config": False,
            "explanation": f"Merchant qualifies under the applicable small-merchant P2PM category with monthly eligible receipts of ₹{monthly_eligible_receipts:,.2f} (≤ ₹1,00,000 threshold), receiving 0% MDR concession.",
            "is_simulated": True
        }

    # Rule 3: Database Rule Lookup if DB session is present
    if db:
        from models import MDRRule

        cat_clean = (merchant_category or "").strip()
        sub_clean = (merchant_subcategory or "").strip()

        active_rule = None
        # Step 1: Attempt to match exact category AND subcategory
        if sub_clean and sub_clean != "General":
            active_rule = db.query(MDRRule).filter(
                MDRRule.business_category.ilike(cat_clean),
                MDRRule.business_subcategory.ilike(sub_clean),
                MDRRule.status == "ACTIVE"
            ).order_by(MDRRule.version.desc()).first()

        # Step 2: Fallback to category level rule
        if not active_rule:
            active_rule = db.query(MDRRule).filter(
                MDRRule.business_category.ilike(cat_clean),
                MDRRule.status.in_(["ACTIVE", "PENDING_CONFIG"])
            ).order_by(MDRRule.version.desc()).first()

        if active_rule:
            return execute_rule_calculation(dec_amount, active_rule)

    # Rule 4: Configurable Demo Policy Default Fallback
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

    # Case B: Zero MDR tier under minimum transaction threshold (e.g. <= ₹2,000 mandate)
    if min_amt is not None and amount <= min_amt:
        return {
            "gross_amount": float(amount),
            "mdr_rule": f"{rule.rule_id} — Zero MDR Tier (≤ ₹{int(min_amt):,})",
            "rule_id": rule.rule_id,
            "rule_version": rule.version,
            "business_category": rule.business_category,
            "business_subcategory": rule.business_subcategory,
            "calculation_type": "ZERO",
            "applied_rate": "0% (Threshold Concession)",
            "applied_cap": float(max_cap) if max_cap else None,
            "mdr_rate": "0%",
            "mdr_amount": 0.0,
            "gst_rate": 0.0,
            "gst_amount": 0.0,
            "total_deductions": 0.0,
            "net_settlement": float(amount),
            "tax_treatment": "EXEMPT",
            "is_pending_config": False,
            "explanation": f"Under configured demo rules, transactions up to ₹{int(min_amt):,} carry 0% MDR concession.",
            "is_simulated": True
        }

    # Case C: Fixed Fee MDR (e.g. Essential Sectors > ₹2,000 -> Flat ₹5.00)
    if calc_type == "FIXED":
        mdr_fee = quantize_curr(fixed_fee)
        applied_rate_str = f"Flat ₹{float(fixed_fee):.2f}"
    # Case D: Percentage or Capped (e.g. Capital Markets 0.02% capped at ₹300, General 0.40%)
    else:
        raw_mdr = quantize_curr(amount * (rate_pct / Decimal("100")))
        if max_cap is not None and max_cap > 0 and raw_mdr > max_cap:
            mdr_fee = quantize_curr(max_cap)
            applied_rate_str = f"{float(rate_pct):.2f}% (Capped at ₹{float(max_cap):.2f})"
        else:
            mdr_fee = raw_mdr
            applied_rate_str = f"{float(rate_pct):.2f}%"

    # GST Calculation: 18% of MDR fee (only if MDR > 0)
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
    """
    Default regulatory fallback using exact decimal arithmetic.
    Accurately mirrors official demo policy assumptions:
    1. Essential Sectors (Petrol & fuel, Telecom, Insurance, Railways, Utilities, Agri):
       - Up to ₹2,000: 0% MDR
       - Above ₹2,000: Flat ₹5 MDR per eligible transaction.
    2. Capital Markets (Asset management, Stockbrokers, Securities dealers):
       - Up to ₹2,000: 0% MDR
       - Above ₹2,000: 0.02% MDR, Max cap ₹300.
    3. General Merchants (Retail, Restaurants, Pharmacy, Clinic, Supermarkets, etc.):
       - Up to ₹2,000: 0% MDR
       - Above ₹2,000: 0.40% MDR.
    """
    cat_str = category or "General Retail & Services"
    sub_str = subcategory or "General"

    # 1. Essential Sectors
    if is_essential_sector(cat_str, sub_str):
        if amount <= Decimal("2000.00"):
            rule_name = "Essential Sector Tariff (≤ ₹2,000 0% MDR)"
            rule_id = "ESSENTIAL_SECTORS_ZERO"
            calc_type = "ZERO"
            mdr_amt = Decimal("0.00")
            rate_str = "0% (Exempt)"
            cap = None
            explanation = "Essential sector transaction up to ₹2,000 carries 0% MDR demo policy assumption."
        else:
            rule_name = "Essential Sector Tariff (Flat ₹5 Above ₹2,000)"
            rule_id = "ESSENTIAL_SECTORS_FLAT_5"
            calc_type = "FIXED"
            mdr_amt = Decimal("5.00")
            rate_str = "Flat ₹5.00"
            cap = 5.0
            gst_val = quantize_curr(mdr_amt * Decimal("0.18"))
            net_val = quantize_curr(amount - mdr_amt - gst_val)
            explanation = f"You received a payment of ₹{float(amount):,.2f}. Based on the configured essential sector demo rule, transactions above ₹2,000 have flat ₹5.00 MDR. Estimated GST is ₹{float(gst_val):.2f}. Your expected settlement is ₹{float(net_val):,.2f}."

    # 2. Capital Markets
    elif is_capital_markets(cat_str, sub_str):
        if amount <= Decimal("2000.00"):
            rule_name = "Capital Markets Tariff (≤ ₹2,000 0% MDR)"
            rule_id = "CAPITAL_MARKETS_ZERO"
            calc_type = "ZERO"
            mdr_amt = Decimal("0.00")
            rate_str = "0% (Exempt)"
            cap = None
            explanation = "Capital markets transaction up to ₹2,000 carries 0% MDR demo policy assumption."
        else:
            rule_name = "Capital Markets Tariff (0.02% Capped at ₹300)"
            rule_id = "CAPITAL_MARKETS_002_CAPPED_300"
            calc_type = "CAPPED"
            raw_mdr = quantize_curr(amount * Decimal("0.0002"))
            if raw_mdr > Decimal("300.00"):
                mdr_amt = Decimal("300.00")
                rate_str = "0.02% (Capped at ₹300.00)"
            else:
                mdr_amt = raw_mdr
                rate_str = "0.02%"
            cap = 300.0
            gst_val = quantize_curr(mdr_amt * Decimal("0.18"))
            net_val = quantize_curr(amount - mdr_amt - gst_val)
            explanation = f"You received a payment of ₹{float(amount):,.2f}. Based on the configured capital markets demo rule, the MDR is 0.02% (capped at ₹300), which equals ₹{float(mdr_amt):.2f}. Estimated GST is ₹{float(gst_val):.2f}. Your expected settlement is ₹{float(net_val):,.2f}."

    # 3. General Merchants (Retail, Restaurants, Pharmacy, Clinic, etc.)
    else:
        if amount <= Decimal("2000.00"):
            rule_name = "General Merchant Concession (≤ ₹2,000 0% MDR)"
            rule_id = "GENERAL_MERCHANT_ZERO"
            calc_type = "ZERO"
            mdr_amt = Decimal("0.00")
            rate_str = "0% (Exempt)"
            cap = None
            explanation = f"You received a payment of ₹{float(amount):,.2f}. Under the general merchant demo rule, transactions up to ₹2,000 carry 0% MDR concession. Estimated GST is ₹0.00. Expected settlement: ₹{float(amount):,.2f}."
        else:
            rule_name = "General Merchant Tariff (0.40%)"
            rule_id = "GENERAL_MERCHANT_40"
            calc_type = "PERCENTAGE"
            mdr_amt = quantize_curr(amount * Decimal("0.004"))
            rate_str = "0.40%"
            cap = None
            gst_val = quantize_curr(mdr_amt * Decimal("0.18"))
            net_val = quantize_curr(amount - mdr_amt - gst_val)
            explanation = f"You received a payment of ₹{float(amount):,.2f}. Based on the configured general merchant demo rule, the MDR is 0.4%, which equals ₹{float(mdr_amt):.2f}. Estimated GST is ₹{float(gst_val):.2f}. Your expected settlement is ₹{float(net_val):,.2f}."

    # GST Calculation
    if mdr_amt > Decimal("0.00"):
        gst_amt = quantize_curr(mdr_amt * Decimal("0.18"))
        gst_rate = 0.18
        tax_treatment = "TAXABLE_18"
    else:
        gst_amt = Decimal("0.00")
        gst_rate = 0.0
        tax_treatment = "EXEMPT"

    total_ded = quantize_curr(mdr_amt + gst_amt)
    net_settlement = quantize_curr(amount - total_ded)

    return {
        "gross_amount": float(amount),
        "mdr_rule": rule_name,
        "rule_id": rule_id,
        "rule_version": 1,
        "business_category": cat_str,
        "business_subcategory": sub_str,
        "calculation_type": calc_type,
        "applied_rate": rate_str,
        "applied_cap": cap,
        "mdr_rate": rate_str,
        "mdr_amount": float(mdr_amt),
        "gst_rate": gst_rate,
        "gst_amount": float(gst_amt),
        "total_deductions": float(total_ded),
        "net_settlement": float(net_settlement),
        "tax_treatment": tax_treatment,
        "is_pending_config": False,
        "explanation": explanation,
        "is_simulated": True
    }
