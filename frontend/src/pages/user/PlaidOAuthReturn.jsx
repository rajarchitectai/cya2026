import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

/**
 * PlaidOAuthReturn
 * Landing page after a bank OAuth redirect (Chase, BofA, etc.)
 * Plaid appends ?oauth_state_id=... to this URL.
 * We store the link_token in sessionStorage before opening Link,
 * retrieve it here, and re-initialize Plaid Link to complete the flow.
 */
export default function PlaidOAuthReturn() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing bank connection…');

  useEffect(() => {
    // The link token was saved to sessionStorage before the OAuth redirect
    const savedToken = sessionStorage.getItem('plaid_link_token');
    if (!savedToken) {
      setStatus('Session expired. Please try linking again.');
      setTimeout(() => navigate('/user/dashboard'), 3000);
      return;
    }

    // Dynamically load Plaid Link and re-open with the saved token
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.onload = () => {
      const handler = window.Plaid.create({
        token: savedToken,
        receivedRedirectUri: window.location.href,
        onSuccess: async (publicToken, metadata) => {
          setStatus('Saving your account…');
          try {
            const { data: account } = await api.post('/plaid/accounts/add', {
              public_token: publicToken,
              metadata,
            });
            setStatus('Importing transactions…');
            try {
              await api.post(`/plaid/accounts/${account._id}/import`);
            } catch (_) { /* non-fatal */ }
            sessionStorage.removeItem('plaid_link_token');
            setStatus('Account linked! Redirecting…');
            setTimeout(() => navigate('/user/dashboard'), 1500);
          } catch (err) {
            setStatus(err.response?.data?.error || 'Failed to save account. Please try again.');
            setTimeout(() => navigate('/user/dashboard'), 3000);
          }
        },
        onExit: () => {
          sessionStorage.removeItem('plaid_link_token');
          navigate('/user/dashboard');
        },
      });
      handler.open();
    };
    document.body.appendChild(script);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="card max-w-sm w-full text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-700 font-medium">{status}</p>
      </div>
    </div>
  );
}
