import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get the hash from the URL (OAuth redirect)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const errorParam = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || 'Authentication failed');
      // Redirect to home after 3 seconds
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    } else if (accessToken) {
      // OAuth redirect successful, Supabase handles the session automatically
      // Redirect to dashboard
      setLocation('/');
    } else {
      // No token or error found, redirect home
      setLocation('/');
    }
  }, [setLocation]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting you back home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Completing Sign In...</h1>
        <p className="text-muted-foreground">Please wait while we set up your account.</p>
      </div>
    </div>
  );
}
