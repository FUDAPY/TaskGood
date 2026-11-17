import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiFetch } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isFirstLoginRequired: boolean;
  login: (email: string, pass: string) => Promise<void>;
  updateFirstLogin: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('taskgood_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('taskgood_token');
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLoginRequired, setIsFirstLoginRequired] = useState<boolean>(() => {
    const saved = localStorage.getItem('taskgood_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        return !!u.isFirstLogin;
      } catch {
        return false;
      }
    }
    return false;
  });

  const refreshUser = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const u = await apiFetch<User>('/auth/me');
      setUser(u);
      setIsFirstLoginRequired(!!u.isFirstLogin);
      localStorage.setItem('taskgood_user', JSON.stringify(u));
    } catch {
      // Ignorar fallo al refresh
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleUnauthorized = () => {
      logout();
    };

    const handleFirstLoginReq = () => {
      setIsFirstLoginRequired(true);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:first-login-required', handleFirstLoginReq);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:first-login-required', handleFirstLoginReq);
    };
  }, [token]);

  const login = async (email: string, pass: string) => {
    const res = await apiFetch<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });

    localStorage.setItem('taskgood_token', res.access_token);
    localStorage.setItem('taskgood_user', JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
    setIsFirstLoginRequired(!!res.user.isFirstLogin);
  };

  const updateFirstLogin = async (email: string, pass: string) => {
    const res = await apiFetch<{ access_token: string; user: User }>('/auth/first-login-update', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });

    localStorage.setItem('taskgood_token', res.access_token);
    localStorage.setItem('taskgood_user', JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
    setIsFirstLoginRequired(false);
  };

  const logout = () => {
    localStorage.removeItem('taskgood_token');
    localStorage.removeItem('taskgood_user');
    setToken(null);
    setUser(null);
    setIsFirstLoginRequired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isFirstLoginRequired,
        login,
        updateFirstLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
