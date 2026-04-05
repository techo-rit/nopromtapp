import { CONFIG } from '../../config';

const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');

export async function requestCarouselTryOn(
  templateId: string,
  templateImageUrl: string
): Promise<{ status: 'cached' | 'generated'; imageUrl: string }> {
  const url = apiBase ? `${apiBase}/api/carousel-tryon` : '/api/carousel-tryon';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ templateId, templateImageUrl }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || `Request failed (${resp.status})`);
  }
  return resp.json();
}
