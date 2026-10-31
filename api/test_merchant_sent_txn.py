import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
import requests
import time
import uuid

BASE = "http://127.0.0.1:8000"
uid = uuid.uuid4().hex[:6]

print("1. Registering Merchant 1 (Sender)...")
m1_email = f"m1_sender_{uid}@gmail.com"
m1_phone = f"99{str(int(time.time()*1000))[-8:]}"
m1_res = requests.post(f"{BASE}/api/auth/register", json={
    "full_name": "Merchant Sender",
    "email": m1_email,
    "phone": m1_phone,
    "password": "Password123!",
    "confirm_password": "Password123!",
    "account_type": "merchant",
    "merchant_details": {
        "business_name": "Sender Mart",
        "business_category": "General Retail & Services",
        "business_subcategory": "Retail Stores",
        "business_address": "Shop 10, Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "contact_number": m1_phone
    }
})
assert m1_res.status_code == 201, f"M1 reg failed: {m1_res.text}"
m1_token = m1_res.json()["access_token"]
m1_headers = {"Authorization": f"Bearer {m1_token}"}
print(f"✔ Registered M1: {m1_email}")

print("2. Registering Merchant 2 (Receiver)...")
m2_email = f"m2_receiver_{uid}@gmail.com"
m2_phone = f"98{str(int(time.time()*1000))[-8:]}"
m2_res = requests.post(f"{BASE}/api/auth/register", json={
    "full_name": "Merchant Receiver",
    "email": m2_email,
    "phone": m2_phone,
    "password": "Password123!",
    "confirm_password": "Password123!",
    "account_type": "merchant",
    "merchant_details": {
        "business_name": "Receiver Wholesaler",
        "business_category": "Grocery & Kirana (Small Retail)",
        "business_subcategory": "Wholesale Grocery",
        "business_address": "Shop 20, Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "contact_number": m2_phone
    }
})
assert m2_res.status_code == 201, f"M2 reg failed: {m2_res.text}"
m2_token = m2_res.json()["access_token"]
m2_qr = requests.get(f"{BASE}/api/payments/my-qr", headers={"Authorization": f"Bearer {m2_token}"}).json()["qr_code"]
print(f"✔ Registered M2: {m2_email}, QR: {m2_qr}")

print("3. Merchant 1 makes a transaction to Merchant 2...")
pay_res = requests.post(f"{BASE}/api/payments/simulate", headers=m1_headers, json={
    "qr_code": m2_qr,
    "amount": 3500.0,
    "note": "Inventory restocking payment"
})
assert pay_res.status_code in [200, 201], f"Payment failed: {pay_res.text}"
paid_txn = pay_res.json()
print(f"✔ Payment successfully made by Merchant 1: Txn ID = {paid_txn['txn_id']}, Amount = ₹{paid_txn['amount']}")

print("4. Verifying transaction in Merchant 1's Daily Analysis...")
daily_res = requests.get(f"{BASE}/api/payments/merchant/daily-analysis", headers=m1_headers)
assert daily_res.status_code == 200, f"Daily analysis failed: {daily_res.text}"
daily_data = daily_res.json()
m1_txns = daily_data["transactions"]
print(f"✔ Merchant 1 Daily Analysis contains {len(m1_txns)} transactions")
matching_daily = [t for t in m1_txns if t["txn_id"] == paid_txn["txn_id"]]
assert len(matching_daily) > 0, "FAILED: Transaction made by merchant is NOT showing in daily analysis!"
matching_t = matching_daily[0]
assert matching_t["is_sender"] is True, "Expected is_sender to be True"
print(f"✔ Verified in Daily Analysis: Txn={matching_t['txn_id']}, is_sender={matching_t['is_sender']}, receiver={matching_t['receiver_business_name']}")

print("5. Verifying transaction in Merchant 1's Full History...")
history_all = requests.get(f"{BASE}/api/payments/transactions", headers=m1_headers).json()
matching_history = [t for t in history_all if t["txn_id"] == paid_txn["txn_id"]]
assert len(matching_history) > 0, "FAILED: Transaction made by merchant is NOT showing in general transaction history!"
print(f"✔ Verified in Transaction History (All)! Total txns = {len(history_all)}")

print("6. Verifying transaction in Merchant 1's 'filter_direction=sent'...")
history_sent = requests.get(f"{BASE}/api/payments/transactions?filter_direction=sent", headers=m1_headers).json()
matching_sent = [t for t in history_sent if t["txn_id"] == paid_txn["txn_id"]]
assert len(matching_sent) > 0, "FAILED: Transaction made by merchant is NOT showing in sent filter!"
print(f"✔ Verified in Sent filter! Total sent = {len(history_sent)}")

print("\nALL MERCHANT TRANSACTION VISIBILITY TESTS PASSED 100%! 🚀🎯")
