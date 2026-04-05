import { CONFIG } from '../../config';

const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');

export async function createShareLink(
  productHandle?: string,
  productName?: string
): Promise<{ code: string; url: string }> {
  const endpoint = apiBase ? `${apiBase}/api/share-links` : '/api/share-links';
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productHandle, productName }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || `Failed to create share link (${resp.status})`);
  }
  const data = await resp.json();
  return { code: data.code, url: data.url };
}
