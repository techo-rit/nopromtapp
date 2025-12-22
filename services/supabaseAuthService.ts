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

    return {
      id: data.user.id,
      email: data.user.email!,
      name: fullName,
      credits: 0,
      createdAt: new Date(),
      lastLogin: new Date(),
    }
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

    return {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata.full_name || email.split('@')[0],
      credits: 0, 
      createdAt: new Date(data.user.created_at),
      lastLogin: new Date(),
    }
  },

  /**
   * Sign in with Google - OAuth flow
   * CRITICAL: Redirect to current page to enable session recovery after OAuth callback
   */
  async signInWithGoogle(): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // CRITICAL: Redirect to current page (not exact href which includes hash)
          // This ensures session recovery when returning from Google OAuth
          redirectTo: `${window.location.origin}${window.location.pathname}`,
          queryParams: {
            // Request offline access to get refresh tokens for multi-device support
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }
      // Page will redirect to Google, no need to do anything else
    } catch (error) {
      throw error;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      // CRITICAL: Try to recover session from multiple sources
      // 1. First check the cached session (should restore from localStorage immediately)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn("Error getting session:", error);
        return null;
      }

      if (!session?.user) {
        // If no session from getSession, try refreshSession to recover from stored token
        try {
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          if (!refreshedSession?.user) {
            return null;
          }
          // Use refreshed session if available
          const user = refreshedSession.user;
          const profileName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
          return {
            id: user.id,
            email: user.email!,
            name: profileName,
            credits: 0,
            createdAt: new Date(user.created_at),
            lastLogin: new Date(),
          };
        } catch (refreshErr) {
          console.warn("Could not refresh session:", refreshErr);
          return null;
        }
      }

      let profileName = null;
      try {
        // Fetch profile with timeout - profile is optional
        const profilePromise = supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        
        // Give profile fetch max 2 seconds before timing out
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
        );
        
        const { data: profile } = await Promise.race([profilePromise, timeoutPromise]) as any;
        profileName = profile?.full_name;
      } catch (e) {
        // If profile fetch fails or times out, we still want to log the user in!
        console.warn("Could not fetch profile details, using metadata instead", e);
      }

      return {
        id: session.user.id,
        email: session.user.email!,
        name: profileName || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        credits: 0, 
        createdAt: new Date(session.user.created_at),
        lastLogin: new Date(),
      }
    } catch (e) {
      console.error("Unexpected auth error", e);
      return null;
    }
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          let profileName = null;
          
          // Only attempt to fetch profile if we have a session
          try {
             const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', session.user.id)
                .single();
             profileName = profile?.full_name;
          } catch (e) {
             console.warn("Could not fetch profile in listener", e);
          }

          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            name: profileName || session.user.user_metadata.full_name || 'User',
            credits: 0, 
            createdAt: new Date(session.user.created_at),
            lastLogin: new Date(),
          }
          callback(user)
        } else {
          callback(null)
        }
      }
    )
    return subscription
  }
}