import sys
import os
import uuid

# Add backend directory to path
backend_path = r"C:\Users\harsh\.gemini\antigravity\scratch\mdr-settlement-guardian\backend"
sys.path.append(backend_path)
os.chdir(backend_path)

from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
import models

# Use an isolated test database so production mdr_guardian.db is NEVER touched or dropped!
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = "sqlite:///./test_mdr_isolated.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.drop_all(bind=test_engine)
Base.metadata.create_all(bind=test_engine)

from database import get_db
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def run_stage2_tests():
    print("==================================================")
    print("RUNNING STAGE 2 SUITE - 7 CORE SCENARIOS")
    print("==================================================")

    # 1. Setup Admin
    admin_res = client.post("/api/auth/register-admin", json={
        "full_name": "Stage 2 Admin",
        "email": "stage2.admin@gmail.com",
        "phone": "9999900001",
        "password": "Password123",
        "confirm_password": "Password123"
    })
    assert admin_res.status_code == 201

    # 2. Register Personal User A
    user_a_res = client.post("/api/auth/register", json={
        "full_name": "Aarav Sharma",
        "email": "aarav.personal@gmail.com",
        "phone": "9811122233",
        "password": "Password123",
        "confirm_password": "Password123",
        "account_type": "personal"
    })
    assert user_a_res.status_code == 201
    user_a_token = user_a_res.json()["access_token"]
    user_a_id = user_a_res.json()["user"]["id"]
    headers_a = {"Authorization": f"Bearer {user_a_token}"}

    # 3. Register Personal User B
    user_b_res = client.post("/api/auth/register", json={
        "full_name": "Bhavna Patel",
        "email": "bhavna.personal@gmail.com",
        "phone": "9822233344",
        "password": "Password123",
        "confirm_password": "Password123",
        "account_type": "personal"
    })
    assert user_b_res.status_code == 201
    user_b_token = user_b_res.json()["access_token"]
    user_b_id = user_b_res.json()["user"]["id"]
    headers_b = {"Authorization": f"Bearer {user_b_token}"}

    # 4. Register Merchant User C
    merchant_res = client.post("/api/auth/register", json={
        "full_name": "Ravi Kumar (Merchant)",
        "email": "ravi.merchant@gmail.com",
        "phone": "9833344455",
        "password": "Password123",
        "confirm_password": "Password123",
        "account_type": "merchant",
        "merchant_details": {
            "business_name": "Ravi Mobile & Tech Store",
            "business_category": "Consumer Electronics & Mobile",
            "business_address": "Shop 4, 100ft Road, Indiranagar",
            "city": "Bengaluru",
            "state": "Karnataka",
            "contact_number": "9833344455"
        }
    })
    assert merchant_res.status_code == 201
    merchant_token = merchant_res.json()["access_token"]
    merchant_id = merchant_res.json()["user"]["id"]
    headers_merchant = {"Authorization": f"Bearer {merchant_token}"}

    # Get User B's QR
    res_b_qr = client.get("/api/payments/my-qr", headers=headers_b)
    assert res_b_qr.status_code == 200
    qr_b = res_b_qr.json()["qr_code"]
    print(f"Generated Personal User B QR: {qr_b}")

    # Get Merchant's QR
    res_m_qr = client.get("/api/payments/my-qr", headers=headers_merchant)
    assert res_m_qr.status_code == 200
    qr_merchant = res_m_qr.json()["qr_code"]
    print(f"Generated Merchant QR: {qr_merchant}")

    # Get User A's QR
    res_a_qr = client.get("/api/payments/my-qr", headers=headers_a)
    assert res_a_qr.status_code == 200
    qr_a = res_a_qr.json()["qr_code"]
    print(f"Generated Personal User A QR: {qr_a}")

    print("\n--- TEST 1: Personal User A scans Personal User B's QR and sends Rs. 1,000 ---")
    # Resolve B's QR
    resolve_res = client.post("/api/payments/resolve-qr", json={"qr_code": qr_b})
    assert resolve_res.status_code == 200
    assert resolve_res.json()["account_type"] == "personal"
    assert resolve_res.json()["full_name"] == "Bhavna Patel"

    # Simulate payment ₹1,000
    pay_1 = client.post("/api/payments/simulate", headers=headers_a, json={
        "qr_code": qr_b,
        "amount": 1000.0,
        "note": "Lunch split"
    })
    assert pay_1.status_code == 201
    txn_1 = pay_1.json()
    assert txn_1["txn_type"] == "P2P"
    assert txn_1["amount"] == 1000.0
    assert txn_1["settlement"] is None, "P2P must have zero merchant MDR deduction"
    # Verify B's wallet increased from 50,000 to 51,000
    wallet_b = client.get("/api/payments/wallet", headers=headers_b).json()
    assert wallet_b["balance"] == 51000.0
    print("PASS: Personal User A -> Personal User B: Rs. 1,000 transferred with P2P 0% MDR.")

    print("\n--- TEST 2: Personal User A scans Merchant QR and pays Rs. 3,000 ---")
    resolve_m = client.post("/api/payments/resolve-qr", json={"qr_code": qr_merchant})
    assert resolve_m.status_code == 200
    assert resolve_m.json()["account_type"] == "merchant"
    assert resolve_m.json()["business_name"] == "Ravi Mobile & Tech Store"

    pay_2 = client.post("/api/payments/simulate", headers=headers_a, json={
        "qr_code": qr_merchant,
        "amount": 3000.0,
        "note": "Wireless Earphones"
    })
    assert pay_2.status_code == 201
    txn_2 = pay_2.json()
    assert txn_2["txn_type"] == "P2M"
    assert txn_2["amount"] == 3000.0
    settlement_2 = txn_2["settlement"]
    assert settlement_2 is not None
    assert settlement_2["gross_amount"] == 3000.0
    assert settlement_2["mdr_amount"] == 12.0 # 0.4% of 3000
    assert settlement_2["gst_amount"] == 2.16 # 18% of 12.0
    assert settlement_2["total_deductions"] == 14.16 # 12 + 2.16
    assert settlement_2["net_settlement"] == 2985.84 # 3000 - 14.16
    print("PASS: Personal User A -> Merchant: Gross=Rs. 3,000, MDR=Rs. 12.00, GST=Rs. 2.16, Net=Rs. 2,985.84 accurately computed by backend!")

    print("\n--- TEST 3: Merchant scans a personal user's QR and sends Rs. 500 ---")
    pay_3 = client.post("/api/payments/simulate", headers=headers_merchant, json={
        "qr_code": qr_a,
        "amount": 500.0,
        "note": "Refund for protective film"
    })
    assert pay_3.status_code == 201
    txn_3 = pay_3.json()
    assert txn_3["txn_type"] == "P2P"
    assert txn_3["settlement"] is None, "Merchant to Personal must behave as personal payment with no merchant MDR"
    print("PASS: Merchant -> Personal User behaves as personal payment (0% MDR).")

    print("\n--- TEST 4: Invalid QR Code ---")
    res_invalid = client.post("/api/payments/resolve-qr", json={"qr_code": "MDR-FAKE-QR-CODE-1234"})
    assert res_invalid.status_code == 404
    assert "Invalid QR code" in res_invalid.json()["detail"]
    print("PASS: Invalid QR code properly rejected with clear error message.")

    print("\n--- TEST 5: Insufficient simulated balance ---")
    # User B has Rs. 51,000, try sending Rs. 1,00,000
    res_insufficient = client.post("/api/payments/simulate", headers=headers_b, json={
        "qr_code": qr_a,
        "amount": 100000.0
    })
    assert res_insufficient.status_code == 400
    assert "Insufficient simulated wallet balance" in res_insufficient.json()["detail"]
    print("PASS: Excessive amount rejected due to insufficient simulated balance.")

    print("\n--- TEST 6: Same payment request submitted twice (Idempotency) ---")
    idempotency_key = f"IDEM_{uuid.uuid4().hex}"
    req_payload = {
        "qr_code": qr_merchant,
        "amount": 1500.0,
        "note": "Screen Guard",
        "idempotency_key": idempotency_key
    }
    # Initial request
    pay_first = client.post("/api/payments/simulate", headers=headers_a, json=req_payload)
    assert pay_first.status_code == 201
    first_txn_id = pay_first.json()["txn_id"]

    # Wallet balance after first debit
    wallet_a_mid = client.get("/api/payments/wallet", headers=headers_a).json()["balance"]

    # Duplicate request with same idempotency key
    pay_second = client.post("/api/payments/simulate", headers=headers_a, json=req_payload)
    assert pay_second.status_code in (200, 201)
    second_txn_id = pay_second.json()["txn_id"]
    assert first_txn_id == second_txn_id, "Idempotent response must return the existing transaction"

    # Verify wallet was NOT debited twice
    wallet_a_after = client.get("/api/payments/wallet", headers=headers_a).json()["balance"]
    assert wallet_a_mid == wallet_a_after, "Wallet balance must remain identical with no duplicate debit"
    print("PASS: Duplicate payment blocked, returned existing transaction with zero double debit.")

    print("\n--- TEST 7: Merchant clicks a transaction (Full deduction breakdown) ---")
    # Fetch transaction details for the Rs. 3,000 payment
    res_detail = client.get(f"/api/payments/transactions/{txn_2['txn_id']}", headers=headers_merchant)
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["txn_id"] == txn_2["txn_id"]
    assert detail["amount"] == 3000.0
    assert detail["settlement"]["mdr_rule"] == "Standard 0.4% UPI MDR"
    assert detail["settlement"]["mdr_rate"] == "0.4%"
    assert detail["settlement"]["mdr_amount"] == 12.0
    assert detail["settlement"]["gst_rate"] == 0.18
    assert detail["settlement"]["gst_amount"] == 2.16
    assert detail["settlement"]["total_deductions"] == 14.16
    assert detail["settlement"]["net_settlement"] == 2985.84
    assert "Expected net bank settlement is" in detail["settlement"]["calculation_note"]
    print("PASS: Complete breakdown verified: Gross Rs. 3000, MDR Rs. 12, GST Rs. 2.16, Net Rs. 2,985.84.")

    print("\n==================================================")
    print("ALL 7 STAGE 2 SCENARIOS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_stage2_tests()
