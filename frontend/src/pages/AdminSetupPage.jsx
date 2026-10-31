import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ShieldCheck, Lock, Mail, Phone, User, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AdminSetupPage() {
  const { isAdminCreated, registerAdmin, checkAdminStatus } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend Validations
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com') || cleanEmail === '@gmail.com') {
      setError('Gmail address must end with @gmail.com');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Phone number must contain exactly 10 digits.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerAdmin({
        full_name: fullName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/admin');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to create Admin account.');
    } finally {
      setLoading(false);
    }
  };

  // If Admin already initialized, show closed notice
  if (isAdminCreated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-[#0A192F]">Admin Setup Closed</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            The platform Administrator account has already been registered and secured.
            Public setup is permanently disabled for security.
          </p>
          <div className="mt-6 flex flex-col space-y-3">
            <Link
              to="/login"
              className="w-full py-3 bg-[#002970] hover:bg-[#0A192F] text-white font-bold rounded-xl shadow-md transition-all text-sm"
            >
              Sign In to Admin Portal
            </Link>
            <Link
              to="/"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all text-xs"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl relative overflow-hidden">
        {/* Top Warning Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Protected One-Time Setup
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0A192F] mt-1">
              Create Admin Account
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          This initializes the master administration privileges for MDR Settlement Guardian.
          Once registered, this setup portal will be permanently locked.
        </p>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2.5 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Admin account created! Redirecting to Admin Dashboard...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Full Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Harsha HY"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Gmail Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Gmail Address (@gmail.com) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin.name@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Must end strictly with @gmail.com
            </span>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              10-Digit Phone Number *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Master Password (Min. 8 characters) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Confirm Master Password *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-2 py-3.5 bg-[#002970] hover:bg-[#0A192F] text-white font-bold rounded-xl shadow-lg shadow-[#002970]/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] disabled:opacity-50 text-sm cursor-pointer"
          >
            {loading ? (
              <span>Registering Master Admin...</span>
            ) : (
              <>
                <span>Complete Admin Initialization</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link to="/login" className="text-xs text-slate-500 hover:text-[#002970] font-medium">
            Already have an account? <span className="font-bold underline">Login here</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
