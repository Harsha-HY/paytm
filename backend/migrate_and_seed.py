import os
from datetime import datetime
from sqlalchemy import text
from database import engine, SessionLocal, Base
import models
from models import BusinessCategory, BusinessSubcategory, MDRRule, AdminAuditLog

def migrate_and_seed():
    print("[Migration] Checking and applying database schema updates...")

    # 1. Add any missing columns to existing tables safely
    with engine.connect() as conn:
        columns_to_add = [
            ("merchant_profiles", "business_subcategory", "VARCHAR(100) DEFAULT 'General'"),
            ("merchant_profiles", "assigned_qr_id", "VARCHAR(100)"),
            ("merchant_profiles", "qr_status", "VARCHAR(30) DEFAULT 'ACTIVE'"),
            ("user_qrs", "qr_status", "VARCHAR(30) DEFAULT 'ACTIVE'"),
            ("user_qrs", "assignment_history", "TEXT"),
            ("user_qrs", "last_generated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("transaction_settlements", "rule_id", "VARCHAR(80)"),
            ("transaction_settlements", "rule_version", "INTEGER DEFAULT 1"),
            ("transaction_settlements", "business_category", "VARCHAR(100)"),
            ("transaction_settlements", "business_subcategory", "VARCHAR(100)"),
            ("transaction_settlements", "calculation_type", "VARCHAR(40)"),
            ("transaction_settlements", "applied_rate", "VARCHAR(50)"),
            ("transaction_settlements", "applied_cap", "FLOAT"),
        ]

        for table, col, col_type in columns_to_add:
            try:
                # PostgreSQL support ADD COLUMN IF NOT EXISTS
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type};"))
                conn.commit()
            except Exception as e:
                # SQLite fallback
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};"))
                    conn.commit()
                except Exception:
                    pass

    # 2. Create all tables that don't exist yet
    Base.metadata.create_all(bind=engine)
    print("[Migration] Database tables created/verified successfully!")

    # 3. Seed required Categories & Subcategories
    db = SessionLocal()
    try:
        categories_data = [
            {
                "name": "Consumer Electronics & Mobile",
                "code": "ELECTRONICS",
                "desc": "Smartphones, laptops, home appliances and gadgets",
                "subs": [
                    ("Mobile Phones & Accessories", "MOBILE_PHONES", "Smartphones and related accessories"),
                    ("Consumer Electronics & Appliances", "HOME_APPLIANCES", "TVs, ACs, refrigerators and home appliances"),
                    ("Computer & Laptop Hardware", "COMPUTERS", "Laptops, desktops and IT peripherals")
                ]
            },
            {
                "name": "Grocery & Kirana (Small Retail)",
                "code": "GROCERY",
                "desc": "Neighborhood retail stores, provisions and daily essentials",
                "subs": [
                    ("Kirana & Provision Stores", "KIRANA_STORES", "Small neighborhood grocery shops"),
                    ("Supermarkets & Hypermarkets", "SUPERMARKETS", "Large format retail grocery"),
                    ("Dairy & Fresh Produce", "DAIRY_PRODUCE", "Milk booths, vegetables and fruits")
                ]
            },
            {
                "name": "Restaurants & Food Outlets",
                "code": "RESTAURANTS",
                "desc": "Dining outlets, cafes, food stalls and quick service eateries",
                "subs": [
                    ("Quick Service Restaurants (QSR)", "QSR", "Fast food and quick takeaway outlets"),
                    ("Fine Dining & Cafes", "FINE_DINING", "Dine-in restaurants and coffee shops"),
                    ("Bakeries & Sweet Shops", "BAKERIES", "Bakeries, confectioneries and sweet vendors")
                ]
            },
            {
                "name": "Healthcare & Pharmacy",
                "code": "HEALTHCARE",
                "desc": "Medical shops, diagnostic centers, clinics and hospitals",
                "subs": [
                    ("Pharmacies & Chemists", "PHARMACY", "Retail medical stores and dispensaries"),
                    ("Clinics & Diagnostic Labs", "CLINICS", "Doctor clinics and pathology testing labs"),
                    ("Hospitals & Care Centers", "HOSPITALS", "Multi-specialty healthcare institutions")
                ]
            },
            {
                "name": "Essential Services",
                "code": "ESSENTIALS",
                "desc": "Government identified essential public utilities and services",
                "subs": [
                    ("Petrol Bunk / Fuel Station", "PETROL_PUMP", "Automotive fuel and charging dispensaries"),
                    ("Telecom / Mobile Recharge", "TELECOM", "Prepaid/postpaid phone recharging services"),
                    ("Broadband / Internet Services", "BROADBAND", "Fixed-line internet and broadband providers"),
                    ("Other Essential Services", "OTHER_ESSENTIALS", "Water, electricity, and municipal utilities")
                ]
            },
            {
                "name": "Apparel & Footwear",
                "code": "APPAREL",
                "desc": "Clothing, fashion merchandise, footwear and lifestyle goods",
                "subs": [
                    ("Clothing & Fashion Stores", "CLOTHING", "Apparel, ethnic wear and garments"),
                    ("Footwear & Leather Goods", "FOOTWEAR", "Shoes, sandals and accessories")
                ]
            },
            {
                "name": "General Retail & Services",
                "code": "GENERAL_RETAIL",
                "desc": "Stationery, home decor, hardware and diverse general commerce",
                "subs": [
                    ("Stationery & Bookstores", "STATIONERY", "School/office stationery and books"),
                    ("Home Decor & Hardware", "HARDWARE", "Sanitaryware, paints, tools and electricals"),
                    ("Other Commercial Services", "OTHER_SERVICES", "Salons, repair centers and miscellaneous services")
                ]
            }
        ]

        for cat_info in categories_data:
            cat = db.query(BusinessCategory).filter(BusinessCategory.name == cat_info["name"]).first()
            if not cat:
                cat = BusinessCategory(
                    name=cat_info["name"],
                    code=cat_info["code"],
                    description=cat_info["desc"],
                    is_active=True
                )
                db.add(cat)
                db.flush()

            for sub_name, sub_code, sub_desc in cat_info["subs"]:
                sub = db.query(BusinessSubcategory).filter(
                    BusinessSubcategory.category_id == cat.id,
                    BusinessSubcategory.name == sub_name
                ).first()
                if not sub:
                    sub = BusinessSubcategory(
                        category_id=cat.id,
                        name=sub_name,
                        code=sub_code,
                        description=sub_desc,
                        is_active=True
                    )
                    db.add(sub)
        db.commit()
        print("[Migration] Categories & subcategories seeded successfully!")

        # 4. Seed Verified Initial MDR Rules
        # We strictly adhere to real regulatory guidelines:
        # - Small retail / payments <= 2000: 0% MDR
        # - Standard retail > 2000: 0.40% capped at 300, 18% GST
        # - Petrol Bunk: Flat Rs.5.00 above Rs.2000, 18% GST (or 0% under 2000)
        # - Telecom / Mobile recharge: 0.40% capped at Rs.15
        # - Broadband: 0.40% capped at Rs.50
        # - General Retail: PENDING_CONFIG (Verification pending)
        initial_rules = [
            # Consumer Electronics & Mobile
            {
                "rule_id": "MDR_RULE_ELECTRONICS_V1",
                "version": 1,
                "category": "Consumer Electronics & Mobile",
                "subcategory": None, # Applies to all subcategories unless overridden
                "payment_type": "P2M",
                "calculation_type": "CAPPED", # 0% <= 2000, 0.40% > 2000 capped at 300
                "rate": 0.40,
                "fixed": 0.0,
                "min_amount": 2000.0,
                "max_cap": 300.0,
                "gst_rate": 0.18,
                "tax_treatment": "TAXABLE_18",
                "conditions": "0% MDR for <= Rs.2000. 0.40% above Rs.2000, capped at Rs.300. 18% GST applicable on MDR fee.",
                "status": "ACTIVE"
            },
            # Grocery & Kirana
            {
                "rule_id": "MDR_RULE_GROCERY_V1",
                "version": 1,
                "category": "Grocery & Kirana (Small Retail)",
                "subcategory": None,
                "payment_type": "P2M",
                "calculation_type": "CAPPED",
                "rate": 0.40,
                "fixed": 0.0,
                "min_amount": 2000.0,
                "max_cap": 300.0,
                "gst_rate": 0.18,
                "tax_treatment": "TAXABLE_18",
                "conditions": "0% MDR for <= Rs.2000 (Small merchant exemption). 0.40% above Rs.2000 capped at Rs.300.",
                "status": "ACTIVE"
            },
            # Restaurants & Food Outlets
            {
                "rule_id": "MDR_RULE_RESTAURANTS_V1",
                "version": 1,
                "category": "Restaurants & Food Outlets",
                "subcategory": None,
                "payment_type": "P2M",
                "calculation_type": "CAPPED",
                "rate": 0.40,
                "fixed": 0.0,
                "min_amount": 2000.0,
                "max_cap": 300.0,
                "gst_rate": 0.18,
                "tax_treatment": "TAXABLE_18",
                "conditions": "Standard F&B schedule: 0% <= Rs.2000, 0.40% above Rs.2000 capped at Rs.300.",
                "status": "ACTIVE"
            },
            # Healthcare & Pharmacy
            {
                "rule_id": "MDR_RULE_HEALTHCARE_V1",
                "version": 1,
                "category": "Healthcare & Pharmacy",
                "subcategory": None,
                "payment_type": "P2M",
                "calculation_type": "CAPPED",
                "rate": 0.40,
                "fixed": 0.0,
                "min_amount": 2000.0,
                "max_cap": 200.0,
                "gst_rate": 0.18,
                "tax_treatment": "TAXABLE_18",
                "conditions": "Healthcare priority cap: 0% <= Rs.2000, 0.40% above Rs.2000 capped at Rs.200.",
                "status": "ACTIVE"
            },
            # Essential Services - Petrol Bunk (Subcategory specific)
            {
                "rule_id": "MDR_RULE_PETROL_V1",
                "version": 1,
                "category": "Essential Services",
                "subcategory": "Petrol Bunk / Fuel Station",
                "payment_type": "P2M",
                "calculation_type": "FIXED",
                "rate": 0.0,
                "fixed": 5.0, # Flat Rs. 5.00
                "min_amount": 2000.0,
                "max_cap": 5.0,
                "gst_rate": 0.18,
                "tax_treatment": "TAXABLE_18",
                "conditions": "Fuel Surcharge Agreement: 0% <= Rs.2000. Flat Rs.5.00 for transactions > Rs.2000 + 18% GST.",
                "status": "ACTIVE"
            },
            # Essential Services - Telecom
            {
                "rule_id": "MDR_RULE_TELECOM_V1",
                "version": 1,
                "category": "Essential Services",
                "subcategory": "Telecom / Mobile Recharge",
                "payment_type": "P2M",
                "calculation_type": "CAPPED",
                "rate": 0.40,
                "fixed": 0.0,
                "min_amount": 2000.0,
                "max_cap": 15.0,
                "gst_rate": 0.18,
                "tax_treatment": "TAXABLE_18",
                "conditions": "Telecom utility cap: 0% <= Rs.2000, 0.40% above Rs.2000 capped at Rs.15.",
                "status": "ACTIVE"
            },
            # Essential Services - Broadband
            {
                "rule_id": "MDR_RULE_BROADBAND_V1",
                "version": 1,
                "category": "Essential Services",
                "subcategory": "Broadband / Internet Services",
                "payment_type": "P2M",
                "calculation_type": "CAPPED",
                "rate": 0.40,
                "fixed": 0.0,
                "min_amount": 2000.0,
                "max_cap": 50.0,
                "gst_rate": 0.18,
                "tax_treatment": "TAXABLE_18",
                "conditions": "Broadband utility cap: 0% <= Rs.2000, 0.40% above Rs.2000 capped at Rs.50.",
                "status": "ACTIVE"
            },
            # Essential Services - Generic
            {
                "rule_id": "MDR_RULE_ESSENTIALS_GEN_V1",
                "version": 1,
                "category": "Essential Services",
                "subcategory": "Other Essential Services",
                "payment_type": "P2M",
                "calculation_type": "CAPPED",
                "rate": 0.40,
                "fixed": 0.0,
                "min_amount": 2000.0,
                "max_cap": 200.0,
                "gst_rate": 0.18,
                "tax_treatment": "TAXABLE_18",
                "conditions": "Public utility cap: 0% <= Rs.2000, 0.40% above Rs.2000 capped at Rs.200.",
                "status": "ACTIVE"
            },
            # Apparel & Footwear
            {
                "rule_id": "MDR_RULE_APPAREL_V1",
                "version": 1,
                "category": "Apparel & Footwear",
                "subcategory": None,
                "payment_type": "P2M",
                "calculation_type": "CAPPED",
                "rate": 0.40,
                "fixed": 0.0,
                "min_amount": 2000.0,
                "max_cap": 300.0,
                "gst_rate": 0.18,
                "tax_treatment": "TAXABLE_18",
                "conditions": "Lifestyle retail: 0% <= Rs.2000, 0.40% above Rs.2000 capped at Rs.300.",
                "status": "ACTIVE"
            },
            # General Retail & Services - Set as PENDING_CONFIG as required by rate requirement
            {
                "rule_id": "MDR_RULE_GENERAL_V1",
                "version": 1,
                "category": "General Retail & Services",
                "subcategory": None,
                "payment_type": "P2M",
                "calculation_type": "PENDING_CONFIG",
                "rate": 0.0,
                "fixed": 0.0,
                "min_amount": 0.0,
                "max_cap": 0.0,
                "gst_rate": 0.0,
                "tax_treatment": "NON_TAXABLE",
                "conditions": "Rate pending independent regulatory verification. Safe policy: 0% deductions applied until Admin configuration.",
                "status": "PENDING_CONFIG"
            }
        ]

        for r_info in initial_rules:
            existing = db.query(MDRRule).filter(
                MDRRule.rule_id == r_info["rule_id"],
                MDRRule.version == r_info["version"]
            ).first()
            if not existing:
                rule = MDRRule(
                    rule_id=r_info["rule_id"],
                    version=r_info["version"],
                    business_category=r_info["category"],
                    business_subcategory=r_info["subcategory"],
                    payment_type=r_info["payment_type"],
                    calculation_type=r_info["calculation_type"],
                    rate_percentage=r_info["rate"],
                    fixed_fee=r_info["fixed"],
                    min_amount=r_info["min_amount"],
                    max_cap=r_info["max_cap"],
                    gst_rate=r_info["gst_rate"],
                    tax_treatment=r_info["tax_treatment"],
                    eligibility_conditions=r_info["conditions"],
                    status=r_info["status"],
                    created_by="SYSTEM_REGULATORY"
                )
                db.add(rule)

        db.commit()
        print("[Migration] Verified Initial MDR Rules populated successfully!")

        # Seed full ecosystem: Admin, Merchants, Customer, and Transactions
        seed_demo_accounts_and_txns(db)

    except Exception as err:
        db.rollback()
        print(f"[Migration ERROR]: {err}")
        raise err
    finally:
        db.close()

