import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PlaidLinkButton from '../../components/PlaidLinkButton';

// ── Icons ─────────────────────────────────────────────────────────────────────
const BankIcon    = () => <span className="text-2xl">🏦</span>;
const PayrollIcon = () => <span className="text-2xl">💼</span>;
const CheckIcon   = () => <span className="text-green-500 font-bold">✓</span>;

// ── Integration Card ──────────────────────────────────────────────────────────
const IntegrationCard = ({ icon, title, description, children, connected }) => (
  <div className={`card border-2 transition-colors ${
    connected ? 'border-green-200 bg-green-50/30' : 'border-gray-100'
  }`}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      {connected && (
        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
          <CheckIcon /> Connected
        </span>
      )}
    </div>
    {children}
  </div>
);

// ── Finch Connect Button ──────────────────────────────────────────────────────
function FinchConnectButton({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSandboxConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/finch/sandbox-connect');
      onSuccess?.(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect sandbox account.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/finch/connect-url');
      // Open Finch OAuth in a popup window
      const popup = window.open(data.url, 'finch-connect',
        'width=600,height=700,left=200,top=100');

      // Listen for the callback message from the popup
      const listener = async (event) => {
        if (event.data?.type !== 'finch-callback') return;
        window.removeEventListener('message', listener);
        popup?.close();

        try {
          await api.post('/finch/exchange', { code: event.data.code });
          onSuccess?.();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to connect payroll account.');
        } finally {
          setLoading(false);
        }
      };
      window.addEventListener('message', listener);

      // Fallback: if popup is closed without completing, reset
      const check = setInterval(() => {
        if (popup?.closed) {
          clearInterval(check);
          window.removeEventListener('message', listener);
          setLoading(false);
        }
      }, 500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect.');
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={loading} className="btn-primary">
        {loading ? 'Connecting…' : '+ Connect Payroll'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function UserDashboard({ user, onLogout }) {
  const navigate = useNavigate();

  const [accounts,    setAccounts]    = useState([]);
  const [finchConns,  setFinchConns]  = useState([]);
  const [loadingAcc,  setLoadingAcc]  = useState(true);
  const [deletingAcc, setDeletingAcc] = useState(null);
  const [deletingFinch, setDeletingFinch] = useState(null);

  const loadAll = useCallback(async () => {
    setLoadingAcc(true);
    try {
      const [accRes, finchRes] = await Promise.all([
        api.get('/plaid/accounts'),
        api.get('/finch/connections'),
      ]);
      setAccounts(accRes.data);
      setFinchConns(finchRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAcc(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Remove this account?')) return;
    setDeletingAcc(id);
    try {
      await api.delete(`/plaid/accounts/${id}`);
      setAccounts((prev) => prev.filter((a) => a._id !== id));
    } finally {
      setDeletingAcc(null);
    }
  };

  const handleDeleteFinch = async (id) => {
    if (!window.confirm('Disconnect this payroll account?')) return;
    setDeletingFinch(id);
    try {
      await api.delete(`/finch/connections/${id}`);
      setFinchConns((prev) => prev.filter((c) => c._id !== id));
    } finally {
      setDeletingFinch(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cya_user_token');
    onLogout();
    navigate('/user/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-xl font-bold text-brand-600">ClaimYourAid</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              Hi, <span className="font-medium">{user?.fname}</span>
            </span>
            <button onClick={handleLogout} className="btn-secondary text-xs">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Integrations</h2>
          <p className="text-sm text-gray-500 mt-1">
            Connect your financial accounts. Your data will be securely shared with ClaimYourAid.
          </p>
        </div>

        {loadingAcc ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">

            {/* ── Bank Accounts (Plaid) ── */}
            <IntegrationCard
              icon={<BankIcon />}
              title="Bank Accounts"
              description="Connect via Plaid — supports Chase, Wells Fargo, Bank of America, and 12,000+ institutions"
              connected={accounts.length > 0}
            >
              {accounts.length > 0 && (
                <ul className="space-y-2 mb-4">
                  {accounts.map((acc) => (
                    <li key={acc._id}
                      className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{acc.institutionName}</p>
                        <p className="text-xs text-gray-400">
                          Linked {new Date(acc.linkedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteAccount(acc._id)}
                          disabled={deletingAcc === acc._id}
                          className="text-xs text-red-500 hover:text-red-700">
                          {deletingAcc === acc._id ? '…' : 'Remove'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <PlaidLinkButton onSuccess={loadAll} label="+ Link Bank Account" />
            </IntegrationCard>

            {/* ── Payroll (Finch) ── */}
            <IntegrationCard
              icon={<PayrollIcon />}
              title="Payroll / Employment"
              description="Connect via Finch — supports ADP, Gusto, Paychex, BambooHR, and 200+ providers"
              connected={finchConns.length > 0}
            >
              {finchConns.length > 0 && (
                <ul className="space-y-2 mb-4">
                  {finchConns.map((conn) => (
                    <li key={conn._id}
                      className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {conn.companyName || conn.provider || 'Payroll Account'}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {conn.provider || 'Connected'} · {new Date(conn.connectedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFinch(conn._id)}
                        disabled={deletingFinch === conn._id}
                        className="text-xs text-red-500 hover:text-red-700">
                        {deletingFinch === conn._id ? '…' : 'Disconnect'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <FinchConnectButton onSuccess={loadAll} />
            </IntegrationCard>

          </div>
        )}

        <p className="text-xs text-gray-400 text-center pt-4">
          Your data is encrypted and only accessible to ClaimYourAid administrators.
          You can disconnect any account at any time.
        </p>
      </main>
    </div>
  );
}
