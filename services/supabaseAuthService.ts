import { supabase } from '../lib/supabase'
import type { User } from '../types'

export const supabaseAuthService = {
  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, fullName: string): Promise<User | null> {
    // Validate inputs
    if (!email || !password || !fullName) throw new Error('All fields are required')
    if (password.length < 8) throw new Error('Password must be at least 8 characters')

    // 1. Sign up with metadata (Trigger will handle profile creation)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName, // This is passed to the SQL trigger
        },
      },
    })

    if (error) throw new Error(error.message)

    // 2. Check if email confirmation is required
    // If session is null, the user needs to confirm their email first.
    if (data.user && !data.session) {
       return null; // Signal to UI that email confirmation is needed
    }

    if (!data.user) throw new Error('Sign up failed')

    // 3. Return user
    return {
      id: data.user.id,
      email: data.user.email!,
      name: fullName,
      createdAt: new Date(),
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

    // Profile is fetched via the listener in App.tsx usually, 
    // but we can return basic data here.
    return {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata.full_name || email.split('@')[0],
      createdAt: new Date(data.user.created_at),
    }
  },

  /**
   * Sign in with Google
   * CHANGE: Returns void. It redirects, so it never "returns" a user.
   */
  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // IMPORTANT: Ensure this URL is added in Supabase Dashboard -> Auth -> URL Configuration
        redirectTo: window.location.origin, 
      },
    })

    if (error) throw new Error(error.message)
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Fetch profile to get the name
    // Even if this FAILS (e.g. network error), we still want to log the user in.
    let profileName = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();
      profileName = profile?.full_name;
    } catch (e) {
      console.warn("Could not fetch profile", e);
    }

    return {
      id: session.user.id,
      email: session.user.email!,
      // Fallback logic is crucial here
      name: profileName || session.user.user_metadata.full_name || 'User',
      createdAt: new Date(session.user.created_at),
    }
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Robust Profile Fetch inside Listener
          let profileName = null;
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
            createdAt: new Date(session.user.created_at),
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