// web/features/feed/feedService.ts — For-You feed API client
import { CONFIG } from '../../config';
import type { FeedItem, FeedResponse } from '../../types';

const BASE = CONFIG.API.BASE_URL;

export async function fetchFeed(limit = 20, offset = 0): Promise<FeedResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const res = await fetch(`${BASE}/api/feed/for-you?${params}`, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Feed API error: ${res.status}`);
  }

  return res.json();
}
