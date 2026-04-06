// web/features/tracking/trackingService.ts — Batched event tracking
import { CONFIG } from '../../config';

export type EventType = 'view' | 'try_on' | 'wishlist' | 'cart_add' | 'cart_remove' | 'purchase';

interface TrackEvent {
  product_id: string;
  event_type: EventType;
  metadata?: Record<string, unknown>;
}

const BASE = CONFIG.API.BASE_URL;
const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH_SIZE = 10;

let queue: TrackEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
}

function stopFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

async function flush() {
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_BATCH_SIZE);

  try {
    await fetch(`${BASE}/api/events/track`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });
  } catch {
    // Silently fail — events are best-effort
  }

  // If there are more events queued, flush again immediately
  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  }
}

/**
 * Track an event. Events are batched and flushed every 5s or at 10 events.
 */
export function trackEvent(productId: string, eventType: EventType, metadata?: Record<string, unknown>) {
  queue.push({
    product_id: productId,
    event_type: eventType,
    metadata,
  });

  startFlushTimer();

  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  }
}

/**
 * Force flush all pending events (e.g., on page unload).
 * Uses sendBeacon for reliability.
 */
export function flushBeacon() {
  if (queue.length === 0) return;

  const batch = queue.splice(0);
  const payload = JSON.stringify({ events: batch });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(`${BASE}/api/events/track`, blob);
  }
}

// Auto-flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushBeacon();
    }
  });

  window.addEventListener('pagehide', flushBeacon);
}

/**
 * Cleanup — call when user logs out.
 */
export function resetTracking() {
  queue = [];
  stopFlushTimer();
}
