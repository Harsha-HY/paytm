import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AdminSetupPage from './pages/AdminSetupPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import MerchantDashboard from './pages/MerchantDashboard';
import MerchantTransactionHistory from './pages/MerchantTransactionHistory';
import PersonalDashboard from './pages/PersonalDashboard';
import PersonalTransactionHistory from './pages/PersonalTransactionHistory';

function ProtectedAdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-semibold text-slate-500">
        Loading session...
      </div>
    );
  }
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function ProtectedMerchantRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-semibold text-slate-500">
        Loading session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function ProtectedPersonalRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-semibold text-slate-500">
        Loading session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/setup-admin" element={<AdminSetupPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/admin/*"
                element={
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                }
              />

              <Route
                path="/merchant/history"
                element={
                  <ProtectedMerchantRoute>
                    <MerchantTransactionHistory />
                  </ProtectedMerchantRoute>
                }
              />

              <Route
                path="/merchant/*"
                element={
                  <ProtectedMerchantRoute>
                    <MerchantDashboard />
                  </ProtectedMerchantRoute>
                }
              />

              <Route
                path="/personal/history"
                element={
                  <ProtectedPersonalRoute>
                    <PersonalTransactionHistory />
                  </ProtectedPersonalRoute>
                }
              />

              <Route
                path="/personal/*"
                element={
                  <ProtectedPersonalRoute>
                    <PersonalDashboard />
                  </ProtectedPersonalRoute>
                }
              />

              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
