# MDR Settlement Guardian 🛡️💳
### *Track 1: Merchant Growth AI · Paytm Build for India*

**MDR Settlement Guardian** is a realistic, production-grade fintech simulated payment platform and central MDR (Merchant Discount Rate) rules engine. It dynamically decouples merchant QR identifiers from static discount rates, resolving real-time regulatory tariffs, computing exact 18% GST splits, and providing automated daily net settlement analytics for merchants and administrators.

---

## 🚀 Key Highlights & Architecture

- **Centralized MDR Rules Engine**:
  - Eliminates hardcoded rates in QR codes. The QR identifies the merchant; the backend rules engine resolves active regulatory tariffs dynamically.
  - Distinguishes **Zero MDR** (e.g. Grocery $\le$ ₹2,000, P2P transfers), **Percentage-based MDR with Caps** (e.g. Electronics 0.40% capped at ₹300), **Flat Fee MDR** (e.g. Petrol Stations flat ₹5/₹10), and **Pending Verification** modes.
  - Immutable historical audit trail snapshots stored with every transaction.
- **Dedicated 18% GST Compliance Box**:
  - Automatically calculates 18% Goods & Services Tax on regulatory MDR fees across all platform settlements.
  - Admin dashboard features a dedicated tax panel calculating system-wide GST collections from live database records.
- **Realistic Merchant Experience**:
  - Instant merchant registration with auto-verification (no manual admin approval bottleneck).
  - Day-wise settlement ledger featuring an automated **11:59:59 PM daily settlement cutoff**.
  - Historical settlement archives allowing merchants to inspect past days' deductions and net credits.
  - Full bidirectional visibility: tracks both **Customer Payments Received** and **Disbursements/Payments Made**.
- **Personal Fintech Experience**:
  - Streamlined modern banking UI with balance privacy toggles.
  - Simulated QR scanning and instant wallet top-ups.
  - Detailed receipts with complete breakdown (Sender, Receiver, Category, MDR, GST, Net Bank Credit).
- **Comprehensive Admin Control Center**:
  - Live database-backed platform metrics (zero mock or placeholder numbers).
  - Outlets & Category filters for the Transaction Ledger (Petrol Bunk, Hotel & Food, Kirana, Electronics, Telecom, Pharmacy).
  - Dynamic MDR Rule configuration & instant versioned publishing.
  - Merchant QR code management and lifecycle controls (Activate / Deactivate / Regenerate).

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, Uvicorn, WebSockets.
- **Database**: PostgreSQL (Supabase Connection Pooling with pgBouncer support).
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Authentication**: JWT (JSON Web Tokens) with PBKDF2-SHA256 password hashing.

---

## 📂 Project Structure

```text
mdr-settlement-guardian/
├── backend/
│   ├── routes/
│   │   ├── admin_routes.py      # Admin stats, merchant mgmt, ledger filters
│   │   ├── auth_routes.py       # Registration, login, auto-verification
│   │   ├── payment_routes.py    # Wallet, QR simulation, daily analysis
│   │   ├── rules_routes.py      # MDR rules endpoints
│   │   └── explain_routes.py    # AI breakdown & explanation routes
│   ├── auth.py                  # JWT validation & password hashing
│   ├── database.py              # Supabase PostgreSQL engine & pooling
│   ├── events.py                # WebSocket real-time event broadcaster
│   ├── main.py                  # FastAPI application entrypoint
│   ├── models.py                # Database models (User, Merchant, Txn, Settlement)
│   ├── rules_engine.py          # Central regulatory MDR calculation engine
│   ├── schemas.py               # Pydantic request/response schemas
│   └── test_e2e_complete_flow.py# 14-step automated verification test suite
├── frontend/
│   ├── src/
│   │   ├── components/          # ReceiptModal, QRScanner, MyQR, PaymentModal
│   │   ├── context/             # AuthContext (state & session management)
│   │   ├── pages/               # AdminDashboard, MerchantDashboard, PersonalDashboard
│   │   └── utils/               # Currency and datetime formatters
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## ⚡ Getting Started

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt  # fastapi uvicorn sqlalchemy psycopg websockets pydantic pyjwt passlib requests python-dotenv

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL database URL and JWT secret

# Run database migrations and seed default rules
python migrate_and_seed.py

# Start FastAPI server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd frontend

# Install node modules
npm install

# Start Vite dev server
npm run dev -- --host 127.0.0.1 --port 5173
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API Docs**: `http://localhost:8000/docs`

---

## 🔒 Permanent Admin Credentials

- **Email**: `admin@gmail.com`
- **Password**: `12345678`

---

## ⚖️ Simulated Environment Notice
All transactions, wallet balances, and settlements on this platform are strictly **simulated** for demonstration, regulatory sandbox compliance, and fintech hackathon testing. No real money or bank transfers occur.
