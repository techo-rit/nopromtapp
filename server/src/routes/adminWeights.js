/**
 * Admin Weights Route — Ranking weight management
 *
 * GET  /api/admin/weights      — View current + history
 * POST /api/admin/weights/tune — Manual weight override
 *
 * Auth: ADMIN_PURGE_KEY header check.
 * Reference: docs/PERSONALIZATION_MODEL.md §9
 */

import { createAdminClient } from '../lib/auth.js';

const ADMIN_KEY = process.env.ADMIN_PURGE_KEY || '';

function verifyAdmin(req, res) {
  const key = req.headers['x-admin-key'];
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

export async function getWeightsHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const supabase = createAdminClient();

    const { data: active } = await supabase
      .from('ranking_weights')
      .select('*')
      .eq('is_active', true)
      .single();

    const { data: history } = await supabase
      .from('ranking_weights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    return res.json({ active, history: history || [] });
  } catch (err) {
    console.error('[adminWeights] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function tuneWeightsHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const { w_style, w_user_clicks, w_product_pop } = req.body;

    if (w_style == null || w_user_clicks == null || w_product_pop == null) {
      return res.status(400).json({ error: 'w_style, w_user_clicks, w_product_pop required' });
    }

    const style = Number(w_style);
    const user = Number(w_user_clicks);
    const pop = Number(w_product_pop);

    if ([style, user, pop].some((v) => isNaN(v) || v < 0 || v > 1)) {
      return res.status(400).json({ error: 'Weights must be numbers between 0 and 1' });
    }

    const sum = style + user + pop;
    if (Math.abs(sum - 1.0) > 0.01) {
      return res.status(400).json({ error: `Weights must sum to 1.0 (got ${sum.toFixed(3)})` });
    }

    // Normalize to exactly sum to 1
    const wStyle = Math.round((style / sum) * 1000) / 1000;
    const wUser = Math.round((user / sum) * 1000) / 1000;
    const wPop = Math.round((1 - wStyle - wUser) * 1000) / 1000;

    const supabase = createAdminClient();

    // Deactivate all current weights
    await supabase
      .from('ranking_weights')
      .update({ is_active: false })
      .eq('is_active', true);

    // Insert new weights
    const { data, error } = await supabase
      .from('ranking_weights')
      .insert({
        w_style: wStyle,
        w_user_clicks: wUser,
        w_product_pop: wPop,
        last_delta: { manual_override: true },
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[adminWeights] Insert failed:', error.message);
      return res.status(500).json({ error: 'Failed to update weights' });
    }

    return res.json(data);
  } catch (err) {
    console.error('[adminWeights] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
