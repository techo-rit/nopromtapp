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

    // FIX: Fetch the full profile (waits for DB trigger) instead of just mapping the auth user
    // This ensures we get the credits immediately after signup
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

    // FIX: Fetch the full profile so the user has their credits immediately upon login
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
   * Uses robust profile fetching to ensure credits are loaded
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        return null;
      }

      return await this._getUserProfile(session.user);
    } catch (e) {
      console.error("Auth check failed", e);
      return null;
    }
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    let cachedUser: User | null = null;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Optimization: If just token refresh, don't refetch profile to avoid flickering
        if (event === 'TOKEN_REFRESHED' && cachedUser && session?.user?.id === cachedUser.id) {
          callback(cachedUser);
          return;
        }
        
        if (session?.user) {
          // This will now use the retry logic, ensuring robust profile loading
          const user = await this._getUserProfile(session.user);
          cachedUser = user;
          callback(user);
        } else {
          cachedUser = null;
          callback(null);
        }
      }
    )
    return subscription
  },

  // --- Helper Methods ---

  /**
   * Fetches user profile with retries to handle database trigger delays.
   * This fixes the "0 credits" issue immediately after signup.
   */
  async _getUserProfile(supabaseUser: any): Promise<User> {
      let profileName = null;
      let profileCredits = 0;
      
      // Retry configuration: 3 attempts, 1 second apart
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1000; // ms

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, credits')
            .eq('id', supabaseUser.id)
            .single();
          
          // If we found the profile, GREAT! Stop looking.
          if (!error && profile) {
            profileName = profile.full_name;
            profileCredits = profile.credits ?? 0;
            break; 
          } 
          
          // If profile is missing (error code PGRST116), the DB trigger might still be running.
          // We loop again to retry.
        } catch (e) {
          // Ignore error and retry
        }

        // Wait before next retry (unless it's the last attempt)
        if (i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }

      // If fetch failed even after retries, log it but return the user anyway.
      // This prevents the app from crashing.
      if (profileName === null && profileCredits === 0) {
        console.warn('Profile fetch incomplete. Using default user data.');
      }

      return this._mapUser(supabaseUser, profileName, profileCredits);
  },

  _mapUser(supabaseUser: any, profileName?: string | null, profileCredits?: number): User {
      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        // Use fetched profile name, OR metadata name, OR fall back to 'User'
        name: profileName || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        credits: profileCredits || 0, 
        createdAt: new Date(supabaseUser.created_at),
        lastLogin: new Date(),
      }
  }
}