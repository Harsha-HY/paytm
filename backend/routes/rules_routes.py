from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User
from rules_engine import calculate_mdr

router = APIRouter(prefix="/api/rules", tags=["MDR Rules Engine"])

class CalculateTestRequest(BaseModel):
    amount: float = Field(..., gt=0)
    merchant_category: Optional[str] = None
    merchant_subcategory: Optional[str] = None
    payment_type: str = "P2M"

@router.post("/calculate", response_model=Dict[str, Any])
def test_calculation(req: CalculateTestRequest, db: Session = Depends(get_db)):
    """Test the central database-backed calculation engine with arbitrary amounts and categories."""
    return calculate_mdr(
        amount=req.amount,
        merchant_category=req.merchant_category,
        merchant_subcategory=req.merchant_subcategory,
        payment_type=req.payment_type,
        db=db
    )
