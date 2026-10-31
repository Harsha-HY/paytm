import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models # ensure all models are registered
import cognee_memory # ensure cognee memory model is registered
from routes.auth_routes import router as auth_router
from routes.admin_routes import router as admin_router
from routes.payment_routes import router as payment_router
from routes.rules_routes import router as rules_router
from routes.explain_routes import router as explain_router
from events import event_manager
from fastapi import WebSocket, WebSocketDisconnect

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MDR Settlement Guardian API",
    description="Backend services for MDR Settlement Guardian - Paytm Merchant Growth AI",
    version="1.0.0"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(payment_router)
app.include_router(rules_router)
app.include_router(explain_router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time bi-directional channel for instant dashboard synchronization."""
    await event_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        event_manager.disconnect(websocket)
    except Exception:
        event_manager.disconnect(websocket)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "MDR Settlement Guardian API",
        "version": "1.0.0",
        "stage": "Stage 3 - LLM Explainer, Cognee Memory & Sarvam Voice"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
