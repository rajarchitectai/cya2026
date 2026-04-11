import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function UserLogin({ onLogin }) {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/user-login', form);
      localStorage.setItem('cya_user_token', data.token);
      onLogin(data.user);
      navigate('/user/dashboard');
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
        <p className="text-center text-gray-500 text-sm mb-8">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" autoComplete="email" required
              value={form.email} onChange={handleChange}
              className="input" placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" autoComplete="current-password" required
              value={form.password} onChange={handleChange}
              className="input" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don&apos;t have an account?{' '}
          <Link to="/user/register" className="text-brand-600 font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
