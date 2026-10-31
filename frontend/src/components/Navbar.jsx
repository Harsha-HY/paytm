import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, User, Store, UserCheck, ShieldAlert } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdminCreated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002970] to-[#00BAF2] flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-[#0A192F] tracking-tight">
                  MDR Guardian
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-[#002970] px-2 py-0.5 rounded-full border border-sky-200">
                  Paytm AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                Understand Every Payment Deduction
              </p>
            </div>
          </Link>

          {/* Right Action Menu */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Role indicator pill */}
                <div className="hidden xs:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {user.role === 'admin' ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-amber-800 font-bold">Admin</span>
                    </>
                  ) : user.account_type === 'merchant' ? (
                    <>
                      <Store className="w-3.5 h-3.5 text-sky-600" />
                      <span className="text-sky-800 font-medium">Merchant</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-800 font-medium">Personal</span>
                    </>
                  )}
                </div>

                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
                    {user.full_name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                    {user.email}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-3">
                {!isAdminCreated && (
                  <Link
                    to="/setup-admin"
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-lg border border-amber-300 transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Setup Admin</span>
                  </Link>
                )}
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#002970] px-3 py-2 rounded-lg transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-xs sm:text-sm font-semibold text-white bg-[#002970] hover:bg-[#0A192F] px-3.5 py-2 rounded-lg shadow-sm shadow-[#002970]/30 transition-all hover:shadow"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
