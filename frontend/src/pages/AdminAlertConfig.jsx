import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const DEFAULT_EMAIL_TPL =
  'New transaction on <<Deposit Date>>: <<Deposit Description>> for $<<Deposit Amount>>';
const DEFAULT_SMS_TPL =
  'Alert: <<Deposit Description>> $<<Deposit Amount>> on <<Deposit Date>>';

export default function AdminAlertConfig() {
  const { userId, accountId } = useParams();

  const [user,    setUser]    = useState(null);
  const [account, setAccount] = useState(null);
  const [alert,   setAlert]   = useState(null);
  const [form,    setForm]    = useState({
    name:           '',
    minAmount:      '0',
    maxAmount:      '999999',
    merchantFilter: '',
    notifyEmail:    '',
    notifyPhone:    '',
    emailTemplate:  DEFAULT_EMAIL_TPL,
    smsTemplate:    DEFAULT_SMS_TPL,
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState({ text: '', type: '' });

  useEffect(() => {
    Promise.all([
      api.get('/admin/users'),
      api.get(`/admin/users/${userId}/accounts`),
      api.get(`/admin/users/${userId}/alerts`),
    ]).then(([usersRes, accRes, alertRes]) => {
      setUser(usersRes.data.find((u) => u._id === userId) || null);

      const acc = accRes.data.find((a) => a._id === accountId);
      setAccount(acc || null);

      const existing = alertRes.data.find(
        (a) => (a.accountId?._id || a.accountId) === accountId
      );
      if (existing) {
        setAlert(existing);
        setForm({
          name:           existing.name           || '',
          minAmount:      String(existing.minAmount ?? 0),
          maxAmount:      String(existing.maxAmount ?? 999999),
          merchantFilter: existing.merchantFilter  || '',
          notifyEmail:    existing.notifyEmail     || '',
          notifyPhone:    existing.notifyPhone     || '',
          emailTemplate:  existing.emailTemplate   || DEFAULT_EMAIL_TPL,
          smsTemplate:    existing.smsTemplate     || DEFAULT_SMS_TPL,
        });
      }
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, accountId]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });
    try {
      const { data } = await api.post(`/admin/users/${userId}/alerts`, {
        accountId,
        ...form,
        minAmount: parseFloat(form.minAmount) || 0,
        maxAmount: parseFloat(form.maxAmount) || 999999,
      });
      setAlert(data);
      setMsg({ text: 'Alert saved successfully.', type: 'success' });
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed to save alert.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!alert) return;
    try {
      const { data } = await api.patch(`/admin/users/${userId}/alerts/${alert._id}/toggle`);
      setAlert(data);
      setMsg({ text: `Alert ${data.active ? 'enabled' : 'disabled'}.`, type: 'success' });
    } catch (err) {
      setMsg({ text: 'Failed to toggle alert.', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!alert || !window.confirm('Delete this alert?')) return;
    try {
      await api.delete(`/admin/users/${userId}/alerts/${alert._id}`);
      setAlert(null);
      setForm({
        name: '', minAmount: '0', maxAmount: '999999',
        merchantFilter: '', notifyEmail: '', notifyPhone: '',
        emailTemplate: DEFAULT_EMAIL_TPL, smsTemplate: DEFAULT_SMS_TPL,
      });
      setMsg({ text: 'Alert deleted.', type: 'success' });
    } catch (err) {
      setMsg({ text: 'Failed to delete alert.', type: 'error' });
    }
  };

  if (loading) return <p className="text-gray-400">Loading…</p>;

  if (!account) return (
    <div className="card text-center space-y-3">
      <p className="text-gray-600">Account not found.</p>
      <Link to={`/users/${userId}/transactions`} className="btn-primary inline-block">
        Back to Transactions
      </Link>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Back */}
      <Link to={`/users/${userId}/transactions`} className="text-sm text-brand-600 hover:underline">
        ← Back to Transactions
      </Link>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configure Alert</h2>
        <p className="text-gray-500 text-sm mt-1">
          {account.institutionName}
          {user && (
            <span className="text-gray-400"> — {user.fname} {user.lname}</span>
          )}
        </p>
      </div>

      {msg.text && (
        <div className={`text-sm px-3 py-2 rounded-lg border ${
          msg.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">

        <div>
          <label className="label">Alert Name</label>
          <input name="name" value={form.name} onChange={handleChange}
            className="input" placeholder={`${account.institutionName} Alert`} />
        </div>

        <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
          <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            Trigger Conditions
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Min Amount ($)</label>
              <input name="minAmount" type="number" min="0" step="0.01"
                value={form.minAmount} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="label">Max Amount ($)</label>
              <input name="maxAmount" type="number" min="0" step="0.01"
                value={form.maxAmount} onChange={handleChange} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Merchant Filter (optional)</label>
            <input name="merchantFilter" value={form.merchantFilter} onChange={handleChange}
              className="input" placeholder="e.g. Amazon, Starbucks (partial match)" />
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
          <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            Notification Channels
          </legend>
          <div>
            <label className="label">Email Address</label>
            <input name="notifyEmail" type="email" value={form.notifyEmail}
              onChange={handleChange} className="input" placeholder="alerts@example.com" />
          </div>
          <div>
            <label className="label">Phone (SMS)</label>
            <input name="notifyPhone" type="text" value={form.notifyPhone}
              onChange={handleChange} className="input" placeholder="+1 555 000 0000" />
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
          <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            Message Templates
          </legend>
          <p className="text-xs text-gray-400">
            Placeholders: <code>{"<<Deposit Date>>"}</code>,{' '}
            <code>{"<<Deposit Amount>>"}</code>,{' '}
            <code>{"<<Deposit Description>>"}</code>
          </p>
          <div>
            <label className="label">Email Template</label>
            <textarea name="emailTemplate" rows={3} value={form.emailTemplate}
              onChange={handleChange} className="input resize-none" />
          </div>
          <div>
            <label className="label">SMS Template</label>
            <textarea name="smsTemplate" rows={2} value={form.smsTemplate}
              onChange={handleChange} className="input resize-none" />
          </div>
        </fieldset>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Alert'}
          </button>

          {alert && (
            <>
              <button type="button" onClick={handleToggle} className="btn-secondary">
                {alert.active ? 'Disable' : 'Enable'}
              </button>
              <button type="button" onClick={handleDelete} className="btn-danger">
                Delete
              </button>
              <span className={`text-xs font-medium ml-auto ${alert.active ? 'text-green-600' : 'text-gray-400'}`}>
                {alert.active ? '● Active' : '○ Disabled'}
              </span>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
