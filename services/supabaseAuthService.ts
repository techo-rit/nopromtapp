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

    // FIX 1: Added missing 'credits' and 'lastLogin'
    return {
      id: data.user.id,
      email: data.user.email!,
      name: fullName,
      credits: 0, // Default starting credits
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

    // FIX 2: Added missing 'credits' and 'lastLogin'
    return {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata.full_name || email.split('@')[0],
      credits: 0, // Ideally, you'd fetch this from your database profile
      createdAt: new Date(data.user.created_at),
      lastLogin: new Date(), // They just logged in, so this is now
    }
  },

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // FIX 3: Kept your redirect fix here so you don't lose it!
        redirectTo: window.location.href, 
      },
    })

    if (error) throw new Error(error.message)
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

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

    // FIX 4: Added missing 'credits' and 'lastLogin'
    return {
      id: session.user.id,
      email: session.user.email!,
      name: profileName || session.user.user_metadata.full_name || 'User',
      credits: 0, // Placeholder until you hook up database fetching
      createdAt: new Date(session.user.created_at),
      lastLogin: new Date(),
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

          // FIX 5: Added missing fields to the typed object
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