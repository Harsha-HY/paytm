import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres.jgbsnhnyxykgqttomrol:%40Paytm246%21%40@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
)

# On serverless (Vercel), only /tmp is writable
if os.getenv("VERCEL"):
    SQLITE_PATH = "/tmp/mdr_guardian.db"
else:
    SQLITE_PATH = os.path.join(BASE_DIR, "mdr_guardian.db")
SQLITE_URL = f"sqlite:///{SQLITE_PATH}"

# Ensure SSL requirement for Supabase
if "supabase.com" in DATABASE_URL and "sslmode" not in DATABASE_URL:
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"

is_serverless = bool(os.getenv("VERCEL"))

def create_db_engine():
    global DATABASE_URL
    urls_to_try = []
    if DATABASE_URL.startswith("postgresql+psycopg://"):
        urls_to_try.append(DATABASE_URL)
        urls_to_try.append(DATABASE_URL.replace("postgresql+psycopg://", "postgresql+psycopg2://"))
    elif DATABASE_URL.startswith("postgresql://"):
        urls_to_try.append(DATABASE_URL.replace("postgresql://", "postgresql+psycopg://"))
        urls_to_try.append(DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://"))
        urls_to_try.append(DATABASE_URL)
    else:
        urls_to_try.append(DATABASE_URL)

    last_err = None
    for url in urls_to_try:
        try:
            if is_serverless:
                eng = create_engine(
                    url,
                    connect_args={"connect_timeout": 15},
                    poolclass=NullPool
                )
            else:
                eng = create_engine(
                    url,
                    connect_args={"connect_timeout": 15},
                    pool_pre_ping=True,
                    pool_recycle=300,
                    pool_size=10,
                    max_overflow=20
                )
            return eng
        except Exception as e:
            last_err = e
            continue

    print(f"[Database Error] All PostgreSQL drivers failed: {last_err}. Using /tmp fallback.")
    return create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
