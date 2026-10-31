import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator

class AdminRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., max_length=255)
    phone: str = Field(...)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(...)

    @field_validator("email")
    @classmethod
    def validate_gmail(cls, v: str) -> str:
        clean = v.strip().lower()
        if not clean.endswith("@gmail.com") or clean == "@gmail.com":
            raise ValueError("Gmail address must end with @gmail.com")
        return clean

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 10:
            raise ValueError("Phone number must contain exactly 10 digits")
        return digits

    @field_validator("confirm_password")
    @classmethod
    def validate_passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

class MerchantDetails(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=200)
    business_category: str = Field(..., min_length=2, max_length=100)
    business_subcategory: Optional[str] = Field("General", max_length=100)
    business_address: str = Field(..., min_length=3)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    contact_number: str = Field(...)

    @field_validator("contact_number")
    @classmethod
    def validate_contact(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 10:
            raise ValueError("Contact number must contain exactly 10 digits")
        return digits

class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., max_length=255)
    phone: str = Field(...)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(...)
    account_type: str = Field(..., pattern="^(personal|merchant)$")
    merchant_details: Optional[MerchantDetails] = None

    @field_validator("email")
    @classmethod
    def validate_gmail(cls, v: str) -> str:
        clean = v.strip().lower()
        if not clean.endswith("@gmail.com") or clean == "@gmail.com":
            raise ValueError("Gmail address must end with @gmail.com")
        return clean

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 10:
            raise ValueError("Phone number must contain exactly 10 digits")
        return digits

    @field_validator("confirm_password")
    @classmethod
    def validate_passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()

class MerchantProfileResponse(BaseModel):
    id: int
    business_name: str
    business_category: str
    business_subcategory: Optional[str] = "General"
    business_address: str
    city: str
    state: str
    contact_number: str
    verification_status: str
    monthly_volume_band: str
    assigned_qr_id: Optional[str] = None
    qr_status: Optional[str] = "ACTIVE"
    created_at: datetime

    class Config:
        from_attributes = True

class AdminProfileResponse(BaseModel):
    id: int
    department: str
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class PersonalProfileResponse(BaseModel):
    id: int
    preferred_language: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str
    role: str
    account_type: str
    is_active: bool
    created_at: datetime
    admin_profile: Optional[AdminProfileResponse] = None
    personal_profile: Optional[PersonalProfileResponse] = None
    merchant_profile: Optional[MerchantProfileResponse] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AdminSetupStatusResponse(BaseModel):
    is_admin_created: bool
    message: str

class AdminStatsResponse(BaseModel):
    total_users: int
    total_personal: int
    total_merchants: int
    pending_merchants: int
    verified_merchants: int
    rejected_merchants: int = 0
    total_qrs: int = 0
    active_qrs: int = 0
    inactive_qrs: int = 0
    total_transactions: int = 0
    successful_transactions: int = 0
    pending_transactions: int = 0
    failed_transactions: int = 0
    total_gross_volume: float = 0.0
    total_calculated_mdr: float = 0.0
    total_gst: float = 0.0
    total_expected_settlement: float = 0.0

# ==========================================
# STAGE 2 SCHEMAS: QR & SIMULATED PAYMENTS
# ==========================================

class WalletResponse(BaseModel):
    balance: float
    currency: str = "INR"

class UserQRResponse(BaseModel):
    user_id: int
    qr_code: str
    qr_payload: str
    full_name: str
    account_type: str
    business_name: Optional[str] = None
    business_category: Optional[str] = None
    verification_status: Optional[str] = None

class ResolveQRRequest(BaseModel):
    qr_code: str

class ResolvedQRResponse(BaseModel):
    user_id: int
    full_name: str
    account_type: str
    qr_code: str
    business_name: Optional[str] = None
    business_category: Optional[str] = None
    business_subcategory: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    verification_status: Optional[str] = None

class PaymentSimulationRequest(BaseModel):
    qr_code: str
    amount: float = Field(..., gt=0, description="Payment amount must be greater than zero")
    note: Optional[str] = None
    idempotency_key: Optional[str] = None

