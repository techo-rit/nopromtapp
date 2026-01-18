// services/supabaseAuthService.ts
// INDUSTRY STANDARD: Clean separation of auth state and profile data
import { supabase } from '../lib/supabase'
import type { User } from '../types'

// Profile cache to avoid re-fetching on every auth event
let profileCache: { userId: string; name: string | null; credits: number } | null = null;

export const supabaseAuthService = {
  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, fullName: string): Promise<User | null> {
    if (!email || !password || !fullName) throw new Error('All fields are required')
    if (password.length < 8) throw new Error('Password must be at least 8 characters')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) throw new Error(error.message)
    if (data.user && !data.session) return null // Email confirmation required
    if (!data.user) throw new Error('Sign up failed')

    // Clear cache and fetch fresh profile
    profileCache = null;
    return this._buildUser(data.user)
  },

  /**
   * Log in user
   */
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Login failed')

    profileCache = null; // Clear cache on fresh login
    return this._buildUser(data.user)
  },

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw new Error(error.message);
  },

  /**
   * Get Current User - SYNCHRONOUS session read + async profile
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Step 1: Read session from localStorage (synchronous, no network)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        console.log('[Auth] No session found');
        return null;
      }

      console.log('[Auth] Session found for:', session.user.email);
      
      // Step 2: Build user with cached/fetched profile
      return await this._buildUser(session.user);
    } catch (e) {
      console.error("[Auth] getCurrentUser failed:", e);
      return null;
    }
  },

  async logout(): Promise<void> {
    profileCache = null;
    await supabase.auth.signOut();
  },

  /**
   * INDUSTRY STANDARD Auth Listener
   * Simple pattern: trust the session, don't over-engineer
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Event:', event, '| User:', session?.user?.email ?? 'none');
        
        // User explicitly signed out
        if (event === 'SIGNED_OUT') {
          profileCache = null;
          callback(null);
          return;
        }
        
        // Session exists = user is authenticated
        if (session?.user) {
          try {
            const user = await this._buildUser(session.user);
            callback(user);
          } catch (e) {
            // CRITICAL: Never logout due to profile fetch failure
            console.error('[Auth] Profile error, using basic user:', e);
            callback(this._mapBasicUser(session.user));
          }
          return;
        }
        
        // No session and not a sign-out = check if we should show logged out
        // Only call null if this is truly "no user" (initial load with no auth)
        if (event === 'INITIAL_SESSION') {
          // No session on initial load = user is not logged in
          callback(null);
        }
        // For other events without session, don't call callback
        // (could be transient state during token refresh)
      }
    );
    
    return subscription;
  },

  // --- Helper Methods ---

  /**
   * Build complete User object with profile data
   */
  async _buildUser(supabaseUser: any): Promise<User> {
    // Use cache if available and matches
    if (profileCache && profileCache.userId === supabaseUser.id) {
      return this._mapUser(supabaseUser, profileCache.name, profileCache.credits);
    }

    // Fetch profile from database
    const { name, credits } = await this._fetchProfile(supabaseUser.id);
    
    // Update cache
    profileCache = { userId: supabaseUser.id, name, credits };
    
    return this._mapUser(supabaseUser, name, credits);
  },

  /**
   * Fetch profile with retry logic
   */
  async _fetchProfile(userId: string): Promise<{ name: string | null; credits: number }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 400;

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, credits')
          .eq('id', userId)
          .single();
        
        if (!error && data) {
          return { name: data.full_name, credits: data.credits ?? 0 };
        }
        
        if (error) {
          console.warn(`[Auth] Profile fetch ${i + 1}/${MAX_RETRIES}:`, error.message);
        }
      } catch (e) {
        console.warn(`[Auth] Profile fetch ${i + 1}/${MAX_RETRIES} error:`, e);
      }

      if (i < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }

    // Return defaults if all retries fail
    return { name: null, credits: 0 };
  },

  /**
   * Map to User type with profile data
   */
  _mapUser(supabaseUser: any, profileName: string | null, credits: number): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: profileName || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      credits: credits,
      createdAt: new Date(supabaseUser.created_at),
      lastLogin: new Date(),
    };
  },

  /**
   * Basic user without profile (fallback)
   */
  _mapBasicUser(supabaseUser: any): User {
    return this._mapUser(supabaseUser, null, profileCache?.credits ?? 0);
  },

  /**
   * Force refresh profile (call after purchase, etc.)
   */
  async refreshProfile(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      profileCache = null;
      await this._buildUser(session.user);
    }
  }
}