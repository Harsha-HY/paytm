import os
import traceback
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal, Base, db_init_error
import models
import cognee_memory
from routes.auth_routes import router as auth_router
from routes.admin_routes import router as admin_router
from routes.payment_routes import router as payment_router
from routes.rules_routes import router as rules_router
from routes.explain_routes import router as explain_router
from events import event_manager
from auth import hash_password

# Initialize tables and seed permanent admin
try:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        admin = db.query(models.User).filter(models.User.role == "admin").first()
        if not admin:
            admin_user = models.User(
                email="admin@gmail.com",
                hashed_password=hash_password("12345678"),
                role="admin",
                full_name="MDR System Admin"
            )
            db.add(admin_user)
            db.flush()
            admin_profile = models.AdminProfile(
                user_id=admin_user.id,
                department="Regulatory Compliance"
            )
            db.add(admin_profile)
            db.commit()
            print("[Database] Permanent admin account ready: admin@gmail.com")
except Exception as e:
    print(f"[Database Warning] Table creation / seeding: {e}")

app = FastAPI(
    title="MDR Settlement Guardian API",
    description="Backend services for MDR Settlement Guardian - Paytm Merchant Growth AI",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "traceback": traceback.format_exc()}
    )

@app.middleware("http")
async def vercel_path_normalizer(request, call_next):
    path = request.scope.get("path", "")
    if path in ["", "/"]:
        request.scope["path"] = "/"
    elif not path.startswith("/api") and not path.startswith("/docs") and not path.startswith("/openapi.json"):
        request.scope["path"] = f"/api{path}"
    return await call_next(request)

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
@app.get("/api")
@app.get("/api/")
def health_check():
    from database import db_init_error
    return {
        "status": "healthy",
        "service": "MDR Settlement Guardian API",
        "version": "1.0.0",
        "stage": "Stage 3 - LLM Explainer, Cognee Memory & Sarvam Voice",
        "database": str(engine.url),
        "db_error": str(db_init_error)
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
