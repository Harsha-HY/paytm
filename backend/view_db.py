import sys
import json
from decimal import Decimal
from database import SessionLocal
from models import Transaction, TransactionSettlement, User, MerchantProfile, MDRRule, Wallet

def custom_serializer(obj):
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    return str(obj)

def view_database(mode="summary"):
    db = SessionLocal()
    try:
        if mode == "--json" or mode == "json":
            # Output full transactions and settlements as formatted JSON
            txns = db.query(Transaction).order_by(Transaction.created_at.desc()).limit(15).all()
            data = []
            for t in txns:
                s = t.settlement
                rec = {
                    "txn_id": t.txn_id,
                    "created_at": t.created_at,
                    "sender": t.sender.full_name if t.sender else "Unknown",
                    "receiver": t.receiver.full_name if t.receiver else "Unknown",
                    "shop_name": t.receiver.merchant_profile.business_name if t.receiver and t.receiver.merchant_profile else None,
                    "gross_amount": t.amount,
                    "status": t.status,
                    "note": t.note,
                    "settlement": {
                        "category": s.business_category if s else None,
                        "subcategory": s.business_subcategory if s else None,
                        "mdr_rule": s.mdr_rule if s else "Exempt",
                        "mdr_rate": s.mdr_rate if s else "0%",
                        "mdr_deducted": s.mdr_amount if s else 0.0,
                        "gst_deducted": s.gst_amount if s else 0.0,
                        "total_deductions": s.total_deductions if s else 0.0,
                        "net_settlement": s.net_settlement if s else t.amount
                    } if s else None
                }
                data.append(rec)
            print(json.dumps(data, indent=2, default=custom_serializer))
            return

        if mode == "--merchants" or mode == "merchants":
            merchants = db.query(MerchantProfile).all()
            print("=" * 110)
            print(f"{'Merchant ID':<12} | {'Shop Name':<30} | {'Category':<22} | {'P2PM Eligible':<14} | {'Bank':<18}")
            print("=" * 110)
            for m in merchants:
                p2pm_str = "YES (<=1L)" if m.p2pm_eligible else "Standard"
                print(f"MERCH_{m.user_id:<6} | {m.business_name[:28]:<30} | {m.business_category[:20]:<22} | {p2pm_str:<14} | {m.merchant_bank or 'SBI':<18}")
            print("=" * 110)
            return

        if mode == "--rules" or mode == "rules":
            rules = db.query(MDRRule).filter(MDRRule.status == "ACTIVE").all()
            print("=" * 110)
            print(f"{'Rule ID':<25} | {'Category':<25} | {'Type':<12} | {'Rate':<8} | {'Fee':<6} | {'Threshold':<10} | {'Cap'}")
            print("=" * 110)
            for r in rules:
                rate_str = f"{r.rate_percentage}%" if r.rate_percentage else "0%"
                fee_str = f"Rs.{r.fixed_fee}" if r.fixed_fee else "-"
                min_str = f"<=Rs.{int(r.min_amount)}" if r.min_amount else "-"
                cap_str = f"Rs.{r.max_cap}" if r.max_cap else "-"
                print(f"{r.rule_id[:24]:<25} | {r.business_category[:24]:<25} | {r.calculation_type:<12} | {rate_str:<8} | {fee_str:<6} | {min_str:<10} | {cap_str}")
            print("=" * 110)
            return

        # Default: Summary table of Recent Transactions & Settlements
        txns = db.query(Transaction).order_by(Transaction.created_at.desc()).limit(10).all()
        print("\n" + "=" * 115)
        print("                         MDR SETTLEMENT GUARDIAN - LIVE DATABASE TRANSACTIONS")
        print("=" * 115)
        print(f"{'Txn ID':<24} | {'Merchant / Shop':<28} | {'Gross':<10} | {'MDR':<8} | {'GST (18%)':<10} | {'Net Credit':<12} | {'Type'}")
        print("-" * 115)
        for t in txns:
            s = t.settlement
            shop = t.receiver.merchant_profile.business_name if t.receiver and t.receiver.merchant_profile else (t.receiver.full_name if t.receiver else "Personal")
            mdr_val = f"Rs.{s.mdr_amount:.2f}" if s else "Rs.0.00"
            gst_val = f"Rs.{s.gst_amount:.2f}" if s else "Rs.0.00"
            net_val = f"Rs.{s.net_settlement:.2f}" if s else f"Rs.{t.amount:.2f}"
            print(f"{t.txn_id:<24} | {shop[:26]:<28} | Rs.{t.amount:<7.2f} | {mdr_val:<8} | {gst_val:<10} | {net_val:<12} | {t.txn_type}")
        print("=" * 115)
        print(f"Total Transactions in DB: {db.query(Transaction).count()} | Total Merchants: {db.query(MerchantProfile).count()} | Active Rules: {db.query(MDRRule).count()}\n")

    finally:
        db.close()

if __name__ == "__main__":
    mode_arg = sys.argv[1] if len(sys.argv) > 1 else "summary"
    view_database(mode_arg)
