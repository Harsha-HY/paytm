import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('mdr_token'));
  const [isAdminCreated, setIsAdminCreated] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check admin status from backend
  const checkAdminStatus = async () => {
    try {
      const res = await apiRequest('/auth/admin-status');
      setIsAdminCreated(res.is_admin_created);
      return res.is_admin_created;
    } catch (err) {
      console.error('Failed to check admin status:', err);
      return false;
    }
  };

  // Check if existing token is valid and fetch current user
  useEffect(() => {
    async function initAuth() {
      setLoading(true);
      await checkAdminStatus();
      const storedToken = localStorage.getItem('mdr_token');
      if (storedToken) {
        try {
          const userData = await apiRequest('/auth/me');
          setUser(userData);
        } catch (err) {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('mdr_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('mdr_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const registerAdmin = async (adminData) => {
    const res = await apiRequest('/auth/register-admin', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
    localStorage.setItem('mdr_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    setIsAdminCreated(true);
    return res.user;
  };

  const registerUser = async (userData) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    localStorage.setItem('mdr_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('mdr_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAdminCreated,
        loading,
        checkAdminStatus,
        login,
        registerAdmin,
        registerUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
