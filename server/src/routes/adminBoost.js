/**
 * Admin Boost Route — CRUD for admin_boost_queue
 *
 * POST   /api/admin/boost     — Create boost
 * GET    /api/admin/boost     — List active boosts
 * DELETE /api/admin/boost/:id — Remove boost
 *
 * Auth: ADMIN_PURGE_KEY header check.
 * Reference: docs/PERSONALIZATION_MODEL.md §8.3
 */

import { createAdminClient, verifyAdmin } from '../lib/auth.js';

const MAX_ACTIVE_BOOSTS = 10;

export async function createBoostHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const { product_id, priority, min_style_match, expires_at } = req.body;

    if (!product_id || typeof product_id !== 'string') {
      return res.status(400).json({ error: 'product_id required' });
    }
    if (!expires_at) {
      return res.status(400).json({ error: 'expires_at required' });
    }

    const expiresDate = new Date(expires_at);
    if (isNaN(expiresDate.getTime()) || expiresDate <= new Date()) {
      return res.status(400).json({ error: 'expires_at must be a future date' });
    }

    const supabase = createAdminClient();

    // Check active boost count
    const { count } = await supabase
      .from('admin_boost_queue')
      .select('id', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString());

    if ((count || 0) >= MAX_ACTIVE_BOOSTS) {
      return res.status(409).json({ error: `Max ${MAX_ACTIVE_BOOSTS} active boosts allowed` });
    }

    const { data, error } = await supabase
      .from('admin_boost_queue')
      .insert({
        product_id,
        priority: Math.max(1, Math.min(priority || 1, 5)),
        min_style_match: Math.max(0, Math.min(min_style_match ?? 0.20, 1.0)),
        expires_at: expiresDate.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[adminBoost] Create failed:', error.message);
      return res.status(500).json({ error: 'Failed to create boost' });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('[adminBoost] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listBoostsHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('admin_boost_queue')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[adminBoost] List failed:', error.message);
      return res.status(500).json({ error: 'Failed to list boosts' });
    }

    return res.json(data || []);
  } catch (err) {
    console.error('[adminBoost] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteBoostHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('admin_boost_queue')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[adminBoost] Delete failed:', error.message);
      return res.status(404).json({ error: 'Boost not found' });
    }

    return res.json(data);
  } catch (err) {
    console.error('[adminBoost] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
