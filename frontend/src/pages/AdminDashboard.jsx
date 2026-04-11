import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, bg }) => (
  <div className={`rounded-xl border border-gray-100 shadow-sm p-5 ${bg || 'bg-white'}`}>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
    <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

// ── Linking progress bar ──────────────────────────────────────────────────────
const LinkingBar = ({ linked, total }) => {
  const pct = total > 0 ? Math.round((linked / total) * 100) : 0;
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Bank Linking Progress</p>
        <p className="text-sm font-bold text-brand-600">{pct}%</p>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          <span className="font-medium text-green-600">{linked}</span> linked
        </span>
        <span>
          <span className="font-medium text-red-500">{total - linked}</span> not linked
        </span>
        <span>{total} total users</span>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats,    setStats]    = useState(null);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');   // all | linked | notLinked
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
    ]).then(([s, u]) => {
      setStats(s.data);
      setUsers(u.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Remove user "${name}" and all their data? This cannot be undone.`)) return;
    setDeleting(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setStats((prev) => prev
        ? { ...prev, totalUsers: prev.totalUsers - 1 }
        : prev
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user.');
    } finally {
      setDeleting(null);
    }
  };

  // Apply search + linking filter
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.fname?.toLowerCase().includes(q) ||
      u.lname?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.cell?.includes(q);

    const matchFilter =
      filter === 'all' ||
      (filter === 'linked'    &&  u.hasLinked) ||
      (filter === 'notLinked' && !u.hasLinked);

    return matchSearch && matchFilter;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">Loading dashboard…</div>
  );

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Users"       value={stats?.totalUsers}       color="text-gray-800"   />
        <StatCard
          label="Linked Users"
          value={stats?.linkedUsers}
          sub={`${stats?.totalUsers > 0 ? Math.round((stats.linkedUsers/stats.totalUsers)*100) : 0}% of users`}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          label="Not Linked"
          value={stats?.notLinkedUsers}
          color="text-red-500"
          bg="bg-red-50"
        />
        <StatCard label="Total Accounts"    value={stats?.totalAccounts}    color="text-brand-600"  />
        <StatCard label="Active Alerts"     value={stats?.activeAlerts}     color="text-yellow-600" />
        <StatCard label="Transactions"      value={stats?.totalTransactions} color="text-purple-600" />
      </div>

      {/* ── Linking progress bar ── */}
      <LinkingBar linked={stats?.linkedUsers ?? 0} total={stats?.totalUsers ?? 0} />

      {/* ── User table ── */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Users ({filtered.length})
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Linking filter tabs */}
            {[
              { key: 'all',       label: `All (${users.length})` },
              { key: 'linked',    label: `Linked (${users.filter(u => u.hasLinked).length})` },
              { key: 'notLinked', label: `Not Linked (${users.filter(u => !u.hasLinked).length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  filter === key
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-brand-400'
                }`}
              >
                {label}
              </button>
            ))}
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-44 text-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No users match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Phone</th>
                  <th className="pb-2 pr-4">Linking Status</th>
                  <th className="pb-2 pr-4">Joined</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-gray-800 whitespace-nowrap">
                      {user.fname} {user.lname}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{user.email}</td>
                    <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{user.cell}</td>
                    <td className="py-3 pr-4">
                      {user.hasLinked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          {user.accountCount} account{user.accountCount !== 1 ? 's' : ''} linked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                          Not linked
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/users/${user._id}/transactions`} className="btn-secondary text-xs">
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(user._id, `${user.fname} ${user.lname}`)}
                          disabled={deleting === user._id}
                          className="btn-danger text-xs"
                        >
                          {deleting === user._id ? '…' : 'Remove'}
                        </button>
                      </div>
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
