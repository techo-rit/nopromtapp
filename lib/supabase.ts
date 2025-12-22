import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// CRITICAL: Session persistence for auth survival across page refreshes and browser closes
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // Persist session to localStorage automatically
    autoRefreshToken: true,    // Auto-refresh tokens before expiry
    detectSessionInUrl: true,  // Detect & recover session from URL params (OAuth redirect)
    
    // Custom storage with fallback to sessionStorage
    storage: {
      getItem: async (key: string) => {
        try {
          const item = localStorage.getItem(key);
          if (item) return item;
        } catch (e) {}
        try {
          return sessionStorage.getItem(key);
        } catch (e) {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {}
        try {
          sessionStorage.setItem(key, value);
        } catch (e) {}
      },
      removeItem: async (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {}
        try {
          sessionStorage.removeItem(key);
        } catch (e) {}
      }
    },
    
    storageKey: 'supabase.auth.token', // Explicit storage key for debugging
  },
  
  global: {
    headers: {
      // Allow multi-device sessions - ensure no single-device locking
      'X-Client-Info': `supabase-js/${(globalThis as any)?.SUPABASE_JS_VERSION || 'unknown'}`,
    },
  },
});
