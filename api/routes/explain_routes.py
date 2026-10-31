import csv
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from database import get_db
from models import User, Transaction, TransactionSettlement
from auth import get_current_user
from cognee_memory import recall_memories, save_memory
from llm_explainer import (
    generate_vernacular_story,
    explain_single_transaction,
    generate_dispute_letter
)
from sarvam_voice import synthesize_sarvam_speech

router = APIRouter(prefix="/api/explain", tags=["LLM Explainer & Sarvam Voice"])

class SpeakRequest(BaseModel):
    text: str
    language: str = "Kannada"

class SetLanguageRequest(BaseModel):
    language: str

class DisputeDraftRequest(BaseModel):
    txn_id: str
    actual_deducted_mdr: float
    actual_deducted_gst: float
    language: Optional[str] = "English"

@router.get("/settlement")
def get_merchant_explanation(
    language: Optional[str] = Query(None, description="Target language: Kannada, Hindi, Tamil, Telugu, English"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Combines Deterministic Rules Engine numbers with Cognee Memory and Sarvam Voice.
    Returns vernacular scripts and synthesized audio in the merchant's language.
    """
    if current_user.account_type != "merchant":
        raise HTTPException(status_code=400, detail="Only merchant accounts can access settlement voice explainers.")

    # 1. Recall Cognee Memory for this merchant
    memory_context = recall_memories(db, current_user.id)
    active_lang = language or memory_context.get("preferred_language", "Kannada")

    # 2. Get merchant's actual recorded transactions from database
    txns = db.query(Transaction).filter(
        Transaction.receiver_id == current_user.id,
        Transaction.txn_type == "P2M"
    ).all()

    gross_total = sum(t.amount for t in txns)
    mdr_total = 0.0
    gst_total = 0.0
    net_total = 0.0
    chargeable_count = 0

    for t in txns:
        if t.settlement:
            mdr_total += t.settlement.mdr_amount
            gst_total += t.settlement.gst_amount
            net_total += t.settlement.net_settlement
            if t.settlement.mdr_amount > 0:
                chargeable_count += 1
        else:
            net_total += t.amount

    if not txns:
        gross_total = 96500.00
        mdr_total = 360.00
        gst_total = 64.80
        net_total = 96075.20
        chargeable_count = 3
        txn_count = 4
    else:
        txn_count = len(txns)

    total_deductions = round(mdr_total + gst_total, 2)

    merchant_name = current_user.full_name
    business_name = current_user.merchant_profile.business_name if current_user.merchant_profile else "Your Shop"

    # 3. Generate Vernacular Story via LLM Explainer
    story = generate_vernacular_story(
        merchant_name=merchant_name,
        business_name=business_name,
        gross_amount=round(gross_total, 2),
        mdr_amount=round(mdr_total, 2),
        gst_amount=round(gst_total, 2),
        total_deductions=total_deductions,
        net_settlement=round(net_total, 2),
        transactions_count=txn_count,
        chargeable_txns_count=chargeable_count,
        language=active_lang
    )

    # 4. Synthesize Sarvam Speech Audio
    voice_data = synthesize_sarvam_speech(story["active_script"], language=active_lang)

    # 5. Store current settlement in Cognee memory
    save_memory(
        db,
        user_id=current_user.id,
        memory_type="settlement_history",
        memory_key=f"settlement_{datetime.utcnow().strftime('%Y%m%d')}",
        data={
            "gross_amount": gross_total,
            "mdr_amount": mdr_total,
            "gst_amount": gst_total,
            "net_settlement": net_total,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

    return {
        "merchant_name": merchant_name,
        "business_name": business_name,
        "language": active_lang,
        "active_script": story["active_script"],
        "scripts": {
            "kannada": story["kannada"],
            "hindi": story["hindi"],
            "tamil": story["tamil"],
            "telugu": story["telugu"],
            "english": story["english"]
        },
        "voice": voice_data,
        "cognee_memory": {
            "settlements_remembered": memory_context["settlements_count"] + 1,
            "open_disputes": len(memory_context["open_disputes"]),
            "preferred_language": active_lang,
            "itc_accumulated": round(memory_context["itc_accumulated"] + gst_total, 2)
        },
        "metrics": story["metrics"]
    }

@router.post("/speak")
def speak_custom_text(req: SpeakRequest):
    """Generates Sarvam voice audio for any custom text and language."""
    return synthesize_sarvam_speech(req.text, language=req.language)

@router.get("/cognee")
def get_cognee_memory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Inspects the Cognee memory profile for the current merchant."""
    return recall_memories(db, current_user.id)

@router.post("/set-language")
def set_preferred_language(
    req: SetLanguageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves merchant's preferred vernacular language in Cognee memory."""
    mem = save_memory(
        db,
        user_id=current_user.id,
        memory_type="preference",
        memory_key="language_preference",
        data={"preferred_language": req.language}
    )
    return {"status": "success", "preferred_language": req.language}

@router.get("/transaction/{txn_id}")
def get_transaction_explanation(
    txn_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns AI Merchant Assistant explanations in English, Hindi, and Kannada
    for a specific transaction, strictly grounded in the rules engine calculation.
    """
    txn = db.query(Transaction).filter(Transaction.txn_id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    settlement = txn.settlement
    if not settlement:
        return {
            "txn_id": txn.txn_id,
            "amount": txn.amount,
            "category": "P2P / Personal",
            "mdr_rate": "0%",
            "mdr_amount": 0.0,
            "gst_amount": 0.0,
            "net_settlement": txn.amount,
            "explanations": {
                "english": f"Personal P2P transfer of ₹{txn.amount:,.2f} is 100% exempt from merchant MDR and GST.",
                "hindi": f"व्यक्तिगत P2P ट्रांसफर (₹{txn.amount:,.2f}) पर 0% MDR और GST छूट लागू है।",
                "kannada": f"ವೈಯಕ್ತಿಕ P2P ವರ್ಗಾವಣೆ (₹{txn.amount:,.2f}) ಮೇಲೆ ಯಾವುದೇ MDR ಅಥವಾ GST ಕಡಿತವಿಲ್ಲ."
            }
        }

    merchant_user = txn.receiver
    p2pm_el = False
    if merchant_user and merchant_user.merchant_profile:
        p2pm_el = getattr(merchant_user.merchant_profile, "p2pm_eligible", False)

    explanations = explain_single_transaction(
        amount=txn.amount,
        category=settlement.business_category or "General Merchant",
        subcategory=settlement.business_subcategory,
        mdr_rate=settlement.mdr_rate,
        mdr_amount=settlement.mdr_amount,
        gst_amount=settlement.gst_amount,
        net_settlement=settlement.net_settlement,
        rule_name=settlement.mdr_rule,
        p2pm_eligible=p2pm_el
    )

    return {
        "txn_id": txn.txn_id,
        "amount": txn.amount,
        "category": settlement.business_category,
        "subcategory": settlement.business_subcategory,
        "mdr_rate": settlement.mdr_rate,
        "mdr_amount": settlement.mdr_amount,
        "gst_amount": settlement.gst_amount,
        "total_deductions": settlement.total_deductions,
        "net_settlement": settlement.net_settlement,
        "rule_name": settlement.mdr_rule,
        "explanations": explanations
    }

@router.post("/dispute-draft")
def get_dispute_draft(
    req: DisputeDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a formal dispute draft letter in English, Hindi, and Kannada
    for reporting incorrect settlement deductions to the acquiring bank / QR provider.
    """
    txn = db.query(Transaction).filter(Transaction.txn_id == req.txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    expected_mdr = txn.settlement.mdr_amount if txn.settlement else 0.0
    expected_gst = txn.settlement.gst_amount if txn.settlement else 0.0

    b_name = current_user.merchant_profile.business_name if current_user.merchant_profile else current_user.full_name
    m_bank = getattr(current_user.merchant_profile, "merchant_bank", "State Bank of India") if current_user.merchant_profile else "State Bank of India"
    q_prov = getattr(current_user.merchant_profile, "qr_provider", "Paytm for Business") if current_user.merchant_profile else "Paytm for Business"
    acq_bank = getattr(current_user.merchant_profile, "acquiring_bank", "Axis Bank Ltd") if current_user.merchant_profile else "Axis Bank Ltd"

    letter_bundle = generate_dispute_letter(
        merchant_name=current_user.full_name,
        business_name=b_name,
        acquiring_bank=acq_bank,
        merchant_bank=m_bank,
        qr_provider=q_prov,
        txn_id=txn.txn_id,
        gross_amount=txn.amount,
        expected_mdr=expected_mdr,
        actual_deducted_mdr=req.actual_deducted_mdr,
        expected_gst=expected_gst,
        actual_deducted_gst=req.actual_deducted_gst,
        language=req.language or "English"
    )

    return letter_bundle
