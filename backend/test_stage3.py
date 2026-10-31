import sys
import os

backend_path = r"C:\Users\harsh\.gemini\antigravity\scratch\mdr-settlement-guardian\backend"
sys.path.append(backend_path)
os.chdir(backend_path)

from fastapi.testclient import TestClient
from main import app
from database import Base, get_db
import models
import cognee_memory
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Isolated test database to keep production database 100% safe
TEST_DB_URL = "sqlite:///./test_stage3_isolated.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.drop_all(bind=test_engine)
Base.metadata.create_all(bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_stage3_explainer():
    print("==================================================")
    print("RUNNING STAGE 3 SUITE: EXPLAINER, COGNEE & SARVAM")
    print("==================================================")

    # 1. Register a Merchant
    res = client.post("/api/auth/register", json={
        "full_name": "Ravi Electronics",
        "email": "ravi.stage3@gmail.com",
        "phone": "9812345678",
        "password": "Password123",
        "confirm_password": "Password123",
        "account_type": "merchant",
        "merchant_details": {
            "business_name": "Ravi Mobile Care",
            "business_category": "Consumer Electronics",
            "business_address": "Indiranagar",
            "city": "Bengaluru",
            "state": "Karnataka",
            "contact_number": "9812345678"
        }
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Explainer endpoint in Kannada
    res_explain = client.get("/api/explain/settlement?language=Kannada", headers=headers)
    assert res_explain.status_code == 200
    exp_data = res_explain.json()
    assert exp_data["language"] == "Kannada"
    assert "active_script" in exp_data
    assert "voice" in exp_data
    assert "audio_base64" in exp_data["voice"]
    assert "scripts" in exp_data
    assert "hindi" in exp_data["scripts"]
    assert "kannada" in exp_data["scripts"]
    assert "english" in exp_data["scripts"]
    print("PASS: Multilingual scripts generated (Kannada, Hindi, English).")
    print(f"PASS: Sarvam voice audio generated: {exp_data['voice']['provider']}")

    # 3. Test Cognee memory recall
    res_cognee = client.get("/api/explain/cognee", headers=headers)
    assert res_cognee.status_code == 200
    cognee_ctx = res_cognee.json()
    assert "settlements_count" in cognee_ctx
    print(f"PASS: Cognee memory recalled context: settlements={cognee_ctx['settlements_count']}")

    # 4. Test Language preference update
    res_lang = client.post("/api/explain/set-language", headers=headers, json={"language": "Hindi"})
    assert res_lang.status_code == 200
    assert res_lang.json()["preferred_language"] == "Hindi"
    print("PASS: Preferred language updated in Cognee memory to Hindi.")

    # 5. Test Custom speech generation
    res_speak = client.post("/api/explain/speak", json={
        "text": "ನಮಸ್ಕಾರ ರವಿ ಅವರೇ, ನಿಮ್ಮ ಇಂದಿನ ಬ್ಯಾಂಕ್ ಜಮೆ ವಿವರ ಸಿದ್ಧವಾಗಿದೆ.",
        "language": "Kannada"
    })
    assert res_speak.status_code == 200
    assert "audio_base64" in res_speak.json()
    print("PASS: Sarvam voice custom synthesis verified.")

    print("\n==================================================")
    print("ALL STAGE 3 TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    test_stage3_explainer()
