import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Admin
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar         from './components/Navbar';
import Login          from './pages/Login';
import AdminDashboard        from './pages/AdminDashboard';
import UserDetail            from './pages/UserDetail';
import AdminUserTransactions from './pages/AdminUserTransactions';
import AdminAlertConfig      from './pages/AdminAlertConfig';
import AlertConfig           from './pages/AlertConfig';

// User portal
import UserLogin         from './pages/user/UserLogin';
import UserRegister      from './pages/user/UserRegister';
import UserDashboard     from './pages/user/UserDashboard';
import FinchCallback     from './pages/user/FinchCallback';
import PlaidOAuthReturn  from './pages/user/PlaidOAuthReturn';
import api            from './services/api';

// ── Admin route guard ─────────────────────────────────────────────────────────
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center space-y-3">
        <p className="text-xl font-semibold text-red-600">Access Denied</p>
        <p className="text-gray-500 text-sm">This portal is for ClaimYourAid admins only.</p>
        <button onClick={() => { localStorage.removeItem('cya_token'); window.location.href = '/login'; }}
          className="btn-secondary text-sm">Sign Out</button>
      </div>
    </div>
  );
  return children;
};

const AdminPublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

const AdminLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
  </div>
);

// ── User portal (self-contained, no AuthContext needed) ───────────────────────
function UserPortal() {
  const [userAuth, setUserAuth] = useState(null);   // { id, fname, email, cell, role }
  const [loading,  setLoading]  = useState(true);

  // Restore user session on mount
  useEffect(() => {
    const token = localStorage.getItem('cya_user_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ data }) => setUserAuth(data))
      .catch(() => localStorage.removeItem('cya_user_token'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>
  );

  const isLoggedIn = !!userAuth;

  return (
    <Routes>
      <Route path="login"    element={
        isLoggedIn
          ? <Navigate to="/user/dashboard" replace />
          : <UserLogin onLogin={setUserAuth} />
      } />
      <Route path="register" element={
        isLoggedIn
          ? <Navigate to="/user/dashboard" replace />
          : <UserRegister onLogin={setUserAuth} />
      } />
      <Route path="dashboard" element={
        isLoggedIn
          ? <UserDashboard user={userAuth} onLogout={() => setUserAuth(null)} />
          : <Navigate to="/user/login" replace />
      } />
      {/* Plaid OAuth redirect return — no auth required */}
      <Route path="plaid-oauth-return" element={<PlaidOAuthReturn />} />
      {/* Finch OAuth popup callback — no auth required */}
      <Route path="finch-callback" element={<FinchCallback />} />
      <Route path="*" element={<Navigate to="/user/login" replace />} />
    </Routes>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin portal */}
          <Route path="/login" element={
            <AdminPublicRoute><Login /></AdminPublicRoute>
          } />
          <Route path="/dashboard" element={
            <AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>
          } />
          <Route path="/users/:userId" element={
            <AdminRoute><AdminLayout><UserDetail /></AdminLayout></AdminRoute>
          } />
          <Route path="/users/:userId/transactions" element={
            <AdminRoute><AdminLayout><AdminUserTransactions /></AdminLayout></AdminRoute>
          } />
          <Route path="/users/:userId/alerts/:accountId" element={
            <AdminRoute><AdminLayout><AdminAlertConfig /></AdminLayout></AdminRoute>
          } />
          <Route path="/alerts/:accountId" element={
            <AdminRoute><AdminLayout><AlertConfig /></AdminLayout></AdminRoute>
          } />

          {/* User portal — all /user/* routes */}
          <Route path="/user/*" element={<UserPortal />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
