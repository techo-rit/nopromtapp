import { supabase } from '../lib/supabase'
import { retryWithBackoff } from '../utils/retryWithBackoff' // Import the retry utility
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
      // If token is expired, Supabase's autoRefreshToken will handle it.
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const user = await this._getUserProfile(session.user);
          callback(user);
        } else {
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
      
      try {
        // FIX: Replaced aggressive Promise.race timeout with retry logic.
        // This ensures temporary network glitches don't reset credits to 0.
        const fetchProfileOp = async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, credits')
            .eq('id', supabaseUser.id)
            .single();
            
          if (error) throw error;
          return data;
        };

        // Attempt to fetch 3 times with exponential backoff
        const profile = await retryWithBackoff(fetchProfileOp, {
          maxAttempts: 3,
          initialDelayMs: 500, // Wait 500ms before first retry
          backoffMultiplier: 1.5
        }) as any;

        profileName = profile?.full_name;
        profileCredits = profile?.credits ?? 0; // Use nullish coalescing to handle 0 correctly

      } catch (e: any) {
        // Log profile fetch failures for observability
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Profile fetch failed after retries', // Updated message
          userId: supabaseUser.id,
          error: e?.message || 'Unknown error',
          action: 'profile_fetch_fallback'
        }));
        
        // Only now do we fall back to defaults
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