import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function AdminUserTransactions() {
  const { userId } = useParams();

  // ── State ───────────────────────────────────────────────────────────────────
  const today      = new Date().toISOString().slice(0, 10);
  const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);

  const [user,        setUser]        = useState(null);
  const [accounts,    setAccounts]    = useState([]);
  const [alerts,      setAlerts]      = useState([]);
  const [importing,   setImporting]   = useState(null);
  const [txns,        setTxns]        = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error,       setError]       = useState('');

  // Filter state
  const [from,       setFrom]       = useState(oneYearAgo);
  const [to,         setTo]         = useState(today);
  const [accountId,  setAccountId]  = useState('all');

  // ── Load user + accounts + alerts on mount ─────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/admin/users'),
      api.get(`/admin/users/${userId}/accounts`),
      api.get(`/admin/users/${userId}/alerts`),
    ]).then(([usersRes, accRes, alertRes]) => {
      setUser(usersRes.data.find((u) => u._id === userId) || null);
      setAccounts(accRes.data);
      setAlerts(alertRes.data);
    }).catch(console.error)
      .finally(() => setInitLoading(false));
  }, [userId]);

  // ── Fetch transactions ──────────────────────────────────────────────────────
  const fetchTxns = useCallback(async (fromDate, toDate, accId) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate, limit: 500 });
      if (accId && accId !== 'all') params.set('accountId', accId);

      const { data } = await api.get(`/admin/users/${userId}/transactions?${params}`);
      // Client-side account filter if needed (backend filters by userId, frontend by accountId)
      const filtered = accId && accId !== 'all'
        ? data.transactions.filter((t) => t.accountId === accId)
        : data.transactions;

      setTxns(filtered);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Auto-fetch once accounts are loaded
  useEffect(() => {
    if (!initLoading) fetchTxns(from, to, accountId);
  }, [initLoading]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleApply = (e) => {
    e.preventDefault();
    fetchTxns(from, to, accountId);
  };

  const handleImport = async (accId) => {
    setImporting(accId);
    try {
      const { data } = await api.post(`/admin/users/${userId}/accounts/${accId}/import`);
      alert(`Imported ${data.imported} of ${data.total} transactions.`);
      fetchTxns(from, to, accountId);
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed.');
    } finally {
      setImporting(null);
    }
  };

  const handleReset = () => {
    setFrom(oneYearAgo);
    setTo(today);
    setAccountId('all');
    fetchTxns(oneYearAgo, today, 'all');
  };

  // ── Summary stats ────────────────────────────────────────────────────────────
  const totalDebits  = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalCredits = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (initLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
  );

  if (!user) return (
    <div className="card text-center space-y-3">
      <p className="text-gray-600">User not found.</p>
      <Link to="/dashboard" className="btn-primary inline-block">Back to Dashboard</Link>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Back ── */}
      <Link to="/dashboard" className="text-sm text-brand-600 hover:underline">
        ← Back to Dashboard
      </Link>

      {/* ── User header ── */}
      <div className="card flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {user.fname} {user.lname}
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
          <p className="text-gray-400 text-sm">{user.cell}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs">
          {user.hasLinked ? (
            <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {user.accountCount} account{user.accountCount !== 1 ? 's' : ''} linked
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium">
              No accounts linked
            </span>
          )}
          <span className="text-gray-400">
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* ── Filters ── */}
      <form onSubmit={handleApply} className="card">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">Filter Transactions</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">From Date</label>
            <input type="date" value={from} max={to}
              onChange={(e) => setFrom(e.target.value)} className="input w-44" />
          </div>
          <div>
            <label className="label">To Date</label>
            <input type="date" value={to} min={from} max={today}
              onChange={(e) => setTo(e.target.value)} className="input w-44" />
          </div>
          <div>
            <label className="label">Account</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
              className="input w-52">
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.institutionName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pb-0.5">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Loading…' : 'Apply Filter'}
            </button>
            <button type="button" onClick={handleReset} className="btn-secondary">
              Reset
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Alerts panel ── */}
      {accounts.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Transaction Alerts</h3>
          <div className="divide-y divide-gray-50">
            {accounts.map((acc) => {
              const existingAlert = alerts.find(
                (a) => (a.accountId?._id || a.accountId) === acc._id
              );
              return (
                <div key={acc._id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{acc.institutionName}</p>
                    {existingAlert && (
                      <p className={`text-xs mt-0.5 ${existingAlert.active ? 'text-green-600' : 'text-gray-400'}`}>
                        {existingAlert.active ? '● Active' : '○ Disabled'} — {existingAlert.name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleImport(acc._id)}
                      disabled={importing === acc._id}
                      className="btn-secondary text-xs"
                    >
                      {importing === acc._id ? 'Importing…' : 'Import'}
                    </button>
                    <Link
                      to={`/users/${userId}/alerts/${acc._id}`}
                      className="btn-secondary text-xs"
                    >
                      {existingAlert ? 'Edit Alert' : 'Set Alert'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Summary cards ── */}
      {!loading && txns.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card py-4 text-center">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Transactions</p>
            <p className="text-2xl font-bold text-gray-800">{txns.length}</p>
            {total > txns.length && (
              <p className="text-xs text-gray-400 mt-1">of {total} total</p>
            )}
          </div>
          <div className="card py-4 text-center">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Total Debits</p>
            <p className="text-2xl font-bold text-red-600">${totalDebits.toFixed(2)}</p>
          </div>
          <div className="card py-4 text-center">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Total Credits</p>
            <p className="text-2xl font-bold text-green-600">${totalCredits.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* ── Transaction table ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Transactions
            {!loading && txns.length > 0 && (
              <span className="ml-2 text-gray-400 font-normal normal-case">
                ({from} → {to})
              </span>
            )}
          </h3>
          {total > txns.length && !loading && (
            <p className="text-xs text-gray-400">
              Showing {txns.length} of {total} — narrow date range to see more
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            Loading transactions…
          </div>
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <p className="text-gray-500 text-sm font-medium">No transactions found</p>
            <p className="text-gray-400 text-xs">
              Try adjusting the date range or check that the user has imported transaction history.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Account</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((txn) => (
                  <tr key={txn._id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap text-xs">
                      {txn.txnDate}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-gray-800 max-w-xs">
                      {txn.name}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs whitespace-nowrap">
                      {txn.accountName || '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      {txn.category ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                          {txn.category}
                        </span>
                      ) : '—'}
                    </td>
                    <td className={`py-2.5 text-right font-semibold whitespace-nowrap ${
                      txn.amount < 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.amount < 0 ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="pt-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Totals ({txns.length} transactions)
                  </td>
                  <td className="pt-3 text-right font-bold text-gray-800">
                    ${(totalCredits - totalDebits).toFixed(2)}
                    <span className="text-xs font-normal text-gray-400 ml-1">net</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