class SettlementDetailResponse(BaseModel):
    gross_amount: float
    mdr_rule: str
    rule_id: Optional[str] = None
    rule_version: Optional[int] = 1
    business_category: Optional[str] = None
    business_subcategory: Optional[str] = None
    calculation_type: Optional[str] = None
    applied_rate: Optional[str] = None
    applied_cap: Optional[float] = None
    mdr_rate: str
    mdr_amount: float
    gst_rate: float
    gst_amount: float
    total_deductions: float
    net_settlement: float
    tax_treatment: str
    calculation_note: Optional[str] = None

    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    id: int
    txn_id: str
    sender_id: int
    sender_name: str
    sender_account_type: Optional[str] = "personal"
    receiver_id: int
    receiver_name: str
    receiver_account_type: str
    receiver_business_name: Optional[str] = None
    receiver_business_category: Optional[str] = None
    receiver_business_subcategory: Optional[str] = None
    amount: float
    txn_type: str # 'P2P' | 'P2M'
    status: str
    note: Optional[str] = None
    created_at: datetime
    settlement: Optional[SettlementDetailResponse] = None
    is_sender: Optional[bool] = None
    available_balance_after: Optional[float] = None
    is_pending_config: Optional[bool] = False

    class Config:
        from_attributes = True

class PersonalOverviewResponse(BaseModel):
    wallet_balance: float
    currency: str = "INR"
    money_sent: float
    money_received: float
    total_transactions: int

class TopupWalletRequest(BaseModel):
    amount: float = Field(..., gt=0, le=1000000)

# ==========================================
# CATEGORY, MDR RULES & QR MANAGEMENT SCHEMAS
# ==========================================

class SubcategoryResponse(BaseModel):
    id: int
    category_id: int
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class CategoryResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool
    subcategories: List[SubcategoryResponse] = []

    class Config:
        from_attributes = True

class MDRRuleResponse(BaseModel):
    id: int
    rule_id: str
    version: int
    business_category: str
    business_subcategory: Optional[str] = None
    payment_type: str
    calculation_type: str
    rate_percentage: float
    fixed_fee: float
    min_amount: Optional[float] = None
    max_cap: Optional[float] = None
    gst_rate: float
    tax_treatment: str
    eligibility_conditions: Optional[str] = None
    effective_start_date: datetime
    effective_end_date: Optional[datetime] = None
    status: str
    created_by: str
    updated_by: Optional[str] = None
    change_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MDRRulePublishRequest(BaseModel):
    business_category: str
    business_subcategory: Optional[str] = None
    calculation_type: str = "PERCENTAGE" # 'PERCENTAGE', 'FIXED', 'ZERO', 'CAPPED', 'PENDING_CONFIG'
    rate_percentage: float = 0.4
    fixed_fee: float = 0.0
    min_amount: Optional[float] = 2000.0
    max_cap: Optional[float] = 300.0
    gst_rate: float = 0.18
    tax_treatment: str = "TAXABLE_18"
    eligibility_conditions: Optional[str] = None
    change_summary: str = "Regulatory MDR schedule update"

class MDRRulePreviewRequest(BaseModel):
    business_category: str
    business_subcategory: Optional[str] = None
    calculation_type: str
    rate_percentage: float
    fixed_fee: float
    min_amount: Optional[float] = None
    max_cap: Optional[float] = None
    gst_rate: float = 0.18
    tax_treatment: str = "TAXABLE_18"
    sample_amounts: List[float] = [500.0, 1500.0, 3000.0, 10000.0, 80000.0]

class MDRRulePreviewResponse(BaseModel):
    previous_rule: Optional[MDRRuleResponse] = None
    proposed_rule: Dict[str, Any]
    affected_category: str
    affected_subcategory: Optional[str] = None
    affected_merchants_count: int
    effective_date: str
    sample_calculations: List[Dict[str, Any]]

class QRManagementItem(BaseModel):
    id: int
    user_id: int
    merchant_name: str
    business_category: str
    business_subcategory: Optional[str] = None
    qr_code: str
    qr_status: str
    is_active: bool
    created_at: datetime
    last_generated_at: Optional[datetime] = None

class MerchantCategoryUpdateRequest(BaseModel):
    business_category: str
    business_subcategory: Optional[str] = "General"
    admin_note: Optional[str] = "Approved by Administrator"

