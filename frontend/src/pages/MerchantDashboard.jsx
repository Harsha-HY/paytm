import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import MyQRCodeCard from '../components/MyQRCodeCard';
import QRScannerModal from '../components/QRScannerModal';
import PaymentModal from '../components/PaymentModal';
import TransactionReceiptModal from '../components/TransactionReceiptModal';
import MobileBottomNav from '../components/MobileBottomNav';
import { realtime } from '../api/realtime';
import { formatDateTime, formatCurrency } from '../utils/formatters';
import {
  Store,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Scan,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Percent,
  Receipt,
  FileText,
  DollarSign,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Eye,
  EyeOff,
  PlusCircle,
  Calendar,
  History,
  Check,
  Upload,
  Download,
  Scale,
  Sparkles,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export default function MerchantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const merchant = user?.merchant_profile;

  // Real-time backend wallet balance
  const [wallet, setWallet] = useState({ balance: 50000, currency: 'INR' });
  const [showBalance, setShowBalance] = useState(true);

  // Daily Analysis State
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dailyData, setDailyData] = useState({
    selected_date: todayStr,
    is_today: true,
    reset_cutoff_time: '23:59:59',
    gross_sales: 0,
    total_transactions: 0,
    total_mdr: 0,
    total_gst: 0,
    total_deductions: 0,
    expected_net_settlement: 0,
    transactions: [],
    historical_days: []
  });

  const [loading, setLoading] = useState(true);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Reconciliation State
  const [reconciliationData, setReconciliationData] = useState(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileError, setReconcileError] = useState('');
  const csvFileInputRef = useRef(null);

  // Modals state
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [resolvedRecipient, setResolvedRecipient] = useState(null);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const loadWallet = async () => {
    try {
      const walletRes = await apiRequest('/payments/wallet');
      setWallet(walletRes);
    } catch (err) {
      console.error('Failed to load wallet:', err);
    }
  };

  const loadDailyAnalysis = async (targetDate) => {
    try {
      setDailyLoading(true);
      const queryDate = targetDate || selectedDate;
      const res = await apiRequest(`/payments/merchant/daily-analysis?target_date=${queryDate}`);
      setDailyData(res);
    } catch (err) {
      console.error('Failed to load daily analysis:', err);
    } finally {
      setDailyLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
    loadDailyAnalysis(selectedDate);

    // Event-driven WebSocket synchronization
    const unsubscribe = realtime.subscribe((event) => {
      if (
        event.type === 'TRANSACTION_CREATED' ||
        event.type === 'WALLET_TOPPED_UP' ||
        event.type === 'MERCHANT_STATUS_UPDATED' ||
        event.type === 'MERCHANT_CATEGORY_UPDATED' ||
        event.type === 'MDR_RULE_UPDATED' ||
        event.type === 'QR_STATUS_UPDATED' ||
        event.type === 'QR_REGENERATED'
      ) {
        loadWallet();
        loadDailyAnalysis(selectedDate);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedDate]);

  const handleTopup = async () => {
    try {
      const res = await apiRequest('/payments/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: 10000 }),
      });
      setWallet(res);
    } catch (err) {
      alert(`Topup error: ${err.message}`);
    }
  };

  const handlePaymentSuccess = () => {
    loadWallet();
    loadDailyAnalysis(selectedDate);
  };

  const handleDownloadSampleCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payments/reconciliation/sample-csv', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Settlement_Report_Sample_${user?.id || 'demo'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Error downloading sample CSV: ' + err.message);
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReconcileLoading(true);
    setReconcileError('');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/payments/reconciliation/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.detail || 'Reconciliation upload failed');
      }

      const data = await response.json();
      setReconciliationData(data);
    } catch (err) {
      setReconcileError(err.message || 'Error processing CSV file.');
    } finally {
      setReconcileLoading(false);
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  const handleUpdateRecordStatus = (recordId, newStatus) => {
    if (!reconciliationData) return;
    const updatedRecords = reconciliationData.records.map(r => {
      if (r.id === recordId) {
        return { ...r, status: newStatus };
      }
      return r;
    });

    const matchedCount = updatedRecords.filter(r => r.status === 'MATCHED').length;
    const timingCount = updatedRecords.filter(r => r.status === 'TIMING_DIFFERENCE').length;
    const discCount = updatedRecords.filter(r => r.status === 'DISCREPANCY').length;

    setReconciliationData({
      ...reconciliationData,
      summary: {
        ...reconciliationData.summary,
        matched_records: matchedCount,
        timing_differences: timingCount,
        discrepancies: discCount
      },
      records: updatedRecords
    });
  };

  const isPending = merchant?.verification_status === 'Pending';
  const isVerified = merchant?.verification_status === 'Verified';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12">
      {/* Compact Fintech Merchant Header */}
      <div className="bg-[#002970] text-white pt-5 pb-6 px-4 sm:px-6 lg:px-8 border-b border-sky-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00BAF2] to-sky-400 text-slate-950 font-black flex items-center justify-center text-lg shadow-md shadow-sky-500/20">
              <Store className="w-6 h-6 text-slate-950" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {merchant?.business_name || 'Merchant Shop'}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    isPending
                      ? 'bg-amber-400 text-slate-950'
                      : isVerified
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-rose-400 text-slate-950'
                  }`}
                >
                  {merchant?.verification_status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                Owner: <span className="text-white font-semibold">{user?.full_name}</span> · Category:{' '}
                <span className="text-white font-semibold">{merchant?.business_category || 'Retail'}</span> ·{' '}
                {merchant?.city || 'India'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                loadWallet();
                loadDailyAnalysis(selectedDate);
              }}
              disabled={loading || dailyLoading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Refresh Daily Ledger"
            >
              <RefreshCw className={`w-4 h-4 ${loading || dailyLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-3 space-y-4">
        {/* Compliance Notice */}
        <div className="bg-sky-100/80 border border-sky-200 text-[#002970] px-3.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-between">
          <span>DEMO PAYMENT — NO REAL MONEY TRANSFERRED.</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded-md text-[#002970] border border-sky-300">
            MDR Settlement Guardian
          </span>
        </div>

        {/* ============================================================== */}
        {/* REALISTIC MERCHANT CHECK BALANCE SECTION                       */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Available Merchant Account Balance
                </span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-slate-400 hover:text-slate-700 p-0.5 transition-colors cursor-pointer"
                  title={showBalance ? 'Hide balance' : 'Check balance'}
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-3xl sm:text-4xl font-black text-[#0A192F] mt-1 tracking-tight flex items-baseline">
                {showBalance ? (
                  <>
                    <span className="text-xl sm:text-2xl mr-1 font-bold text-slate-400">₹</span>
                    {wallet.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </>
                ) : (
                  <span className="tracking-widest text-slate-400">₹ ••••••••</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Net settlement credited directly after MDR and GST deductions
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleTopup}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#002970] font-bold text-xs border border-sky-200 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#00BAF2]" />
                <span>+ Add ₹10,000 Demo Funds</span>
              </button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
            <button
              onClick={() => setShowMyQR(true)}
              className="p-3.5 rounded-2xl bg-[#002970] hover:bg-[#0A192F] text-white flex flex-col items-center justify-center space-y-1.5 shadow-md shadow-[#002970]/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <QrCode className="w-5 h-5 text-[#00BAF2]" />
              <span className="text-xs font-bold">My Store QR</span>
              <span className="text-[10px] text-sky-200">Show / Download QR</span>
            </button>

            <button
              onClick={() => setShowScanner(true)}
              className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 flex flex-col items-center justify-center space-y-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Scan className="w-5 h-5 text-[#002970]" />
              <span className="text-xs font-bold">Scan Any QR</span>
              <span className="text-[10px] text-slate-400">Live Camera Scan</span>
            </button>

            <button
              onClick={() => {
                const reconcSec = document.getElementById('reconciliation-section');
                if (reconcSec) reconcSec.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 flex flex-col items-center justify-center space-y-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold">Reconcile CSV</span>
              <span className="text-[10px] text-slate-400">Match Bank Reports</span>
            </button>

            <button
              onClick={() => navigate('/merchant/history')}
              className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 flex flex-col items-center justify-center space-y-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <History className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-bold">Full Ledger</span>
              <span className="text-[10px] text-slate-400">Audit History</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PART 3: VERIFIED MERCHANT PROFILE & CLASSIFICATION CARD         */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-[#002970]" />
              <h2 className="font-extrabold text-[#0A192F] text-base">Verified Merchant Classification Profile</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              Merchant ID: MERCH_{user?.id}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Merchant Shop Name</span>
              <span className="font-bold text-slate-900 block mt-0.5">{merchant?.business_name || user?.full_name}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Approved Category</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {merchant?.business_category || 'General Merchant'}
                {merchant?.business_subcategory && <span className="text-slate-500 font-normal"> · {merchant.business_subcategory}</span>}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Settlement Bank</span>
              <span className="font-bold text-slate-900 block mt-0.5">{merchant?.merchant_bank || 'State Bank of India'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">QR / Payment Provider</span>
              <span className="font-bold text-slate-900 block mt-0.5">{merchant?.qr_provider || 'Paytm for Business'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Acquiring Bank</span>
              <span className="font-bold text-slate-900 block mt-0.5">{merchant?.acquiring_bank || 'Axis Bank Ltd'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly Eligible Receipts</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                ₹{(merchant?.monthly_eligible_receipts || 45000).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">P2PM Eligibility Status</span>
              <span className={`font-bold block mt-0.5 ${merchant?.p2pm_eligible ? 'text-emerald-700' : 'text-slate-700'}`}>
                {merchant?.p2pm_eligible ? '✅ Eligible (≤ ₹1 Lakh Exemption)' : 'Standard Commercial Merchant'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Applicable MDR Rule</span>
              <span className="font-bold text-[#002970] block mt-0.5">{merchant?.applicable_mdr_rule || 'DEMO_CONFIG_RULE'}</span>
            </div>
          </div>

          <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-2xl text-[11px] text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-[#002970]">Responsible GST Tax Invoice Supplier: </span>
              <span>{merchant?.gst_invoice_supplier || 'Acquiring Bank (Axis Bank Ltd) - GSTIN 27AAACA0000A1Z5'}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Effective Date: {formatDateTime(merchant?.created_at)}
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PART 8: MERCHANT DASHBOARD 5 METRIC CARDS & TRANSACTIONS       */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
          {/* Section Header with Day Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-[#002970]" />
                <h2 className="font-extrabold text-[#0A192F] text-base sm:text-lg">Daily Settlement Overview</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Every transaction resets at 11:59:59 PM. Past dates are preserved in archive.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDate === todayStr ? 'bg-[#002970] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  max={todayStr}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 5 KEY METRICS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Total Customer Payments */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Demo Sales
                </span>
                <div className="text-xl sm:text-2xl font-black text-[#0A192F] mt-1 tracking-tight">
                  ₹{dailyData.gross_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-[11px] text-slate-400 mt-2 font-medium">Gross customer payments</span>
            </div>

            {/* 2. Total Transactions */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Number of Transactions
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
                  {dailyData.total_transactions}
                </div>
              </div>
              <span className="text-[11px] text-slate-400 mt-2 font-medium">Demo payments</span>
            </div>

            {/* 3. Estimated MDR Fees */}
            <div className="bg-white p-4 rounded-3xl border border-rose-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                  Total Estimated MDR
                </span>
                <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1 tracking-tight">
                  - ₹{dailyData.total_mdr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-[11px] text-rose-400 mt-2 font-medium">Per verified demo policy</span>
            </div>

            {/* 4. Estimated 18% GST */}
            <div className="bg-white p-4 rounded-3xl border border-amber-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                  Total Estimated GST (18%)
                </span>
                <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1 tracking-tight">
                  - ₹{dailyData.total_gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-[11px] text-amber-500 mt-2 font-medium">18% GST on MDR fee</span>
            </div>

            {/* 5. Expected Net Settlement */}
            <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-[#002970] to-[#0A192F] text-white p-4 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-sky-300 uppercase tracking-wider block">
                  Expected Net Settlement
                </span>
                <div className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                  ₹{dailyData.expected_net_settlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-[11px] text-sky-200 mt-2 font-medium">Calculated bank credit</span>
            </div>
          </div>

          {/* DAY-WISE TRANSACTIONS FEED FOR SELECTED DATE */}
          <div className="pt-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0A192F] text-sm sm:text-base">
                Recent Transactions on {selectedDate} ({dailyData.transactions.length})
              </h3>
              <span className="text-xs text-slate-400">
                Tap any transaction to view receipt breakdown & AI assistant
              </span>
            </div>

            {dailyLoading ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#002970] mb-2" />
                Loading ledger...
              </div>
            ) : dailyData.transactions.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No customer payments on {selectedDate}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Payments received before 11:59:59 PM on this day will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-1">
                {dailyData.transactions.map((t) => {
                  const s = t.settlement;
                  const timeFormatted = formatDateTime(t.created_at);
                  const isSent = t.is_sender;

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTxn(t)}
                      className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSent
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}
                        >
                          {isSent ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm truncate flex items-center space-x-1.5">
                            <span>{isSent ? (t.receiver_business_name || t.receiver_name) : t.sender_name}</span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                isSent ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isSent ? 'Money Sent' : 'Money Received'}
                            </span>
                            {s && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-100 text-[#002970]">
                                {s.applied_rate || s.mdr_rate}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                            <span>{timeFormatted}</span>
                            <span>·</span>
                            <span className="font-mono">{t.txn_id}</span>
                            {t.note && (
                              <>
                                <span>·</span>
                                <span className="italic truncate max-w-[120px]">"{t.note}"</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <div className={`font-black text-sm sm:text-base ${isSent ? 'text-rose-600' : 'text-slate-900'}`}>
                          {isSent ? '-' : '+'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {isSent ? (
                            <span className="text-rose-500 font-semibold">Debited from wallet</span>
                          ) : (
                            <>
                              Net: <span className="font-bold text-[#002970]">₹{(s?.net_settlement || t.amount).toFixed(2)}</span>
                              {s && <span className="text-rose-600 ml-1">(-₹{s.total_deductions.toFixed(2)})</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* PART 9: SETTLEMENT RECONCILIATION CSV UPLOAD & AUDIT PANEL     */}
        {/* ============================================================== */}
        <div id="reconciliation-section" className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h2 className="font-extrabold text-[#0A192F] text-base">Settlement Reconciliation & Bank Audit</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload bank/aggregator settlement CSV to detect missing credits, duplicate deductions, and timing holdbacks.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadSampleCSV}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sample CSV</span>
              </button>

              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVUpload}
              />

              <button
                onClick={() => csvFileInputRef.current?.click()}
                disabled={reconcileLoading}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-[#002970] hover:bg-[#0A192F] text-white text-xs font-bold shadow-md shadow-[#002970]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-[#00BAF2]" />
                <span>{reconcileLoading ? 'Auditing CSV...' : 'Upload Settlement CSV'}</span>
              </button>
            </div>
          </div>

          {reconcileError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{reconcileError}</span>
            </div>
          )}

          {/* Reconciliation Results Display */}
          {reconciliationData && (
            <div className="space-y-4 animate-in fade-in">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Audited Records</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{reconciliationData.summary.total_records}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Matched (Accurate)</span>
                  <div className="text-2xl font-black text-emerald-800 mt-1">{reconciliationData.summary.matched_records}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Timing Differences</span>
                  <div className="text-2xl font-black text-amber-800 mt-1">{reconciliationData.summary.timing_differences}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Discrepancies</span>
                  <div className="text-2xl font-black text-rose-800 mt-1">{reconciliationData.summary.discrepancies}</div>
                </div>
              </div>

              {/* Records Breakdown Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Txn ID / Ref</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Gross Amount</th>
                      <th className="py-2.5 px-3 text-right">Expected Net</th>
                      <th className="py-2.5 px-3 text-right">Actual Credit</th>
                      <th className="py-2.5 px-3 text-right">Difference</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reconciliationData.records.map((rec) => {
                      const isMatched = rec.status === 'MATCHED';
                      const isTiming = rec.status === 'TIMING_DIFFERENCE';
                      const isDisc = rec.status === 'DISCREPANCY';

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-900">{rec.txn_id}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{rec.settlement_ref}</div>
                          </td>

                          <td className="py-3 px-3 text-slate-600">
                            {rec.settlement_date}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            ₹{rec.gross_amount.toFixed(2)}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-[#002970]">
                            ₹{rec.expected_net.toFixed(2)}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            ₹{rec.actual_credit.toFixed(2)}
                          </td>

                          <td className={`py-3 px-3 text-right font-bold ${rec.difference < 0 ? 'text-rose-600' : rec.difference > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {rec.difference === 0 ? '₹0.00' : `${rec.difference < 0 ? '-' : '+'}₹${Math.abs(rec.difference).toFixed(2)}`}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <select
                              value={rec.status}
                              onChange={(e) => handleUpdateRecordStatus(rec.id, e.target.value)}
                              className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full border cursor-pointer focus:outline-none ${
                                isMatched
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : isTiming
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300'
                              }`}
                            >
                              <option value="MATCHED">Matched</option>
                              <option value="TIMING_DIFFERENCE">Timing Difference</option>
                              <option value="DISCREPANCY">Discrepancy</option>
                            </select>
                          </td>

                          <td className="py-3 px-3 text-slate-600 text-[11px]">
                            {rec.reason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showMyQR && <MyQRCodeCard onClose={() => setShowMyQR(false)} />}

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onTargetResolved={(recipient) => setResolvedRecipient(recipient)}
      />

      <PaymentModal
        recipient={resolvedRecipient}
        isOpen={Boolean(resolvedRecipient)}
        onClose={() => setResolvedRecipient(null)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <TransactionReceiptModal
        txn={selectedTxn}
        isOpen={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
      />

      <MobileBottomNav
        onScan={() => setShowScanner(true)}
        onMyQR={() => setShowMyQR(true)}
      />
    </div>
  );
}
