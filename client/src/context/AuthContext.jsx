import React, { createContext, useContext, useMemo, useState } from 'react';
import { http } from '../api/http';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('foodbridge_user');
    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('foodbridge_user');
      localStorage.removeItem('foodbridge_token');
      return null;
    }
  });

  function saveSession(nextUser, token = localStorage.getItem('foodbridge_token')) {
    if (token) {
      localStorage.setItem('foodbridge_token', token);
    }
    localStorage.setItem('foodbridge_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }

  async function login(email, password) {
    const { data } = await http.post('/auth/login', { email, password });
    saveSession(data.user, data.token);
    return data.user;
  }

  async function register(payload) {
    const { data } = await http.post('/auth/register', payload);
    saveSession(data.user, data.token);
    return data.user;
  }

  function updateUser(nextUser) {
    saveSession(nextUser);
  }

  function logout() {
    localStorage.removeItem('foodbridge_token');
    localStorage.removeItem('foodbridge_user');
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, register, logout, updateUser }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
