import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { apiRequest } from '../api/client';
import {
  X,
  Store,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Wallet,
  Sparkles,
  FileText
} from 'lucide-react';

export default function PaymentModal({ recipient, isOpen, onClose, onPaymentSuccess }) {
  const [amount, setAmount] = useState('1000');
  const [note, setNote] = useState('');
  const [walletBalance, setWalletBalance] = useState(50000);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successTxn, setSuccessTxn] = useState(null);

  // Fetch current simulated balance
  useEffect(() => {
    if (isOpen) {
      apiRequest('/payments/wallet')
        .then((w) => setWalletBalance(w.balance))
        .catch((err) => console.error(err));
      setSuccessTxn(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !recipient) return null;

  const isMerchant = recipient.account_type === 'merchant';
  const numericAmount = parseFloat(amount) || 0;
  const isInsufficient = numericAmount > walletBalance;

  // Live client-side estimate preview (actual calculation happens on backend)
  const getEstimatedFee = () => {
    if (!isMerchant) return { fee: 0, gst: 0, net: numericAmount, label: '0% P2P Exemption' };
    if (numericAmount <= 2000) return { fee: 0, gst: 0, net: numericAmount, label: '0% Tier (≤ ₹2,000)' };
    const fee = Math.min(numericAmount * 0.004, 300);
    const gst = fee * 0.18;
    return {
      fee: fee,
      gst: gst,
      net: numericAmount - (fee + gst),
      label: numericAmount >= 75000 ? '0.4% Capped at ₹300' : '0.4% UPI MDR + 18% GST',
    };
  };

  const estimate = getEstimatedFee();

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    setError('');

    if (numericAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (isInsufficient) {
      setError(`Insufficient balance. You have ₹${walletBalance.toLocaleString('en-IN')}`);
      return;
    }

    setProcessing(true);
    const idempotencyKey = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Simulate short network delay for fintech realism
      await new Promise((resolve) => setTimeout(resolve, 800));

      const txn = await apiRequest('/payments/simulate', {
        method: 'POST',
        body: JSON.stringify({
          qr_code: recipient.qr_code,
          amount: numericAmount,
          note: note.trim() || 'Simulated Payment',
          idempotency_key: idempotencyKey,
        }),
      });

      // Fire celebratory confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      setSuccessTxn(txn);
      if (onPaymentSuccess) {
        onPaymentSuccess(txn);
      }
    } catch (err) {
      setError(err.message || 'Payment simulation failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* PROCESSING ANIMATION OVERLAY */}
        {processing && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-[#002970] animate-spin mb-4" />
            <h4 className="text-lg font-bold text-[#0A192F]">Processing Payment...</h4>
            <p className="text-xs text-slate-500 mt-1">Executing simulated transaction & ledger audit</p>
          </div>
        )}

        {/* SUCCESS SCREEN */}
        {successTxn ? (
          <div className="py-4 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Payment Successful
            </span>

            <h3 className="text-3xl font-black text-[#0A192F] mt-2">
              ₹{successTxn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>

            <p className="text-xs text-slate-600 mt-1">
              Paid to <span className="font-bold text-slate-900">{successTxn.receiver_name}</span>
            </p>

            {/* Transaction Receipt Card */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">{successTxn.txn_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Type:</span>
                <span className="font-bold text-slate-800">
                  {successTxn.txn_type === 'P2M' ? 'P2M (Merchant QR)' : 'P2P (Personal)'}
                </span>
              </div>

              {successTxn.settlement && (
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-rose-600">
                    <span>MDR Deduction ({successTxn.settlement.mdr_rate}):</span>
                    <span>- ₹{successTxn.settlement.mdr_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>18% GST on Fee:</span>
                    <span>- ₹{successTxn.settlement.gst_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#002970] pt-1 border-t border-slate-200">
                    <span>Expected Net Bank Settlement:</span>
                    <span>₹{successTxn.settlement.net_settlement.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-[10px] font-bold text-[#002970] uppercase">
              SIMULATED PAYMENT — NO REAL MONEY TRANSFERRED
            </div>

            <button
              onClick={onClose}
              className="w-full mt-5 py-3 bg-[#002970] hover:bg-[#0A192F] text-white font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Done & Return to Dashboard
            </button>
          </div>
        ) : (
          /* PAYMENT FORM */
          <div>
            {/* Recipient Header Card */}
            <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isMerchant ? 'bg-sky-100 text-[#002970]' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {isMerchant ? <Store className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-[#0A192F] text-sm truncate">
                    {isMerchant ? recipient.business_name || recipient.full_name : recipient.full_name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {isMerchant ? `${recipient.business_category || 'Merchant'} · Verified Paytm QR` : 'Personal P2P User'}
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  isMerchant ? 'bg-sky-100 text-[#002970]' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isMerchant ? 'Merchant' : 'Personal'}
              </span>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Enter Payment Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-xl font-bold text-slate-400">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white tracking-tight"
                  />
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                {[500, 1000, 2000, 3000, 12000, 80000].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setAmount(chip.toString())}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all ${
                      amount === chip.toString()
                        ? 'bg-[#002970] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ₹{chip >= 1000 ? `${chip / 1000}k` : chip}
                  </button>
                ))}
              </div>

              {/* Note / Purpose */}
              <div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add note (e.g. Earphones, Groceries, Dinner)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white"
                />
              </div>

              {/* Live Fee Breakdown Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Simulated Sender Balance:</span>
                  <span className={`font-mono font-bold ${isInsufficient ? 'text-rose-600' : 'text-slate-900'}`}>
                    ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Applicable MDR Rule:</span>
                  <span className="font-bold text-[#002970]">{estimate.label}</span>
                </div>

                {isMerchant && (
                  <>
                    <div className="flex justify-between text-rose-600">
                      <span>Estimated Deductions (MDR + GST):</span>
                      <span className="font-bold">- ₹{(estimate.fee + estimate.gst).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-[#002970] pt-1 border-t border-slate-200">
                      <span>Merchant Expected Net:</span>
                      <span>₹{estimate.net.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Disclaimer */}
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  SIMULATED PAYMENT — NO REAL MONEY TRANSFERRED
                </span>
              </div>

              <button
                type="submit"
                disabled={isInsufficient || numericAmount <= 0}
                className="w-full py-3.5 bg-[#002970] hover:bg-[#0A192F] text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#002970]/20 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Confirm Simulated Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
