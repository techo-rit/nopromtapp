import type { User } from '../../types'
import { CONFIG } from '../../config'

/**
 * Main Authentication Service
 * Backend-driven auth with httpOnly cookies.
 * Used by App.tsx and AuthModal.tsx
 */

export const authService = {
  setCachedUser(user: User | null) {
    cachedUser = user
    try {
      if (user) {
        const persisted = { ...user, email: '' }
        localStorage.setItem(USER_SESSION_CACHE_KEY, encodeCache(persisted))
      } else {
        localStorage.removeItem(USER_SESSION_CACHE_KEY)
      }
    } catch {
      // ignore cache errors
    }
  },

  getCachedUser(): User | null {
    if (cachedUser !== undefined) return cachedUser ?? null
    try {
      const raw = localStorage.getItem(USER_SESSION_CACHE_KEY)
      if (!raw) {
        cachedUser = null
        return null
      }
      cachedUser = decodeCache<User>(raw)
      return cachedUser ?? null
    } catch {
      cachedUser = null
      return null
    }
  },

  updateCachedUser(partial: Partial<User>): User | null {
    const current = authService.getCachedUser()
    if (!current) return null
    const next = { ...current, ...partial }
    authService.setCachedUser(next)
    return next
  },

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

    const user = data.user as User
    authService.setCachedUser(user)
    return user
  },

  async getCurrentUser(): Promise<User | null> {
    if (cachedUser !== undefined) return cachedUser
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/me` : '/auth/me'

    const resp = await fetch(url, { credentials: 'include' })
    if (!resp.ok) return null
    const data = await resp.json()
    const user = data.user || null
    authService.setCachedUser(user)
    return user
  },

  async fetchCurrentUser(): Promise<User | null> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/me` : '/auth/me'

    const resp = await fetch(url, { credentials: 'include' })
    if (!resp.ok) return null
    const data = await resp.json()
    const user = data.user || null
    authService.setCachedUser(user)
    return user
  },

  async logout(): Promise<User | null> {
    const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/auth/logout` : '/auth/logout'

    const resp = await fetch(url, { method: 'POST', credentials: 'include' })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok || data.success === false) {
      throw new Error(data.error || 'Logout failed')
    }
    const user = data.user || null
    authService.setCachedUser(null)
    return user
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

    const user = data.user as User
    authService.setCachedUser(user)
    return user
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    // No realtime client-side auth. Keep API parity with a no-op subscription.
    return { unsubscribe: () => {} }
  },
}

let cachedUser: User | null | undefined = undefined
const USER_SESSION_CACHE_KEY = 'stiri_user_local_cache_v1'

function encodeCache(value: unknown): string {
  const json = JSON.stringify(value)
  const checksum = simpleHash(json)
  const payload = btoa(json)
  return JSON.stringify({ payload, checksum })
}

function decodeCache<T>(raw: string): T | null {
  try {
    const parsed = JSON.parse(raw) as { payload?: string; checksum?: string }
    if (!parsed?.payload || !parsed?.checksum) return null
    const json = atob(parsed.payload)
    if (simpleHash(json) !== parsed.checksum) return null
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

function simpleHash(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i)
    hash |= 0
  }
  return String(hash >>> 0)
}
