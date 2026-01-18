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

    if (data.user && !data.session) {
       return null; 
    }

    if (!data.user) throw new Error('Sign up failed')

    return this._mapUser(data.user)
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

    return this._mapUser(data.user)
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
   * Get Current User (Fixed: No manual refresh)
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // STANDARD: Just get the session. 
      // If token is expired, Supabase's autoRefreshToken (configured in lib/supabase.ts) 
      // will handle the refresh cycle automatically in the background.
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        return null;
      }

      // Fetch profile details if needed, or just return user
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
    // Cache to preserve credits across token refresh events
    let cachedUser: User | null = null;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // TOKEN_REFRESHED: Don't refetch profile - credits haven't changed
        // This prevents the timeout issue from resetting credits to 0
        if (event === 'TOKEN_REFRESHED' && cachedUser && session?.user?.id === cachedUser.id) {
          // Just update the cached user's lastLogin, keep credits intact
          callback(cachedUser);
          return;
        }
        
        if (session?.user) {
          const user = await this._getUserProfile(session.user);
          cachedUser = user; // Cache for future token refresh events
          callback(user);
        } else {
          cachedUser = null;
          callback(null);
        }
      }
    )
    return subscription
  },

  // --- Helper Methods to reduce duplication ---

  async _getUserProfile(supabaseUser: any): Promise<User> {
      let profileName = null;
      let profileCredits = 0;
      let fetchSuccess = false;
      
      try {
        // Increased timeout from 1500ms to 5000ms for slow connections
        const profilePromise = supabase
          .from('profiles')
          .select('full_name, credits')
          .eq('id', supabaseUser.id)
          .single();
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        );
        
        const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;
        
        if (!error && profile) {
          profileName = profile.full_name;
          profileCredits = profile.credits ?? 0;
          fetchSuccess = true;
        }
      } catch (e: any) {
        // Log profile fetch failures for observability
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Profile fetch failed',
          userId: supabaseUser.id,
          error: e?.message || 'Unknown error',
          action: 'profile_fetch_fallback'
        }));
      }

      // If fetch failed, log it but don't silently return 0 credits
      // The caller should handle this appropriately
      if (!fetchSuccess) {
        console.warn('Using fallback user data - profile fetch unsuccessful');
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