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
  Wallet,
  QrCode,
  Scan,
  Send,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Eye,
  EyeOff,
  Bell,
  User,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [wallet, setWallet] = useState({ balance: 50000, currency: 'INR' });
  const [overview, setOverview] = useState({
    wallet_balance: 50000,
    currency: 'INR',
    money_sent: 0,
    money_received: 0,
    total_transactions: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [resolvedRecipient, setResolvedRecipient] = useState(null);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [walletData, overviewData, txnData] = await Promise.all([
        apiRequest('/payments/wallet'),
        apiRequest('/payments/personal/overview').catch(() => null),
        apiRequest('/payments/transactions?limit=10'),
      ]);
      setWallet(walletData);
      if (overviewData) setOverview(overviewData);
      setTransactions(txnData);
    } catch (err) {
      console.error('Failed to load personal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = realtime.subscribe((event) => {
      if (event.type === 'TRANSACTION_CREATED') {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleTopup = async () => {
    try {
      const res = await apiRequest('/payments/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: 10000 }),
      });
      setWallet(res);
      loadData();
    } catch (err) {
      alert(`Topup error: ${err.message}`);
    }
  };

  const handleTargetResolved = (recipient) => {
    setResolvedRecipient(recipient);
  };

  const handlePaymentSuccess = () => {
    loadData();
  };

  // User initials for fintech avatar
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12">
      {/* Compact Fintech Application Header */}
      <div className="bg-[#002970] text-white pt-5 pb-6 px-4 sm:px-6 lg:px-8 border-b border-sky-950">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* User Avatar Circle */}
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00BAF2] to-sky-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-sky-500/20">
              {initials}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  {user?.full_name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400 text-slate-950">
                  Personal
                </span>
              </div>
              <p className="text-xs text-sky-200">
                +91 {user?.phone || 'XXXXXXXXXX'} · Zero-MDR Protected
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-3 space-y-4">
        {/* Compliance Pill */}
        <div className="bg-sky-100/80 border border-sky-200 text-[#002970] px-3.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-between">
          <span>Simulated Payment Platform — No Real Money Transferred</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded-md text-[#002970] border border-sky-300">
            Stage 2 Demo
          </span>
        </div>

        {/* Realistic Balance Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Available Simulated Balance
                </span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-slate-400 hover:text-slate-700 p-0.5 transition-colors cursor-pointer"
                  title={showBalance ? 'Hide balance' : 'Show balance'}
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

          {/* Quick Actions Grid (4 Distinct Rounded Buttons) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
            <button
              onClick={() => setShowScanner(true)}
              className="p-3.5 rounded-2xl bg-[#002970] hover:bg-[#0A192F] text-white flex flex-col items-center justify-center space-y-1.5 shadow-md shadow-[#002970]/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Scan className="w-5 h-5 text-[#00BAF2]" />
              </div>
              <span className="text-xs font-bold">Scan QR</span>
            </button>

            <button
              onClick={() => setShowScanner(true)}
              className="p-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-[#002970] border border-sky-200 flex flex-col items-center justify-center space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#002970] text-white flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Send Money</span>
            </button>

            <button
              onClick={() => setShowMyQR(true)}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 flex flex-col items-center justify-center space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold">My QR</span>
            </button>

            <button
              onClick={() => setShowMyQR(true)}
              className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 flex flex-col items-center justify-center space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Receive Money</span>
            </button>
          </div>
        </div>

        {/* Transaction Overview Metrics (3 Cards) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Money Sent
            </span>
            <div className="text-sm sm:text-base font-black text-rose-600 mt-0.5 truncate">
              - ₹{overview.money_sent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Money Received
            </span>
            <div className="text-sm sm:text-base font-black text-emerald-600 mt-0.5 truncate">
              + ₹{overview.money_received.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Transactions
            </span>
            <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
              {overview.total_transactions}
            </div>
          </div>
        </div>

        {/* Recent Transactions List with "See All" */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-[#0A192F] text-base">
                Recent Transactions
              </h3>
              <p className="text-xs text-slate-400">
                Tap any transaction to view receipt breakdown
              </p>
            </div>

            <button
              onClick={() => navigate('/personal/history')}
              className="inline-flex items-center space-x-1 text-xs font-bold text-[#002970] hover:text-[#00BAF2] px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
            >
              <span>See All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#002970] mb-2" />
              Loading real database transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No transactions recorded yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Scan another user's QR or a merchant QR to simulate your first payment.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-1">
              {transactions.slice(0, 5).map((t) => {
                const isSent = t.is_sender;
                const counterParty = isSent ? t.receiver_name : t.sender_name;
                const dateObj = new Date(t.created_at);
                const timeStr = dateObj.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTxn(t)}
                    className="py-3.5 px-2 flex items-center justify-between hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-105 ${
                          isSent
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}
                      >
                        {isSent ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {isSent ? `Paid to ${counterParty}` : `Received from ${counterParty}`}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                          <span>{formatDateTime(t.created_at)}</span>
                          <span>·</span>
                          <span className="capitalize">{t.txn_type}</span>
                          <span>·</span>
                          <span className="font-mono text-slate-400">{t.txn_id.slice(-8)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div
                        className={`font-black text-sm sm:text-base ${
                          isSent ? 'text-slate-900' : 'text-emerald-600'
                        }`}
                      >
                        {isSent ? '-' : '+'} ₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Success</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showMyQR && <MyQRCodeCard onClose={() => setShowMyQR(false)} />}

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onTargetResolved={handleTargetResolved}
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
