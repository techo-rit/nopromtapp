// src/services/authService.ts
import { supabase } from '../lib/supabase';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import type { User } from '../types';

export const authService = {
  /**
   * Get Current User - Call this explicitly on app load
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;
    return await this._getUserProfile(session.user);
  },

  /**
   * Auth State Listener - Standardized to prevent race conditions
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Industry Standard: Handle explicit events to prevent ghost loading
        if (event === 'SIGNED_OUT' || !session?.user) {
          callback(null);
          return;
        }

        // Fetch profile without blocking the thread indefinitely
        try {
          const user = await this._getUserProfile(session.user);
          callback(user);
        } catch (error) {
          console.error("Profile fetch error in listener:", error);
          // Fallback: Return basic user if profile fails, so app doesn't hang
          callback(this._mapUser(session.user));
        }
      }
    );
    return subscription;
  },

  async _getUserProfile(supabaseUser: any): Promise<User> {
    try {
      // 1. Attempt to fetch profile with retries
      const fetchProfileOp = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, credits')
          .eq('id', supabaseUser.id)
          .single();
        if (error) throw error;
        return data;
      };

      const profile = await retryWithBackoff(fetchProfileOp, {
        maxAttempts: 3,
        initialDelayMs: 500,
      }) as any;

      return this._mapUser(supabaseUser, profile?.full_name, profile?.credits);
    } catch (e) {
      console.warn("Using fallback profile due to error:", e);
      return this._mapUser(supabaseUser); // Return default user to prevent blank screen
    }
  },

  _mapUser(supabaseUser: any, profileName?: string | null, profileCredits?: number): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: profileName || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      credits: profileCredits || 0,
      createdAt: new Date(supabaseUser.created_at || Date.now()),
      lastLogin: new Date(),
    };
  },
  
  // ... (Keep existing signUp, login, logout, signInWithGoogle methods as they were) ...
  async signUp(email: string, password: string, fullName: string) {
      // ... (use existing implementation)
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName } }
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Sign up failed');
      return this._mapUser(data.user, fullName);
  },
  
  async login(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Login failed');
      return this._getUserProfile(data.user);
  },

  async signInWithGoogle() {
       const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw new Error(error.message);
  },
  
  async logout() {
    await supabase.auth.signOut();
  }
};