def seed_demo_accounts_and_txns(db):
    from auth import hash_password
    import uuid
    import json
    from datetime import timedelta
    from models import (
        User, AdminProfile, MerchantProfile, PersonalProfile,
        Wallet, UserQR, Transaction, TransactionSettlement
    )

    # 1. Ensure Admin exists
    admin = db.query(User).filter(User.role == "admin").first()
    if not admin:
        admin = User(
            email="admin@gmail.com",
            hashed_password=hash_password("12345678"),
            role="admin",
            account_type="admin",
            full_name="MDR System Admin",
            phone="9876543210",
            is_active=True
        )
        db.add(admin)
        db.flush()
        db.add(AdminProfile(user_id=admin.id, department="Regulatory Compliance"))
        db.add(Wallet(user_id=admin.id, balance=100000.0, currency="INR"))
        admin_qr = f"MDR-PAY-{admin.id}-ADMIN"
        db.add(UserQR(
            user_id=admin.id,
            qr_code=admin_qr,
            qr_payload=json.dumps({"app": "MDR_SETTLEMENT_GUARDIAN", "qr_code": admin_qr, "user_id": admin.id, "account_type": "admin", "v": 1}),
            is_active=True,
            qr_status="ACTIVE"
        ))
        db.commit()

    # 2. Ensure Kirana Merchant exists
    m1 = db.query(User).filter(User.email == "kirana.merchant@gmail.com").first()
    if not m1:
        m1 = User(
            email="kirana.merchant@gmail.com",
            hashed_password=hash_password("12345678"),
            role="merchant",
            account_type="merchant",
            full_name="Ramesh Gupta",
            phone="9845012345",
            is_active=True
        )
        db.add(m1)
        db.flush()
        m1_qr = f"MDR-PAY-{m1.id}-KIRANA"
        db.add(MerchantProfile(
            user_id=m1.id,
            business_name="Gupta Provisions & Supermarket",
            business_category="Grocery & Kirana (Small Retail)",
            business_subcategory="Supermarket",
            business_address="Shop 4, Market Road",
            city="Bengaluru",
            state="Karnataka",
            contact_number="9845012345",
            verification_status="Verified",
            monthly_volume_band="₹1 Lakh - ₹5 Lakh",
            assigned_qr_id=m1_qr,
            qr_status="ACTIVE"
        ))
        db.add(Wallet(user_id=m1.id, balance=124500.0, currency="INR"))
        db.add(UserQR(
            user_id=m1.id,
            qr_code=m1_qr,
            qr_payload=json.dumps({"app": "MDR_SETTLEMENT_GUARDIAN", "qr_code": m1_qr, "user_id": m1.id, "account_type": "merchant", "v": 1}),
            is_active=True,
            qr_status="ACTIVE"
        ))
        db.commit()

    # 3. Ensure Restaurant Merchant exists
    m2 = db.query(User).filter(User.email == "swadisht.foods@gmail.com").first()
    if not m2:
        m2 = User(
            email="swadisht.foods@gmail.com",
            hashed_password=hash_password("12345678"),
            role="merchant",
            account_type="merchant",
            full_name="Pooja Hegde",
            phone="9845098765",
            is_active=True
        )
        db.add(m2)
        db.flush()
        m2_qr = f"MDR-PAY-{m2.id}-FOODS"
        db.add(MerchantProfile(
            user_id=m2.id,
            business_name="Swadisht Tiffin & Sweets",
            business_category="Restaurants & Food Outlets",
            business_subcategory="Fine Dining",
            business_address="12 Indiranagar 100ft Rd",
            city="Bengaluru",
            state="Karnataka",
            contact_number="9845098765",
            verification_status="Verified",
            monthly_volume_band="₹5 Lakh - ₹15 Lakh",
            assigned_qr_id=m2_qr,
            qr_status="ACTIVE"
        ))
        db.add(Wallet(user_id=m2.id, balance=78200.0, currency="INR"))
        db.add(UserQR(
            user_id=m2.id,
            qr_code=m2_qr,
            qr_payload=json.dumps({"app": "MDR_SETTLEMENT_GUARDIAN", "qr_code": m2_qr, "user_id": m2.id, "account_type": "merchant", "v": 1}),
            is_active=True,
            qr_status="ACTIVE"
        ))
        db.commit()

    # 4. Ensure Personal Customer exists
    cust = db.query(User).filter(User.email == "customer@gmail.com").first()
    if not cust:
        cust = User(
            email="customer@gmail.com",
            hashed_password=hash_password("12345678"),
            role="personal",
            account_type="personal",
            full_name="Rahul Sharma",
            phone="9822334455",
            is_active=True
        )
        db.add(cust)
        db.flush()
        cust_qr = f"MDR-PAY-{cust.id}-USER"
        db.add(PersonalProfile(
            user_id=cust.id,
            preferred_language="Kannada"
        ))
        db.add(Wallet(user_id=cust.id, balance=48500.0, currency="INR"))
        db.add(UserQR(
            user_id=cust.id,
            qr_code=cust_qr,
            qr_payload=json.dumps({"app": "MDR_SETTLEMENT_GUARDIAN", "qr_code": cust_qr, "user_id": cust.id, "account_type": "personal", "v": 1}),
            is_active=True,
            qr_status="ACTIVE"
        ))
        db.commit()

    # 5. Seed live demo transactions if fewer than 4 transactions exist
    if db.query(Transaction).count() < 4:
        now = datetime.utcnow()
        demo_txns = [
            # Txn 1: <= 2000 Kirana (Exempt 0% MDR)
            {
                "txn_id": "TXN_20261031_001KIR",
                "sender_id": cust.id,
                "receiver_id": m1.id,
                "amount": 1450.0,
                "txn_type": "P2M",
                "note": "Morning Groceries & Milk",
                "created_at": now - timedelta(hours=3, minutes=15),
                "settlement": {
                    "gross_amount": 1450.0,
                    "mdr_rate_applied": 0.0,
                    "mdr_amount": 0.0,
                    "gst_rate_applied": 0.18,
                    "gst_amount": 0.0,
                    "total_deductions": 0.0,
                    "net_settlement_amount": 1450.0,
                    "savings_compared_to_standard": 10.27,
                    "exemption_applied": True,
                    "exemption_reason": "Small Merchant P2M Exemption (<= ₹2,000 threshold)",
                    "settlement_status": "PROCESSED",
                    "rule_id": "MDR_RULE_GROCERY_V1",
                    "business_category": "Grocery & Kirana (Small Retail)",
                    "calculation_type": "CAPPED",
                    "applied_rate": "0.40%"
                }
            },
            # Txn 2: > 2000 Kirana (0.40% MDR + 18% GST)
            {
                "txn_id": "TXN_20261031_002KIR",
                "sender_id": cust.id,
                "receiver_id": m1.id,
                "amount": 3500.0,
                "txn_type": "P2M",
                "note": "Monthly Rice & Oil Provisions",
                "created_at": now - timedelta(hours=2, minutes=20),
                "settlement": {
                    "gross_amount": 3500.0,
                    "mdr_rate_applied": 0.40,
                    "mdr_amount": 14.00,
                    "gst_rate_applied": 0.18,
                    "gst_amount": 2.52,
                    "total_deductions": 16.52,
                    "net_settlement_amount": 3483.48,
                    "savings_compared_to_standard": 24.78,
                    "exemption_applied": False,
                    "exemption_reason": "Above ₹2,000 threshold",
                    "settlement_status": "PROCESSED",
                    "rule_id": "MDR_RULE_GROCERY_V1",
                    "business_category": "Grocery & Kirana (Small Retail)",
                    "calculation_type": "CAPPED",
                    "applied_rate": "0.40%"
                }
            },
            # Txn 3: Restaurant (> 2000)
            {
                "txn_id": "TXN_20261031_003REST",
                "sender_id": cust.id,
                "receiver_id": m2.id,
                "amount": 4800.0,
                "txn_type": "P2M",
                "note": "Family Lunch & Catering",
                "created_at": now - timedelta(hours=1, minutes=45),
                "settlement": {
                    "gross_amount": 4800.0,
                    "mdr_rate_applied": 0.40,
                    "mdr_amount": 19.20,
                    "gst_rate_applied": 0.18,
                    "gst_amount": 3.46,
                    "total_deductions": 22.66,
                    "net_settlement_amount": 4777.34,
                    "savings_compared_to_standard": 33.98,
                    "exemption_applied": False,
                    "exemption_reason": "Standard Restaurant MDR Schedule",
                    "settlement_status": "PROCESSED",
                    "rule_id": "MDR_RULE_RESTAURANTS_V1",
                    "business_category": "Restaurants & Food Outlets",
                    "calculation_type": "CAPPED",
                    "applied_rate": "0.40%"
                }
            },
            # Txn 4: Merchant 1 paying Merchant 2 (Outgoing Merchant Payment!)
            {
                "txn_id": "TXN_20261031_004M2M",
                "sender_id": m1.id,
                "receiver_id": m2.id,
                "amount": 2200.0,
                "txn_type": "P2M",
                "note": "Sweet box gift order from Kirana store",
                "created_at": now - timedelta(minutes=50),
                "settlement": {
                    "gross_amount": 2200.0,
                    "mdr_rate_applied": 0.40,
                    "mdr_amount": 8.80,
                    "gst_rate_applied": 0.18,
                    "gst_amount": 1.58,
                    "total_deductions": 10.38,
                    "net_settlement_amount": 2189.62,
                    "savings_compared_to_standard": 15.58,
                    "exemption_applied": False,
                    "exemption_reason": "B2B Merchant Settlement",
                    "settlement_status": "PROCESSED",
                    "rule_id": "MDR_RULE_RESTAURANTS_V1",
                    "business_category": "Restaurants & Food Outlets",
                    "calculation_type": "CAPPED",
                    "applied_rate": "0.40%"
                }
            },
            # Txn 5: Large retail with cap applied
            {
                "txn_id": "TXN_20261031_005CAP",
                "sender_id": cust.id,
                "receiver_id": m1.id,
                "amount": 85000.0,
                "txn_type": "P2M",
                "note": "Wholesale Festival Bulk Supplies",
                "created_at": now - timedelta(minutes=25),
                "settlement": {
                    "gross_amount": 85000.0,
                    "mdr_rate_applied": 0.35,
                    "mdr_amount": 300.00,
                    "gst_rate_applied": 0.18,
                    "gst_amount": 54.00,
                    "total_deductions": 354.00,
                    "net_settlement_amount": 84646.00,
                    "savings_compared_to_standard": 649.00,
                    "exemption_applied": False,
                    "exemption_reason": "Capped at Regulatory ₹300 Max Fee",
                    "settlement_status": "PROCESSED",
                    "rule_id": "MDR_RULE_GROCERY_V1",
                    "business_category": "Grocery & Kirana (Small Retail)",
                    "calculation_type": "CAPPED",
                    "applied_rate": "0.40%",
                    "applied_cap": 300.0
                }
            }
        ]

        for t in demo_txns:
            s_data = t.pop("settlement")
            txn = Transaction(
                txn_id=t["txn_id"],
                sender_id=t["sender_id"],
                receiver_id=t["receiver_id"],
                amount=t["amount"],
                txn_type=t["txn_type"],
                status="SUCCESS",
                note=t["note"],
                created_at=t["created_at"]
            )
            db.add(txn)
            db.flush()

            settlement = TransactionSettlement(
                transaction_id=txn.id,
                **s_data
            )
            db.add(settlement)

        db.commit()
        print("[Migration] Seeded 5 realistic demo transactions with full MDR & GST deductions!")

if __name__ == "__main__":
    migrate_and_seed()
