import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { apiRequest } from '../api/client';
import { Camera, X, AlertCircle, Sparkles, Keyboard, CheckCircle2, ArrowRight } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onTargetResolved }) {
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'manual'
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || activeMode !== 'camera') {
      stopScanner();
      return;
    }

    let isMounted = true;
    const scannerElementId = 'qr-reader-container';

    async function startScanner() {
      try {
        setError('');
        const html5QrCode = new Html5Qrcode(scannerElementId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isMounted) {
              handleCodeScanned(decodedText);
            }
          },
          (errorMessage) => {
            // Ignore frame-by-frame read noise
          }
        );
        setCameraPermission('granted');
      } catch (err) {
        console.warn('Camera start failed or permission denied:', err);
        setCameraPermission('denied');
        setActiveMode('manual');
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, activeMode]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
  };

  const handleCodeScanned = async (code) => {
    await stopScanner();
    await resolveAndProceed(code);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setError('Please enter a QR code identifier.');
      return;
    }
    await resolveAndProceed(manualCode.trim());
  };

  const resolveAndProceed = async (code) => {
    setLoading(true);
    setError('');
    try {
      const recipient = await apiRequest('/payments/resolve-qr', {
        method: 'POST',
        body: JSON.stringify({ qr_code: code }),
      });
      onClose();
      onTargetResolved(recipient);
    } catch (err) {
      setError(err.message || 'Invalid or unregistered QR code.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#002970] text-[#00BAF2] flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Scan QR to Pay</h3>
              <p className="text-[11px] text-slate-500">Scan Personal or Merchant QR Code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle Pills */}
        <div className="flex items-center space-x-2 my-4 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => {
              setActiveMode('camera');
              setError('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeMode === 'camera'
                ? 'bg-white text-[#002970] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Scanner</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('manual');
              stopScanner();
              setError('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeMode === 'manual'
                ? 'bg-white text-[#002970] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Manual Demo Input</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Camera Viewport */}
        {activeMode === 'camera' && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center min-h-[260px] border border-slate-800">
            <div id="qr-reader-container" className="w-full h-full min-h-[260px]" />

            {/* Futuristic Scanning Overlay Reticle */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-56 h-56 border-2 border-[#00BAF2] rounded-2xl relative shadow-lg shadow-[#00BAF2]/20">
                {/* Laser animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#00BAF2] to-transparent animate-pulse"
                     style={{ top: '50%' }} />
                {/* Corner reticles */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-[#00BAF2]" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-[#00BAF2]" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-[#00BAF2]" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-[#00BAF2]" />
              </div>
              <span className="text-[11px] font-bold text-white/90 bg-black/60 px-3 py-1 rounded-full mt-4 backdrop-blur-xs">
                Align QR Code within frame
              </span>
            </div>
          </div>
        )}

        {/* Manual Input Viewport */}
        {activeMode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Enter QR Identifier *
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. MDR-PAY-4-C47E6460"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Type or paste the unique QR code of any registered user or merchant.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#002970] hover:bg-[#0A192F] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#002970]/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Resolving recipient...</span>
              ) : (
                <>
                  <span>Verify Recipient & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Disclaimer */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            SIMULATED PAYMENT — NO REAL MONEY TRANSFERRED
          </span>
        </div>
      </div>
    </div>
  );
}
