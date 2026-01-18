import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// INDUSTRY STANDARD: Minimal config, let Supabase handle defaults
// - persistSession defaults to true (uses localStorage)
// - autoRefreshToken defaults to true  
// - storageKey uses Supabase's default format (don't override)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // DO NOT set custom storageKey - use Supabase's default
    // This ensures compatibility and proper session recovery
  },
});
