// server/src/routes/shopify.js — REST endpoints for Shopify Storefront API
import {
  getProducts,
  getProductByHandle,
  getProductsByHandles,
  createCart,
  getCart,
  addCartLines,
  updateCartLines,
  removeCartLines,
  productCache,
} from '../lib/shopify.js';
import { getUserFromRequest, createAdminClient } from '../lib/auth.js';

// ─── Products (public — no auth required) ───────────────────

// GET /api/shopify/products
export async function getProductsHandler(req, res) {
  try {
    const first = Math.min(parseInt(req.query.first, 10) || 50, 100);
    const products = await getProducts(first);
    res.json({ success: true, products });
  } catch (err) {
    console.error('Shopify getProducts error:', err.message);
    res.status(502).json({ success: false, error: 'Failed to fetch products' });
  }
}

// GET /api/shopify/product/:handle
export async function getProductByHandleHandler(req, res) {
  try {
    const { handle } = req.params;
    if (!handle || typeof handle !== 'string') {
      return res.status(400).json({ success: false, error: 'Handle is required' });
    }
    const product = await getProductByHandle(handle);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (err) {
    console.error('Shopify getProduct error:', err.message);
    res.status(502).json({ success: false, error: 'Failed to fetch product' });
  }
}

// POST /api/shopify/products/batch — { handles: string[] }
export async function getProductsByHandlesHandler(req, res) {
  try {
    const { handles } = req.body;
    if (!Array.isArray(handles) || handles.length === 0) {
      return res.status(400).json({ success: false, error: 'handles[] is required' });
    }
    if (handles.length > 25) {
      return res.status(400).json({ success: false, error: 'Max 25 handles per batch' });
    }
    const products = await getProductsByHandles(handles);
    res.json({ success: true, products });
  } catch (err) {
    console.error('Shopify getProductsByHandles error:', err.message);
    res.status(502).json({ success: false, error: 'Failed to fetch products' });
  }
}

// ─── Cart (auth required for DB persistence) ────────────────

// Helper: load or create cart for authenticated user
async function resolveCartId(supabase, userId, providedCartId) {
  // 1. If client provides a cart ID, use it
  if (providedCartId) return providedCartId;

  // 2. Check DB for stored cart ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('shopify_cart_id')
    .eq('id', userId)
    .single();

  return profile?.shopify_cart_id || null;
}

async function saveCartId(supabase, userId, cartId) {
  await supabase
    .from('profiles')
    .update({ shopify_cart_id: cartId })
    .eq('id', userId);
}

// POST /api/shopify/cart — create or get cart
export async function cartHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ success: false, error: authResult.error });
    }

    const userId = authResult.user.id;
    const existingCartId = await resolveCartId(supabase, userId, req.body?.cartId);

    // Try to fetch existing cart first
    if (existingCartId) {
      const existing = await getCart(existingCartId);
      if (existing) {
        return res.json({ success: true, cart: existing });
      }
    }

    // No existing cart or expired — create new one
    const lines = req.body?.lines || [];
    const cart = await createCart(lines);
    await saveCartId(supabase, userId, cart.id);
    res.json({ success: true, cart });
  } catch (err) {
    console.error('Shopify cart error:', err.message);
    res.status(502).json({ success: false, error: 'Failed to create/get cart' });
  }
}

// GET /api/shopify/cart/:id
export async function getCartHandler(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Cart ID is required' });

    const cart = await getCart(id);
    if (!cart) return res.status(404).json({ success: false, error: 'Cart not found' });
    res.json({ success: true, cart });
  } catch (err) {
    console.error('Shopify getCart error:', err.message);
    res.status(502).json({ success: false, error: 'Failed to fetch cart' });
  }
}

