import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// CRITICAL: Session persistence for auth survival across page refreshes and browser closes
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // Persist session to localStorage automatically
    autoRefreshToken: true,    // Auto-refresh tokens before expiry
    detectSessionInUrl: true,  // Detect & recover session from URL params (OAuth redirect) 
    storageKey: 'supabase.auth.token', // Explicit storage key for debugging
  },
  
  global: {
    headers: {
      // Allow multi-device sessions - ensure no single-device locking
      'X-Client-Info': `supabase-js/${(globalThis as any)?.SUPABASE_JS_VERSION || 'unknown'}`,
    },
  },
});
