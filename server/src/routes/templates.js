import { createAdminClient } from '../lib/auth.js';
import { createTtlCache } from '../lib/cache.js';
import { getProductsByHandles, getProductByHandle } from '../lib/shopify.js';

const TEMPLATES_CACHE_TTL = 60 * 1000; // 60 seconds — keep in sync with feed cache
const cache = createTtlCache(TEMPLATES_CACHE_TTL);

// Expose for admin cache purge
export { cache as templatesCache };

/**
 * Enrich templates with Shopify price data (server-side join).
 * Fails gracefully — returns templates without prices if Shopify is down.
 */
async function enrichTemplatesWithPrices(templates) {
  if (!templates || templates.length === 0) return templates;

  const handles = templates.map((t) => t.id);

  try {
    // Batch in chunks of 25 (Shopify alias limit)
    const products = [];
    for (let i = 0; i < handles.length; i += 25) {
      const chunk = handles.slice(i, i + 25);
      const batch = await getProductsByHandles(chunk);
      products.push(...batch);
    }

    // Build handle → product map for O(1) lookup
    const productMap = new Map();
    for (const p of products) {
      productMap.set(p.handle, p);
    }

    // Merge price data into each template
    return templates.map((t) => {
      const product = productMap.get(t.id);
      if (!product) return t;

      const firstVariant = product.variants?.[0];
      return {
        ...t,
        price: firstVariant?.price || product.priceRange?.minVariantPrice || null,
        compare_at_price: firstVariant?.compareAtPrice || product.compareAtPriceRange?.minVariantPrice || null,
        available_for_sale: product.availableForSale ?? true,
      };
    });
  } catch (err) {
    console.warn('[templates] Shopify enrichment failed, returning templates without prices:', err.message);
    return templates;
  }
}

/**
 * Enrich a single template with full Shopify product data.
 */
async function enrichTemplateWithProduct(template) {
  if (!template) return template;

  try {
    const product = await getProductByHandle(template.id);
    if (!product) return template;

    const firstVariant = product.variants?.[0];
    return {
      ...template,
      price: firstVariant?.price || product.priceRange?.minVariantPrice || null,
      compare_at_price: firstVariant?.compareAtPrice || product.compareAtPriceRange?.minVariantPrice || null,
      available_for_sale: product.availableForSale ?? true,
      shopify_product: product,
    };
  } catch (err) {
    console.warn('[templates] Shopify single enrichment failed:', err.message);
    return template;
  }
}

// ─── SSE: broadcast template changes to connected clients ───
const sseClients = new Set();
let _realtimeChannel = null;

export function broadcastTemplateUpdate() {
  cache.clear();
  const msg = `data: ${JSON.stringify({ type: 'update', ts: Date.now() })}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { sseClients.delete(res); }
  }
}

/** Start Supabase Realtime listener (called once at boot) */
export function startTemplateRealtime() {
  if (_realtimeChannel) return;
  const supabase = createAdminClient();
  if (!supabase) {
    console.warn('[templates] No Supabase client — realtime disabled');
    return;
  }
  _realtimeChannel = supabase
    .channel('templates_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, () => {
      console.log('[templates] Realtime change detected — broadcasting');
      broadcastTemplateUpdate();
    })
    .subscribe((status) => {
      console.log('[templates] Realtime subscription status:', status);
    });
}

/**
 * GET /api/templates/stream
 * SSE — pushes { type: 'update' } whenever the templates table changes.
 */
export function templatesStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  // Send initial heartbeat
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  sseClients.add(res);
  req.on('close', () => { sseClients.delete(res); });
}

/**
 * GET /api/templates
 * Public — returns active templates.
 */
export async function listTemplates(req, res) {
  try {
    const cacheKey = 'templates:all';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const supabase = createAdminClient();
    if (!supabase) return res.status(503).json({ error: 'Database unavailable' });

    let query = supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('trending_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    const enriched = await enrichTemplatesWithPrices(data || []);
    const result = { templates: enriched };
    cache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error('[templates] list error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
}

/**
 * GET /api/templates/trending
 * Public — returns only trending templates in order.
 */
export async function listTrendingTemplates(req, res) {
  try {
    const cacheKey = 'templates:trending';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const supabase = createAdminClient();
    if (!supabase) return res.status(503).json({ error: 'Database unavailable' });

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .eq('trending', true)
      .order('trending_order', { ascending: true });

    if (error) throw error;

    const enriched = await enrichTemplatesWithPrices(data || []);
    const result = { templates: enriched };
    cache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error('[templates] trending error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch trending templates' });
  }
}

/**
 * GET /api/templates/:id
 * Public — returns a single template by ID.
 */
export async function getTemplate(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing template id' });

    const cacheKey = `template:${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const supabase = createAdminClient();
    if (!supabase) return res.status(503).json({ error: 'Database unavailable' });

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const enriched = await enrichTemplateWithProduct(data);
    cache.set(cacheKey, enriched);
    return res.json(enriched);
  } catch (err) {
    console.error('[templates] get error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch template' });
  }
}
