// services/supabaseAuthService.ts
// INDUSTRY STANDARD: Supabase Auth with single source of truth pattern
import { supabase } from '../lib/supabase'
import type { User } from '../types'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'

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
   * Get Current User
   * INDUSTRY STANDARD: Use getSession() for initial load (reads from storage),
   * onAuthStateChange handles validation and refresh automatically
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("[Auth] getSession error:", error.message);
        return null;
      }
      
      if (!session?.user) {
        return null;
      }

      return await this._getUserProfile(session.user);
    } catch (e) {
      console.error("[Auth] getCurrentUser failed", e);
      return null;
    }
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  /**
   * INDUSTRY STANDARD Auth State Listener
   * 
   * This is the SINGLE SOURCE OF TRUTH for auth state.
   * Key principles:
   * 1. Trust INITIAL_SESSION - it reads from persisted storage
   * 2. Only SIGNED_OUT means user is logged out
   * 3. Never call callback(null) unless explicitly signed out
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    let cachedUser: User | null = null;
    let processingEvent = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // Prevent concurrent processing of events
        if (processingEvent) {
          console.log('[Auth] Skipping event (already processing):', event);
          return;
        }
        
        console.log('[Auth] Event:', event, 'Has session:', !!session);
        
        // SIGNED_OUT is the ONLY event that should clear the user
        if (event === 'SIGNED_OUT') {
          cachedUser = null;
          callback(null);
          return;
        }
        
        // TOKEN_REFRESHED with valid session - use cached user for performance
        if (event === 'TOKEN_REFRESHED' && cachedUser && session?.user?.id === cachedUser.id) {
          console.log('[Auth] Token refreshed, using cached user');
          callback(cachedUser);
          return;
        }
        
        // Any event with a session means user is authenticated
        if (session?.user) {
          processingEvent = true;
          try {
            const user = await this._getUserProfile(session.user);
            cachedUser = user;
            callback(user);
          } catch (e) {
            console.error('[Auth] Profile fetch failed, using basic user:', e);
            // CRITICAL: Still provide user even if profile fails
            // This prevents logout due to temporary DB issues
            cachedUser = this._mapUser(session.user, null, 0);
            callback(cachedUser);
          } finally {
            processingEvent = false;
          }
          return;
        }
        
        // No session and not SIGNED_OUT - could be initial load with no auth
        // IMPORTANT: Only set null if we've never had a user
        // This prevents race conditions on page refresh
        if (!cachedUser) {
          console.log('[Auth] No session, no cached user - user is not logged in');
          callback(null);
        } else {
          console.log('[Auth] No session but have cached user - keeping user (might be temporary)');
          // Keep the cached user - don't log out
          // If session is truly gone, SIGNED_OUT will fire
        }
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
      const RETRY_DELAY = 500; // Reduced for faster UX

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
          
          if (error) {
            console.warn(`[Auth] Profile fetch attempt ${i + 1}/${MAX_RETRIES}:`, error.message);
          }
        } catch (e) {
          console.warn(`[Auth] Profile fetch attempt ${i + 1}/${MAX_RETRIES} exception:`, e);
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