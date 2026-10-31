import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { SlidersHorizontal, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Calculator, Percent, Sparkles, Save } from 'lucide-react';

export default function AdminRulesEditor() {
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Live test calculator state
  const [testAmount, setTestAmount] = useState('3000');
  const [testCategory, setTestCategory] = useState('Standard Retail');
  const [testResult, setTestResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/rules');
      setRules(data);
    } catch (err) {
      setError(err.message || 'Failed to load rules.yaml');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleRunTestCalc = async () => {
    setCalcLoading(true);
    try {
      const res = await apiRequest('/rules/calculate', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(testAmount) || 0,
          merchant_category: testCategory,
          payment_type: 'P2M',
        }),
      });
      setTestResult(res);
    } catch (err) {
      alert(`Calculation error: ${err.message}`);
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    if (rules && testAmount) {
      handleRunTestCalc();
    }
  }, [testAmount, testCategory]);

  const handleToggleEnabled = () => {
    setRules((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await apiRequest('/rules', {
        method: 'PUT',
        body: JSON.stringify(rules),
      });
      setMessage('Rules successfully saved and persisted to rules.yaml!');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update rules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 font-medium">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002970] mb-2" />
        Loading rules configuration from backend...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#002970] bg-sky-100 px-2.5 py-0.5 rounded-full">
              Editable rules.yaml
            </span>
            <span className="text-xs text-slate-400">Deterministic Engine Config</span>
          </div>
          <h3 className="text-lg font-black text-[#0A192F] mt-1">
            Regulatory MDR & GST Policy Engine
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure NPCI fee bands, caps, category overrides, and GST rates. Changes apply immediately to all transactions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#002970] hover:bg-[#0A192F] text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-[#002970]/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#00BAF2]" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Master Policy Switch */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
        <div>
          <span className="font-extrabold text-[#0A192F] text-sm block">
            MDR Enforcement Master Status
          </span>
          <span className="text-xs text-slate-500">
            If Supreme Court challenge freezes charges or NPCI delays start date, flip this switch to revert to zero-MDR.
          </span>
        </div>
        <button
          onClick={handleToggleEnabled}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            rules?.enabled
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-300 text-slate-700'
          }`}
        >
          {rules?.enabled ? 'MDR Policy Active' : 'Zero-MDR Fallback'}
        </button>
      </div>

      {/* Configured Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Standard Bands */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="font-extrabold text-[#002970] text-sm block">1. UPI MDR Bands</span>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">≤ ₹2,000: 0% Free</span>
            <span className="text-[10px] text-slate-500">~95% of daily transactions</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">&gt; ₹2k to &lt; ₹75k: 0.4%</span>
            <span className="text-[10px] text-slate-500">Standard P2M rate</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">≥ ₹75,000: Flat ₹300 Cap</span>
            <span className="text-[10px] text-slate-500">Maximum fee ceiling</span>
          </div>
        </div>

        {/* Special Overrides */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="font-extrabold text-[#002970] text-sm block">2. Category Overrides</span>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">Essential Services</span>
            <span className="text-[10px] text-slate-500">Flat ₹5 above ₹2,000 (Fuel, Telecom, Utilities)</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">Capital Markets</span>
            <span className="text-[10px] text-slate-500">0.02% capped at ₹300 (Brokers, AMCs)</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">GST on Fee: 18%</span>
            <span className="text-[10px] text-slate-500">Claimable as Input Tax Credit (ITC)</span>
          </div>
        </div>

        {/* Small Merchant Cliff */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="font-extrabold text-[#002970] text-sm block">3. Small Merchant Cliff</span>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">Monthly Limit: ₹1,00,000</span>
            <span className="text-[10px] text-slate-500">Threshold for small QR retailers</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">Streak: 3 Consecutive Months</span>
            <span className="text-[10px] text-slate-500">Charges apply only after month 3</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">Alerts at: 75% and 90%</span>
            <span className="text-[10px] text-slate-500">Automated warning triggers</span>
          </div>
        </div>
      </div>

      {/* Interactive Calculation Sandbox Tool for Admin / Judges */}
      <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200">
        <div className="flex items-center space-x-2 mb-3">
          <Calculator className="w-5 h-5 text-[#002970]" />
          <h4 className="font-extrabold text-[#0A192F] text-sm">
            Interactive Rules Testing Sandbox
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Test Payment Amount (₹)
            </label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002970]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Select Category
            </label>
            <select
              value={testCategory}
              onChange={(e) => setTestCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002970]"
            >
              <option value="Consumer Electronics & Retail">Standard Retail (0.4% / Cap)</option>
              <option value="Essential Services (Fuel / Telecom)">Essential Services (Flat ₹5)</option>
              <option value="Capital Markets (AMC / Broker)">Capital Markets (0.02% Capped)</option>
              <option value="Grocery & Kirana">Grocery & Kirana</option>
            </select>
          </div>
        </div>

        {/* Calculation Result */}
        {testResult && (
          <div className="bg-white p-4 rounded-xl border border-sky-200 text-xs space-y-1.5 shadow-xs">
            <div className="flex justify-between items-center pb-1 border-b border-slate-100">
              <span className="font-bold text-[#002970]">Applied Rule:</span>
              <span className="font-extrabold text-slate-900">{testResult.mdr_rule}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>MDR Service Fee:</span>
              <span className="font-bold text-rose-600">- ₹{testResult.mdr_amount.toFixed(2)} ({testResult.mdr_rate})</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>18% GST on Fee:</span>
              <span className="font-bold text-amber-600">- ₹{testResult.gst_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-[#002970] pt-1 border-t border-slate-100">
              <span>Net Settlement Bank Credit:</span>
              <span>₹{testResult.net_settlement.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 italic leading-relaxed">
              "{testResult.explanation}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
