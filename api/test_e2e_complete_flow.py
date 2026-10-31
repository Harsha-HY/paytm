"""
Comprehensive End-to-End Verification Test Suite
MDR Settlement Guardian Central Rules Engine & Admin Management
"""
import requests
import json
import uuid
import time
import sys
from decimal import Decimal

# Ensure utf-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 80)
    print("MDR SETTLEMENT GUARDIAN — E2E VERIFICATION SUITE")
    print("=" * 80)

    # 1. Admin Login
    print("\n[STEP 1] Logging in as Permanent Admin...")
    admin_login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@gmail.com",
        "password": "12345678"
    })
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_token = admin_login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("✔ Admin login successful (admin@gmail.com)")

    # 2. Fetch categories
    print("\n[STEP 2] Fetching approved categories & subcategories...")
    cats_res = requests.get(f"{BASE_URL}/api/auth/categories")
    assert cats_res.status_code == 200, f"Fetch categories failed: {cats_res.text}"
    cats = cats_res.json()
    cat_names = [c["name"] for c in cats]
    print(f"✔ Found {len(cats)} categories: {cat_names}")

    # Ensure baseline V1 for Petrol Bunk is active (fixed ₹5.00) so test is idempotent
    requests.post(
        f"{BASE_URL}/api/admin/mdr-rules/publish",
        headers=admin_headers,
        json={
            "business_category": "Essential Services",
            "business_subcategory": "Petrol Bunk / Fuel Station",
            "calculation_type": "FIXED",
            "rate_percentage": 0.0,
            "fixed_fee": 5.0,
            "min_amount": 0.0,
            "max_cap": 5.0,
            "gst_rate": 18.0,
            "tax_treatment": "TAXABLE_18",
            "eligibility_conditions": "Baseline regulatory tariff flat ₹5.00",
            "change_summary": "Test suite baseline: Flat ₹5 fee"
        }
    )

    # 3. Register 5 diverse merchants
    print("\n[STEP 3] Registering 5 test merchants across different categories...")
    merchants_config = [
        {
            "name": "Speedway Fuels",
            "category": "Essential Services",
            "subcategory": "Petrol Bunk / Fuel Station",
            "city": "Mumbai"
        },
        {
            "name": "Apex Telecom Store",
            "category": "Essential Services",
            "subcategory": "Telecom / Mobile Recharge",
            "city": "Delhi"
        },
        {
            "name": "Gupta Kirana & Provisions",
            "category": "Grocery & Kirana (Small Retail)",
            "subcategory": "Kirana & Provision Stores",
            "city": "Bengaluru"
        },
        {
            "name": "Hot Wok Asian Diner",
            "category": "Restaurants & Food Outlets",
            "subcategory": "Quick Service Restaurants (QSR)",
            "city": "Pune"
        },
        {
            "name": "Croma Tech Hub",
            "category": "Consumer Electronics & Mobile",
            "subcategory": "Mobile Phones & Accessories",
            "city": "Hyderabad"
        },
        {
            "name": "Urban Decor Hardware",
            "category": "General Retail & Services",
            "subcategory": "Home Decor & Hardware",
            "city": "Chennai"
        }
    ]

    registered_merchants = {}
    uid = uuid.uuid4().hex[:6]

    for m in merchants_config:
        email = f"merchant_{m['subcategory'].replace(' ', '_').replace('/', '_')[:12].lower()}_{uid}@gmail.com"
        phone = f"98{str(int(time.time()*1000))[-8:]}"
        payload = {
            "full_name": f"{m['name']} Manager",
            "email": email,
            "phone": phone,
            "password": "Password123!",
            "confirm_password": "Password123!",
            "account_type": "merchant",
            "merchant_details": {
                "business_name": m["name"],
                "business_category": m["category"],
                "business_subcategory": m["subcategory"],
                "business_address": f"Plot 42, Commercial Hub, {m['city']}",
                "city": m["city"],
                "state": "Maharashtra",
                "contact_number": phone
            }
        }
        res = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert res.status_code == 201, f"Failed to register {m['name']}: {res.text}"
        data = res.json()
        m_user = data["user"]
        m_token = data["access_token"]
        # Fetch merchant QR
        qr_fetch = requests.get(f"{BASE_URL}/api/payments/my-qr", headers={"Authorization": f"Bearer {m_token}"})
        assert qr_fetch.status_code == 200, f"Fetch QR failed: {qr_fetch.text}"
        m_qr_code = qr_fetch.json()["qr_code"]
        registered_merchants[m["name"]] = {
            "user_id": m_user["id"],
            "token": m_token,
            "category": m["category"],
            "subcategory": m["subcategory"],
            "qr_code": m_qr_code
        }
        print(f"✔ Registered Merchant: {m['name']} ({m['subcategory']}) -> QR: {m_qr_code}")

    # 4. Instant Auto-Verification & QR Verification (No Admin Approval Required)
    print("\n[STEP 4] Verifying merchants are immediately AUTO-VERIFIED without admin approval...")
    for name, info in registered_merchants.items():
        user_chk = requests.get(f"{BASE_URL}/api/admin/users?q={name}", headers=admin_headers).json()
        assert len(user_chk) > 0
        m_prof = user_chk[0]["merchant_profile"]
        assert m_prof["verification_status"] == "Verified", f"Expected auto-verified, got {m_prof['verification_status']}"
        print(f"✔ Merchant {name} is immediately ACTIVE & AUTO-VERIFIED (Status: {m_prof['verification_status']})")

    # Verify QRs list in Admin
    qrs_res = requests.get(f"{BASE_URL}/api/admin/qrs", headers=admin_headers)
    assert qrs_res.status_code == 200
    all_qrs = qrs_res.json()
    print(f"✔ Admin retrieved {len(all_qrs)} active merchant QRs from database")

    # 5. Register Personal Customer
    print("\n[STEP 5] Registering personal customer...")
    customer_email = f"customer_{uid}@gmail.com"
    customer_phone = f"97{str(int(time.time()*1000))[-8:]}"
    cust_res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "full_name": "Arjun Sharma",
        "email": customer_email,
        "phone": customer_phone,
        "password": "Password123!",
        "confirm_password": "Password123!",
        "account_type": "personal"
    })
    assert cust_res.status_code == 201, f"Customer registration failed: {cust_res.text}"
    cust_token = cust_res.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print(f"✔ Personal customer registered: {customer_email}")

    # Topup customer balance
    topup_res = requests.post(
        f"{BASE_URL}/api/payments/wallet/topup",
        headers=cust_headers,
        json={"amount": 200000.0}
    )
    assert topup_res.status_code == 200
    print("✔ Customer wallet funded with ₹200,000 (Total Balance: ₹250,000)")

    # 6. Test Payment 1: Petrol Bunk (Essential Services)
    print("\n[STEP 6A] Testing Payment to Petrol Bunk (Speedway Fuels)...")
    petrol_qr = registered_merchants["Speedway Fuels"]["qr_code"]

    # Resolve QR
    resolve_res = requests.post(f"{BASE_URL}/api/payments/resolve-qr", headers=cust_headers, json={"qr_code": petrol_qr})
    assert resolve_res.status_code == 200, f"Resolve QR failed: {resolve_res.text}"
    resolve_data = resolve_res.json()
    assert resolve_data["business_category"] == "Essential Services"
    assert resolve_data["business_subcategory"] == "Petrol Bunk / Fuel Station"
    print(f"✔ QR Decoupled Resolution: Category={resolve_data['business_category']}, Subcategory={resolve_data['business_subcategory']}")

    # Simulate payment ₹2,500
    pay_res = requests.post(f"{BASE_URL}/api/payments/simulate", headers=cust_headers, json={
        "qr_code": petrol_qr,
        "amount": 2500.0,
        "note": "Fuel for Car"
    })
    assert pay_res.status_code in [200, 201], f"Payment failed: {pay_res.text}"
    txn_petrol_1 = pay_res.json()
    s_petrol_1 = txn_petrol_1["settlement"]
    print(f"✔ Petrol Payment Snapshot: Amount=₹{txn_petrol_1['amount']}")
    print(f"   MDR Type: {s_petrol_1['calculation_type']}, Applied MDR: ₹{s_petrol_1['mdr_amount']}, GST: ₹{s_petrol_1['gst_amount']}")
    print(f"   Net Settlement: ₹{s_petrol_1['net_settlement']}, Rule Version: {s_petrol_1['rule_version']}")

    # Petrol Bunk has FLAT ₹5.00 MDR + 18% GST (₹0.90) = ₹5.90 total deductions -> Net = 2500 - 5.90 = 2494.10
    assert abs(s_petrol_1["mdr_amount"] - 5.0) < 0.01, f"Expected MDR 5.0, got {s_petrol_1['mdr_amount']}"
    assert abs(s_petrol_1["gst_amount"] - 0.9) < 0.01, f"Expected GST 0.9, got {s_petrol_1['gst_amount']}"
    assert abs(s_petrol_1["net_settlement"] - 2494.10) < 0.01, f"Expected Net 2494.10, got {s_petrol_1['net_settlement']}"

    # 6B. Test Payment 2: Grocery Kirana (Zero MDR <= ₹2,000)
    print("\n[STEP 6B] Testing Payment to Grocery Kirana (Gupta Kirana)...")
    grocery_qr = registered_merchants["Gupta Kirana & Provisions"]["qr_code"]
    pay_grocery = requests.post(f"{BASE_URL}/api/payments/simulate", headers=cust_headers, json={
        "qr_code": grocery_qr,
        "amount": 1500.0,
        "note": "Weekly Groceries"
    })
    assert pay_grocery.status_code in [200, 201], f"Grocery payment failed: {pay_grocery.text}"
    txn_grocery = pay_grocery.json()
    s_grocery = txn_grocery["settlement"]
    print(f"✔ Grocery Payment Snapshot: Amount=₹{txn_grocery['amount']}")
    print(f"   MDR: ₹{s_grocery['mdr_amount']}, GST: ₹{s_grocery['gst_amount']}, Net: ₹{s_grocery['net_settlement']}")
    # Under ₹2,000 grocery has 0% MDR and ₹0 GST!
    assert s_grocery["mdr_amount"] == 0.0, f"Expected 0 MDR, got {s_grocery['mdr_amount']}"
    assert s_grocery["gst_amount"] == 0.0, f"Expected 0 GST, got {s_grocery['gst_amount']}"
    assert s_grocery["net_settlement"] == 1500.0, f"Expected full 1500.0 net settlement"

    # 6C. Test Payment 3: Electronics (Percentage with cap)
    print("\n[STEP 6C] Testing Payment to Electronics Store (Croma Tech Hub)...")
    elec_qr = registered_merchants["Croma Tech Hub"]["qr_code"]
    # Amount ₹100,000 -> 0.40% is ₹400, but capped at ₹300!
    pay_elec = requests.post(f"{BASE_URL}/api/payments/simulate", headers=cust_headers, json={
        "qr_code": elec_qr,
        "amount": 100000.0,
        "note": "Laptop purchase"
    })
    assert pay_elec.status_code in [200, 201], f"Elec payment failed: {pay_elec.text}"
    txn_elec = pay_elec.json()
    s_elec = txn_elec["settlement"]
    print(f"✔ Electronics Payment Snapshot: Amount=₹{txn_elec['amount']}")
    print(f"   MDR: ₹{s_elec['mdr_amount']} (Cap applied: {s_elec['applied_cap']}), GST: ₹{s_elec['gst_amount']}")
    assert abs(s_elec["mdr_amount"] - 300.0) < 0.01, f"Expected capped MDR ₹300, got {s_elec['mdr_amount']}"
    # GST on ₹300 is 18% = ₹54.00
    assert abs(s_elec["gst_amount"] - 54.0) < 0.01, f"Expected GST ₹54.0, got {s_elec['gst_amount']}"
    assert abs(s_elec["net_settlement"] - 99646.0) < 0.01, f"Expected Net ₹99646.0, got {s_elec['net_settlement']}"

    # 6D. Test Payment 4: General Retail (Pending Configuration)
    print("\n[STEP 6D] Testing Payment to General Retail (Urban Decor)...")
    general_qr = registered_merchants["Urban Decor Hardware"]["qr_code"]
    pay_gen = requests.post(f"{BASE_URL}/api/payments/simulate", headers=cust_headers, json={
        "qr_code": general_qr,
        "amount": 3000.0,
        "note": "Hardware tools"
    })
    assert pay_gen.status_code in [200, 201], f"General payment failed: {pay_gen.text}"
    txn_gen = pay_gen.json()
    s_gen = txn_gen["settlement"]
    print(f"✔ General Retail Payment Snapshot: Status={s_gen['calculation_type']}, MDR=₹{s_gen['mdr_amount']}")
    assert s_gen["calculation_type"] == "PENDING_CONFIG", f"Expected PENDING_CONFIG, got {s_gen['calculation_type']}"

    # 7. Admin updates Petrol Bunk rule to Version 2
    print("\n[STEP 7] Admin publishing NEW RULE VERSION for Petrol Bunk...")
    publish_res = requests.post(
        f"{BASE_URL}/api/admin/mdr-rules/publish",
        headers=admin_headers,
        json={
            "business_category": "Essential Services",
            "business_subcategory": "Petrol Bunk / Fuel Station",
            "calculation_type": "FIXED",
            "rate_percentage": 0.0,
            "fixed_fee": 10.0,  # Changed from flat ₹5 to flat ₹10
            "min_amount": 0.0,
            "max_cap": 10.0,
            "gst_rate": 18.0,
            "tax_treatment": "TAXABLE_18",
            "eligibility_conditions": "Revised regulatory tariff flat ₹10.00",
            "change_summary": "Tariff revision: Flat fee adjusted to ₹10"
        }
    )
    assert publish_res.status_code == 200, f"Publish rule failed: {publish_res.text}"
    new_rule = publish_res.json()
    print(f"✔ New Rule Published: Rule ID={new_rule['rule_id']}, Version={new_rule['version']}, Fixed Fee=₹{new_rule['fixed_fee']}")
    assert new_rule["version"] >= 2, f"Expected version >= 2, got {new_rule['version']}"

    # 8. Customer pays Petrol Bunk AGAIN using the EXACT SAME QR code
    print("\n[STEP 8] Customer pays Petrol Bunk again using the SAME QR code...")
    pay_petrol_2 = requests.post(f"{BASE_URL}/api/payments/simulate", headers=cust_headers, json={
        "qr_code": petrol_qr,
        "amount": 2500.0,
        "note": "Fuel after tariff change"
    })
    assert pay_petrol_2.status_code in [200, 201], f"Petrol 2 payment failed: {pay_petrol_2.text}"
    txn_petrol_2 = pay_petrol_2.json()
    s_petrol_2 = txn_petrol_2["settlement"]
    print(f"✔ Petrol Payment (New Rule): Amount=₹{txn_petrol_2['amount']}")
    print(f"   MDR: ₹{s_petrol_2['mdr_amount']}, GST: ₹{s_petrol_2['gst_amount']}, Net: ₹{s_petrol_2['net_settlement']}")
    print(f"   Applied Rule Version: {s_petrol_2['rule_version']}, Rule ID: {s_petrol_2['rule_id']}")
    # Under V2: Flat ₹10 MDR + ₹1.80 GST = ₹11.80 deduction -> Net = ₹2488.20
    assert abs(s_petrol_2["mdr_amount"] - 10.0) < 0.01, f"Expected V2 MDR ₹10.0, got {s_petrol_2['mdr_amount']}"
    assert abs(s_petrol_2["gst_amount"] - 1.8) < 0.01, f"Expected V2 GST ₹1.8, got {s_petrol_2['gst_amount']}"
    assert abs(s_petrol_2["net_settlement"] - 2488.20) < 0.01, f"Expected V2 Net ₹2488.20, got {s_petrol_2['net_settlement']}"
    assert s_petrol_2["rule_version"] == new_rule["version"]

    # 9. Verify Grocery Merchant is completely unaffected
    print("\n[STEP 9] Verifying Grocery Merchant remains unaffected...")
    pay_grocery_2 = requests.post(f"{BASE_URL}/api/payments/simulate", headers=cust_headers, json={
        "qr_code": grocery_qr,
        "amount": 1200.0,
        "note": "Grocery check after petrol rule update"
    })
    assert pay_grocery_2.status_code in [200, 201], f"Grocery 2 failed: {pay_grocery_2.text}"
    s_grocery_2 = pay_grocery_2.json()["settlement"]
    assert s_grocery_2["mdr_amount"] == 0.0
    print("✔ Grocery merchant remains 0% MDR, completely unaffected by Petrol rule update")

    # 10. Verify Historical Immutability
    print("\n[STEP 10] Checking Historical Immutability of First Petrol Transaction...")
    # Fetch original transaction receipt
    history_res = requests.get(f"{BASE_URL}/api/payments/transactions", headers=cust_headers)
    assert history_res.status_code == 200
    txns = history_res.json()
    first_petrol = [t for t in txns if t["id"] == txn_petrol_1["id"]][0]
    s_first = first_petrol["settlement"]
    print(f"✔ Original Transaction {first_petrol['txn_id']} snapshot:")
    print(f"   MDR: ₹{s_first['mdr_amount']} (Original V1), Net: ₹{s_first['net_settlement']}")
    assert abs(s_first["mdr_amount"] - 5.0) < 0.01, "IMMUTABILITY VIOLATION: First txn MDR changed!"
    assert abs(s_first["net_settlement"] - 2494.10) < 0.01, "IMMUTABILITY VIOLATION: First txn Net changed!"

    # 11. Edge Case: Inactive QR rejection
    print("\n[STEP 11] Testing Inactive QR Payment Rejection...")
    # Deactivate Grocery QR in Admin
    qrs_list = requests.get(f"{BASE_URL}/api/admin/qrs", headers=admin_headers).json()
    grocery_qr_item = [q for q in qrs_list if q["qr_code"] == grocery_qr][0]
    qr_record_id = grocery_qr_item["id"]

    deactivate_res = requests.patch(
        f"{BASE_URL}/api/admin/qrs/{qr_record_id}/status?status=INACTIVE",
        headers=admin_headers
    )
    assert deactivate_res.status_code == 200
    print(f"✔ Deactivated Grocery QR in Admin")

    # Attempt payment to deactivated QR
    fail_pay = requests.post(f"{BASE_URL}/api/payments/simulate", headers=cust_headers, json={
        "qr_code": grocery_qr,
        "amount": 500.0,
        "note": "Should fail on inactive QR"
    })
    assert fail_pay.status_code == 400, f"Expected 400 Bad Request, got {fail_pay.status_code}"
    print(f"✔ Inactive QR rejected payment cleanly: {fail_pay.json()['detail']}")

    # Re-activate QR
    requests.patch(
        f"{BASE_URL}/api/admin/qrs/{qr_record_id}/status?status=ACTIVE",
        headers=admin_headers
    )
    print("✔ Re-activated Grocery QR")

    # 12. Check Merchant Daily Settlement Analysis endpoint
    print("\n[STEP 12] Checking Merchant Daily Settlement Analysis & History...")
    speedway_token = registered_merchants["Speedway Fuels"]["token"]
    daily_res = requests.get(
        f"{BASE_URL}/api/payments/merchant/daily-analysis",
        headers={"Authorization": f"Bearer {speedway_token}"}
    )
    assert daily_res.status_code == 200
    daily = daily_res.json()
    print(f"✔ Speedway Fuels Daily Analysis:")
    print(f"   Gross Sales: ₹{daily['gross_sales']}, Total Txns: {daily['total_transactions']}")
    print(f"   Total MDR: ₹{daily['total_mdr']}, Total GST: ₹{daily['total_gst']}")
    print(f"   Expected Net Settlement: ₹{daily['expected_net_settlement']}")
    print(f"   Reset Cutoff: {daily['reset_cutoff_time']}")
    assert daily["total_transactions"] >= 2
    assert daily["reset_cutoff_time"] == "23:59:59"

    # 13. Check Admin Overview Live Statistics & Separate GST Box
    print("\n[STEP 13] Verifying Admin Dashboard Live Stats & Separate GST Box...")
    admin_stats_res = requests.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
    assert admin_stats_res.status_code == 200
    stats = admin_stats_res.json()
    print(f"✔ Live Admin Stats:")
    print(f"   Total Accounts: {stats['total_users']} (Merchants: {stats['total_merchants']}, Personal: {stats['total_personal']})")
    print(f"   Total QRs: {stats['total_qrs']} (Active: {stats['active_qrs']}, Inactive: {stats['inactive_qrs']})")
    print(f"   Total Txns: {stats['total_transactions']}, Gross Volume: ₹{stats['total_gross_volume']}")
    print(f"   Calculated MDR: ₹{stats['total_calculated_mdr']}")
    print(f"   Separate GST Total: ₹{stats['total_gst']} (18% on MDR)")
    print(f"   Expected Net Settlement: ₹{stats['total_expected_settlement']}")
    assert stats["total_merchants"] >= 6
    assert stats["total_transactions"] >= 5
    assert stats["total_gst"] > 0, "GST must be calculated and non-zero"

    # 14. Check Admin Transaction Ledger Category Filtering (Petrol, Hotel, Grocery)
    print("\n[STEP 14] Verifying Admin Transaction Ledger Category Filtering...")
    petrol_txns_res = requests.get(f"{BASE_URL}/api/admin/transactions?category=petrol", headers=admin_headers)
    assert petrol_txns_res.status_code == 200
    petrol_txns = petrol_txns_res.json()
    print(f"✔ Found {len(petrol_txns)} transactions filtered for 'petrol'")
    assert len(petrol_txns) >= 2
    for pt in petrol_txns:
        assert pt["settlement"]["business_subcategory"] == "Petrol Bunk / Fuel Station"

    grocery_txns_res = requests.get(f"{BASE_URL}/api/admin/transactions?category=grocery", headers=admin_headers)
    assert grocery_txns_res.status_code == 200
    grocery_txns = grocery_txns_res.json()
    print(f"✔ Found {len(grocery_txns)} transactions filtered for 'grocery'")
    assert len(grocery_txns) >= 1
    for gt in grocery_txns:
        assert "Grocery" in gt["settlement"]["business_category"] or "Kirana" in gt["settlement"]["business_subcategory"]

    print("\n" + "=" * 80)
    print("ALL 14 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎯💯")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
