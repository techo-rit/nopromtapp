import { CONFIG } from '../../config';
import type { UserProfile, UserAddress, GeneratedImage } from '../../types';
import { authService } from '../auth/authService';

function apiUrl(path: string): string {
  const base = CONFIG.API.BASE_URL.replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

const PROFILE_REVALIDATION_THROTTLE_MS =
  Number(CONFIG.PROFILE?.REVALIDATION_THROTTLE_MS ?? 15000) || 15000;

export const profileService = {
  async getProfile(force = false): Promise<{ profile: UserProfile; onboardingSteps: number; onboardingPercent: number } | null> {
    const serverProfile = async () => fetchProfileFromServer(force);
    const shouldRevalidate = () => shouldRevalidateProfile();

    if (!force) {
      const cached = getCachedProfile();
      const cachedUser = authService.getCachedUser();
      if (cached && !cachedUser) {
        setCachedProfile(null);
        setCachedAddresses(null);
      } else if (cached && cachedUser && cached.profile?.id && cached.profile.id !== cachedUser.id) {
        setCachedProfile(null);
        setCachedAddresses(null);
      } else if (cached) {
        if (!shouldRevalidate()) return cached;
        const fresh = await serverProfile();
        if (!fresh) return cached;
        if (hasOnboardingPercentDiff(cached, fresh)) return fresh;
        return cached;
      }

      const publicCached = getCachedPublicProfile();
      if (publicCached) {
        if (shouldRevalidate()) {
          const fresh = await serverProfile();
          if (fresh && hasOnboardingPercentDiff(publicCached, fresh)) {
            return fresh;
          }
        }

        const now = new Date().toISOString();
        const fallbackUser = authService.getCachedUser();
        return {
          profile: {
            id: fallbackUser?.id || '',
            email: fallbackUser?.email || '',
            name: publicCached.name || '',
            phone: fallbackUser?.phone || null,
            ageRange: publicCached.ageRange || null,
            colors: publicCached.colors || [],
            styles: publicCached.styles || [],
            fit: publicCached.fit || null,
            bodyType: publicCached.bodyType || null,
            skinTone: publicCached.skinTone || null,
            avatarUrl: fallbackUser?.avatarUrl || null,
            isOnboardingComplete: fallbackUser?.isOnboardingComplete || false,
            accountType: fallbackUser?.accountType || 'free',
            monthlyQuota: fallbackUser?.monthlyQuota || 3,
            monthlyUsed: fallbackUser?.monthlyUsed || 0,
            extraCredits: fallbackUser?.extraCredits || 0,
            creationsLeft: fallbackUser?.creationsLeft || 0,
            createdAt: now,
            updatedAt: now,
          },
          onboardingSteps: publicCached.onboardingSteps ?? 0,
          onboardingPercent: publicCached.onboardingPercent ?? 0,
        };
      }
    }
    return serverProfile();
  },

  async updateProfile(updates: Partial<{
    name: string;
    phone: string;
    ageRange: string;
    colors: string[];
    styles: string[];
    fit: string;
    bodyType: string;
    skinTone: string;
    bust: number | null;
    waist: number | null;
    hip: number | null;
    measurementUnit: string;
    isOnboardingComplete: boolean;
  }>): Promise<{ profile: UserProfile; onboardingSteps: number; onboardingPercent: number }> {
    const resp = await fetch(apiUrl('/api/profile'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Failed to update profile');
    }
    const result = {
      profile: data.profile,
      onboardingSteps: data.onboardingSteps,
      onboardingPercent: data.onboardingPercent,
    };
    setCachedProfile(result);
    setCachedPublicProfile({
      name: data.profile?.name || '',
      ageRange: data.profile?.ageRange || null,
      colors: data.profile?.colors || [],
      styles: data.profile?.styles || [],
      fit: data.profile?.fit || null,
      bodyType: data.profile?.bodyType || null,
      skinTone: data.profile?.skinTone || null,
      onboardingSteps: data.onboardingSteps ?? 0,
      onboardingPercent: data.onboardingPercent ?? 0,
    });
    authService.updateCachedUser({
      name: data.profile?.name || '',
      phone: data.profile?.phone || null,
      ageRange: data.profile?.ageRange || null,
      colors: data.profile?.colors || [],
      styles: data.profile?.styles || [],
      fit: data.profile?.fit || null,
      bodyType: data.profile?.bodyType || null,
      skinTone: data.profile?.skinTone || null,
      avatarUrl: data.profile?.avatarUrl || null,
      isOnboardingComplete: data.profile?.isOnboardingComplete ?? false,
      accountType: data.profile?.accountType || 'free',
      monthlyQuota: data.profile?.monthlyQuota ?? 3,
      monthlyUsed: data.profile?.monthlyUsed ?? 0,
      extraCredits: data.profile?.extraCredits ?? 0,
      creationsLeft: data.profile?.creationsLeft ?? 0,
    });
    return result;
  },

  async getAddresses(force = false): Promise<UserAddress[]> {
    if (!force) {
      const cached = getCachedAddresses();
      const cachedUser = authService.getCachedUser();
      if (cached && !cachedUser) {
        setCachedAddresses(null);
      } else if (cached && cachedUser && cached.length > 0 && cached[0].userId !== cachedUser.id) {
        setCachedAddresses(null);
      } else if (cached) {
        return cached;
      }
    }
    const resp = await fetch(apiUrl(`/api/profile/addresses${force ? '?force=1' : ''}`), { credentials: 'include' });
    if (!resp.ok) return [];
    const data = await resp.json();
    const addresses = data.addresses || [];
    setCachedAddresses(addresses);
    return addresses;
  },

  async addAddress(address: {
    label?: string;
    addressLine1?: string;
    addressLine: string;
    city?: string;
    state?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
    isDefault?: boolean;
  }): Promise<UserAddress> {
    const resp = await fetch(apiUrl('/api/profile/addresses'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(address),
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to add address');
    const nextAddress = data.address;
    const existing = getCachedAddresses() || [];
    setCachedAddresses([nextAddress, ...existing.filter(a => a.id !== nextAddress.id)]);
    setCachedProfile(null);
    setCachedPublicProfile(null);
    return nextAddress;
  },

  async updateAddress(id: string, updates: {
    label?: string;
    addressLine1?: string | null;
    addressLine?: string;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    lat?: number | null;
    lng?: number | null;
  }): Promise<UserAddress> {
    const resp = await fetch(apiUrl(`/api/profile/addresses/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to update address');

    const updatedAddress = data.address as UserAddress;
    const existing = getCachedAddresses() || [];
    if (existing.length > 0) {
      setCachedAddresses(existing.map((address) => (
        address.id === id ? updatedAddress : address
      )));
    }
    return updatedAddress;
  },

  async deleteAddress(id: string): Promise<void> {
    const resp = await fetch(apiUrl(`/api/profile/addresses/${id}`), {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to delete address');
    const existing = getCachedAddresses() || [];
    setCachedAddresses(existing.filter(a => a.id !== id));
    setCachedProfile(null);
    setCachedPublicProfile(null);
  },

  async setDefaultAddress(id: string): Promise<UserAddress> {
    const resp = await fetch(apiUrl(`/api/profile/addresses/${id}/default`), {
      method: 'PUT',
      credentials: 'include',
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to set default address');

    const defaultAddress = data.address as UserAddress;
    const existing = getCachedAddresses() || [];
    if (existing.length > 0) {
      setCachedAddresses(existing.map((address) => ({
        ...address,
        isDefault: address.id === id,
      })));
    }

    return defaultAddress;
  },

  async getGenerations(force = false): Promise<{ generations: GeneratedImage[]; total: number }> {
    if (!force) {
      const cached = getCachedGenerations();
      if (cached) return cached;
    }
    const resp = await fetch(apiUrl('/api/profile/generations?limit=50'), { credentials: 'include' });
    if (!resp.ok) return { generations: [], total: 0 };
    const data = await resp.json();
    if (!data.success) return { generations: [], total: 0 };
    const result: { generations: GeneratedImage[]; total: number } = {
      generations: (data.generations || []).map(mapGeneration),
      total: data.total || 0,
    };
    setCachedGenerations(result);
    return result;
  },

  async deleteGeneration(id: string): Promise<void> {
    const resp = await fetch(apiUrl(`/api/profile/generations/${id}`), {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to delete');
    const cached = getCachedGenerations();
    if (cached) setCachedGenerations({ ...cached, generations: cached.generations.filter(g => g.id !== id), total: Math.max(0, cached.total - 1) });
  },

  async deleteAllGenerations(): Promise<void> {
    const resp = await fetch(apiUrl('/api/profile/generations'), {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to delete');
    setCachedGenerations({ generations: [], total: 0 });
  },

  clearGenerationsCache() {
    setCachedGenerations(null);
  },

  clearCache() {
    setCachedProfile(null);
    setCachedAddresses(null);
    setCachedPublicProfile(null);
    setCachedGenerations(null);
  },
};

const PROFILE_PUBLIC_CACHE_KEY = 'stiri_profile_public_cache_v1';
let cachedProfile: { profile: UserProfile; onboardingSteps: number; onboardingPercent: number } | null | undefined = undefined;
let cachedAddresses: UserAddress[] | null | undefined = undefined;
let cachedPublicProfile: PublicProfileCache | null | undefined = undefined;
let cachedGenerations: { generations: GeneratedImage[]; total: number } | null | undefined = undefined;
let lastProfileRevalidationAt = 0;

function getCachedProfile() {
  if (cachedProfile !== undefined) return cachedProfile;
  cachedProfile = null;
  return null;
}

function setCachedProfile(value: { profile: UserProfile; onboardingSteps: number; onboardingPercent: number } | null) {
  cachedProfile = value;
}

function getCachedAddresses() {
  if (cachedAddresses !== undefined) return cachedAddresses;
  cachedAddresses = null;
  return null;
}

function setCachedAddresses(value: UserAddress[] | null) {
  cachedAddresses = value;
}

type PublicProfileCache = {
  name: string;
  ageRange: string | null;
  colors: string[];
  styles: string[];
  fit: string | null;
  bodyType: string | null;
  skinTone: string | null;
  onboardingSteps: number;
  onboardingPercent: number;
};

function getCachedPublicProfile(): PublicProfileCache | null {
  if (cachedPublicProfile !== undefined) return cachedPublicProfile;
  try {
    const raw = localStorage.getItem(PROFILE_PUBLIC_CACHE_KEY);
    if (!raw) { cachedPublicProfile = null; return null; }
    const decoded = decodeCache<PublicProfileCache>(raw);
    cachedPublicProfile = decoded;
    return cachedPublicProfile;
  } catch {
    cachedPublicProfile = null;
    return null;
  }
}

function setCachedPublicProfile(value: PublicProfileCache | null) {
  cachedPublicProfile = value;
  try {
    if (value) {
      localStorage.setItem(PROFILE_PUBLIC_CACHE_KEY, encodeCache(value));
    } else {
      localStorage.removeItem(PROFILE_PUBLIC_CACHE_KEY);
    }
  } catch {
    // ignore cache errors
  }
}

function encodeCache(value: unknown): string {
  const json = JSON.stringify(value);
  const checksum = simpleHash(json);
  const payload = btoa(json);
  return JSON.stringify({ payload, checksum });
}

function decodeCache<T>(raw: string): T | null {
  try {
    const parsed = JSON.parse(raw) as { payload?: string; checksum?: string };
    if (!parsed?.payload || !parsed?.checksum) return null;
    const json = atob(parsed.payload);
    if (simpleHash(json) !== parsed.checksum) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function simpleHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return String(hash >>> 0);
}

function getCachedGenerations() {
  if (cachedGenerations !== undefined) return cachedGenerations;
  cachedGenerations = null;
  return null;
}

function setCachedGenerations(value: { generations: GeneratedImage[]; total: number } | null) {
  cachedGenerations = value;
}

async function fetchProfileFromServer(force = false): Promise<{ profile: UserProfile; onboardingSteps: number; onboardingPercent: number } | null> {
  markProfileRevalidatedNow();
  const resp = await fetch(apiUrl(`/api/profile${force ? '?force=1' : ''}`), { credentials: 'include' });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.success) return null;

  const result = {
    profile: data.profile,
    onboardingSteps: data.onboardingSteps,
    onboardingPercent: data.onboardingPercent,
  };

  setCachedProfile(result);
  setCachedPublicProfile({
    name: data.profile?.name || '',
    ageRange: data.profile?.ageRange || null,
    colors: data.profile?.colors || [],
    styles: data.profile?.styles || [],
    fit: data.profile?.fit || null,
    bodyType: data.profile?.bodyType || null,
    skinTone: data.profile?.skinTone || null,
    onboardingSteps: data.onboardingSteps ?? 0,
    onboardingPercent: data.onboardingPercent ?? 0,
  });

  authService.updateCachedUser({
    name: data.profile?.name || '',
    phone: data.profile?.phone || null,
    ageRange: data.profile?.ageRange || null,
    colors: data.profile?.colors || [],
    styles: data.profile?.styles || [],
    fit: data.profile?.fit || null,
    bodyType: data.profile?.bodyType || null,
    skinTone: data.profile?.skinTone || null,
    avatarUrl: data.profile?.avatarUrl || null,
    isOnboardingComplete: data.profile?.isOnboardingComplete ?? false,
    accountType: data.profile?.accountType || 'free',
    monthlyQuota: data.profile?.monthlyQuota ?? 3,
    monthlyUsed: data.profile?.monthlyUsed ?? 0,
    extraCredits: data.profile?.extraCredits ?? 0,
    creationsLeft: data.profile?.creationsLeft ?? 0,
  });

  return result;
}

function hasOnboardingPercentDiff(
  cached: { onboardingPercent?: number } | null,
  fresh: { onboardingPercent?: number } | null,
): boolean {
  const cachedPercent = Number(cached?.onboardingPercent ?? 0);
  const freshPercent = Number(fresh?.onboardingPercent ?? 0);
  return cachedPercent !== freshPercent;
}

function shouldRevalidateProfile(now = Date.now()): boolean {
  return now - lastProfileRevalidationAt >= PROFILE_REVALIDATION_THROTTLE_MS;
}

function markProfileRevalidatedNow(now = Date.now()) {
  lastProfileRevalidationAt = now;
}

function mapGeneration(raw: Record<string, unknown>): GeneratedImage {
  return {
    id: String(raw.id ?? ''),
    imageUrl: String(raw.image_url ?? ''),
    templateId: (raw.template_id as string | null) ?? null,
    templateName: (raw.template_name as string | null) ?? null,
    stackId: (raw.stack_id as string | null) ?? null,
    mode: (raw.mode === 'tryon' ? 'tryon' : 'remix'),
    aspectRatio: (raw.aspect_ratio as string | null) ?? null,
    createdAt: String(raw.created_at ?? ''),
  };
}
