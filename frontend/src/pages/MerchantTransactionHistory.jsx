import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import TransactionReceiptModal from '../components/TransactionReceiptModal';
import {
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  Clock,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Store,
  Download,
  Building2,
  Percent,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

export default function MerchantTransactionHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const merchant = user?.merchant_profile;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all'); // all, received, sent
  const [statusFilter, setStatusFilter] = useState('all'); // all, SUCCESS, PENDING, FAILED
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (directionFilter !== 'all') {
        params.append('filter_direction', directionFilter);
      }
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter !== 'all') params.append('date_range', dateFilter);

      const res = await apiRequest(`/payments/transactions?${params.toString()}`);
      setTransactions(res);
    } catch (err) {
      console.error('Error fetching merchant transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, directionFilter, statusFilter, dateFilter]);

  const clearFilters = () => {
    setSearch('');
    setDirectionFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters = search || directionFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all';

  // Quick stats from fetched data
  const receivedTxns = transactions.filter((t) => !t.is_sender);
  const sentTxns = transactions.filter((t) => t.is_sender);
  const totalGross = receivedTxns.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalMdr = receivedTxns.reduce((acc, t) => acc + (t.settlement?.mdr_amount || 0), 0);
  const totalGst = receivedTxns.reduce((acc, t) => acc + (t.settlement?.gst_amount || 0), 0);
  const totalNet = receivedTxns.reduce(
    (acc, t) => acc + (t.settlement?.net_settlement || t.amount || 0),
    0
  );
  const totalSent = sentTxns.reduce((acc, t) => acc + (t.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Compact Header */}
      <div className="bg-[#002970] text-white pt-6 pb-8 px-4 sm:px-6 lg:px-8 border-b border-sky-900 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/merchant')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Back to Merchant Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Merchant Transaction History & Ledger
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#00BAF2] text-slate-950">
                  {merchant?.business_category || 'Merchant'}
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                {merchant?.business_name || 'Business'} · Full record of payments received and payments made
              </p>
            </div>
          </div>

          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        {/* Aggregated Quick Metrics for View */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Customer Sales Received
            </span>
            <div className="text-base sm:text-lg font-black text-[#0A192F] mt-0.5">
              ₹{totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">({receivedTxns.length} received)</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
              Total MDR Fees
            </span>
            <div className="text-base sm:text-lg font-black text-rose-600 mt-0.5">
              - ₹{totalMdr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-rose-400 font-medium">Regulatory deductions</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
              Total 18% GST
            </span>
            <div className="text-base sm:text-lg font-black text-amber-700 mt-0.5">
              - ₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-amber-500 font-medium">Tax on MDR fee</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-sky-200 bg-sky-50/50 shadow-xs">
            <span className="text-[10px] font-bold text-[#002970] uppercase tracking-wider block">
              Expected Net Settlement
            </span>
            <div className="text-base sm:text-lg font-black text-[#002970] mt-0.5">
              ₹{totalNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            {totalSent > 0 && (
              <span className="text-[10px] text-rose-600 font-bold block">
                Payments made: -₹{totalSent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-6 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Transaction ID or counterparty's name..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Direction Filter Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setDirectionFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  directionFilter === 'all'
                    ? 'bg-white text-[#002970] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({transactions.length})
              </button>
              <button
                onClick={() => setDirectionFilter('received')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  directionFilter === 'received'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Money Received
              </button>
              <button
                onClick={() => setDirectionFilter('sent')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  directionFilter === 'sent'
                    ? 'bg-white text-rose-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Payments Made
              </button>
            </div>

            {/* Status filters */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-[#002970] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setStatusFilter('SUCCESS')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'SUCCESS'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Success
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'PENDING'
                    ? 'bg-white text-amber-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('FAILED')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'FAILED'
                    ? 'bg-white text-rose-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Failed
              </button>
            </div>

            {/* Date filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border-none text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#002970]"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-rose-600 font-bold hover:underline px-2 py-1 cursor-pointer"
              >
                Reset Filters
              </button>
            )}

            <div className="ml-auto text-xs font-semibold text-slate-400">
              {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Desktop Table & Mobile Cards */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#002970] mb-2" />
              Loading merchant ledger records...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 px-4">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No transactions found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No transactions match the selected criteria. Try resetting filters.'
                  : 'Display your Merchant QR code to receive customer payments or scan a QR to make payments.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#002970] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Responsive Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Counterparty & ID</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-right">MDR Fee</th>
                      <th className="py-3 px-4 text-right">GST (18%)</th>
                      <th className="py-3 px-4 text-right font-black text-[#002970]">Net Settlement</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => {
                      const s = t.settlement;
                      const isSent = t.is_sender;
                      const counterpartyName = isSent
                        ? (t.receiver_business_name || t.receiver_name)
                        : t.sender_name;
                      const dateObj = new Date(t.created_at);
                      const formattedDate = dateObj.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });
                      const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTxn(t)}
                          className="hover:bg-sky-50/50 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSent
                                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                }`}
                              >
                                {isSent ? (
                                  <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                  <ArrowDownLeft className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 group-hover:text-[#002970] truncate">
                                  {isSent ? `To: ${counterpartyName}` : `From: ${counterpartyName}`}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {t.txn_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isSent
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isSent ? 'Payment Made' : 'Customer Sale'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{formattedDate}</div>
                            <div className="text-[10px] text-slate-400">{formattedTime}</div>
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${isSent ? 'text-rose-600' : 'text-slate-900'}`}>
                            {isSent ? '-' : '+'}₹{t.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-rose-600 font-medium">
                            {isSent ? '—' : s ? `- ₹${s.mdr_amount.toFixed(2)}` : '₹0.00'}
                          </td>
                          <td className="py-3 px-4 text-right text-amber-700 font-medium">
                            {isSent ? '—' : s ? `- ₹${s.gst_amount.toFixed(2)}` : '₹0.00'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-sm">
                            {isSent ? (
                              <span className="text-rose-600">- ₹{t.amount.toFixed(2)}</span>
                            ) : (
                              <span className="text-[#002970]">₹{(s?.net_settlement || t.amount).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t.status || 'SUCCESS'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden divide-y divide-slate-100">
                {transactions.map((t) => {
                  const s = t.settlement;
                  const isSent = t.is_sender;
                  const counterpartyName = isSent
                    ? (t.receiver_business_name || t.receiver_name)
                    : t.sender_name;
                  const dateObj = new Date(t.created_at);

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTxn(t)}
                      className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isSent
                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}
                          >
                            {isSent ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {isSent ? `To: ${counterpartyName}` : counterpartyName}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {t.txn_id}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-black text-sm ${isSent ? 'text-rose-600' : 'text-slate-900'}`}>
                            {isSent ? '-' : '+'}₹{t.amount.toFixed(2)}
                          </div>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              isSent
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isSent ? 'Made' : 'Received'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          {dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ·{' '}
                          {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="flex items-center space-x-2">
                          {isSent ? (
                            <span className="text-rose-500 font-semibold">Debited from wallet</span>
                          ) : (
                            <>
                              <span className="text-rose-600 font-semibold">
                                MDR: {s ? `₹${s.mdr_amount.toFixed(2)}` : '₹0'}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="font-extrabold text-[#002970]">
                                Net: ₹{(s?.net_settlement || t.amount).toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Clickable Receipt Modal */}
      <TransactionReceiptModal
        txn={selectedTxn}
        isOpen={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
      />
    </div>
  );
}
