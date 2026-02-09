import type { User } from '../../types'
import { CONFIG } from '../../config'

/**
 * Main Authentication Service
 * Backend-driven auth with httpOnly cookies.
 * Used by App.tsx and AuthModal.tsx
 */

export const authService = {
  // Updated: Returns User OR null (if email confirmation is required)
  async signUp(email: string, password: string, name: string): Promise<User | null> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/signup` : '/auth/signup'

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    })

    const data = await resp.json()
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Sign up failed')
    }

    return data.user || null
  },

  async login(email: string, password: string): Promise<User> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/login` : '/auth/login'

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    const data = await resp.json()
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Login failed')
    }

    return data.user as User
  },

  // Updated: Returns void (Promise<void>) because it redirects the page
  async signInWithGoogle(): Promise<void> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/google/start` : '/auth/google/start'

    const resp = await fetch(url, { credentials: 'include' })
    const data = await resp.json()
    if (!resp.ok || !data.success || !data.url) {
      throw new Error(data.error || 'Google auth failed')
    }

    window.location.href = data.url
  },

  async getCurrentUser(): Promise<User | null> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/me` : '/auth/me'

    const resp = await fetch(url, { credentials: 'include' })
    if (!resp.ok) return null
    const data = await resp.json()
    return data.user || null
  },

  async logout(): Promise<void> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/logout` : '/auth/logout'

    await fetch(url, { method: 'POST', credentials: 'include' })
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    // No realtime client-side auth. Keep API parity with a no-op subscription.
    return { unsubscribe: () => {} }
  },
}
