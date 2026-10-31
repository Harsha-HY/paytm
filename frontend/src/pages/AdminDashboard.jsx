import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import MobileBottomNav from '../components/MobileBottomNav';
import TransactionReceiptModal from '../components/TransactionReceiptModal';
import { realtime } from '../api/realtime';
import { formatDateTime, formatCurrency } from '../utils/formatters';
import {
  Users,
  Store,
  UserCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  Calendar,
  Building2,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  Eye,
  LogOut,
  Receipt,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  CheckCircle2,
  TrendingUp,
  Percent,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  History,
  Tag,
  Plus,
  Play,
  Check,
  RotateCw
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'merchants' | 'rules' | 'qrs' | 'transactions' | 'audit'

  // Live Database Statistics
  const [stats, setStats] = useState({
    total_users: 0,
    total_personal: 0,
    total_merchants: 0,
    pending_merchants: 0,
    verified_merchants: 0,
    rejected_merchants: 0,
    total_qrs: 0,
    active_qrs: 0,
    inactive_qrs: 0,
    total_transactions: 0,
    successful_transactions: 0,
    pending_transactions: 0,
    failed_transactions: 0,
    total_gross_volume: 0.0,
    total_calculated_mdr: 0.0,
    total_gst: 0.0,
    total_expected_settlement: 0.0,
  });

  // Merchants & Users State
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userCategoryFilter, setUserCategoryFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  // Categories & Subcategories
  const [categories, setCategories] = useState([]);

  // Change Category Modal State
  const [categoryModalUser, setCategoryModalUser] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('General');

  // MDR Rules State
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [selectedRuleCategory, setSelectedRuleCategory] = useState('all');

  // Rule Publish & Preview Modal State
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleFormData, setRuleFormData] = useState({
    business_category: 'Consumer Electronics & Mobile',
    business_subcategory: '',
    calculation_type: 'PERCENTAGE',
    rate_percentage: 0.40,
    fixed_fee: 0.0,
    min_amount: 2000.0,
    max_cap: 300.0,
    gst_rate: 0.18,
    tax_treatment: 'TAXABLE_18',
    eligibility_conditions: '',
    change_summary: 'Regulatory MDR schedule update'
  });
  const [rulePreview, setRulePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // QR Management State
  const [qrs, setQrs] = useState([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSearch, setQrSearch] = useState('');
  const [qrStatusFilter, setQrStatusFilter] = useState('all');

  // Platform Transactions State
  const [transactions, setTransactions] = useState([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnSearch, setTxnSearch] = useState('');
  const [txnType, setTxnType] = useState('all');
  const [txnStatus, setTxnStatus] = useState('all');
  const [txnCategory, setTxnCategory] = useState('all');
  const [txnSortBy, setTxnSortBy] = useState('created_at');
  const [txnSortOrder, setTxnSortOrder] = useState('desc');
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);

  // Load Database Stats
  const loadStats = async () => {
    try {
      const data = await apiRequest('/admin/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  };

  // Load Categories
  const loadCategories = async () => {
    try {
      const data = await apiRequest('/admin/categories');
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Load Merchants
  const loadUsers = async () => {
    setUserLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (userSearch.trim()) params.append('q', userSearch.trim());
      if (userStatusFilter !== 'all') params.append('verification_status', userStatusFilter);
      if (userCategoryFilter !== 'all') params.append('category', userCategoryFilter);

      const data = await apiRequest(`/admin/users?${params.toString()}`);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // Load MDR Rules
  const loadRules = async () => {
    setRulesLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRuleCategory !== 'all') params.append('category', selectedRuleCategory);
      const data = await apiRequest(`/admin/mdr-rules?${params.toString()}`);
      setRules(data);
    } catch (err) {
      console.error('Failed to load MDR rules:', err);
    } finally {
      setRulesLoading(false);
    }
  };

  // Load QR Codes
  const loadQrs = async () => {
    setQrLoading(true);
    try {
      const params = new URLSearchParams();
      if (qrSearch.trim()) params.append('q', qrSearch.trim());
      if (qrStatusFilter !== 'all') params.append('status', qrStatusFilter);
      const data = await apiRequest(`/admin/qrs?${params.toString()}`);
      setQrs(data);
    } catch (err) {
      console.error('Failed to load QR codes:', err);
    } finally {
      setQrLoading(false);
    }
  };

  // Load Transactions
  const loadTransactions = async () => {
    setTxnLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (txnSearch.trim()) params.append('search', txnSearch.trim());
      if (txnType !== 'all') params.append('txn_type', txnType);
      if (txnStatus !== 'all') params.append('status', txnStatus);
      if (txnCategory !== 'all') params.append('category', txnCategory);
      params.append('sort_by', txnSortBy);
      params.append('sort_order', txnSortOrder);

      const res = await apiRequest(`/admin/transactions?${params.toString()}`);
      setTransactions(res);
    } catch (err) {
      console.error('Failed to load platform transactions:', err);
    } finally {
      setTxnLoading(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    try {
      const data = await apiRequest('/admin/audit-logs');
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  // Master Refresh
  const refreshAll = () => {
    loadStats();
    loadCategories();
    loadUsers();
    loadRules();
    loadQrs();
    loadTransactions();
    loadAuditLogs();
  };

  useEffect(() => {
    refreshAll();

    // Subscribe to Real-Time WebSocket Channel
    const unsubscribe = realtime.subscribe((event) => {
      console.log('[Admin Realtime Event Received]:', event.type);
      loadStats();
      if (event.type === 'TRANSACTION_CREATED') {
        loadTransactions();
      } else if (event.type === 'MERCHANT_STATUS_UPDATED' || event.type === 'MERCHANT_CATEGORY_UPDATED') {
        loadUsers();
      } else if (event.type === 'MDR_RULE_UPDATED') {
        loadRules();
      } else if (event.type === 'QR_STATUS_UPDATED' || event.type === 'QR_REGENERATED') {
        loadQrs();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadUsers();
  }, [userStatusFilter, userCategoryFilter]);

  useEffect(() => {
    loadRules();
  }, [selectedRuleCategory]);

  useEffect(() => {
    loadQrs();
  }, [qrStatusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTransactions();
    }, 250);
    return () => clearTimeout(timer);
  }, [txnSearch, txnType, txnStatus, txnCategory, txnSortBy, txnSortOrder]);

  // Merchant Status Action (Approve / Reject)
  const handleUpdateMerchantStatus = async (userId, newStatus) => {
    try {
      await apiRequest(`/admin/merchants/${userId}/status?status=${newStatus}`, {
        method: 'PATCH',
      });
      loadUsers();
      loadStats();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser((prev) => ({
          ...prev,
          merchant_profile: {
            ...prev.merchant_profile,
            verification_status: newStatus,
          },
        }));
      }
    } catch (err) {
      alert(`Error updating merchant status: ${err.message}`);
    }
  };

  // Change Category Action with Admin Confirmation
  const handleChangeCategoryConfirm = async () => {
    if (!categoryModalUser || !newCategory) return;
    try {
      await apiRequest(`/admin/merchants/${categoryModalUser.id}/category`, {
        method: 'PATCH',
        body: JSON.stringify({
          business_category: newCategory,
          business_subcategory: newSubcategory || 'General',
          admin_note: 'Updated by Master Administrator'
        }),
      });
      setCategoryModalUser(null);
      loadUsers();
      loadStats();
    } catch (err) {
      alert(`Error updating merchant category: ${err.message}`);
    }
  };

  // QR Activation / Deactivation Action
  const handleToggleQrStatus = async (qrId, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiRequest(`/admin/qrs/${qrId}/status?status=${nextStatus}`, {
        method: 'PATCH',
      });
      loadQrs();
      loadStats();
    } catch (err) {
      alert(`Error updating QR status: ${err.message}`);
    }
  };

  // QR Regeneration Action
  const handleRegenerateQr = async (userId) => {
    if (!window.confirm('Are you sure you want to regenerate this merchant QR? The previous QR identifier will be superseded.')) {
      return;
    }
    try {
      const res = await apiRequest(`/admin/qrs/${userId}/regenerate`, {
        method: 'POST',
      });
      alert(`New QR Generated: ${res.qr_code}`);
      loadQrs();
      loadUsers();
    } catch (err) {
      alert(`Error regenerating QR: ${err.message}`);
    }
  };

  // Preview MDR Rule Before Publishing
  const handlePreviewRule = async (e) => {
    e.preventDefault();
    setPreviewLoading(true);
    try {
      const previewRes = await apiRequest('/admin/mdr-rules/preview', {
        method: 'POST',
        body: JSON.stringify(ruleFormData),
      });
      setRulePreview(previewRes);
    } catch (err) {
      alert(`Preview Error: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Publish MDR Rule
  const handlePublishRule = async () => {
    try {
      await apiRequest('/admin/mdr-rules/publish', {
        method: 'POST',
        body: JSON.stringify(ruleFormData),
      });
      setShowRuleModal(false);
      setRulePreview(null);
      loadRules();
      loadStats();
      alert('New MDR Rule published successfully! All new merchant QR transactions will adopt this rate automatically.');
    } catch (err) {
      alert(`Publish Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12 text-slate-900">
      {/* Top Application Header */}
      <div className="bg-[#0A192F] text-white pt-6 pb-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
                Master Admin Portal
              </span>
              <span className="text-xs text-emerald-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Real-Time Live</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 tracking-tight">
              MDR Settlement Guardian Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Central MDR Rules Engine · Merchant Verification · QR Lifecycle · Real-Time Platform Audits
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={refreshAll}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Database</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* ============================================================== */}
        {/* A. LIVE DATABASE-BACKED STATISTICAL OVERVIEW                   */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Created Accounts</span>
            <div className="text-xl sm:text-2xl font-black text-[#0A192F] mt-1">{stats.total_users}</div>
            <span className="text-[10px] text-slate-500">{stats.total_merchants} Merchants · {stats.total_personal} P2P</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 shadow-sm">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Gross Sales Volume</span>
            <div className="text-lg sm:text-xl font-black text-indigo-950 mt-1 truncate">{formatCurrency(stats.total_gross_volume)}</div>
            <span className="text-[10px] text-indigo-600">{stats.successful_transactions} Successful Txns</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-sm">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">MDR Deductions</span>
            <div className="text-lg sm:text-xl font-black text-rose-700 mt-1 truncate">
              {stats.total_calculated_mdr > 0 ? `- ${formatCurrency(stats.total_calculated_mdr)}` : '₹0.00'}
            </div>
            <span className="text-[10px] text-rose-500">Per regulatory schedule</span>
          </div>

          {/* DEDICATED SEPARATE GST BOX TOTALLY CALCULATED */}
          <div className="bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-amber-50 p-3.5 rounded-2xl border-2 border-amber-400 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider block">
                Total 18% GST (Tax)
              </span>
              <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded font-mono">
                Separate Box
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-950 mt-1 truncate">
              {stats.total_gst > 0 ? `- ${formatCurrency(stats.total_gst)}` : '₹0.00'}
            </div>
            <span className="text-[10px] text-amber-800 font-semibold">Taxes on MDR Deductions</span>
          </div>

          <div className="bg-gradient-to-br from-[#002970] to-[#0A192F] text-white p-3.5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-extrabold text-sky-300 uppercase tracking-wider block">Expected Net Settlement</span>
            <div className="text-lg sm:text-xl font-black text-white mt-1 truncate">
              {formatCurrency(stats.total_expected_settlement)}
            </div>
            <span className="text-[10px] text-sky-200">Net Merchant Bank Credit</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active QRs</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.active_qrs}</div>
            <span className="text-[10px] text-slate-400">Total: {stats.total_qrs} QRs</span>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 mb-6 pb-2">
          {[
            { id: 'overview', label: 'Overview & Activity', icon: TrendingUp },
            { id: 'merchants', label: `Merchants (${stats.total_merchants})`, icon: Store },
            { id: 'rules', label: `Central MDR Engine (${rules.length})`, icon: Percent },
            { id: 'qrs', label: `QR Management (${stats.total_qrs})`, icon: QrCode },
            { id: 'transactions', label: `Transactions Ledger (${stats.total_transactions})`, icon: Receipt },
            { id: 'audit', label: 'Audit Trail', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#002970] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW & ACTIVITY                                     */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-[#0A192F] text-lg">Recent Platform Transactions</h3>
                  <p className="text-xs text-slate-400">Live transactions executed across registered Personal and Merchant users</p>
                </div>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#002970] font-bold text-xs hover:bg-sky-100 cursor-pointer"
                >
                  View All Transactions →
                </button>
              </div>

              <div className="divide-y divide-slate-100 mt-2">
                {transactions.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTxn(t)}
                    className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#002970] flex items-center justify-center font-bold text-xs">
                        {t.txn_type}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{t.sender_name} → {t.receiver_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {t.txn_id} · {formatDateTime(t.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-slate-900">{formatCurrency(t.amount)}</div>
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {t.status || 'SUCCESS'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-3xl p-6 border-2 border-amber-300 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                      GST Deductions Total (18%)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950">
                      Calculated
                    </span>
                  </div>
                  <div className="text-2xl font-black text-amber-950 mt-1">
                    {formatCurrency(stats.total_gst)}
                  </div>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    18% GST auto-calculated on regulatory MDR across all platform payments
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  View Tax Ledger
                </button>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-sky-200 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Central MDR Rules Engine Active</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Published rates automatically govern all QR payments</p>
                </div>
                <button
                  onClick={() => setActiveTab('rules')}
                  className="px-4 py-2 rounded-xl bg-[#002970] hover:bg-[#0A192F] text-white font-bold text-xs cursor-pointer"
                >
                  Configure Rules
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: B. MERCHANT DIRECTORY & CATEGORY CONTROL                */}
        {/* ============================================================== */}
        {activeTab === 'merchants' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-[#0A192F] text-lg">Merchant Accounts & Category Control</h3>
                <p className="text-xs text-slate-400">All registered merchants are immediately active upon registration. No approval required.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#002970]"
                />

                <select
                  value={userCategoryFilter}
                  onChange={(e) => setUserCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {userLoading ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#002970] mb-2" />
                Loading merchant directory...
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">No merchants found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Merchant ID & Shop Name</th>
                      <th className="py-3 px-4">Owner Contact</th>
                      <th className="py-3 px-4">Approved Category & Subcategory</th>
                      <th className="py-3 px-4 text-center">Account Status</th>
                      <th className="py-3 px-4 text-center">Assigned QR</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const mp = u.merchant_profile;
                      const isMerchant = u.account_type === 'merchant';
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{mp?.business_name || u.full_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID #{u.id} · Registered {formatDateTime(u.created_at)}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-800">{u.email}</div>
                            <div className="text-[10px] text-slate-400">+91 {u.phone}</div>
                          </td>

                          <td className="py-3 px-4">
                            {isMerchant && mp ? (
                              <div>
                                <span className="font-bold text-slate-900 block">{mp.business_category}</span>
                                <span className="text-[10px] text-slate-500 font-medium">{mp.business_subcategory || 'General'}</span>
                              </div>
                            ) : (
                              <span className="text-emerald-700 italic">Personal User (0% MDR)</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isMerchant && mp ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center justify-center space-x-1 max-w-[130px] mx-auto">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Active & Verified</span>
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-semibold">Verified Active</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isMerchant ? (
                              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                {u.qr_profile?.qr_code || mp?.assigned_qr_id || 'Active QR'}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right space-x-1.5">
                            {isMerchant && (
                              <button
                                onClick={() => {
                                  setCategoryModalUser(u);
                                  setNewCategory(mp?.business_category || 'Consumer Electronics & Mobile');
                                  setNewSubcategory(mp?.business_subcategory || 'General');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#002970] font-bold text-xs transition-colors cursor-pointer"
                                title="Change Approved Category"
                              >
                                Modify Category
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: C. CENTRAL MDR RULES ENGINE MANAGEMENT                   */}
        {/* ============================================================== */}
        {activeTab === 'rules' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-[#0A192F] text-lg">Central MDR Rules Engine (Database-Backed)</h3>
                <p className="text-xs text-slate-400">All merchant QR transactions resolve their applicable MDR schedule dynamically from these rules</p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedRuleCategory}
                  onChange={(e) => setSelectedRuleCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => setShowRuleModal(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#002970] hover:bg-[#0A192F] text-white font-bold text-xs shadow-md shadow-[#002970]/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish New Rule</span>
                </button>
              </div>
            </div>

            {rulesLoading ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#002970] mb-2" />
                Querying database-backed MDR rules...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Rule ID & Version</th>
                      <th className="py-3 px-4">Category & Subcategory</th>
                      <th className="py-3 px-4">Calculation Type</th>
                      <th className="py-3 px-4 text-right">Rate / Fee</th>
                      <th className="py-3 px-4 text-right">Max Cap</th>
                      <th className="py-3 px-4 text-right">GST Rate</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Effective Dates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rules.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-slate-900">{r.rule_id}</div>
                          <div className="text-[10px] text-slate-400">Version {r.version}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{r.business_category}</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {r.business_subcategory || 'All Subcategories'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                            {r.calculation_type}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          {r.calculation_type === 'FIXED'
                            ? `Flat ₹${r.fixed_fee.toFixed(2)}`
                            : r.calculation_type === 'PENDING_CONFIG'
                            ? 'Pending Verification'
                            : `${r.rate_percentage}%`}
                        </td>

                        <td className="py-3 px-4 text-right text-slate-600 font-medium">
                          {r.max_cap ? `₹${r.max_cap.toFixed(2)}` : 'No Cap'}
                        </td>

                        <td className="py-3 px-4 text-right text-slate-600">
                          {Math.round(r.gst_rate * 100)}% ({r.tax_treatment})
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'PENDING_CONFIG'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-[10px] text-slate-400 font-mono">
                          {formatDateTime(r.effective_start_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: E. QR CODE LIFECYCLE MANAGEMENT                        */}
        {/* ============================================================== */}
        {activeTab === 'qrs' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-[#0A192F] text-lg">Merchant QR Lifecycle Desk</h3>
                <p className="text-xs text-slate-400">Merchant QRs never store hardcoded MDR rates; they dynamically bind to the central rules engine</p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search merchant or QR code..."
                  value={qrSearch}
                  onChange={(e) => setQrSearch(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#002970]"
                />

                <select
                  value={qrStatusFilter}
                  onChange={(e) => setQrStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">All QR Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive / Suspended</option>
                </select>
              </div>
            </div>

            {qrLoading ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#002970] mb-2" />
                Querying QR assignments...
              </div>
            ) : qrs.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <QrCode className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">No merchant QRs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Merchant Shop Name</th>
                      <th className="py-3 px-4">Assigned QR Identifier</th>
                      <th className="py-3 px-4">Category & Subcategory</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Assigned Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {qrs.map((qr) => (
                      <tr key={qr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{qr.merchant_name}</div>
                          <div className="text-[10px] text-slate-400">User ID #{qr.user_id}</div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-[#002970]">
                          {qr.qr_code}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{qr.business_category}</div>
                          <div className="text-[10px] text-slate-400">{qr.business_subcategory || 'General'}</div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              qr.qr_status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {qr.qr_status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-[10px] text-slate-400 font-mono">
                          {formatDateTime(qr.created_at)}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleToggleQrStatus(qr.id, qr.qr_status)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              qr.qr_status === 'ACTIVE'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {qr.qr_status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            onClick={() => handleRegenerateQr(qr.user_id)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#002970] font-bold text-xs transition-colors cursor-pointer"
                            title="Regenerate QR token"
                          >
                            <RotateCw className="w-3.5 h-3.5 inline mr-1" />
                            <span>Regen</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: PLATFORM TRANSACTIONS LEDGER                            */}
        {/* ============================================================== */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-[#0A192F] text-lg">Platform-Wide Transaction Ledger</h3>
                <p className="text-xs text-slate-400">Click any transaction to open the receipt with exact regulatory math snapshot</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search Txn ID, sender, receiver..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#002970]"
                />

                <select
                  value={txnType}
                  onChange={(e) => setTxnType(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="P2P">P2P (Personal)</option>
                  <option value="P2M">P2M (Merchant)</option>
                </select>

                <select
                  value={txnStatus}
                  onChange={(e) => setTxnStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="SUCCESS">Success</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>

                {/* Outlet & Category Filter (Hotel, Petrol, Grocery, etc.) */}
                <select
                  value={txnCategory}
                  onChange={(e) => setTxnCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Outlets & Categories</option>
                  <option value="petrol">⛽ Petrol Bunk / Fuel Stations</option>
                  <option value="hotel">🏨 Hotel & Food / Restaurants</option>
                  <option value="grocery">🛒 Grocery & Kirana</option>
                  <option value="electronics">📱 Electronics & Mobile</option>
                  <option value="telecom">📶 Telecom & Recharge</option>
                  <option value="healthcare">💊 Healthcare & Pharmacy</option>
                  <option value="apparel">👕 Apparel & Footwear</option>
                  <option value="general">🏢 General Retail & Services</option>
                </select>

                <select
                  value={txnSortBy}
                  onChange={(e) => setTxnSortBy(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="created_at">Sort Date</option>
                  <option value="amount">Sort Amount</option>
                </select>

                <button
                  onClick={() => setTxnSortOrder(txnSortOrder === 'desc' ? 'asc' : 'desc')}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Toggle order"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Filter Pills by Outlet (Hotel, Petrol, Grocery, etc.) */}
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Outlet:</span>
              </span>
              {[
                { id: 'all', label: 'All History', icon: '🏪' },
                { id: 'petrol', label: 'Petrol Bunk', icon: '⛽' },
                { id: 'hotel', label: 'Hotel & Dining', icon: '🏨' },
                { id: 'grocery', label: 'Kirana & Grocery', icon: '🛒' },
                { id: 'electronics', label: 'Electronics & Mobile', icon: '📱' },
                { id: 'telecom', label: 'Telecom & Recharge', icon: '📶' },
                { id: 'healthcare', label: 'Pharmacy & Health', icon: '💊' },
              ].map((pill) => {
                const isSelected = txnCategory === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setTxnCategory(pill.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-[#002970] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{pill.icon}</span>
                    <span>{pill.label}</span>
                  </button>
                );
              })}
            </div>

            {txnLoading ? (
              <div className="py-16 text-center text-xs text-slate-400 font-medium">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#002970] mb-2" />
                Querying database transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">No transactions recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Txn ID & Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Sender (Debit)</th>
                      <th className="py-3 px-4">Receiver (Credit)</th>
                      <th className="py-3 px-4 text-right">Gross Amount</th>
                      <th className="py-3 px-4 text-right">MDR Fee</th>
                      <th className="py-3 px-4 text-right">GST (18%)</th>
                      <th className="py-3 px-4 text-right font-black text-[#002970]">Net Settlement</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => {
                      const s = t.settlement;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTxn(t)}
                          className="hover:bg-sky-50/60 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-slate-900 group-hover:text-[#002970]">
                              {t.txn_id}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatDateTime(t.created_at)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                t.txn_type === 'P2M'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {t.txn_type}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{t.sender_name}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{t.sender_account_type || 'Personal'}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{t.receiver_name}</div>
                            <div className="text-[10px] text-slate-500 font-medium flex items-center space-x-1 mt-0.5">
                              {s?.business_subcategory ? (
                                <span className="bg-sky-50 text-sky-900 border border-sky-200 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                                  {s.business_subcategory}
                                </span>
                              ) : (
                                <span className="text-slate-400 capitalize">{t.receiver_account_type || 'Personal'}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {formatCurrency(t.amount)}
                          </td>

                          <td className="py-3 px-4 text-right text-rose-600 font-semibold">
                            {s ? `- ${formatCurrency(s.mdr_amount)}` : '₹0.00'}
                          </td>

                          <td className="py-3 px-4 text-right text-amber-700 font-semibold">
                            {s ? `- ${formatCurrency(s.gst_amount)}` : '₹0.00'}
                          </td>

                          <td className="py-3 px-4 text-right font-black text-[#002970] text-sm">
                            {formatCurrency(s?.net_settlement || t.amount)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>{t.status || 'SUCCESS'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: AUDIT TRAIL LOGS                                        */}
        {/* ============================================================== */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="font-extrabold text-[#0A192F] text-lg mb-1">Administrative Audit Trail</h3>
            <p className="text-xs text-slate-400 mb-4">Immutable log of rate changes, approvals, and QR operations</p>

            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold font-mono text-slate-700 mr-2">
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-900 text-xs">{log.target_type} #{log.target_id || ''}</span>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {log.previous_value && <span className="text-rose-600 line-through mr-2">Old: {log.previous_value}</span>}
                      {log.new_value && <span className="text-emerald-700 font-semibold">New: {log.new_value}</span>}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-mono">
                    <div>{log.admin_email}</div>
                    <div>{formatDateTime(log.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: CHANGE MERCHANT CATEGORY WITH CONFIRMATION              */}
      {/* ============================================================== */}
      {categoryModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-[#0A192F]">Reclassify Merchant Category</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Shop: <span className="font-semibold text-slate-800">{categoryModalUser.merchant_profile?.business_name}</span>
            </p>

            <div className="my-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Approved Business Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    setNewCategory(e.target.value);
                    const selCat = categories.find((c) => c.name === e.target.value);
                    if (selCat && selCat.subcategories.length > 0) {
                      setNewSubcategory(selCat.subcategories[0].name);
                    } else {
                      setNewSubcategory('General');
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Subcategory</label>
                <select
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  {categories
                    .find((c) => c.name === newCategory)
                    ?.subcategories.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  <option value="General">General / Standard</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <span className="font-bold">Confirmation Notice: </span>
                Changing this merchant's approved category will automatically switch their applied central MDR schedule for all subsequent customer payments.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setCategoryModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeCategoryConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#002970] text-white hover:bg-[#0A192F] shadow-sm cursor-pointer"
              >
                Confirm Reclassification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MDR RULE CREATION & PREVIEW DESK                         */}
      {/* ============================================================== */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#002970] text-white">
              <div>
                <h3 className="text-base font-extrabold">Publish Central MDR Regulatory Rule</h3>
                <p className="text-xs text-sky-200">Creates a new versioned rule; previous rules are kept for historical accuracy</p>
              </div>
              <button onClick={() => setShowRuleModal(false)} className="text-white/70 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Category</label>
                  <select
                    value={ruleFormData.business_category}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, business_category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Subcategory (Optional)</label>
                  <select
                    value={ruleFormData.business_subcategory}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, business_subcategory: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="">Applies to Entire Category</option>
                    {categories
                      .find((c) => c.name === ruleFormData.business_category)
                      ?.subcategories.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Calculation Type</label>
                  <select
                    value={ruleFormData.calculation_type}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, calculation_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Fee (Flat ₹)</option>
                    <option value="CAPPED">Percentage with Cap</option>
                    <option value="ZERO">Zero MDR (0%)</option>
                    <option value="PENDING_CONFIG">Pending Verification</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rate Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ruleFormData.rate_percentage}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, rate_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fixed Fee (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={ruleFormData.fixed_fee}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, fixed_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Zero-MDR Threshold (₹)</label>
                  <input
                    type="number"
                    value={ruleFormData.min_amount}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, min_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Maximum MDR Cap (₹)</label>
                  <input
                    type="number"
                    value={ruleFormData.max_cap}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, max_cap: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">GST Tax Treatment</label>
                  <select
                    value={ruleFormData.tax_treatment}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, tax_treatment: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="TAXABLE_18">18% GST (Taxable)</option>
                    <option value="EXEMPT">Exempt (0% GST)</option>
                    <option value="NON_TAXABLE">Non-Taxable</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Regulatory Change Summary</label>
                <input
                  type="text"
                  value={ruleFormData.change_summary}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, change_summary: e.target.value })}
                  placeholder="e.g. Revised petrol bunk interchange schedule"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                />
              </div>

              {/* Simulation Preview Button */}
              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handlePreviewRule}
                  disabled={previewLoading}
                  className="px-4 py-2 rounded-xl bg-sky-50 text-[#002970] font-bold text-xs hover:bg-sky-100 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Preview Calculation & Affected Merchants</span>
                </button>
              </div>

              {/* PREVIEW RESULTS ACCORDION */}
              {rulePreview && (
                <div className="mt-3 p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-sky-200 pb-2">
                    <span className="font-bold text-[#002970]">
                      Affected Category: {rulePreview.affected_category}
                    </span>
                    <span className="font-extrabold text-xs bg-white px-2.5 py-0.5 rounded-full border border-sky-300 text-sky-900">
                      {rulePreview.affected_merchants_count} Merchants Affected
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block text-[11px] mb-1">Sample Transaction Calculations:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {rulePreview.sample_calculations.map((calc, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-xl border border-sky-200 text-[11px]">
                          <div className="font-black text-slate-900">{formatCurrency(calc.gross_amount)}</div>
                          <div className="text-rose-600 font-semibold">MDR: -{formatCurrency(calc.mdr_amount)}</div>
                          <div className="text-amber-700 font-semibold">GST: -{formatCurrency(calc.gst_amount)}</div>
                          <div className="text-[#002970] font-bold pt-1 border-t border-slate-100">
                            Net: {formatCurrency(calc.net_settlement)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishRule}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#002970] hover:bg-[#0A192F] text-white shadow-md shadow-[#002970]/20 cursor-pointer"
              >
                Confirm & Publish Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLICKABLE TRANSACTION RECEIPT MODAL */}
      <TransactionReceiptModal
        txn={selectedTxn}
        isOpen={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
