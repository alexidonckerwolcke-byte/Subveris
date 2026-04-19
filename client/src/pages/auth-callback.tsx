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

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (!supabase) {
        window.location.replace('/');
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setError(error.message || 'Authentication failed');
        setTimeout(() => {
          window.location.replace('/login');
        }, 3000);
        return;
      }

      if (data?.session?.user && isRecentlyCreatedAccount(data.session.user)) {
        localStorage.setItem('justSignedUp', 'true');
      }

      if (data?.session) {
        window.location.replace('/dashboard');
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (errorParam) {
        setError(errorDescription || 'Authentication failed');
        setTimeout(() => {
          setLocation('/login');
        }, 3000);
        return;
      }

      setLocation('/login');
    };

    handleAuthCallback();
  }, [setLocation]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return null;
}
