import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function UserRegister({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fname: '', lname: '', email: '', cell: '', password: '', confirm: '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { fname, lname, email, cell, password } = form;
      const { data } = await api.post('/auth/register', { fname, lname, email, cell, password });
      localStorage.setItem('cya_user_token', data.token);
      onLogin(data.user);
      navigate('/user/dashboard');
    } catch (err) {
      const details = err.response?.data?.details;
      setError(details?.[0]?.msg || err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-brand-600 text-center mb-1">ClaimYourAid</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Create your account</p>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input name="fname" required value={form.fname} onChange={handleChange}
                className="input" placeholder="Jane" />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input name="lname" value={form.lname} onChange={handleChange}
                className="input" placeholder="Doe" />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input name="email" type="email" autoComplete="email" required
              value={form.email} onChange={handleChange}
              className="input" placeholder="you@example.com" />
          </div>

          <div>
            <label className="label">Phone Number</label>
            <input name="cell" type="text" required value={form.cell} onChange={handleChange}
              className="input" placeholder="555-000-0000" />
          </div>

          <div>
            <label className="label">Password</label>
            <input name="password" type="password" autoComplete="new-password" required
              minLength={8} value={form.password} onChange={handleChange}
              className="input" placeholder="Min. 8 characters" />
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <input name="confirm" type="password" autoComplete="new-password" required
              value={form.confirm} onChange={handleChange}
              className="input" placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/user/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
