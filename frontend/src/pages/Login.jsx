import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-brand-600 text-center mb-1">ClaimYourAid</h1>
        <p className="text-center text-xs font-semibold text-brand-700 bg-brand-50 rounded-full py-1 mb-8">
          Admin Portal
        </p>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="label">Admin Email</label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              className="input"
              placeholder="admin@claimyouraid.com"
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          This portal is restricted to ClaimYourAid administrators only.
        </p>
      </div>
    </div>
  );
}
