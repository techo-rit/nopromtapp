import { CONFIG } from '../../config';

const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');

export async function uploadProfilePhoto(imageDataUrl: string): Promise<string> {
  const url = apiBase ? `${apiBase}/api/profile/photo` : '/api/profile/photo';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ imageData: imageDataUrl }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || `Upload failed (${resp.status})`);
  }
  const data = await resp.json();
  return data.profilePhotoUrl;
}

export async function deleteProfilePhoto(): Promise<void> {
  const url = apiBase ? `${apiBase}/api/profile/photo` : '/api/profile/photo';
  const resp = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || `Delete failed (${resp.status})`);
  }
}
