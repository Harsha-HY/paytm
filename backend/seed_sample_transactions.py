import json
import uuid
from datetime import datetime, timedelta
from database import SessionLocal
from models import User, MerchantProfile, Wallet, UserQR, Transaction, TransactionSettlement
from auth import hash_password
from rules_engine import calculate_mdr

def seed_sample_merchants_and_transactions():
    db = SessionLocal()
    try:
        # Find or create a sender user (customer)
        customer = db.query(User).filter(User.email == "demo.customer@gmail.com").first()
        if not customer:
            customer = User(
                email="demo.customer@gmail.com",
                hashed_password=hash_password("12345678"),
                role="user",
                account_type="personal",
                full_name="Aarav Sharma (Customer)",
                phone="9876500001",
                is_active=True
            )
            db.add(customer)
            db.flush()
            db.add(Wallet(user_id=customer.id, balance=100000.0, currency="INR"))
            c_qr = f"MDR-PAY-{customer.id}-CUST"
            db.add(UserQR(
                user_id=customer.id,
                qr_code=c_qr,
                qr_payload=json.dumps({"app": "MDR_SETTLEMENT_GUARDIAN", "qr_code": c_qr, "user_id": customer.id, "account_type": "personal", "v": 1}),
                is_active=True
            ))
            db.commit()

        sample_configs = [
            {
                "email": "petrol.guardian@demo.com",
                "full_name": "Rajesh Kumar (Petrol Dealer)",
                "phone": "9845011001",
                "business_name": "Indian Oil Speedway Bunk",
                "category": "Essential Sectors",
                "subcategory": "Petrol Bunk / Fuel Station",
                "merchant_bank": "State Bank of India",
                "qr_provider": "Paytm for Business",
                "acquiring_bank": "Axis Bank Ltd",
                "monthly_eligible_receipts": 250000.0,
                "p2pm_eligible": False,
                "gst_invoice_supplier": "Acquiring Bank (Axis Bank Ltd) - GSTIN 27AAACA0000A1Z5",
                "applicable_mdr_rule": "ESSENTIAL_SECTORS_FLAT_5",
                "sample_amount": 3000.0,
                "sample_note": "Fuel Dispensing Payment (Demo Txn 1)"
            },
            {
                "email": "restaurant.guardian@demo.com",
                "full_name": "Suresh Shetty (Restaurant)",
                "phone": "9845011002",
                "business_name": "Swadisht Sagar Family Restaurant",
                "category": "General Merchant",
                "subcategory": "Restaurants & Dining",
                "merchant_bank": "HDFC Bank",
                "qr_provider": "Google Pay for Business",
                "acquiring_bank": "HDFC Bank Ltd",
                "monthly_eligible_receipts": 140000.0,
                "p2pm_eligible": False,
                "gst_invoice_supplier": "Acquiring Bank (HDFC Bank Ltd) - GSTIN 27AAACH1234A1Z1",
                "applicable_mdr_rule": "GENERAL_MERCHANT_ZERO",
                "sample_amount": 1500.0,
                "sample_note": "Family Lunch Bill (Demo Txn 2)"
            },
            {
                "email": "pharmacy.guardian@demo.com",
                "full_name": "Vikram Patel (Pharmacy)",
                "phone": "9845011003",
                "business_name": "Sanjeevani MedPlus Pharmacy",
                "category": "General Merchant",
                "subcategory": "Healthcare & Pharmacy",
                "merchant_bank": "ICICI Bank",
                "qr_provider": "PhonePe for Business",
                "acquiring_bank": "ICICI Bank Ltd",
                "monthly_eligible_receipts": 180000.0,
                "p2pm_eligible": False,
                "gst_invoice_supplier": "Acquiring Bank (ICICI Bank Ltd) - GSTIN 27AAACI5678A1Z9",
                "applicable_mdr_rule": "GENERAL_MERCHANT_40",
                "sample_amount": 2500.0,
                "sample_note": "Prescription Medicines (Demo Txn 3)"
            },
            {
                "email": "clinic.guardian@demo.com",
                "full_name": "Dr. Anita Rao (Clinic)",
                "phone": "9845011004",
                "business_name": "Arogya Dental & General Clinic",
                "category": "General Merchant",
                "subcategory": "Healthcare & Clinic",
                "merchant_bank": "Axis Bank",
                "qr_provider": "BharatPe",
                "acquiring_bank": "Axis Bank Ltd",
                "monthly_eligible_receipts": 75000.0,
                "p2pm_eligible": False,
                "gst_invoice_supplier": "Acquiring Bank (Axis Bank Ltd) - GSTIN 27AAACA0000A1Z5",
                "applicable_mdr_rule": "GENERAL_MERCHANT_ZERO",
                "sample_amount": 500.0,
                "sample_note": "Doctor Consultation (Demo Txn 4)"
            },
            {
                "email": "telecom.guardian@demo.com",
                "full_name": "Mohan Verma (Telecom)",
                "phone": "9845011005",
                "business_name": "Bharat Telecom & Digital Point",
                "category": "Essential Sectors",
                "subcategory": "Telecom / Mobile Recharge",
                "merchant_bank": "Kotak Mahindra Bank",
                "qr_provider": "Paytm for Business",
                "acquiring_bank": "Kotak Mahindra Bank Ltd",
                "monthly_eligible_receipts": 92000.0,
                "p2pm_eligible": True,
                "gst_invoice_supplier": "Acquiring Bank (Kotak Mahindra Bank Ltd) - GSTIN 27AAACK9876A1Z4",
                "applicable_mdr_rule": "ESSENTIAL_SECTORS_ZERO",
                "sample_amount": 400.0,
                "sample_note": "5G Mobile Recharge (Demo Txn 5)"
            }
        ]

        print("Seeding Part 4 Sample Transactions and Merchant Profiles...")

        for cfg in sample_configs:
            m_user = db.query(User).filter(User.email == cfg["email"]).first()
            if not m_user:
                m_user = User(
                    email=cfg["email"],
                    hashed_password=hash_password("12345678"),
                    role="merchant",
                    account_type="merchant",
                    full_name=cfg["full_name"],
                    phone=cfg["phone"],
                    is_active=True
                )
                db.add(m_user)
                db.flush()

            # Profile
            prof = db.query(MerchantProfile).filter(MerchantProfile.user_id == m_user.id).first()
            if not prof:
                prof = MerchantProfile(
                    user_id=m_user.id,
                    business_name=cfg["business_name"],
                    business_category=cfg["category"],
                    business_subcategory=cfg["subcategory"],
                    business_address="Commercial Arcade, Sector 4",
                    city="Bengaluru",
                    state="Karnataka",
                    contact_number=cfg["phone"],
                    verification_status="Verified",
                    monthly_volume_band="Under ₹1 Lakh" if cfg["p2pm_eligible"] else "₹1 Lakh - ₹5 Lakh",
                    merchant_bank=cfg["merchant_bank"],
                    qr_provider=cfg["qr_provider"],
                    acquiring_bank=cfg["acquiring_bank"],
                    monthly_eligible_receipts=cfg["monthly_eligible_receipts"],
                    p2pm_eligible=cfg["p2pm_eligible"],
                    gst_invoice_supplier=cfg["gst_invoice_supplier"],
                    applicable_mdr_rule=cfg["applicable_mdr_rule"],
                    rule_effective_date=datetime.utcnow() - timedelta(days=90),
                    qr_status="ACTIVE"
                )
                db.add(prof)
            else:
                prof.business_name = cfg["business_name"]
                prof.business_category = cfg["category"]
                prof.business_subcategory = cfg["subcategory"]
                prof.merchant_bank = cfg["merchant_bank"]
                prof.qr_provider = cfg["qr_provider"]
                prof.acquiring_bank = cfg["acquiring_bank"]
                prof.monthly_eligible_receipts = cfg["monthly_eligible_receipts"]
                prof.p2pm_eligible = cfg["p2pm_eligible"]
                prof.gst_invoice_supplier = cfg["gst_invoice_supplier"]
                prof.applicable_mdr_rule = cfg["applicable_mdr_rule"]

            db.flush()

            # QR
            qr = db.query(UserQR).filter(UserQR.user_id == m_user.id).first()
            if not qr:
                qr_code_str = f"MDR-PAY-{m_user.id}-{cfg['category'][:3].upper()}"
                qr = UserQR(
                    user_id=m_user.id,
                    qr_code=qr_code_str,
                    qr_payload=json.dumps({"app": "MDR_SETTLEMENT_GUARDIAN", "qr_code": qr_code_str, "user_id": m_user.id, "account_type": "merchant", "v": 1}),
                    is_active=True,
                    qr_status="ACTIVE"
                )
                db.add(qr)
                db.flush()
                prof.assigned_qr_id = qr_code_str

            # Wallet
            w = db.query(Wallet).filter(Wallet.user_id == m_user.id).first()
            if not w:
                w = Wallet(user_id=m_user.id, balance=50000.0, currency="INR")
                db.add(w)
                db.flush()

            # Seed Sample Transaction if not already seeded
            amt = cfg["sample_amount"]
            calc = calculate_mdr(
                amount=amt,
                merchant_category=cfg["category"],
                merchant_subcategory=cfg["subcategory"],
                payment_type="P2M",
                p2pm_eligible=cfg["p2pm_eligible"],
                monthly_eligible_receipts=cfg["monthly_eligible_receipts"],
                db=db
            )

            # Check if this exact sample transaction exists
            existing_txn = db.query(Transaction).filter(
                Transaction.receiver_id == m_user.id,
                Transaction.amount == amt,
                Transaction.note == cfg["sample_note"]
            ).first()

            if not existing_txn:
                txn_id_str = f"DEMO_TXN_{uuid.uuid4().hex[:8].upper()}"
                txn = Transaction(
                    txn_id=txn_id_str,
                    sender_id=customer.id,
                    receiver_id=m_user.id,
                    amount=amt,
                    txn_type="P2M",
                    status="SUCCESS",
                    note=cfg["sample_note"],
                    created_at=datetime.utcnow() - timedelta(hours=2)
                )
                db.add(txn)
                db.flush()

                settlement = TransactionSettlement(
                    transaction_id=txn.id,
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
                    tax_treatment=calc.get("tax_treatment", "TAXABLE_18"),
                    calculation_note=calc["explanation"],
                    created_at=datetime.utcnow() - timedelta(hours=2)
                )
                db.add(settlement)
                w.balance = round(w.balance + calc["net_settlement"], 2)
                print(f"Seeded Txn: {cfg['business_name']} | Amt: Rs.{amt} | MDR: Rs.{calc['mdr_amount']} | GST: Rs.{calc['gst_amount']} | Net: Rs.{calc['net_settlement']}")

        db.commit()
        print("Successfully seeded all 5 sample merchant profiles and transactions!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding sample transactions: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_sample_merchants_and_transactions()
