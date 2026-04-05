import { CONFIG } from '../../config';

const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');

export interface SavedSelfie {
  id: string;
  url: string;
  created_at: string;
}

export async function getSavedSelfies(): Promise<SavedSelfie[]> {
  const url = apiBase ? `${apiBase}/api/profile/selfies` : '/api/profile/selfies';
  const resp = await fetch(url, { credentials: 'include' });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.selfies || [];
}

export async function saveSelfie(imageDataUrl: string): Promise<{ selfie: SavedSelfie; profilePhotoUrl: string }> {
  const url = apiBase ? `${apiBase}/api/profile/selfies` : '/api/profile/selfies';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ imageData: imageDataUrl }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || `Save failed (${resp.status})`);
  }
  const data = await resp.json();
  return { selfie: data.selfie, profilePhotoUrl: data.profilePhotoUrl };
}

export async function deleteSavedSelfie(id: string): Promise<void> {
  const url = apiBase ? `${apiBase}/api/profile/selfies/${id}` : `/api/profile/selfies/${id}`;
  const resp = await fetch(url, { method: 'DELETE', credentials: 'include' });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || `Delete failed (${resp.status})`);
  }
}

export async function activateSelfie(id: string): Promise<string> {
  const url = apiBase ? `${apiBase}/api/profile/selfies/${id}/activate` : `/api/profile/selfies/${id}/activate`;
  const resp = await fetch(url, { method: 'PATCH', credentials: 'include' });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || `Activate failed (${resp.status})`);
  }
  const data = await resp.json();
  return data.profilePhotoUrl;
}
