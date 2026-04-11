import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-xl font-bold text-brand-600 tracking-tight">
            ClaimYourAid
          </Link>
          <span className="hidden sm:inline-block text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
            Admin Portal
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              Hi, <span className="font-medium">{user.fname}</span>
            </span>
            <button onClick={handleLogout} className="btn-secondary text-xs">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
