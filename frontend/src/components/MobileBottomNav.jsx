import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Receipt,
  Scan,
  QrCode,
  User,
  Store,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav({ onScan, onMyQR }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isMerchant = user.account_type === 'merchant';
  const isAdmin = user.role === 'admin';

  const homePath = isAdmin ? '/admin' : isMerchant ? '/merchant' : '/personal';
  const historyPath = isMerchant ? '/merchant/history' : '/personal/history';

  const isHomeActive = location.pathname === homePath;
  const isHistoryActive = location.pathname.includes('/history');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-lg">
      <div className="grid grid-cols-5 items-center">
        {/* Home */}
        <button
          onClick={() => navigate(homePath)}
          className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            isHomeActive ? 'text-[#002970]' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Home className={`w-5 h-5 ${isHomeActive ? 'stroke-[2.5px]' : ''}`} />
          <span className="text-[10px] font-bold mt-0.5">Home</span>
        </button>

        {/* Transactions / History */}
        <button
          onClick={() => navigate(historyPath)}
          className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            isHistoryActive ? 'text-[#002970]' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Receipt className={`w-5 h-5 ${isHistoryActive ? 'stroke-[2.5px]' : ''}`} />
          <span className="text-[10px] font-bold mt-0.5">History</span>
        </button>

        {/* Scan (Elevated Center Button) */}
        <div className="flex justify-center -mt-4">
          <button
            onClick={() => onScan && onScan()}
            className="w-13 h-13 rounded-2xl bg-[#002970] text-white flex flex-col items-center justify-center shadow-lg shadow-[#002970]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white"
            title="Scan QR"
          >
            <Scan className="w-6 h-6 text-[#00BAF2]" />
            <span className="text-[9px] font-black uppercase tracking-tighter mt-0.5">Scan</span>
          </button>
        </div>

        {/* My QR / Settlements */}
        <button
          onClick={() => (onMyQR ? onMyQR() : navigate(homePath))}
          className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-[#002970] transition-colors cursor-pointer"
        >
          {isMerchant ? <Percent className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
          <span className="text-[10px] font-bold mt-0.5">
            {isMerchant ? 'My QR' : 'My QR'}
          </span>
        </button>

        {/* Profile / Account */}
        <button
          onClick={() => {
            alert(
              `User Profile:\nName: ${user.full_name}\nEmail: ${user.email}\nPhone: ${user.phone}\nAccount Type: ${user.account_type.toUpperCase()}\nRole: ${user.role.toUpperCase()}`
            );
          }}
          className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Profile</span>
        </button>
      </div>
    </nav>
  );
}
