import type { User } from '../../types'
import { CONFIG } from '../../config'

/**
 * Main Authentication Service
 * Backend-driven auth with httpOnly cookies.
 * Used by App.tsx and AuthModal.tsx
 */

export const authService = {
  async sendOtp(phone: string): Promise<void> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/otp/send` : '/auth/otp/send'

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone }),
    })

    const data = await resp.json()
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Failed to send OTP')
    }
  },

  async verifyOtp(phone: string, code: string): Promise<User> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/otp/verify` : '/auth/otp/verify'

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone, code }),
    })

    const data = await resp.json()
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'OTP verification failed')
    }

    return data.user as User
  },

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
  async signInWithGoogle(loginHint?: string): Promise<void> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const baseUrl = apiBase ? `${apiBase}/auth/google/start` : '/auth/google/start'
    const params = new URLSearchParams({ redirect: '1' })
    if (loginHint) {
      params.set('login_hint', loginHint)
      params.set('prompt', 'select_account')
    }
    window.location.href = `${baseUrl}?${params.toString()}`
  },

  async getCurrentUser(): Promise<User | null> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/me` : '/auth/me'

    const resp = await fetch(url, { credentials: 'include' })
    if (!resp.ok) return null
    const data = await resp.json()
    return data.user || null
  },

  async logout(): Promise<User | null> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/logout` : '/auth/logout'

    const resp = await fetch(url, { method: 'POST', credentials: 'include' })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok || data.success === false) {
      throw new Error(data.error || 'Logout failed')
    }
    return data.user || null
  },

  async switchAccount(email: string): Promise<User> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/switch` : '/auth/switch'

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok || !data.success || !data.user) {
      throw new Error(data.error || 'Account switch failed')
    }

    return data.user as User
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    // No realtime client-side auth. Keep API parity with a no-op subscription.
    return { unsubscribe: () => {} }
  },
}
