import sys
import os

# Add backend directory to path
backend_path = r"C:\Users\harsh\.gemini\antigravity\scratch\mdr-settlement-guardian\backend"
sys.path.append(backend_path)
os.chdir(backend_path)

from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
import models

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = "sqlite:///./test_flow_isolated.db"
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

def test_full_flow():
    print("=== TEST 1: Check initial Admin Status ===")
    res = client.get("/api/auth/admin-status")
    assert res.status_code == 200
    assert res.json()["is_admin_created"] is False
    print("PASS: Initial admin status is False")

    print("\n=== TEST 2: Register Master Admin ===")
    admin_payload = {
        "full_name": "Harsha Admin",
        "email": "harsha.admin@gmail.com",
        "phone": "9876543210",
        "password": "AdminPassword123",
        "confirm_password": "AdminPassword123"
    }
    res = client.post("/api/auth/register-admin", json=admin_payload)
    assert res.status_code == 201, res.text
    admin_data = res.json()
    admin_token = admin_data["access_token"]
    assert admin_data["user"]["role"] == "admin"
    assert admin_data["user"]["account_type"] == "admin"
    print("PASS: Master admin registered successfully")

    print("\n=== TEST 3: Block Second Admin Registration ===")
    second_admin = {
        "full_name": "Second Admin",
        "email": "another.admin@gmail.com",
        "phone": "9988776655",
        "password": "Password12345",
        "confirm_password": "Password12345"
    }
    res = client.post("/api/auth/register-admin", json=second_admin)
    assert res.status_code == 403
    print("PASS: Second admin registration strictly blocked with 403 Forbidden")

    print("\n=== TEST 4: Register Normal Personal User ===")
    personal_payload = {
        "full_name": "Gargie Yogish",
        "email": "gargie.user@gmail.com",
        "phone": "9845012345",
        "password": "UserPassword123",
        "confirm_password": "UserPassword123",
        "account_type": "personal"
    }
    res = client.post("/api/auth/register", json=personal_payload)
    assert res.status_code == 201, res.text
    personal_data = res.json()
    assert personal_data["user"]["role"] == "user"
    assert personal_data["user"]["account_type"] == "personal"
    print("PASS: Personal user registered successfully")

    print("\n=== TEST 5: Register Merchant User ===")
    merchant_payload = {
        "full_name": "Ravi Kumar",
        "email": "ravi.store@gmail.com",
        "phone": "9880011223",
        "password": "MerchantPass123",
        "confirm_password": "MerchantPass123",
        "account_type": "merchant",
        "merchant_details": {
            "business_name": "Ravi Electronics & Mobiles",
            "business_category": "Consumer Electronics",
            "business_address": "Shop 4, 100ft Road, Indiranagar",
            "city": "Bengaluru",
            "state": "Karnataka",
            "contact_number": "9880011223"
        }
    }
    res = client.post("/api/auth/register", json=merchant_payload)
    assert res.status_code == 201, res.text
    m_data = res.json()
    assert m_data["user"]["account_type"] == "merchant"
    assert m_data["user"]["merchant_profile"]["verification_status"] == "Pending"
    merchant_user_id = m_data["user"]["id"]
    print("PASS: Merchant registered with Pending verification status")

    print("\n=== TEST 6: Validation Error on Non-Gmail or Wrong Phone ===")
    bad_email_payload = personal_payload.copy()
    bad_email_payload["email"] = "notagmail@yahoo.com"
    res = client.post("/api/auth/register", json=bad_email_payload)
    assert res.status_code == 422
    print("PASS: Non-gmail rejected")

    bad_phone_payload = personal_payload.copy()
    bad_phone_payload["phone"] = "12345" # not 10 digits
    res = client.post("/api/auth/register", json=bad_phone_payload)
    assert res.status_code == 422
    print("PASS: Invalid phone length rejected")

    print("\n=== TEST 7: Login Validation (Specific Error Messages) ===")
    # Unregistered email
    res = client.post("/api/auth/login", json={"email": "unknown.user@gmail.com", "password": "AnyPassword123"})
    assert res.status_code == 404
    assert res.json()["detail"] == "This Gmail address is not registered. Please create an account."
    print("PASS: Correct message for unregistered Gmail")

    # Incorrect password
    res = client.post("/api/auth/login", json={"email": "ravi.store@gmail.com", "password": "WrongPassword"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect password. Please try again."
    print("PASS: Correct message for incorrect password")

    # Successful login
    res = client.post("/api/auth/login", json={"email": "ravi.store@gmail.com", "password": "MerchantPass123"})
    assert res.status_code == 200
    assert res.json()["user"]["account_type"] == "merchant"
    print("PASS: Merchant login successful")

    print("\n=== TEST 8: Admin Stats & Real Database Counts ===")
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/admin/stats", headers=headers)
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_users"] == 3 # admin, personal, merchant
    assert stats["total_merchants"] == 1
    assert stats["total_personal"] == 1
    assert stats["pending_merchants"] == 1
    print(f"PASS: Real DB counts: {stats}")

    print("\n=== TEST 9: Admin Search & User List ===")
    res = client.get("/api/admin/users?q=Ravi", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["full_name"] == "Ravi Kumar"
    print("PASS: Search by name works")

    print("\n=== TEST 10: Admin Merchant Verification Approval ===")
    res = client.patch(f"/api/admin/merchants/{merchant_user_id}/status?status=Verified", headers=headers)
    assert res.status_code == 200
    assert res.json()["merchant_profile"]["verification_status"] == "Verified"
    print("PASS: Merchant status approved to 'Verified'")

    # Verify stats updated
    res = client.get("/api/admin/stats", headers=headers)
    assert res.json()["pending_merchants"] == 0
    assert res.json()["verified_merchants"] == 1
    print("PASS: Admin stats reflect verified merchant count")

    print("\n==========================================")
    print("ALL 10 TESTS PASSED WITH 100% SUCCESS!")
    print("==========================================")

if __name__ == "__main__":
    test_full_flow()
