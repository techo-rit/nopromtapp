/**
 * Product Sync Route — Admin-triggered tag generation + cron
 *
 * POST /api/admin/product-sync              — Full sync: all templates → Gemini → cache
 * POST /api/admin/product-sync/:templateId  — Sync a single template
 * POST /api/admin/cron/personalization       — Trigger nightly cron (admin key)
 *
 * Reference: docs/PERSONALIZATION_MODEL.md §4, §15
 */

import { createAdminClient, verifyAdmin } from '../lib/auth.js';
import { syncAllTemplates, syncSingleTemplate } from '../lib/productSync.js';
import { runNightlyCron } from '../lib/rankingCron.js';

/**
 * POST /api/admin/product-sync — Full catalog tag generation
 */
export async function fullSyncHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const supabase = createAdminClient();
    const result = await syncAllTemplates(supabase);

    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[productSync] Full sync error:', err.message);
    return res.status(500).json({ error: 'Sync failed', message: err.message });
  }
}

/**
 * POST /api/admin/product-sync/:templateId — Sync a single template
 */
export async function singleSyncHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const { templateId } = req.params;
    if (!templateId) {
      return res.status(400).json({ error: 'templateId required' });
    }

    const supabase = createAdminClient();
    const result = await syncSingleTemplate(supabase, templateId);

    if (!result.synced) {
      return res.status(404).json(result);
    }

    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[productSync] Single sync error:', err.message);
    return res.status(500).json({ error: 'Sync failed', message: err.message });
  }
}

/**
 * POST /api/admin/cron/personalization — Trigger nightly cron manually
 */
export async function cronHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const supabase = createAdminClient();
    const result = await runNightlyCron(supabase);

    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron] Manual trigger error:', err.message);
    return res.status(500).json({ error: 'Cron failed' });
  }
}
