/**
 * Wardrobe API client — all wardrobe + concierge HTTP calls.
 */

import { CONFIG } from '../../config';
import type {
  WardrobeGarment,
  WardrobeGarmentsResponse,
  WardrobeOutfitsResponse,
  WardrobeGap,
  WardrobeSyncEvent,
  WardrobeChatRequest,
  WardrobeChatResponse,
} from '../../types';

const BASE = CONFIG.API.BASE_URL;
const FETCH_OPTS: RequestInit = { credentials: 'include' };

// ── Garments ──────────────────────────────────────────────────────

export async function uploadGarment(imageBase64: string, mimeType: string): Promise<{ garment: WardrobeGarment; count: number; cap: number }> {
  const res = await fetch(`${BASE}/api/wardrobe/garments/upload`, {
    ...FETCH_OPTS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, mimeType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function deleteGarment(id: string): Promise<{ success: boolean; stale_outfits: number }> {
  const res = await fetch(`${BASE}/api/wardrobe/garments/${encodeURIComponent(id)}`, {
    ...FETCH_OPTS,
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Delete failed');
  return res.json();
}

export async function listGarments(): Promise<WardrobeGarmentsResponse> {
  const res = await fetch(`${BASE}/api/wardrobe/garments`, FETCH_OPTS);
  if (!res.ok) throw new Error('Failed to fetch garments');
  return res.json();
}


// ── Sync (SSE) ────────────────────────────────────────────────────

export function startSync(
  onEvent: (event: WardrobeSyncEvent) => void,
  onError?: (err: Error) => void,
  onDone?: () => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${BASE}/api/wardrobe/sync`, {
    ...FETCH_OPTS,
    method: 'POST',
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok || !res.body) {
      onError?.(new Error('Sync request failed'));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6)) as WardrobeSyncEvent;
            onEvent(event);
          } catch {
            // skip malformed events
          }
        }
      }
    }

    onDone?.();
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onError?.(err);
    }
  });

  return controller;
}


// ── Outfits ───────────────────────────────────────────────────────

export async function listOutfits(page = 1, limit = 20): Promise<WardrobeOutfitsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await fetch(`${BASE}/api/wardrobe/outfits?${params}`, FETCH_OPTS);
  if (!res.ok) throw new Error('Failed to fetch outfits');
  return res.json();
}


// ── Chat / Concierge ─────────────────────────────────────────────

export async function sendChatMessage(req: WardrobeChatRequest): Promise<WardrobeChatResponse> {
  const res = await fetch(`${BASE}/api/wardrobe/chat`, {
    ...FETCH_OPTS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Chat request failed');
  return res.json();
}


// ── Gaps ──────────────────────────────────────────────────────────

export async function getGaps(): Promise<{ gaps: WardrobeGap[]; total_garments: number; category_counts: Record<string, number> }> {
  const res = await fetch(`${BASE}/api/wardrobe/gaps`, FETCH_OPTS);
  if (!res.ok) throw new Error('Failed to fetch gaps');
  return res.json();
}
