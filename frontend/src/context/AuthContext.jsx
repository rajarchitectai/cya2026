import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on page load
  useEffect(() => {
    const token = localStorage.getItem('cya_token');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => localStorage.removeItem('cya_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('cya_token', data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (fields) => {
    const { data } = await api.post('/auth/register', fields);
    localStorage.setItem('cya_token', data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cya_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
