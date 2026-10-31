from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="user") # 'admin' | 'user'
    account_type = Column(String(30), nullable=False, default="personal") # 'admin' | 'personal' | 'merchant'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    admin_profile = relationship("AdminProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="joined")
    personal_profile = relationship("PersonalProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="joined")
    merchant_profile = relationship("MerchantProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="joined")
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="joined")
    qr_profile = relationship("UserQR", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="joined")

class AdminProfile(Base):
    __tablename__ = "admin_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department = Column(String(100), default="Platform Administration")
    last_login = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="admin_profile")

class PersonalProfile(Base):
    __tablename__ = "personal_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    preferred_language = Column(String(50), default="English")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="personal_profile")

class MerchantProfile(Base):
    __tablename__ = "merchant_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_name = Column(String(200), nullable=False)
    business_category = Column(String(100), nullable=False)
    business_subcategory = Column(String(100), nullable=True, default="General")
    business_address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    contact_number = Column(String(20), nullable=False)
    verification_status = Column(String(30), default="Pending") # 'Pending' | 'Verified' | 'Rejected'
    monthly_volume_band = Column(String(50), default="Under ₹1 Lakh")
    assigned_qr_id = Column(String(100), nullable=True)
    qr_status = Column(String(30), default="ACTIVE") # 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="merchant_profile")

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    balance = Column(Float, default=50000.0) # Initial ₹50,000 simulated balance for testing
    currency = Column(String(10), default="INR")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="wallet")

class UserQR(Base):
    __tablename__ = "user_qrs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    qr_code = Column(String(100), unique=True, index=True, nullable=False)
    qr_payload = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    qr_status = Column(String(30), default="ACTIVE") # 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    assignment_history = Column(Text, nullable=True)
    last_generated_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="qr_profile")

class BusinessCategory(Base):
    __tablename__ = "business_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    subcategories = relationship("BusinessSubcategory", back_populates="category", cascade="all, delete-orphan")

class BusinessSubcategory(Base):
    __tablename__ = "business_subcategories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("business_categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("BusinessCategory", back_populates="subcategories")

class MDRRule(Base):
    __tablename__ = "mdr_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(80), index=True, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    business_category = Column(String(100), nullable=False)
    business_subcategory = Column(String(100), nullable=True)
    payment_type = Column(String(30), default="P2M")
    calculation_type = Column(String(40), default="PERCENTAGE") # 'ZERO', 'PERCENTAGE', 'FIXED', 'CAPPED', 'PENDING_CONFIG'
    rate_percentage = Column(Float, default=0.0) # e.g. 0.4 for 0.4%
    fixed_fee = Column(Float, default=0.0) # flat fee e.g. 5.0
    min_amount = Column(Float, nullable=True)
    max_cap = Column(Float, nullable=True) # max cap e.g. 300.0
    gst_rate = Column(Float, default=0.18) # 18% GST
    tax_treatment = Column(String(40), default="TAXABLE_18") # 'TAXABLE_18', 'EXEMPT', 'NON_TAXABLE'
    eligibility_conditions = Column(Text, nullable=True)
    effective_start_date = Column(DateTime, default=datetime.utcnow)
    effective_end_date = Column(DateTime, nullable=True)
    status = Column(String(30), default="ACTIVE") # 'DRAFT', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED', 'PENDING_CONFIG'
    created_by = Column(String(100), default="ADMIN")
    updated_by = Column(String(100), nullable=True)
    change_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    txn_id = Column(String(64), unique=True, index=True, nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    txn_type = Column(String(20), nullable=False) # 'P2P' | 'P2M'
    status = Column(String(20), default="SUCCESS")
    idempotency_key = Column(String(128), unique=True, index=True, nullable=True)
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    settlement = relationship("TransactionSettlement", back_populates="transaction", uselist=False, cascade="all, delete-orphan")

class TransactionSettlement(Base):
    __tablename__ = "transaction_settlements"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), unique=True, nullable=False)
    gross_amount = Column(Float, nullable=False)
    mdr_rule = Column(String(120), nullable=False)
    rule_id = Column(String(80), nullable=True)
    rule_version = Column(Integer, default=1)
    business_category = Column(String(100), nullable=True)
    business_subcategory = Column(String(100), nullable=True)
    calculation_type = Column(String(40), nullable=True)
    applied_rate = Column(String(50), nullable=True)
    applied_cap = Column(Float, nullable=True)
    mdr_rate = Column(String(50), nullable=False)
    mdr_amount = Column(Float, nullable=False)
    gst_rate = Column(Float, nullable=False)
    gst_amount = Column(Float, nullable=False)
    total_deductions = Column(Float, nullable=False)
    net_settlement = Column(Float, nullable=False)
    tax_treatment = Column(String(50), default="CGST_SGST")
    calculation_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    transaction = relationship("Transaction", back_populates="settlement")

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, nullable=True)
    admin_email = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    target_type = Column(String(100), nullable=False)
    target_id = Column(String(100), nullable=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
