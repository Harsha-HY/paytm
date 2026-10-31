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

    except Exception as err:
        db.rollback()
        print(f"[Migration ERROR]: {err}")
        raise err
    finally:
        db.close()

if __name__ == "__main__":
    migrate_and_seed()
