import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import (
    User,
    AdminProfile,
    PersonalProfile,
    MerchantProfile,
    Wallet,
    UserQR,
    BusinessCategory,
    BusinessSubcategory
)
from schemas import (
    AdminRegisterRequest,
    UserRegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    AdminSetupStatusResponse
)
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.get("/admin-status", response_model=AdminSetupStatusResponse)
def check_admin_status(db: Session = Depends(get_db)):
    """Check if the initial Admin account has already been set up."""
    admin_exists = db.query(User).filter(User.role == "admin").first() is not None
    return AdminSetupStatusResponse(
        is_admin_created=admin_exists,
        message="Admin account already configured" if admin_exists else "Initial Admin setup is required"
    )

@router.get("/categories")
def get_public_categories(db: Session = Depends(get_db)):
    """Returns active business categories and their approved subcategories for registration."""
    cats = db.query(BusinessCategory).filter(BusinessCategory.is_active == True).all()
    result = []
    for c in cats:
        subs = [s.name for s in c.subcategories if s.is_active]
        result.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "description": c.description,
            "subcategories": subs
        })
    return result

@router.post("/register-admin", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_initial_admin(req: AdminRegisterRequest, db: Session = Depends(get_db)):
    """
    Creates the first Admin account.
    Strictly allowed ONCE during initial system bootstrapping.
    Subsequent calls are permanently blocked.
    """
    existing_admin = db.query(User).filter(User.role == "admin").first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account has already been initialized. Public Admin registration is permanently closed."
        )

    # Check if this email is already registered
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this Gmail address already exists."
        )

    new_user = User(
        full_name=req.full_name.strip(),
        email=req.email.strip().lower(),
        phone=req.phone.strip(),
        hashed_password=hash_password(req.password),
        role="admin",
        account_type="admin",
        is_active=True
    )
    db.add(new_user)
    db.flush()

    admin_profile = AdminProfile(
        user_id=new_user.id,
        department="Platform Administration",
        last_login=datetime.utcnow()
    )
    db.add(admin_profile)

    # Automatically initialize demo wallet and QR
    db.add(Wallet(user_id=new_user.id, balance=50000.0, currency="INR"))
    token_str = uuid.uuid4().hex[:8].upper()
    code = f"MDR-PAY-{new_user.id}-{token_str}"
    payload = json.dumps({
        "app": "MDR_SETTLEMENT_GUARDIAN",
        "qr_code": code,
        "user_id": new_user.id,
        "account_type": new_user.account_type,
        "v": 1
    })
    db.add(UserQR(user_id=new_user.id, qr_code=code, qr_payload=payload, is_active=True, qr_status="ACTIVE"))

    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role, "account_type": new_user.account_type})
    return TokenResponse(access_token=token, token_type="bearer", user=UserResponse.model_validate(new_user))

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a normal user (Personal or Merchant).
    Never allows role='admin'.
    """
    # Prevent duplicate Gmail
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This Gmail address is already registered. Please log in or use another email."
        )

    account_type = req.account_type.lower()
    if account_type not in ["personal", "merchant"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account type must be either 'personal' or 'merchant'."
        )

    if account_type == "merchant" and not req.merchant_details:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Merchant details are required when registering as a Merchant."
        )

    new_user = User(
        full_name=req.full_name.strip(),
        email=req.email.strip().lower(),
        phone=req.phone.strip(),
        hashed_password=hash_password(req.password),
        role="user",
        account_type=account_type,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    if account_type == "merchant":
        m_details = req.merchant_details
        subcat = getattr(m_details, "business_subcategory", "General") or "General"
        merchant_profile = MerchantProfile(
            user_id=new_user.id,
            business_name=m_details.business_name.strip(),
            business_category=m_details.business_category.strip(),
            business_subcategory=subcat.strip(),
            business_address=m_details.business_address.strip(),
            city=m_details.city.strip(),
            state=m_details.state.strip(),
            contact_number=m_details.contact_number.strip(),
            verification_status="Verified",
            monthly_volume_band="Under ₹1 Lakh",
            qr_status="ACTIVE"
        )
        db.add(merchant_profile)
    else:
        personal_profile = PersonalProfile(
            user_id=new_user.id,
            preferred_language="English"
        )
        db.add(personal_profile)

    # Initialize wallet and unique QR
    db.add(Wallet(user_id=new_user.id, balance=50000.0, currency="INR"))
    token_str = uuid.uuid4().hex[:8].upper()
    code = f"MDR-PAY-{new_user.id}-{token_str}"
    payload = json.dumps({
        "app": "MDR_SETTLEMENT_GUARDIAN",
        "qr_code": code,
        "user_id": new_user.id,
        "account_type": new_user.account_type,
        "v": 1
    })
    db.add(UserQR(user_id=new_user.id, qr_code=code, qr_payload=payload, is_active=True, qr_status="ACTIVE"))
    if account_type == "merchant":
        merchant_profile.assigned_qr_id = code
        merchant_profile.qr_status = "ACTIVE"

    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role, "account_type": new_user.account_type})
    return TokenResponse(access_token=token, token_type="bearer", user=UserResponse.model_validate(new_user))

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Common login endpoint with exact user-requested error messages:
    - If Gmail not registered: "This Gmail address is not registered. Please create an account."
    - If password incorrect: "Incorrect password. Please try again."
    """
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This Gmail address is not registered. Please create an account."
        )

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Please contact administrator."
        )

    # Update last login timestamp for admin
    if user.role == "admin" and user.admin_profile:
        user.admin_profile.last_login = datetime.utcnow()
        db.commit()

    token = create_access_token(data={"sub": str(user.id), "role": user.role, "account_type": user.account_type})
    return TokenResponse(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
