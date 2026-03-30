// server/src/routes/wishlist.js — CRUD for user wishlist (template-based)
import { createAdminClient, getUserFromRequest } from '../lib/auth.js';

/**
 * GET /api/wishlist
 * Returns the authenticated user's wishlist (template IDs + joined template data).
 */
export async function getWishlistHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const { data, error } = await supabase
      .from('user_wishlist')
      .select('template_id, created_at, templates(*)')
      .eq('user_id', authResult.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      items: (data || []).map(row => ({
        templateId: row.template_id,
        createdAt: row.created_at,
        template: row.templates,
      })),
    });
  } catch (err) {
    console.error('[wishlist] get error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch wishlist' });
  }
}

/**
 * POST /api/wishlist — { templateId: string }
 * Adds a template to the user's wishlist. Idempotent (ignores duplicates).
 */
export async function addWishlistHandler(req, res) {
  try {
    const { templateId } = req.body;
    if (!templateId || typeof templateId !== 'string') {
      return res.status(400).json({ success: false, error: 'templateId is required' });
    }

    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const { error } = await supabase
      .from('user_wishlist')
      .upsert(
        { user_id: authResult.user.id, template_id: templateId },
        { onConflict: 'user_id,template_id', ignoreDuplicates: true }
      );

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error('[wishlist] add error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to add to wishlist' });
  }
}

/**
 * DELETE /api/wishlist/:templateId
 * Removes a template from the user's wishlist.
 */
export async function removeWishlistHandler(req, res) {
  try {
    const { templateId } = req.params;
    if (!templateId) return res.status(400).json({ success: false, error: 'templateId is required' });

    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const { error } = await supabase
      .from('user_wishlist')
      .delete()
      .eq('user_id', authResult.user.id)
      .eq('template_id', templateId);

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error('[wishlist] remove error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to remove from wishlist' });
  }
}