// POST /api/shopify/cart/lines — add lines to cart
// Body: { cartId, lines: [{ variantId, quantity }] }
export async function addCartLinesHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ success: false, error: authResult.error });
    }

    const userId = authResult.user.id;
    let { cartId, lines } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ success: false, error: 'lines[] is required' });
    }

    // Auto-resolve cart from DB if not provided
    if (!cartId) {
      cartId = await resolveCartId(supabase, userId, null);
    }

    // If still no cart, create one with the lines
    if (!cartId) {
      const cart = await createCart(lines);
      await saveCartId(supabase, userId, cart.id);
      return res.json({ success: true, cart });
    }

    const cart = await addCartLines(cartId, lines);
    // Save cart ID in case it wasn't stored yet
    await saveCartId(supabase, userId, cart.id);
    res.json({ success: true, cart });
  } catch (err) {
    console.error('Shopify addCartLines error:', err.message);
    res.status(502).json({ success: false, error: 'Failed to add to cart' });
  }
}

// PUT /api/shopify/cart/lines — update line quantities
// Body: { cartId, lines: [{ lineId, quantity }] }
export async function updateCartLinesHandler(req, res) {
  try {
    const { cartId, lines } = req.body;
    if (!cartId) return res.status(400).json({ success: false, error: 'cartId is required' });
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ success: false, error: 'lines[] is required' });
    }
    const cart = await updateCartLines(cartId, lines);
    res.json({ success: true, cart });
  } catch (err) {
    console.error('Shopify updateCartLines error:', err.message);
    res.status(502).json({ success: false, error: 'Failed to update cart' });
  }
}

// DELETE /api/shopify/cart/lines — remove lines from cart
// Body: { cartId, lineIds: [string] }
export async function removeCartLinesHandler(req, res) {
  try {
    const { cartId, lineIds } = req.body;
    if (!cartId) return res.status(400).json({ success: false, error: 'cartId is required' });
    if (!Array.isArray(lineIds) || lineIds.length === 0) {
      return res.status(400).json({ success: false, error: 'lineIds[] is required' });
    }
    const cart = await removeCartLines(cartId, lineIds);
    res.json({ success: true, cart });
  } catch (err) {
    console.error('Shopify removeCartLines error:', err.message);
    res.status(502).json({ success: false, error: 'Failed to remove from cart' });
  }
}

// ─── Admin: Cache Purge (key-protected) ─────────────────────

// POST /api/admin/cache/purge — { key: string, scope?: 'products' | 'all' }
// Protected by ADMIN_PURGE_KEY env var (shared secret, NOT user auth)
export async function cachePurgeHandler(req, res) {
  const adminKey = process.env.ADMIN_PURGE_KEY;
  if (!adminKey) {
    return res.status(503).json({ success: false, error: 'Cache purge not configured' });
  }

  const { key, scope = 'all' } = req.body;
  if (!key || key !== adminKey) {
    return res.status(403).json({ success: false, error: 'Invalid admin key' });
  }

  const cleared = [];
  if (scope === 'products' || scope === 'all') {
    productCache.clear();
    cleared.push('shopify-products');
  }
  if (scope === 'templates' || scope === 'all') {
    try {
      const { templatesCache } = await import('./templates.js');
      templatesCache.clear();
      cleared.push('templates');
    } catch { /* templates cache not available */ }
  }
  if (scope === 'feed' || scope === 'all') {
    try {
      const { feedCache } = await import('../lib/feedCache.js');
      feedCache.clear();
      cleared.push('feed');
    } catch { /* feed cache not available */ }
  }

  console.log(`[admin] Cache purged: scope=${scope}, cleared=[${cleared.join(',')}]`);

  // Broadcast SSE to all connected clients so they invalidate their client-side cache
  try {
    const { broadcastTemplateUpdate } = await import('./templates.js');
    broadcastTemplateUpdate();
    cleared.push('client-sse');
  } catch { /* SSE broadcast not available */ }

  res.json({ success: true, purged: scope, cleared, timestamp: new Date().toISOString() });
}
