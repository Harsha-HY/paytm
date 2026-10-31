import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import TransactionReceiptModal from '../components/TransactionReceiptModal';
import {
  ArrowLeft,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

export default function PersonalTransactionHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all'); // all, sent, received
  const [typeFilter, setTypeFilter] = useState('all'); // all, P2P, P2M
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (search.trim()) params.append('search', search.trim());
      if (directionFilter !== 'all') params.append('filter_direction', directionFilter);
      if (typeFilter !== 'all') params.append('txn_type', typeFilter);
      if (dateFilter !== 'all') params.append('date_range', dateFilter);

      const res = await apiRequest(`/payments/transactions?${params.toString()}`);
      setTransactions(res);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, directionFilter, typeFilter, dateFilter]);

  const clearFilters = () => {
    setSearch('');
    setDirectionFilter('all');
    setTypeFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters = search || directionFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Compact Header */}
      <div className="bg-[#002970] text-white pt-6 pb-8 px-4 sm:px-6 lg:px-8 border-b border-sky-900 sticky top-16 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/personal')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Transaction History
              </h1>
              <p className="text-xs text-sky-200">
                Live database ledger · All personal payments & transfers
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-6 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Transaction ID or person's name..."
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

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Direction */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setDirectionFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  directionFilter === 'all'
                    ? 'bg-white text-[#002970] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDirectionFilter('sent')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  directionFilter === 'sent'
                    ? 'bg-white text-rose-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sent (-)
              </button>
              <button
                onClick={() => setDirectionFilter('received')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  directionFilter === 'received'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Received (+)
              </button>
            </div>

            {/* Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border-none text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#002970]"
            >
              <option value="all">All Types</option>
              <option value="P2P">P2P (Personal)</option>
              <option value="P2M">P2M (Merchant)</option>
            </select>

            {/* Date */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border-none text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#002970]"
            >
              <option value="all">All Time</option>
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
              {transactions.length} record{transactions.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#002970] mb-2" />
              Loading database records...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 px-4">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No transactions found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No transactions matched your search or filters. Try clearing filters.'
                  : 'You have not conducted any simulated payments yet.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#002970] text-white text-xs font-bold shadow-sm"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((t) => {
                const isSent = t.is_sender;
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
                  <div
                    key={t.id}
                    onClick={() => setSelectedTxn(t)}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {/* Avatar with initials or direction icon */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform group-hover:scale-105 ${
                          isSent
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}
                      >
                        {isSent ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {isSent ? t.receiver_name : t.sender_name}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {t.txn_type}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{formattedDate} at {formattedTime}</span>
                          <span>·</span>
                          <span className="font-mono text-slate-500 truncate max-w-[100px] sm:max-w-none">
                            {t.txn_id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <div
                        className={`font-black text-sm sm:text-base ${
                          isSent ? 'text-slate-900' : 'text-emerald-600'
                        }`}
                      >
                        {isSent ? '-' : '+'} ₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
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

      {/* Full Clickable Receipt Modal */}
      <TransactionReceiptModal
        txn={selectedTxn}
        isOpen={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
      />
    </div>
  );
}
