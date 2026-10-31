import React, { useState, useEffect } from 'react';
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
  Check
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

    // Subscribe to real-time events for instant updates without page refresh
    const unsubscribe = realtime.subscribe((event) => {
      if (
        event.type === 'TRANSACTION_CREATED' ||
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

  // Helper for quick date pills
  const setQuickDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDate(dateStr);
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
          <span>Simulated Merchant Settlement Platform — No Real Money Transferred</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded-md text-[#002970] border border-sky-300">
            MDR Audit Engine
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
                Primary linked settlement balance for instant payments and disbursements
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
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-[#00BAF2]" />
              </div>
              <span className="text-xs font-bold">My Merchant QR</span>
            </button>

            <button
              onClick={() => setShowScanner(true)}
              className="p-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-[#002970] border border-sky-200 flex flex-col items-center justify-center space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#002970] text-white flex items-center justify-center">
                <Scan className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Scan to Pay</span>
            </button>

            <button
              onClick={() => navigate('/merchant/history')}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 flex flex-col items-center justify-center space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold">All History</span>
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('daily-analysis-panel');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 flex flex-col items-center justify-center space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Daily Analysis</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DAILY SETTLEMENT ANALYSIS PANEL (RESETS AT 11:59:59 PM DAILY)  */}
        {/* ============================================================== */}
        <div id="daily-analysis-panel" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
          {/* Panel Header & Day Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-[#0A192F] text-lg">
                  Daily Settlement Analysis
                </h2>
                {dailyData.is_today && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400 text-slate-950 animate-pulse">
                    Today Live
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculates daily customer sales · Automatic settlement cutoff resets at{' '}
                <span className="font-bold text-slate-700">11:59:59 PM</span> everyday
              </p>
            </div>

            {/* Day Selector Buttons & Calendar Picker */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setQuickDate(0)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-[#002970] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Today (Live)
              </button>

              <button
                onClick={() => setQuickDate(1)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Yesterday
              </button>

              <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
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

          {/* EXACT 5 METRICS CARDS AS REQUESTED */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Total Customer Payments */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Customer Payments
                </span>
                <div className="text-xl sm:text-2xl font-black text-[#0A192F] mt-1 tracking-tight">
                  ₹{dailyData.gross_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-[11px] text-slate-400 mt-2 font-medium">Gross customer sales</span>
            </div>

            {/* 2. Total Transactions */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Transactions
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
                  {dailyData.total_transactions}
                </div>
              </div>
              <span className="text-[11px] text-slate-400 mt-2 font-medium">Simulated payments</span>
            </div>

            {/* 3. Estimated MDR Fees */}
            <div className="bg-white p-4 rounded-3xl border border-rose-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                  Estimated MDR Fees
                </span>
                <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1 tracking-tight">
                  - ₹{dailyData.total_mdr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-[11px] text-rose-400 mt-2 font-medium">Per regulatory schedule</span>
            </div>

            {/* 4. Estimated 18% GST */}
            <div className="bg-white p-4 rounded-3xl border border-amber-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                  Estimated 18% GST
                </span>
                <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1 tracking-tight">
                  - ₹{dailyData.total_gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-[11px] text-amber-500 mt-2 font-medium">Taxes on MDR fees</span>
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
              <span className="text-[11px] text-sky-200 mt-2 font-medium">Calculated net bank credit</span>
            </div>
          </div>

          {/* DAY-WISE TRANSACTIONS FEED FOR SELECTED DATE */}
          <div className="pt-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0A192F] text-sm sm:text-base">
                Transactions on {selectedDate} ({dailyData.transactions.length})
              </h3>
              <span className="text-xs text-slate-400">
                Tap any transaction to view receipt breakdown
              </span>
            </div>

            {dailyLoading ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#002970] mb-2" />
                Loading day-wise ledger...
              </div>
            ) : dailyData.transactions.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No customer payments on {selectedDate}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Payments received before 11:59:59 PM on this day will be calculated here.
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

          {/* ============================================================== */}
          {/* HISTORICAL DAYS ARCHIVE PANEL (OLD DAY DATA IS VISIBLE)        */}
          {/* ============================================================== */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3 className="font-extrabold text-[#0A192F] text-sm sm:text-base flex items-center space-x-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Past Days Settlement Archive</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Select any historical day to inspect its full transactions and deductions
                </p>
              </div>

              <button
                onClick={() => navigate('/merchant/history')}
                className="inline-flex items-center space-x-1 text-xs font-bold text-[#002970] hover:text-[#00BAF2] px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
              >
                <span>Full Ledger</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {dailyData.historical_days.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No past daily history recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Customer Payments</th>
                      <th className="py-2.5 px-3 text-center">Txns</th>
                      <th className="py-2.5 px-3 text-right">MDR Fees</th>
                      <th className="py-2.5 px-3 text-right">GST (18%)</th>
                      <th className="py-2.5 px-3 text-right text-[#002970] font-bold">Net Bank Credit</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyData.historical_days.map((d) => {
                      const isSelected = d.date === selectedDate;
                      return (
                        <tr
                          key={d.date}
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-sky-50/70 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <span>{d.date}</span>
                              {d.is_today && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                  Today
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-black text-slate-900">
                            ₹{d.gross_sales.toFixed(2)}
                          </td>

                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {d.total_transactions}
                          </td>

                          <td className="py-3 px-3 text-right text-rose-600 font-semibold">
                            {d.total_mdr > 0 ? `- ₹${d.total_mdr.toFixed(2)}` : '₹0.00'}
                          </td>

                          <td className="py-3 px-3 text-right text-amber-700 font-semibold">
                            {d.total_gst > 0 ? `- ₹${d.total_gst.toFixed(2)}` : '₹0.00'}
                          </td>

                          <td className="py-3 px-3 text-right font-black text-[#002970] text-sm">
                            ₹{d.expected_net_settlement.toFixed(2)}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedDate(d.date)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#002970] text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isSelected ? 'Viewing' : 'Inspect'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
