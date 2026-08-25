import { createClient } from '@supabase/supabase-js';

function readEnvValue(...names: string[]) {
  const env = import.meta.env as Record<string, string | undefined>;

  for (const name of names) {
    const value = env[name]?.trim();
    if (value) {
      return value;
    }
  }

  if (typeof window !== 'undefined') {
    const runtimeConfig = (window as Window & {
      __SUPABASE_CONFIG__?: Record<string, string | undefined>;
    }).__SUPABASE_CONFIG__;

    if (runtimeConfig) {
      for (const name of names) {
        const value = runtimeConfig[name]?.trim();
        if (value) {
          return value;
        }
      }
    }
  }

  return '';
}

export function resolveSupabaseConfig() {
  const supabaseUrl = readEnvValue('VITE_SUPABASE_URL', 'SUPABASE_URL') || 'https://your-project.supabase.co';
  const supabaseAnonKey = readEnvValue(
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_KEY'
  );

  return {
    supabaseUrl,
    supabaseAnonKey,
    hasConfig: Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co'),
  };
}

function createSupabaseStub(): any {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase is not configured') }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase is not configured') }),
      signInWithOAuth: async () => ({ data: { provider: '', url: '' }, error: new Error('Supabase is not configured') }),
      signOut: async () => ({ error: null }),
      mfa: {
        challenge: async () => ({ data: null, error: new Error('Supabase is not configured') }),
        verify: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      },
    },
  };
}

const { supabaseUrl, supabaseAnonKey, hasConfig } = resolveSupabaseConfig();

if (!hasConfig) {
  console.warn('Missing Supabase credentials. Some features may not work.');
}

export const supabase = hasConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: true,
      },
    })
  : createSupabaseStub();
export const supabaseAnonKeyOverride = supabaseAnonKey;
