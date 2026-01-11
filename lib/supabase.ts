import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// CRITICAL: Session persistence for auth survival across page refreshes
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // Persist session to localStorage
    autoRefreshToken: true,    // Handle token refreshes automatically
    detectSessionInUrl: true,  // Important for OAuth redirects
    // INDUSTRY STANDARD: Use a unique, namespaced key to avoid conflicts with other localhost apps
    storageKey: 'noprompt_auth_token_v1', 
    // SECURITY: Force PKCE flow. It is more robust than implicit flow for modern web apps.
    flowType: 'pkce', 
  },
  
  global: {
    headers: {
      'X-Client-Info': `noprompt-web/${(globalThis as any)?.SUPABASE_JS_VERSION || 'unknown'}`,
    },
  },
});