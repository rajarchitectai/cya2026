import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PlaidLinkButton from '../components/PlaidLinkButton';
import TransactionList from '../components/TransactionList';

export default function Dashboard() {
  const [accounts,     setAccounts]     = useState([]);
  const [selectedAcc,  setSelectedAcc]  = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txnLoading,   setTxnLoading]   = useState(false);
  const [importing,    setImporting]    = useState(false);
  const [importMsg,    setImportMsg]    = useState('');
  const [accLoading,   setAccLoading]   = useState(true);
  const [deleteId,     setDeleteId]     = useState(null);

  const loadAccounts = useCallback(async () => {
    setAccLoading(true);
    try {
      const { data } = await api.get('/plaid/accounts');
      setAccounts(data);
      if (data.length > 0 && !selectedAcc) setSelectedAcc(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setAccLoading(false);
    }
  }, [selectedAcc]);

  useEffect(() => { loadAccounts(); }, []);

  useEffect(() => {
    if (!selectedAcc) { setTransactions([]); return; }
    setTxnLoading(true);
    api.get(`/plaid/accounts/${selectedAcc._id}/transactions?limit=50`)
      .then(({ data }) => setTransactions(data))
      .catch(console.error)
      .finally(() => setTxnLoading(false));
  }, [selectedAcc]);

  const handleImport = async () => {
    if (!selectedAcc) return;
    setImporting(true);
    setImportMsg('');
    try {
      const { data } = await api.post(`/plaid/accounts/${selectedAcc._id}/import`);
      setImportMsg(`Imported ${data.imported} new transaction(s) (${data.total} total).`);
      // Refresh transaction list
      const { data: txns } = await api.get(`/plaid/accounts/${selectedAcc._id}/transactions?limit=50`);
      setTransactions(txns);
    } catch (err) {
      setImportMsg(err.response?.data?.error || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    try {
      await api.delete(`/plaid/accounts/${id}`);
      const updated = accounts.filter((a) => a._id !== id);
      setAccounts(updated);
      if (selectedAcc?._id === id) setSelectedAcc(updated[0] || null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <PlaidLinkButton onSuccess={loadAccounts} />
      </div>

      {/* Account list */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Linked Accounts
        </h3>

        {accLoading ? (
          <p className="text-sm text-gray-400">Loading accounts…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-500">
            No accounts linked yet. Click <strong>+ Link Bank Account</strong> to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {accounts.map((acc) => (
              <li
                key={acc._id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAcc?._id === acc._id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedAcc(acc)}
              >
                <div>
                  <p className="font-medium text-gray-800">{acc.institutionName}</p>
                  <p className="text-xs text-gray-400">
                    Linked {new Date(acc.linkedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/alerts/${acc._id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="btn-secondary text-xs"
                  >
                    Alerts
                  </Link>
                  <button
                    className="btn-danger text-xs"
                    disabled={deleteId === acc._id}
                    onClick={(e) => { e.stopPropagation(); handleDelete(acc._id); }}
                  >
                    {deleteId === acc._id ? '…' : 'Remove'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Transactions */}
      {selectedAcc && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Transactions — {selectedAcc.institutionName}
            </h3>
            <div className="flex items-center gap-3">
              {importMsg && (
                <span className="text-xs text-gray-500">{importMsg}</span>
              )}
              <button
                className="btn-secondary text-xs"
                disabled={importing}
                onClick={handleImport}
              >
                {importing ? 'Importing…' : 'Import History'}
              </button>
            </div>
          </div>
          <TransactionList transactions={transactions} loading={txnLoading} />
        </div>
      )}
    </div>
  );
}
