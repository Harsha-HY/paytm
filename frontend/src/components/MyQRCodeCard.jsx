import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Store, UserCheck, Download, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';

export default function MyQRCodeCard({ onClose }) {
  const { user } = useAuth();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const qrRef = useRef(null);

  useEffect(() => {
    async function fetchQR() {
      try {
        setLoading(true);
        const data = await apiRequest('/payments/my-qr');
        setQrData(data);
      } catch (err) {
        setError(err.message || 'Failed to load QR code');
      } finally {
        setLoading(false);
      }
    }
    fetchQR();
  }, []);

  const handleCopyCode = () => {
    if (qrData?.qr_code) {
      navigator.clipboard.writeText(qrData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isMerchant = user?.account_type === 'merchant';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2 border shadow-xs"
            style={{
              backgroundColor: isMerchant ? '#EFF6FF' : '#ECFDF5',
              color: isMerchant ? '#002970' : '#047857',
              borderColor: isMerchant ? '#BFDBFE' : '#A7F3D0',
            }}
          >
            {isMerchant ? <Store className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            <span>{isMerchant ? 'Official Merchant QR' : 'Personal P2P QR'}</span>
          </div>

          <h3 className="text-lg font-black text-[#0A192F] tracking-tight">
            {isMerchant ? qrData?.business_name || user?.full_name : user?.full_name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isMerchant ? `${qrData?.business_category || 'Retail'} · Paytm Merchant` : 'Scan to send simulated payment'}
          </p>
        </div>

        {/* QR Display Container */}
        <div className="bg-gradient-to-b from-slate-50 to-white p-5 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center shadow-inner relative">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium animate-pulse">
              Generating Secure QR...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-xs text-rose-600 font-medium">
              <AlertCircle className="w-6 h-6 mx-auto mb-1 text-rose-500" />
              {error}
            </div>
          ) : (
            <>
              <div ref={qrRef} className="p-3 bg-white rounded-2xl shadow-md border border-slate-100">
                <QRCodeSVG
                  value={qrData?.qr_code || ''}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Unique QR Identifier code display */}
              <div className="mt-4 flex items-center space-x-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="font-mono text-xs font-bold text-slate-700">
                  {qrData?.qr_code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="text-slate-500 hover:text-[#002970] p-1 rounded transition-colors"
                  title="Copy QR Code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mandatory Simulation Disclaimer */}
        <div className="mt-4 p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-center">
          <p className="text-[10px] font-extrabold text-[#002970] tracking-wide uppercase">
            SIMULATED PAYMENT — NO REAL MONEY TRANSFERRED
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {isMerchant
              ? 'MDR & GST are calculated automatically upon customer scan'
              : 'Zero MDR is applied to personal P2P payments'}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center space-x-2">
          <button
            onClick={handleCopyCode}
            className="flex-1 py-2.5 bg-[#002970] hover:bg-[#0A192F] text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-[#002970]/20 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Code!' : 'Copy QR ID'}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
