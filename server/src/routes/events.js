/**
 * Event Tracking Route — POST /api/events/track
 *
 * Accepts batched click events from the frontend.
 * Deduplicates views within 5 minutes.
 * Reference: docs/PERSONALIZATION_MODEL.md §3.1
 */

import { createAdminClient, getUserFromRequest } from '../lib/auth.js';

const VALID_EVENTS = new Set(['view', 'try_on', 'wishlist', 'cart_add', 'cart_remove', 'purchase']);
const VIEW_DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BATCH_SIZE = 20;

export async function trackEventsHandler(req, res) {
  try {
    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return;

    const { user } = authResult;
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array required' });
    }

    if (events.length > MAX_BATCH_SIZE) {
      return res.status(400).json({ error: `Max ${MAX_BATCH_SIZE} events per batch` });
    }

    // Validate events
    const validEvents = [];
    for (const event of events) {
      if (!event.product_id || typeof event.product_id !== 'string') continue;
      if (!VALID_EVENTS.has(event.event_type)) continue;
      if (event.product_id.length > 255) continue;

      validEvents.push({
        user_id: user.id,
        product_id: event.product_id,
        event_type: event.event_type,
        metadata: event.metadata && typeof event.metadata === 'object' ? event.metadata : {},
      });
    }

    if (validEvents.length === 0) {
      return res.status(400).json({ error: 'No valid events in batch' });
    }

    const supabase = createAdminClient();

    // View deduplication: check for recent views by this user
    const viewEvents = validEvents.filter((e) => e.event_type === 'view');
    const viewProductIds = viewEvents.map((e) => e.product_id);

    let dedupedViews = new Set();
    if (viewProductIds.length > 0) {
      const dedupCutoff = new Date(Date.now() - VIEW_DEDUP_WINDOW_MS).toISOString();
      const { data: recentViews } = await supabase
        .from('click_events')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('event_type', 'view')
        .in('product_id', viewProductIds)
        .gte('created_at', dedupCutoff);

      dedupedViews = new Set((recentViews || []).map((r) => r.product_id));
    }

    // Filter out duplicate views
    const eventsToInsert = validEvents.filter((e) => {
      if (e.event_type === 'view' && dedupedViews.has(e.product_id)) return false;
      return true;
    });

    if (eventsToInsert.length === 0) {
      return res.json({ tracked: 0, deduped: validEvents.length });
    }

    // Insert events
    const { error } = await supabase
      .from('click_events')
      .insert(eventsToInsert);

    if (error) {
      console.error('[events] Insert failed:', error.message);
      return res.status(500).json({ error: 'Failed to track events' });
    }

    // Increment events_since_compute for this user
    const { data: existing } = await supabase
      .from('user_click_profile')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      await supabase.rpc('increment_events_since_compute', { uid: user.id }).catch(() => {
        // If RPC doesn't exist, do manual update
        supabase
          .from('user_click_profile')
          .update({ events_since_compute: eventsToInsert.length })
          .eq('user_id', user.id)
          .then(() => {});
      });
    } else {
      // Create initial click profile
      await supabase
        .from('user_click_profile')
        .insert({
          user_id: user.id,
          events_since_compute: eventsToInsert.length,
        });
    }

    // Update recent_impressions for view events
    const newViews = eventsToInsert
      .filter((e) => e.event_type === 'view')
      .map((e) => e.product_id);

    if (newViews.length > 0 && existing) {
      const { data: profile } = await supabase
        .from('user_click_profile')
        .select('recent_impressions')
        .eq('user_id', user.id)
        .single();

      const impressions = Array.isArray(profile?.recent_impressions)
        ? profile.recent_impressions
        : [];
      const updated = [...newViews, ...impressions].slice(0, 200);

      await supabase
        .from('user_click_profile')
        .update({ recent_impressions: updated })
        .eq('user_id', user.id);
    }

    return res.json({
      tracked: eventsToInsert.length,
      deduped: validEvents.length - eventsToInsert.length,
    });
  } catch (err) {
    console.error('[events] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
