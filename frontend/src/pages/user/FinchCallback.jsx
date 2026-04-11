import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * This page is opened in a popup by FinchConnectButton.
 * Finch redirects here with ?code=xxx after the user authorizes.
 * We post the code back to the opener window and close ourselves.
 */
export default function FinchCallback() {
  const [params] = useSearchParams();

  useEffect(() => {
    const code  = params.get('code');
    const error = params.get('error');

    if (window.opener) {
      window.opener.postMessage(
        { type: 'finch-callback', code, error },
        window.location.origin
      );
      window.close();
    }
  }, [params]);

  return (
    <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">
      {params.get('error')
        ? `Connection failed: ${params.get('error')}`
        : 'Completing connection… this window will close automatically.'}
    </div>
  );
}
