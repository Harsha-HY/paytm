import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Sparkles,
  Store,
  Users,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

export default function LandingPage() {
  const { user, isAdminCreated } = useAuth();
  const [demoAmount, setDemoAmount] = useState(3000);

  // Live interactive rate computation for the landing demo
  const calculateFee = (amt) => {
    if (amt <= 2000) {
      return { fee: 0, gst: 0, net: amt, rule: 'Zero MDR (≤ ₹2,000)' };
    }
    const rawFee = amt * 0.004;
    const cappedFee = Math.min(rawFee, 300);
    const gst = cappedFee * 0.18;
    const net = amt - (cappedFee + gst);
    return {
      fee: cappedFee,
      gst: gst,
      net: net,
      rule: amt >= 75000 ? '₹300 Max Cap Reached' : '0.4% UPI MDR + 18% GST',
    };
  };

  const demoCalc = calculateFee(demoAmount);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 pb-16">
      {/* Top Banner Alert regarding new regulations */}
      <div className="bg-[#002970] text-white py-2 px-4 text-xs text-center font-medium flex items-center justify-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-[#00BAF2] animate-pulse" />
        <span>Paytm Build for India Hackathon · Bengaluru 2026 · Track 1: Merchant Growth AI</span>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-12">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-sky-50 text-[#002970] border border-sky-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-6 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#00BAF2] animate-ping" />
            <span>MDR Settlement Guardian</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#0A192F] tracking-tight leading-[1.15]">
            Understand Every{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#002970] via-[#00BAF2] to-sky-600">
              Payment Deduction
            </span>
          </h1>

          {/* Tagline / Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            The AI that explains to every Paytm merchant, in their own language, exactly why a settlement
            is lower than their sales—and warns them before the surprise happens.
          </p>

          {/* Call to Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            {user ? (
              <Link
                to={
                  user.role === 'admin'
                    ? '/admin'
                    : user.account_type === 'merchant'
                    ? '/merchant'
                    : '/personal'
                }
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-bold text-white bg-[#002970] hover:bg-[#0A192F] shadow-lg shadow-[#002970]/25 transition-all hover:scale-[1.02]"
              >
                <span>Go to Your Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-bold text-white bg-[#002970] hover:bg-[#0A192F] shadow-lg shadow-[#002970]/25 transition-all hover:scale-[1.02]"
                >
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-all hover:border-slate-400"
                >
                  <span>Login</span>
                </Link>
              </>
            )}

            {!isAdminCreated && !user && (
              <Link
                to="/setup-admin"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs transition-all"
              >
                <span>Initialize Admin Setup</span>
              </Link>
            )}
          </div>
        </div>

        {/* Interactive Real-Time MDR Calculation Showcase */}
        <div className="mt-12 sm:mt-16 max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-200 relative overflow-hidden">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#002970] via-[#00BAF2] to-sky-400" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#002970] bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                  Interactive Simulator
                </span>
                <h3 className="text-xl font-bold text-[#0A192F] mt-2">
                  See how the new UPI MDR changes net bank credit
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Adjust the transaction amount to see deterministic math in action:
                </p>
              </div>

              {/* Slider / Preset buttons */}
              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                {[1500, 3000, 12000, 80000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setDemoAmount(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      demoAmount === val
                        ? 'bg-[#002970] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ₹{val.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Computation Display Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">QR Sale Value</span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  ₹{demoAmount.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-400">Customer paid</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs text-rose-600 font-medium">MDR Fee (0.4%)</span>
                <div className="text-2xl font-black text-rose-600 mt-1">
                  - ₹{demoCalc.fee.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-400">{demoCalc.rule}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs text-amber-600 font-medium">18% GST (Claimable)</span>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  - ₹{demoCalc.gst.toFixed(2)}
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">Input Tax Credit</span>
              </div>

              <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200">
                <span className="text-xs text-[#002970] font-bold">Bank Credit (Settlement)</span>
                <div className="text-2xl font-black text-[#002970] mt-1">
                  ₹{demoCalc.net.toFixed(2)}
                </div>
                <span className="text-[11px] text-sky-700 font-medium">Netted automatically</span>
              </div>
            </div>

            {/* Vernacular Voice Explainer Preview */}
            <div className="mt-6 bg-[#0A192F] text-white rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#00BAF2]/20 flex items-center justify-center shrink-0 text-[#00BAF2]">
                <Volume2 className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#00BAF2]">
                    Sarvam Voice Explanation (Preview)
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                    Kannada & Hindi
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 mt-1 italic leading-relaxed">
                  "ನಮಸ್ಕಾರ ರವಿ ಅವರೇ, ಇಂದು ನಿಮ್ಮ ₹{demoAmount.toLocaleString('en-IN')} ಮಾರಾಟಕ್ಕೆ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ₹{demoCalc.net.toFixed(2)} ಜಮೆಯಾಗಿದೆ. {demoCalc.fee > 0 ? `₹${(demoCalc.fee + demoCalc.gst).toFixed(2)} ಕಡಿತಗೊಂಡಿದ್ದು (₹${demoCalc.fee.toFixed(2)} UPI ಶುಲ್ಕ + ₹${demoCalc.gst.toFixed(2)} GST), GST ಮೊತ್ತವನ್ನು ನೀವು ಕ್ಲೈಮ್ ಮಾಡಬಹುದು.` : '₹2,000 ಕ್ಕಿಂತ ಕಡಿಮೆಯಿರುವುದರಿಂದ ಯಾವುದೇ ಶುಲ್ಕವಿಲ್ಲ!'}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars Section: Explain, Warn, Recover, Act */}
        <div className="mt-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0A192F]">
              Four Pillars of Merchant Protection
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Transforming regulatory confusion into trust and financial clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-[#002970] flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#0A192F] text-base mb-1">1. Explain</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Line-by-line settlement story. Which payments paid the fee, the cap, and GST, spoken in the merchant's own language via Sarvam AI.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#0A192F] text-base mb-1">2. Warn</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                ₹1 Lakh Cliff tracker. Alerts merchants at 75% and 90% and counts the 3-month clock before any charges apply.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#0A192F] text-base mb-1">3. Recover</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Audit engine catches errors: charges on payments ≤ ₹2,000, cap breaches, wrong category rates, and GST input credit to claim.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#0A192F] text-base mb-1">4. Act</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Approve, don't chase. Pre-drafted dispute workflows ready for one-tap merchant approval, powered by Cognee memory.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
