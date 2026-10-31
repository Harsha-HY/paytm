import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres.jgbsnhnyxykgqttomrol:%40Paytm246%21%40@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
)
SQLITE_PATH = os.path.join(BASE_DIR, "mdr_guardian.db")
SQLITE_URL = f"sqlite:///{SQLITE_PATH}"

# Ensure SSL requirement for Supabase
if "supabase.com" in DATABASE_URL and "sslmode" not in DATABASE_URL:
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"

is_serverless = bool(os.getenv("VERCEL"))

try:
    if DATABASE_URL.startswith("postgresql"):
        if is_serverless:
            from sqlalchemy.pool import NullPool
            engine = create_engine(
                DATABASE_URL,
                connect_args={"connect_timeout": 15},
                poolclass=NullPool
            )
        else:
            engine = create_engine(
                DATABASE_URL,
                connect_args={"connect_timeout": 15},
                pool_pre_ping=True,
                pool_recycle=300,
                pool_size=10,
                max_overflow=20
            )
    else:
        engine = create_engine(DATABASE_URL)
except Exception as e:
    print(f"[Database] Engine creation warning ({e}). Using SQLite fallback.")
    engine = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
