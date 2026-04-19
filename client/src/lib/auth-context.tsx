import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { queryClient } from './queryClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isNewUser: boolean;
  justSignedUp: boolean;
  tutorialCompleted: boolean;
  aal: 'aal1' | 'aal2' | null; // Authenticator Assurance Level
  pendingMfaFactors: any[]; // MFA factors that need verification
  pendingMfaSession: any; // Session awaiting MFA verification
  isPremium: boolean;
  premiumStatus: string;
  planType: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  completeTutorial: () => void;
  clearSignUpFlag: () => void;
  getToken: () => Promise<string>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  verifyMfa: (code: string, factorId: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [hasSubscriptions, setHasSubscriptions] = useState<boolean | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [premiumStatus, setPremiumStatus] = useState<string>('free');
  const [planType, setPlanType] = useState<string>('free');
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [aal, setAal] = useState<'aal1' | 'aal2' | null>(null);
  const [pendingMfaFactors, setPendingMfaFactors] = useState<any[]>([]);
  const [pendingMfaSession, setPendingMfaSession] = useState<any>(null);
  const [justSignedUp, setJustSignedUp] = useState(false);

  const NEW_USER_THRESHOLD_MS = 5 * 60 * 1000;

  const isOAuthUser = (user: User) => {
    const identities = (user as any).identities as Array<any> | undefined;
    return !!identities?.some((identity) => identity.provider && identity.provider !== 'email');
  };

  const isUserVerified = (user: User) => {
    return Boolean(
      user.confirmed_at ||
      (user as any).email_confirmed_at ||
      user.user_metadata?.email_verified_at ||
      isOAuthUser(user)
    );
  };

  const isRecentlyCreatedAccount = (user: User) => {
    const createdAt = new Date(user.created_at).getTime();
    const ageMs = Date.now() - createdAt;
    return Math.abs(ageMs) < NEW_USER_THRESHOLD_MS;
  };

  // Check if user is new (account created within last 7 days AND no subscriptions)
  const isNewUser = user && hasSubscriptions === false
    ? (new Date().getTime() - new Date(user.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000)
    : false;

  const completeTutorial = () => {
    setTutorialCompleted(true);
    localStorage.setItem('tutorialCompleted', 'true');
  };

  const clearSignUpFlag = () => {
    setJustSignedUp(false);
    localStorage.removeItem('justSignedUp');
    localStorage.removeItem('postSignupPlan');
    localStorage.removeItem('postSignupSetup2FA');
  };

  // Check if user has subscriptions and premium status
  const checkUserSubscriptions = async (userId: string) => {
    try {
      const tokenValue = session?.access_token || JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').access_token;
      const headers: Record<string, string> = {};
      if (tokenValue) {
        headers['Authorization'] = `Bearer ${tokenValue}`;
      }

      // Check regular subscriptions
      const response = await fetch('/api/subscriptions', {
        headers,
      });
      if (response.ok) {
        const subscriptions = await response.json();
        setHasSubscriptions(subscriptions.length > 0);
      }

      // Check premium status
      const premiumResponse = await fetch('/api/user/premium-status', {
        headers,
      });
      if (premiumResponse.ok) {
        const premiumData = await premiumResponse.json();
        setIsPremium(premiumData.isPremium);
        setPremiumStatus(premiumData.status);
        setPlanType(premiumData.planType || 'free');
        setCancelAtPeriodEnd(premiumData.cancelAtPeriodEnd);
        setCurrentPeriodEnd(premiumData.currentPeriodEnd);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setHasSubscriptions(false);
      setIsPremium(false);
      setPremiumStatus('free');
      setCancelAtPeriodEnd(false);
      setCurrentPeriodEnd(null);
    }
  };

  useEffect(() => {
    // Check if tutorial was already completed
    const tutorialDone = localStorage.getItem('tutorialCompleted') === 'true';
    setTutorialCompleted(tutorialDone);
  }, []);

  useEffect(() => {
    if (user) {
      checkUserSubscriptions(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (!supabase) {
      console.warn('[Auth] Supabase client not initialized; skipping auth bootstrap.');
      setLoading(false);
      return;
    }

    // Get initial session
    const restoreJustSignedUp = (user: User | null) => {
      if (
        user &&
        localStorage.getItem('justSignedUp') === 'true' &&
        isUserVerified(user) &&
        isRecentlyCreatedAccount(user)
      ) {
        setJustSignedUp(true);
        return;
      }

      setJustSignedUp(false);
      localStorage.removeItem('justSignedUp');
    };

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Restore just-signed-up state only when the current session belongs to a fresh user.
        restoreJustSignedUp(session?.user ?? null);

        // Mirror the current Supabase session token into our localStorage helper
        if (session?.access_token) {
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }));
        } else {
          localStorage.removeItem('supabase.auth.token');
        }

        setLoading(false);
      })
      .catch((error) => {
        console.error('[Auth] getSession failed:', error);
        setLoading(false);
      });

    const isUserEmailVerified = (user: User) => {
      return Boolean(
        user.confirmed_at ||
        (user as any).email_confirmed_at ||
        user.user_metadata?.email_verified_at
      );
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clear React Query cache when user logs out (session becomes null)
        if (!session) {
          queryClient.clear();
        }
        
        // Extract AAL from JWT
        if (session?.access_token) {
          try {
            const payload = JSON.parse(atob(session.access_token.split('.')[1]));
            setAal(payload.aal || 'aal1');
          } catch (e) {
            setAal('aal1');
          }
        }
        
        // Store token in localStorage for API requests
        if (session?.access_token) {
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          }));
          // Store user UUID for browser extension
          localStorage.setItem('supabaseUserUUID', session.user.id);
          // Store API base URL for browser extension
          localStorage.setItem('subverisApiUrl', window.location.origin);
          
          // Sync to Chrome extension storage for background scripts
          const chromeGlobal = (globalThis as any).chrome;
          if (chromeGlobal?.storage?.local) {
            try {
              chromeGlobal.storage.local.set({
                authToken: session.access_token,
                supabaseUserUUID: session.user.id
              });
            } catch (e) {
              console.error('[Auth] Failed to sync to chrome storage:', e);
            }
          }
          
          // Check if this is a new user (newly confirmed signup or OAuth signup)
          if (session.user && isUserVerified(session.user) && isRecentlyCreatedAccount(session.user)) {
            setJustSignedUp(true);
            localStorage.setItem('justSignedUp', 'true');
          }
        } else {
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('supabaseUserUUID');
          setPendingMfaFactors([]);
          setPendingMfaSession(null);
          setJustSignedUp(false);
        }
        // If user's metadata requires MFA on every login, and current AAL is not aal2,
        // prompt the MFA flow so they must enter authenticator code.
        try {
          const mfaAlways = session?.user?.user_metadata?.mfa_always_required;
          if (mfaAlways && (aal !== 'aal2')) {
            setPendingMfaSession(session ?? null);
            setPendingMfaFactors(session?.user?.factors || []);
          }
        } catch (e) {
          // ignore
        }
        // Check if user just signed up
        if (session?.user && localStorage.getItem('justSignedUp') === 'true') {
          if (isUserVerified(session.user) && isRecentlyCreatedAccount(session.user)) {
            setJustSignedUp(true);
          } else {
            setJustSignedUp(false);
            localStorage.removeItem('justSignedUp');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } as AuthError };
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (data?.session?.user && isUserVerified(data.session.user) && isRecentlyCreatedAccount(data.session.user)) {
      setJustSignedUp(true);
      localStorage.setItem('justSignedUp', 'true');
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } as AuthError };
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Check if MFA is required
    if ((data?.session as any)?.mfa_required) {
      // User has 2FA set up — store pending MFA session and available factors
      if (data.session) {
        setPendingMfaSession(data.session);
        setPendingMfaFactors(data.user?.factors || []);
      }
    }

    // If the user's metadata forces MFA on every login, and the session is not AAL2,
    // trigger the MFA challenge flow so the user must enter their authenticator code.
    try {
      const mfaAlways = data?.user?.user_metadata?.mfa_always_required;
      if (mfaAlways) {
        // determine AAL from token if present
        const token = data?.session?.access_token;
        let aal: string | null = null;
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            aal = payload?.aal || null;
          } catch (e) {
            aal = null;
          }
        }

        if (aal !== 'aal2') {
          // Ensure pending MFA state exists so UI will prompt for code
          if (data.session) setPendingMfaSession(data.session);
          setPendingMfaFactors(data.user?.factors || []);
        }
      }
    } catch (err) {
      // ignore
    }
    
    return { error };
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } as AuthError };

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback'
      }
    });

    return { error };
  };

  const verifyMfa = async (code: string, factorId: string) => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } as AuthError };
    if (!pendingMfaSession) return { error: { message: 'No pending MFA session' } as AuthError };
    
    try {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      
      if (error) {
        return { error };
      }

      const challengeId = (data as any)?.id;
      // Verify the challenge with the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: data.id,
        challengeId,
        code: code,
      });

      if (verifyError) {
        return { error: verifyError };
      }

      // Clear pending MFA state on success
      setPendingMfaSession(null);
      setPendingMfaFactors([]);

      return { error: null };
    } catch (err) {
      return { error: { message: String(err) } as AuthError };
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    // Clear React Query cache before signing out to prevent data leakage
    queryClient.clear();
    await supabase.auth.signOut();
    // Redirect to homepage after sign out
    window.location.href = '/';
  };

  const getToken = async (): Promise<string> => {
    if (!session?.access_token) {
      throw new Error('No active session');
    }
    return session.access_token;
  };

  const value = {
    user,
    session,
    loading,
    isNewUser,
    justSignedUp,
    tutorialCompleted,
    completeTutorial,
    clearSignUpFlag,
    aal,
    pendingMfaFactors,
    pendingMfaSession,
    isPremium,
    premiumStatus,
    planType,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    getToken,
    signUp,
    signIn,
    signInWithGoogle,
    verifyMfa,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}