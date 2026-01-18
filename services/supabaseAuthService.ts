// services/supabaseAuthService.ts
import { supabase } from '../lib/supabase'
import type { User } from '../types'

// Cache profile in memory to reduce database calls
let profileCache: { userId: string; name: string | null; credits: number } | null = null;

export const supabaseAuthService = {
  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, fullName: string): Promise<User | null> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) throw new Error(error.message)
    if (data.user && !data.session) return null // Email confirmation required
    if (!data.user) throw new Error('Sign up failed')

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

    profileCache = null;
    return this._buildUser(data.user)
  },

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Simplified redirect
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw new Error(error.message);
  },

  /**
   * Get Current User - ROBUST IMPLEMENTATION
   * Fixes "Logout on Refresh" by aggressively checking for sessions
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // 1. Try to get the active session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session?.user) {
        return await this._buildUser(session.user);
      }

      // 2. Fallback: If no session, try to refresh explicitly (recovers lost sessions)
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session?.user) {
        console.log('[Auth] Session recovered via refresh');
        return await this._buildUser(refreshData.session.user);
      }

      return null;
    } catch (e) {
      console.warn("[Auth] getCurrentUser error:", e);
      return null;
    }
  },

  async logout(): Promise<void> {
    profileCache = null;
    await supabase.auth.signOut();
  },

  /**
   * Real-time Auth Listener
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth Event] ${event}`);

        // Handle explicit sign out
        if (event === 'SIGNED_OUT') {
          profileCache = null;
          callback(null);
          return;
        }

        // Handle Session Available (Sign in, Auto-refresh, or Initial Load)
        if (session?.user) {
          try {
            const user = await this._buildUser(session.user);
            callback(user);
          } catch (e) {
            // Fallback if profile fetch fails - keep user logged in!
            console.error('[Auth] Profile fetch failed, using basic user:', e);
            callback(this._mapBasicUser(session.user));
          }
        } else if (event === 'INITIAL_SESSION') {
            // Only explicitly send null if it's the initial load and truly no session exists
            callback(null);
        }
      }
    );
    
    // Return the subscription object directly so we can unsubscribe later
    return subscription;
  },

  // --- Internal Helper Methods ---

  async _buildUser(supabaseUser: any): Promise<User> {
    // 1. Use cache if valid
    if (profileCache && profileCache.userId === supabaseUser.id) {
      return this._mapUser(supabaseUser, profileCache.name, profileCache.credits);
    }

    // 2. Fetch fresh profile
    const { name, credits } = await this._fetchProfile(supabaseUser.id);
    
    // 3. Update cache
    profileCache = { userId: supabaseUser.id, name, credits };
    return this._mapUser(supabaseUser, name, credits);
  },

  async _fetchProfile(userId: string): Promise<{ name: string | null; credits: number }> {
    try {
      // Simple fetch, no complex retry logic needed for most cases
      // If it fails, we just return default values so the user stays logged in
      const { data, error } = await supabase
        .from('profiles') // Ensure your table is named 'profiles' or 'users'
        .select('full_name, credits')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        return { name: data.full_name, credits: data.credits ?? 0 };
      }
    } catch (e) {
      console.warn('[Auth] Error fetching profile:', e);
    }
    return { name: null, credits: 0 };
  },

  _mapUser(supabaseUser: any, profileName: string | null, credits: number): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: profileName || supabaseUser.user_metadata?.full_name || 'User',
      credits: credits,
      createdAt: new Date(supabaseUser.created_at),
      lastLogin: new Date(),
    };
  },

  _mapBasicUser(supabaseUser: any): User {
    return this._mapUser(supabaseUser, null, 0);
  }
}