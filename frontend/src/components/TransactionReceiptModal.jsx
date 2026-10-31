import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Download,
  Share2,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  User,
  ShieldCheck,
  Receipt,
  HelpCircle,
  AlertTriangle,
  Sparkles,
  Languages,
  Scale
} from 'lucide-react';
import { formatDateTime, formatCurrency } from '../utils/formatters';
import { apiRequest } from '../api/client';

export default function TransactionReceiptModal({ txn, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeLang, setActiveLang] = useState('english'); // 'english' | 'hindi' | 'kannada'
  const [explanationData, setExplanationData] = useState(null);
  const [disputeLetter, setDisputeLetter] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeCopied, setDisputeCopied] = useState(false);

  useEffect(() => {
    if (isOpen && txn?.txn_id) {
      setDisputeLetter(null);
      setShowDisputeModal(false);
      apiRequest(`/explain/transaction/${txn.txn_id}`)
        .then(res => setExplanationData(res))
        .catch(err => console.warn('Could not load AI explanation:', err));
    }
  }, [isOpen, txn]);

  if (!isOpen || !txn) return null;

  const isP2M = txn.txn_type === 'P2M';
  const isSender = txn.is_sender;
  const s = txn.settlement;
  const isPendingConfig = txn.is_pending_config || (s && s.calculation_type === 'PENDING_CONFIG');

  const handleCopyTxnId = () => {
    navigator.clipboard.writeText(txn.txn_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateDispute = async () => {
    setDisputeLoading(true);
    try {
      const res = await apiRequest('/explain/dispute-draft', {
        method: 'POST',
        body: JSON.stringify({
          txn_id: txn.txn_id,
          actual_deducted_mdr: s ? s.mdr_amount + 10.0 : 10.0,
          actual_deducted_gst: s ? s.gst_amount + 1.80 : 1.80,
          language: activeLang
        })
      });
      setDisputeLetter(res);
      setShowDisputeModal(true);
    } catch (err) {
      console.error('Error generating dispute letter:', err);
    } finally {
      setDisputeLoading(false);
    }
  };

  const handleCopyDispute = () => {
    if (!disputeLetter) return;
    const text = disputeLetter[activeLang] || disputeLetter.english;
    navigator.clipboard.writeText(text);
    setDisputeCopied(true);
    setTimeout(() => setDisputeCopied(false), 2000);
  };

  const handleDownloadReceipt = () => {
    const formattedDate = formatDateTime(txn.created_at);

    const receiptContent = `
============================================================
              MDR SETTLEMENT GUARDIAN
        OFFICIAL SIMULATED PAYMENT RECEIPT
============================================================
* DEMO PAYMENT — NO REAL MONEY TRANSFERRED *

Transaction ID : ${txn.txn_id}
Date & Time    : ${formattedDate}
Payment Status : ${txn.status || 'SUCCESS'}
Payment Method : Simulated QR Payment
Transaction Type: ${txn.txn_type}

------------------------------------------------------------
PARTIES INVOLVED:
------------------------------------------------------------
Sender (Customer): ${txn.sender_name} (${txn.sender_account_type || 'Personal'})
Receiver         : ${txn.receiver_name} (${txn.receiver_account_type || 'Personal'})
${isP2M && txn.receiver_business_name ? `Merchant Shop    : ${txn.receiver_business_name}\n` : ''}${isP2M && (s?.business_category || txn.receiver_business_category) ? `Approved Category: ${s?.business_category || txn.receiver_business_category}\n` : ''}${isP2M && (s?.business_subcategory || txn.receiver_business_subcategory) ? `Subcategory      : ${s?.business_subcategory || txn.receiver_business_subcategory}\n` : ''}Payment Note     : ${txn.note || 'Simulated Payment'}

------------------------------------------------------------
PAYMENT & DEDUCTION BREAKDOWN:
------------------------------------------------------------
Customer Payment (Gross) : INR ${txn.amount.toFixed(2)}
${
  isP2M && s
    ? `MDR Rule ID              : ${s.rule_id || s.mdr_rule} (v${s.rule_version || 1})
Applied MDR Rate         : ${s.applied_rate || s.mdr_rate}
MDR Deduction Fee        : - INR ${s.mdr_amount.toFixed(2)}
Estimated GST (18%)      : - INR ${s.gst_amount.toFixed(2)}
Total Deductions         : - INR ${s.total_deductions.toFixed(2)}
------------------------------------------------------------
EXPECTED NET SETTLEMENT  : INR ${s.net_settlement.toFixed(2)}
------------------------------------------------------------
Regulatory Calculation Formula & Note:
${s.calculation_note || 'Central MDR rules engine verification snapshot.'}`
    : `MDR Fee (P2P Exemption) : INR 0.00 (Zero Fee)
GST on MDR               : INR 0.00
Total Deductions         : INR 0.00
------------------------------------------------------------
NET AMOUNT TRANSFERRED   : INR ${txn.amount.toFixed(2)}
------------------------------------------------------------
Exemption Note:
All P2P personal payments carry 0% MDR under official regulations.`
}

============================================================
Central MDR Rules Engine Verified · MDR Settlement Guardian
Track 1: Merchant Growth AI · Paytm Build for India
============================================================
    `.trim();

    const element = document.createElement('a');
    const file = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `MDR_Receipt_${txn.txn_id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Receipt Header */}
        <div className="bg-[#002970] text-white p-5 pb-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#00BAF2] text-slate-950">
              {isP2M ? 'Merchant Settlement Audit' : 'P2P Transfer Receipt'}
            </span>
            {s?.rule_version && (
              <span className="text-[10px] font-mono text-sky-200 bg-white/10 px-2 py-0.5 rounded-md">
                v{s.rule_version}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="text-xs text-sky-200 font-medium block">
                {isSender ? 'Simulated Money Sent' : 'Simulated Money Received'}
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white mt-0.5 tracking-tight flex items-baseline space-x-1">
                <span>{isSender ? '-' : '+'}</span>
                <span>{formatCurrency(txn.amount)}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-400 text-slate-950 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Success</span>
              </span>
            </div>
          </div>

          <p className="text-[11px] text-sky-200/90 mt-2 font-mono">
            {formatDateTime(txn.created_at)}
          </p>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-700">
          {/* Transaction ID Pill */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Transaction ID
              </span>
              <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                {txn.txn_id}
              </span>
            </div>
            <button
              onClick={handleCopyTxnId}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Pending Configuration Notice if unverified */}
          {isPendingConfig && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-2.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-xs">MDR Configuration Pending Verification</span>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  Rate schedule for this business category is awaiting independent regulatory verification. Safe policy applied: 0% fee deducted.
                </p>
              </div>
            </div>
          )}

          {/* Counterparties */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
                <User className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Sender (Customer)
                </span>
              </div>
              <div className="font-bold text-slate-900 text-sm truncate">
                {txn.sender_name}
              </div>
              <span className="text-[10px] text-slate-500 capitalize">
                {txn.sender_account_type || 'Personal'} Account
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
                {isP2M ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Receiver
                </span>
              </div>
              <div className="font-bold text-slate-900 text-sm truncate">
                {txn.receiver_name}
              </div>
              <span className="text-[10px] text-slate-500 capitalize">
                {txn.receiver_account_type || 'Personal'} {isP2M ? 'Shop' : 'Account'}
              </span>
            </div>
          </div>

          {/* Business Category and Subcategory */}
          {isP2M && (txn.receiver_business_category || s?.business_category) && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Approved Merchant Classification
              </span>
              <div className="font-bold text-slate-900 text-xs mt-0.5">
                {s?.business_category || txn.receiver_business_category}
                {(s?.business_subcategory || txn.receiver_business_subcategory) && (
                  <span className="text-slate-500 font-normal">
                    {' '}· {s?.business_subcategory || txn.receiver_business_subcategory}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Itemized Calculation Breakdown */}
          {isP2M && s ? (
            <div className="rounded-2xl p-4 bg-sky-50/70 border border-sky-200 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-sky-200">
                <div>
                  <span className="font-bold text-[#002970] text-xs block">
                    Applicable MDR Policy Rule
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {s.rule_id || s.mdr_rule}
                  </span>
                </div>
                <span className="font-extrabold text-[11px] text-[#002970] bg-white px-2.5 py-0.5 rounded-full border border-sky-300">
                  {s.applied_rate || s.mdr_rate}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Customer Payment</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(s.gross_amount)}
                  </span>
                </div>

                <div className="flex justify-between text-rose-600">
                  <span>MDR Service Fee ({s.applied_rate || s.mdr_rate})</span>
                  <span className="font-bold">- {formatCurrency(s.mdr_amount)}</span>
                </div>

                <div className="flex justify-between text-amber-700">
                  <span>Estimated GST on Fee (18%)</span>
                  <span className="font-bold">- {formatCurrency(s.gst_amount)}</span>
                </div>

                <div className="flex justify-between text-rose-700 font-bold pt-1.5 border-t border-sky-200">
                  <span>Total Deductions (MDR + GST)</span>
                  <span>- {formatCurrency(s.total_deductions)}</span>
                </div>

                <div className="flex justify-between items-center text-[#002970] font-black text-sm pt-2 border-t-2 border-sky-300">
                  <span>Expected Net Settlement</span>
                  <span className="text-base text-[#002970]">
                    {formatCurrency(s.net_settlement)}
                  </span>
                </div>
              </div>

              {s.calculation_note && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-sky-200 text-slate-600 text-[11px] leading-relaxed">
                  <span className="font-bold text-[#002970] block mb-0.5">
                    Settlement Calculation Formula:
                  </span>
                  {s.calculation_note}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>P2P Transfer — 0% MDR Guarantee</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                As per regulatory rules, personal user-to-user transfers are completely exempt from MDR and GST. The full payment amount was transferred to the recipient's simulated balance with zero deductions.
              </p>
              <div className="pt-2 border-t border-emerald-200 flex justify-between items-center font-bold text-xs text-emerald-900">
                <span>Total Deductions:</span>
                <span>₹0.00</span>
              </div>
            </div>
          )}

          {/* AI Merchant Assistant Multilingual Explanation Section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#00BAF2]" />
                <span className="font-bold text-[#002970] text-xs">AI Merchant Assistant</span>
              </div>
              <div className="flex space-x-1 bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                {['english', 'hindi', 'kannada'].map(l => (
                  <button
                    key={l}
                    onClick={() => setActiveLang(l)}
                    className={`px-2 py-0.5 rounded-md capitalize transition-all ${
                      activeLang === l ? 'bg-white text-[#002970] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {l === 'english' ? 'English' : l === 'hindi' ? 'हिंदी' : 'ಕನ್ನಡ'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed">
              {explanationData?.explanations?.[activeLang] || s?.calculation_note || 'Calculating rules explanation...'}
            </div>

            {/* Dispute Generator Button if MDR was charged */}
            {s && s.mdr_amount > 0 && (
              <div className="pt-1">
                <button
                  onClick={handleGenerateDispute}
                  disabled={disputeLoading}
                  className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-[#002970] border border-[#002970]/30 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Scale className="w-3.5 h-3.5 text-rose-600" />
                  <span>{disputeLoading ? 'Drafting Letter...' : 'Generate Overcharge Dispute Draft Letter'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Dispute Draft Letter Modal */}
          {showDisputeModal && disputeLetter && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 text-xs flex items-center space-x-1">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span>Formal Acquirer Dispute Letter ({activeLang.toUpperCase()})</span>
                </span>
                <button
                  onClick={handleCopyDispute}
                  className="px-2 py-1 bg-white border border-amber-300 rounded-lg text-[10px] font-bold text-amber-900 hover:bg-amber-100"
                >
                  {disputeCopied ? 'Copied!' : 'Copy Letter'}
                </button>
              </div>
              <pre className="p-3 bg-white border border-amber-200 rounded-xl text-[10px] text-slate-800 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                {disputeLetter[activeLang] || disputeLetter.english}
              </pre>
            </div>
          )}

          {/* Compliance Disclaimer */}
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-900 text-[10px] leading-relaxed text-center font-bold">
            DEMO PAYMENT — NO REAL MONEY TRANSFERRED.
          </div>
        </div>

        {/* Receipt Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center space-x-2">
          <button
            onClick={handleDownloadReceipt}
            className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-[#002970] hover:bg-[#0A192F] text-white font-bold text-xs shadow-md shadow-[#002970]/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Official Receipt</span>
          </button>

          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
