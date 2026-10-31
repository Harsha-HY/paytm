import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from database import Base, get_db

class CogneeMemory(Base):
    __tablename__ = "cognee_memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    memory_type = Column(String(50), nullable=False) # 'profile', 'settlement_history', 'dispute', 'preference'
    memory_key = Column(String(100), nullable=False, index=True)
    content_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def save_memory(db: Session, user_id: int, memory_type: str, memory_key: str, data: Dict[str, Any]) -> CogneeMemory:
    """Stores or updates a memory node for a merchant in Cognee memory store."""
    existing = db.query(CogneeMemory).filter(
        CogneeMemory.user_id == user_id,
        CogneeMemory.memory_type == memory_type,
        CogneeMemory.memory_key == memory_key
    ).first()

    if existing:
        existing.content_json = json.dumps(data)
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_mem = CogneeMemory(
            user_id=user_id,
            memory_type=memory_type,
            memory_key=memory_key,
            content_json=json.dumps(data),
            created_at=datetime.utcnow()
        )
        db.add(new_mem)
        db.commit()
        db.refresh(new_mem)
        return new_mem

def recall_memories(db: Session, user_id: int) -> Dict[str, Any]:
    """Retrieves all connected memory graphs and past settlement context for a merchant."""
    memories = db.query(CogneeMemory).filter(CogneeMemory.user_id == user_id).all()
    context = {
        "preferred_language": "Kannada", # default Indic preference
        "language_code": "kn-IN",
        "settlements_count": 0,
        "past_settlements": [],
        "open_disputes": [],
        "risk_profile": "Standard Merchant",
        "itc_accumulated": 0.0,
        "dispute_history": []
    }

    for m in memories:
        try:
            parsed = json.loads(m.content_json)
            if m.memory_type == "preference":
                context["preferred_language"] = parsed.get("preferred_language", context["preferred_language"])
                context["language_code"] = parsed.get("language_code", context["language_code"])
            elif m.memory_type == "settlement_history":
                context["past_settlements"].append(parsed)
                context["settlements_count"] += 1
                context["itc_accumulated"] += float(parsed.get("gst_amount", 0.0))
            elif m.memory_type == "dispute":
                context["dispute_history"].append(parsed)
                if parsed.get("status") in ["Open", "Pending"]:
                    context["open_disputes"].append(parsed)
        except Exception:
            pass

    return context
