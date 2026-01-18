// services/supabaseAuthService.ts
import { supabase } from '../lib/supabase'
import type { User } from '../types'

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
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) throw new Error(error.message)

    // If email confirmation is required and no session is returned
    if (data.user && !data.session) {
       return null; 
    }

    if (!data.user) throw new Error('Sign up failed')

    return this._getUserProfile(data.user)
  },

  /**
   * Log in user
   */
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Login failed')

    return this._getUserProfile(data.user)
  },

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Get Current User - FIXED VERSION
   * Uses getUser() to validate token server-side, not just read from localStorage
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // CRITICAL FIX: getUser() validates the JWT with Supabase server
      // getSession() only reads localStorage and doesn't verify if token is still valid
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // Only log actual errors, not "no session" cases
        if (error && error.message !== 'Auth session missing!') {
          console.error("[Auth] Validation failed:", error.message);
        }
        return null;
      }

      return await this._getUserProfile(user);
    } catch (e) {
      console.error("[Auth] Check failed", e);
      return null;
    }
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  /**
   * Auth State Change Listener - FIXED VERSION
   * Properly handles race conditions and avoids unnecessary null callbacks
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    let cachedUser: User | null = null;
    let isInitialLoad = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Event:', event, 'Session:', !!session);
        
        // CRITICAL FIX: Ignore INITIAL_SESSION if we're still loading
        // This prevents the race condition where null fires before session recovery
        if (event === 'INITIAL_SESSION' && !session) {
          // Don't immediately call callback(null) - let getCurrentUser() handle initial load
          // This prevents logout on page refresh
          console.log('[Auth] Ignoring empty INITIAL_SESSION - waiting for getCurrentUser');
          isInitialLoad = false;
          return;
        }
        
        // Token refresh - just use cached user to avoid flickering
        if (event === 'TOKEN_REFRESHED' && cachedUser && session?.user?.id === cachedUser.id) {
          callback(cachedUser);
          return;
        }
        
        // User signed out explicitly
        if (event === 'SIGNED_OUT') {
          cachedUser = null;
          callback(null);
          return;
        }
        
        // User signed in or session recovered
        if (session?.user) {
          try {
            const user = await this._getUserProfile(session.user);
            cachedUser = user;
            callback(user);
          } catch (e) {
            console.error('[Auth] Profile fetch failed:', e);
            // Still provide basic user info even if profile fetch fails
            cachedUser = this._mapUser(session.user, null, 0);
            callback(cachedUser);
          }
        } else if (!isInitialLoad) {
          // Only call null if this isn't the initial load
          // (initial load is handled by getCurrentUser)
          cachedUser = null;
          callback(null);
        }
        
        isInitialLoad = false;
      }
    )
    return subscription
  },

  // --- Helper Methods ---

  /**
   * Fetches user profile with retries to handle database trigger delays.
   */
  async _getUserProfile(supabaseUser: any): Promise<User> {
      let profileName = null;
      let profileCredits = 0;
      
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1000;

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, credits')
            .eq('id', supabaseUser.id)
            .single();
          
          if (!error && profile) {
            profileName = profile.full_name;
            profileCredits = profile.credits ?? 0;
            break; 
          }
          
          // Log the actual error for debugging
          if (error) {
            console.warn(`[Auth] Profile fetch attempt ${i + 1} failed:`, error.message);
          }
        } catch (e) {
          console.warn(`[Auth] Profile fetch attempt ${i + 1} exception:`, e);
        }

        if (i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }

      return this._mapUser(supabaseUser, profileName, profileCredits);
  },

  _mapUser(supabaseUser: any, profileName?: string | null, profileCredits?: number): User {
      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: profileName || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        credits: profileCredits || 0, 
        createdAt: new Date(supabaseUser.created_at),
        lastLogin: new Date(),
      }
  }
}