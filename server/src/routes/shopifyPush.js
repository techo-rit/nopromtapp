/**
 * Shopify Push — Push Supabase templates to Shopify as products
 *
 * POST /api/admin/shopify-push       — Push all active templates
 * POST /api/admin/shopify-push/:id   — Push a single template
 *
 * Creates new products or updates existing ones.
 * Template.id is used as the Shopify handle.
 */

import { createAdminClient, verifyAdmin } from '../lib/auth.js';
import { shopifyAdminFetch } from '../lib/shopify.js';

// ─── GraphQL Mutations ──────────────────────────────────────

const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      status
      variants(first: 1) {
        nodes { id }
      }
    }
  }
`;

const PRODUCT_CREATE_MUTATION = `
  mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product {
        id
        handle
        title
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PRODUCT_UPDATE_MUTATION = `
  mutation productUpdate($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
    productUpdate(product: $product, media: $media) {
      product {
        id
        handle
        title
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const VARIANT_UPDATE_MUTATION = `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// ─── Template → Shopify mapping ─────────────────────────────

function templateToProductInput(template) {
  const product = {
    handle: template.id,
    title: template.title || template.id,
    status: template.is_active ? 'ACTIVE' : 'DRAFT',
  };

  if (template.description) {
    product.descriptionHtml = template.description;
  }

  // Map tags — deduplicated
  const tags = [];
  if (Array.isArray(template.tags)) tags.push(...template.tags);
  if (template.garment_type) tags.push(template.garment_type);
  if (template.garment_category) tags.push(template.garment_category);
  if (Array.isArray(template.occasion)) tags.push(...template.occasion);
  if (Array.isArray(template.style_tags)) tags.push(...template.style_tags);
  if (Array.isArray(template.season)) tags.push(...template.season);
  product.tags = [...new Set(tags)];

  if (template.garment_category) {
    product.productType = template.garment_category;
  }

  return product;
}

function templateToMedia(template) {
  if (!template.image) return [];
  const imageUrl = template.image.startsWith('http')
    ? template.image
    : `https://stiri.in${template.image}`;
  return [{
    originalSource: imageUrl,
    alt: template.title || template.id,
    mediaContentType: 'IMAGE',
  }];
}

// ─── Core push logic ────────────────────────────────────────

async function pushTemplateToShopify(template) {
  const handle = template.id;

  // Check if product already exists
  let existing = null;
  try {
    const data = await shopifyAdminFetch(PRODUCT_BY_HANDLE_QUERY, { handle });
    existing = data?.productByHandle || null;
  } catch {
    // Product doesn't exist — will create
  }

  const product = templateToProductInput(template);
  const media = templateToMedia(template);

  if (existing) {
    // Update existing product
    product.id = existing.id;
    delete product.handle; // can't update handle
    const result = await shopifyAdminFetch(PRODUCT_UPDATE_MUTATION, { product, media });
    const errors = result?.productUpdate?.userErrors || [];
    if (errors.length > 0) {
      return { handle, action: 'update', success: false, errors };
    }

    // Update variant price if we have one
    const variantId = existing.variants?.nodes?.[0]?.id;
    if (variantId && template.min_price != null) {
      const priceRupees = (template.min_price / 100).toFixed(2);
      try {
        await shopifyAdminFetch(VARIANT_UPDATE_MUTATION, {
          productId: existing.id,
          variants: [{ id: variantId, price: priceRupees }],
        });
      } catch (err) {
        console.warn(`[shopify-push] Variant price update failed for ${handle}:`, err.message);
      }
    }

    return {
      handle,
      action: 'update',
      success: true,
      shopifyId: result.productUpdate.product.id,
    };
  } else {
    // Create new product
    const result = await shopifyAdminFetch(PRODUCT_CREATE_MUTATION, { product, media });
    const errors = result?.productCreate?.userErrors || [];
    if (errors.length > 0) {
      return { handle, action: 'create', success: false, errors };
    }
    return {
      handle,
      action: 'create',
      success: true,
      shopifyId: result.productCreate.product.id,
    };
  }
}

// ─── Route Handlers ─────────────────────────────────────────

/**
 * POST /api/admin/shopify-push — Push all active templates to Shopify
 */
export async function pushAllHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const supabase = createAdminClient();
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_active', true);

    if (error) throw new Error(`DB fetch failed: ${error.message}`);
    if (!templates?.length) {
      return res.json({ ok: true, total: 0, pushed: 0, errors: 0, results: [] });
    }

    let pushed = 0;
    let errors = 0;
    const results = [];

    for (const template of templates) {
      try {
        const result = await pushTemplateToShopify(template);
        if (result.success) pushed++;
        else errors++;
        results.push(result);
      } catch (err) {
        errors++;
        results.push({ handle: template.id, success: false, error: err.message });
      }
    }

    return res.json({ ok: true, total: templates.length, pushed, errors, results });
  } catch (err) {
    console.error('[shopify-push] Full push error:', err.message);
    return res.status(500).json({ error: 'Push failed', message: err.message });
  }
}

/**
 * POST /api/admin/shopify-push/:id — Push a single template to Shopify
 */
export async function pushSingleHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Template id required' });

    const supabase = createAdminClient();
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const result = await pushTemplateToShopify(template);
    return res.json({ ok: result.success, ...result });
  } catch (err) {
    console.error('[shopify-push] Single push error:', err.message);
    return res.status(500).json({ error: 'Push failed', message: err.message });
  }
}
