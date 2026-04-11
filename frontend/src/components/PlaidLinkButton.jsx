import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import api from '../services/api';

/**
 * PlaidLinkButton
 * - Creates a link token on click
 * - Opens Plaid Link modal
 * - On success: saves account AND auto-imports 2 years of transaction history silently
 * - onSuccess(account) is called when everything is done
 */
export default function PlaidLinkButton({ onSuccess, label = '+ Link Bank Account' }) {
  const [linkToken, setLinkToken] = useState(null);
  const [status,    setStatus]    = useState('idle'); // idle | fetching | linking | importing | done
  const [error,     setError]     = useState('');

  const fetchLinkToken = async () => {
    setStatus('fetching');
    setError('');
    try {
      const { data } = await api.post('/plaid/link-token');
      // Save token to sessionStorage so it survives an OAuth bank redirect
      sessionStorage.setItem('plaid_link_token', data.link_token);
      setLinkToken(data.link_token);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start account linking.');
      setStatus('idle');
    }
  };

  const handleSuccess = useCallback(async (publicToken, metadata) => {
    setStatus('linking');
    setError('');
    try {
      // 1. Exchange public token → save account
      const { data: account } = await api.post('/plaid/accounts/add', {
        public_token: publicToken,
        metadata,
      });

      // 2. Auto-import 2 years of transaction history in the background
      setStatus('importing');
      try {
        await api.post(`/plaid/accounts/${account._id}/import`);
      } catch (_) {
        // Import failure is non-fatal — admin can still see partial data
      }

      setLinkToken(null);
      setStatus('done');
      onSuccess?.(account);
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to link account.');
      setStatus('idle');
    }
  }, [onSuccess]);

  const handleExit = useCallback(() => {
    setLinkToken(null);
    setStatus('idle');
  }, []);

  const { open, ready } = usePlaidLink({
    token:     linkToken,
    onSuccess: handleSuccess,
    onExit:    handleExit,
  });

  // Auto-open when we have a token
  if (linkToken && ready) open();

  const statusLabel = {
    idle:      label,
    fetching:  'Preparing…',
    linking:   'Saving account…',
    importing: 'Importing transactions…',
    done:      '✓ Linked!',
  }[status];

  return (
    <div>
      <button
        className="btn-primary"
        onClick={fetchLinkToken}
        disabled={status !== 'idle'}
      >
        {statusLabel}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
