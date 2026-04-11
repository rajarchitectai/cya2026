import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const tabs = ['Accounts', 'Transactions', 'Alerts', 'Payroll'];

// ── Transactions panel with date-range filter ────────────────────────────────
function TransactionsPanel({ userId }) {
  const today     = new Date().toISOString().slice(0, 10);
  const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);

  const [from,    setFrom]    = useState(oneYearAgo);
  const [to,      setTo]      = useState(today);
  const [txns,    setTxns]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const fetchTxns = useCallback(async (fromDate, toDate) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate, limit: 200 });
      const { data } = await api.get(`/admin/users/${userId}/transactions?${params}`);
      setTxns(data.transactions);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load on mount with default range
  useEffect(() => { fetchTxns(oneYearAgo, today); }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchTxns(from, to);
  };

  const handleReset = () => {
    setFrom(oneYearAgo);
    setTo(today);
    fetchTxns(oneYearAgo, today);
  };

  // Summary stats derived from current result set
  const totalDebit  = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalCredit = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-4">
      {/* Date filter bar */}
      <form onSubmit={handleFilter}
        className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label">From Date</label>
          <input type="date" value={from} max={to}
            onChange={(e) => setFrom(e.target.value)} className="input w-40" />
        </div>
        <div>
          <label className="label">To Date</label>
          <input type="date" value={to} min={from} max={today}
            onChange={(e) => setTo(e.target.value)} className="input w-40" />
        </div>
        <div className="flex gap-2 pb-0.5">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Loading…' : 'Apply Filter'}
          </button>
          <button type="button" onClick={handleReset} className="btn-secondary">
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Summary row */}
      {!loading && txns.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card py-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Transactions</p>
            <p className="text-xl font-bold text-gray-800">{total}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Total Debits</p>
            <p className="text-xl font-bold text-red-600">${totalDebit.toFixed(2)}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Total Credits</p>
            <p className="text-xl font-bold text-green-600">${totalCredit.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <p className="text-sm text-gray-400 py-4">Loading transactions…</p>
        ) : txns.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">
            No transactions found for the selected date range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            {total > txns.length && (
              <p className="text-xs text-gray-400 mb-3">
                Showing {txns.length} of {total} — narrow the date range to see more.
              </p>
            )}
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2 pr-4">Account</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((txn) => (
                  <tr key={txn._id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{txn.txnDate}</td>
                    <td className="py-2 pr-4 font-medium text-gray-800 max-w-xs truncate">
                      {txn.name}
                    </td>
                    <td className="py-2 pr-4 text-gray-500 text-xs whitespace-nowrap">
                      {txn.accountName || '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                        {txn.category || '—'}
                      </span>
                    </td>
                    <td className={`py-2 text-right font-semibold whitespace-nowrap ${
                      txn.amount < 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.amount < 0 ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UserDetail() {
  const { userId } = useParams();

  const [user,       setUser]       = useState(null);
  const [accounts,   setAccounts]   = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [finchConns, setFinchConns] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('Accounts');

  useEffect(() => {
    Promise.all([
      api.get('/admin/users'),
      api.get(`/admin/users/${userId}/accounts`),
      api.get(`/admin/users/${userId}/alerts`),
      api.get(`/admin/users/${userId}/finch`),
    ]).then(([usersRes, accRes, alertRes, finchRes]) => {
      setUser(usersRes.data.find((u) => u._id === userId) || null);
      setAccounts(accRes.data);
      setAlerts(alertRes.data);
      setFinchConns(finchRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!user) return (
    <div className="card text-center space-y-3">
      <p className="text-gray-600">User not found.</p>
      <Link to="/dashboard" className="btn-primary inline-block">Back</Link>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="text-sm text-brand-600 hover:underline">
        ← Back to Dashboard
      </Link>

      {/* User header */}
      <div className="card flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{user.fname} {user.lname}</h2>
          <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
          <p className="text-gray-400 text-sm">{user.cell}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-gray-400">
          <p>Joined {new Date(user.createdAt).toLocaleDateString()}</p>
          {user.hasLinked ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {user.accountCount} account{user.accountCount !== 1 ? 's' : ''} linked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
              No accounts linked
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Accounts tab ── */}
      {activeTab === 'Accounts' && (
        <div className="card">
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-400">No linked accounts.</p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((acc) => (
                <li key={acc._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">{acc.institutionName}</p>
                    <p className="text-xs text-gray-400">
                      {acc.accountType
                        ? `${acc.accountType} · `
                        : ''}
                      Linked {new Date(acc.linkedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link to={`/alerts/${acc._id}`} className="btn-secondary text-xs">
                    Manage Alerts
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Transactions tab ── */}
      {activeTab === 'Transactions' && (
        <TransactionsPanel userId={userId} />
      )}

      {/* ── Alerts tab ── */}
      {/* ── Payroll tab ── */}
      {activeTab === 'Payroll' && (
        <div className="card">
          {finchConns.length === 0 ? (
            <p className="text-sm text-gray-400">No payroll accounts connected.</p>
          ) : (
            <ul className="space-y-3">
              {finchConns.map((conn) => (
                <li key={conn._id} className="p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-800">
                      {conn.companyName || 'Payroll Account'}
                    </p>
                    <span className="text-xs text-green-600 font-semibold">● Connected</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
                    {conn.provider   && <span>Provider: <span className="capitalize font-medium text-gray-700">{conn.provider}</span></span>}
                    {conn.companyId  && <span>Company ID: {conn.companyId}</span>}
                    <span>Connected: {new Date(conn.connectedAt).toLocaleDateString()}</span>
                    {conn.products?.length > 0 && (
                      <span className="col-span-2 sm:col-span-3">
                        Products: {conn.products.join(', ')}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'Alerts' && (
        <div className="card">
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-400">No alerts configured.</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((alert) => (
                <li key={alert._id} className="p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-800">{alert.name}</p>
                    <span className={`text-xs font-semibold ${
                      alert.active ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {alert.active ? '● Active' : '○ Disabled'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">
                    <span>Amount: ${alert.minAmount}–${alert.maxAmount}</span>
                    {alert.merchantFilter && <span>Merchant: {alert.merchantFilter}</span>}
                    {alert.notifyEmail   && <span>Email: {alert.notifyEmail}</span>}
                    {alert.notifyPhone   && <span>SMS: {alert.notifyPhone}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
