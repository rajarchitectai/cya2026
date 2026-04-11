import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const DEFAULT_EMAIL_TPL = 'New transaction on <<Deposit Date>>: <<Deposit Description>> for $<<Deposit Amount>>';
const DEFAULT_SMS_TPL   = 'Alert: <<Deposit Description>> $<<Deposit Amount>> on <<Deposit Date>>';

export default function UserAlertConfig({ user, onLogout }) {
  const { accountId } = useParams();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [alert,   setAlert]   = useState(null);
  const [form,    setForm]    = useState({
    name: '', minAmount: '0', maxAmount: '999999',
    merchantFilter: '', notifyEmail: '', notifyPhone: '',
    emailTemplate: DEFAULT_EMAIL_TPL, smsTemplate: DEFAULT_SMS_TPL,
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState({ text: '', type: '' });

  useEffect(() => {
    Promise.all([
      api.get('/plaid/accounts'),
      api.get('/alerts'),
    ]).then(([accRes, alertRes]) => {
      const acc = accRes.data.find((a) => a._id === accountId);
      setAccount(acc || null);
      const existing = alertRes.data.find((a) => a.accountId === accountId);
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
  }, [accountId]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });
    try {
      const { data } = await api.post('/alerts', {
        accountId, ...form,
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

  const handleLogout = () => {
    localStorage.removeItem('cya_user_token');
    onLogout();
    navigate('/user/login');
  };

  if (loading) return <p className="text-gray-400 p-8">Loading…</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-xl font-bold text-brand-600">ClaimYourAid</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">Hi, <span className="font-medium">{user?.fname}</span></span>
            <button onClick={handleLogout} className="btn-secondary text-xs">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Link to="/user/dashboard" className="text-sm text-brand-600 hover:underline">
          ← Back to Dashboard
        </Link>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configure Alert</h2>
          {account && <p className="text-gray-500 text-sm mt-1">{account.institutionName}</p>}
        </div>

        {!account ? (
          <div className="card text-center space-y-3">
            <p className="text-gray-600">Account not found.</p>
            <Link to="/user/dashboard" className="btn-primary inline-block">Back</Link>
          </div>
        ) : (
          <>
            {msg.text && (
              <div className={`text-sm px-3 py-2 rounded-lg border ${
                msg.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>{msg.text}</div>
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
                    className="input" placeholder="e.g. Amazon (partial match)" />
                </div>
              </fieldset>

              <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
                <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                  Notify Me At
                </legend>
                <div>
                  <label className="label">Email</label>
                  <input name="notifyEmail" type="email" value={form.notifyEmail}
                    onChange={handleChange} className="input" placeholder="you@example.com" />
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
                  Placeholders: <code>{'<<Deposit Date>>'}</code>, <code>{'<<Deposit Amount>>'}</code>, <code>{'<<Deposit Description>>'}</code>
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
                  <span className={`text-xs font-medium ml-auto ${alert.active ? 'text-green-600' : 'text-gray-400'}`}>
                    {alert.active ? '● Active' : '○ Disabled'}
                  </span>
                )}
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
