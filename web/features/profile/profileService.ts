import { CONFIG } from '../../config';
import type { UserProfile, UserAddress } from '../../types';

function apiUrl(path: string): string {
  const base = CONFIG.API.BASE_URL.replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

export const profileService = {
  async getProfile(): Promise<{ profile: UserProfile; onboardingSteps: number; onboardingPercent: number } | null> {
    const resp = await fetch(apiUrl('/api/profile'), { credentials: 'include' });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.success) return null;
    return {
      profile: data.profile,
      onboardingSteps: data.onboardingSteps,
      onboardingPercent: data.onboardingPercent,
    };
  },

  async updateProfile(updates: Partial<{
    name: string;
    phone: string;
    ageRange: string;
    email: string;
    colorMode: string;
    colors: string[];
    styles: string[];
    fit: string;
    bodyType: string;
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
    return {
      profile: data.profile,
      onboardingSteps: data.onboardingSteps,
      onboardingPercent: data.onboardingPercent,
    };
  },

  async getAddresses(): Promise<UserAddress[]> {
    const resp = await fetch(apiUrl('/api/profile/addresses'), { credentials: 'include' });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.addresses || [];
  },

  async addAddress(address: {
    label?: string;
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
    return data.address;
  },

  async deleteAddress(id: string): Promise<void> {
    const resp = await fetch(apiUrl(`/api/profile/addresses/${id}`), {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to delete address');
  },
};
