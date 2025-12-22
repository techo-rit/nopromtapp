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
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // NOTE: For mobile apps later, you will need to change this to your app's deep link scheme
        redirectTo: window.location.href, 
      },
    })

    if (error) throw new Error(error.message)
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) return null;

      let profileName = null;
      try {
        // FIX: Add a small timeout or fail gracefully if profile fetch hangs
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single()
          .throwOnError(); // Explicitly throw if error to catch below
          
        profileName = profile?.full_name;
      } catch (e) {
        // If profile fetch fails, we still want to log the user in!
        console.warn("Could not fetch profile details, using metadata", e);
      }

      return {
        id: session.user.id,
        email: session.user.email!,
        name: profileName || session.user.user_metadata.full_name || 'User',
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