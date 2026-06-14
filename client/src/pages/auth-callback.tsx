import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';

const NEW_USER_THRESHOLD_MS = 5 * 60 * 1000;

function isRecentlyCreatedAccount(user: any) {
  const createdAt = new Date(user.created_at).getTime();
  return Math.abs(Date.now() - createdAt) < NEW_USER_THRESHOLD_MS;
}

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Verifying authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (!supabase) {
        window.location.replace('/');
        return;
      }

      const hash = window.location.hash.substring(1);
      const search = window.location.search;
      const hasOAuthResponse = hash.includes('access_token') || hash.includes('id_token') || hash.includes('refresh_token') || hash.includes('error') || search.includes('code');

      let session = null;
      let callbackError = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await supabase.auth.getSession();
        session = result.data?.session;
        callbackError = result.error;

        if (session || callbackError || !hasOAuthResponse) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (session?.user && isRecentlyCreatedAccount(session.user)) {
        localStorage.setItem('justSignedUp', 'true');
      }

      if (session) {
        setStatus('Authentication successful. Redirecting...');
        window.location.replace('/dashboard');
        return;
      }

      const hashParams = new URLSearchParams(hash);
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (errorParam) {
        setError(errorDescription || 'Authentication failed');
        setStatus('Redirecting to login...');
        setTimeout(() => {
          window.location.replace('/login');
        }, 3000);
        return;
      }

      if (callbackError) {
        console.warn('Auth callback session check failed:', callbackError);
        setError('Authentication failed. Redirecting to login...');
        setTimeout(() => {
          window.location.replace('/login');
        }, 3000);
        return;
      }

      setStatus('No active session found. Redirecting to login...');
      setTimeout(() => setLocation('/login'), 500);
    };

    handleAuthCallback();
  }, [setLocation]);

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4 text-center px-4">
      <div>
        <h1 className="text-2xl font-bold mb-2">{error ? 'Authentication Failed' : 'Signing You In'}</h1>
        <p className="text-muted-foreground mb-4">{error || status}</p>
        {!error && <p className="text-sm text-muted-foreground">Please wait while we finish authenticating your account.</p>}
      </div>
    </div>
  );
}
