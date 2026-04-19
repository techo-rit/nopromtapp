/**
 * Product Sync — Gemini AI tag generation for templates
 *
 * Reads templates from Supabase, uses Gemini to classify each into
 * 30 style dimensions, and enriches with Shopify price data.
 * Tags are stored directly on the templates table.
 *
 * Reference: docs/PERSONALIZATION_MODEL.md §4, §15
 */

import { GoogleGenAI } from '@google/genai';
import { shopifyFetch } from './shopify.js';

const TAG_MODEL = 'gemini-3.1-flash-image-preview';

// Fields stored as arrays on the templates table
const ARRAY_FIELDS = new Set([
  'color_family', 'style_tags', 'size_range', 'body_type_fit',
  'skin_tone_complement', 'age_group', 'occasion', 'season',
  'trend_tag', 'sustainability',
]);

const SCALAR_FIELDS = [
  'garment_type', 'garment_category', 'fit_silhouette', 'pattern',
  'fabric', 'price_tier', 'gender', 'neckline', 'sleeve_length',
  'length', 'embellishment', 'brand_tier', 'color_intensity',
  'layering', 'care_level', 'origin_aesthetic',
  'transparency', 'versatility',
];

const TAG_PROMPT = `You are a fashion product tagging expert for an Indian fashion marketplace. Analyze the product image carefully and generate structured metadata for personalization.

Return ONLY a valid JSON object with these exact keys.

**Product metadata** (generated from the image):
- title: A concise, appealing product title (e.g. "Emerald Silk Palazzo Set")
- description: A 1-2 sentence product description highlighting key visual features, fabric feel, and styling appeal
- tags: string array of 3-8 searchable keywords (e.g. ["palazzo","silk","green","party wear","ethnic"])

**Array fields** (string arrays, 1-5 values each):
- color_family: primary/secondary colors, e.g. ["red","maroon"]
- style_tags: fashion styles, e.g. ["bohemian","casual","ethnic"]
- size_range: available sizes, default ["XS","S","M","L","XL"]
- body_type_fit: body types this flatters, e.g. ["hourglass","pear"]
- skin_tone_complement: skin tones this suits, e.g. ["fair","medium","dark"]
- age_group: target demos from [gen_z, millennial, gen_x, boomer]
- occasion: when to wear, e.g. ["party","casual","festive","work"]
- season: seasonal fit, e.g. ["summer","monsoon","winter","all_season"]
- trend_tag: fashion trends, e.g. ["cottagecore","y2k","quiet_luxury"]
- sustainability: attributes if any, e.g. ["eco_friendly","handloom"]

**Scalar fields** (single string each):
- garment_type: dress|top|bottom|saree|lehenga|kurta|jumpsuit|co_ord|jacket
- garment_category: ethnic|western|fusion|loungewear|activewear|bridal
- fit_silhouette: a_line|bodycon|relaxed|structured|flared|straight
- pattern: floral|solid|geometric|abstract|printed|striped|checkered
- fabric: cotton|silk|chiffon|denim|georgette|crepe|linen|velvet|net
- price_tier: budget|mid|premium|luxury
- gender: women|men|unisex
- neckline: v_neck|round|boat|sweetheart|collar|halter|off_shoulder
- sleeve_length: sleeveless|short|three_quarter|full|cap
- length: mini|midi|maxi|cropped|knee|ankle|floor
- embellishment: embroidered|sequined|plain|printed|mirror_work|zari
- brand_tier: mass|bridge|designer|luxury
- color_intensity: pastel|bright|muted|dark|neon
- layering: base|mid|outer
- care_level: easy|moderate|delicate
- origin_aesthetic: indian|western|korean|mediterranean|bohemian|minimalist
- weight: lightweight|medium|heavy
- transparency: opaque|semi_sheer|sheer
- versatility: high|medium|low

**Boolean**:
- is_new_arrival: true if the item was created within 7 days, else false
`;


// ── Gemini Tag Generation ──────────────────────────────────────

/**
 * Use Gemini to classify a template into 30 style dimensions.
 * Sends the product image to the vision model; Gemini returns
 * title, description, tags, and all classification dimensions.
 */
async function generateTagsWithGemini(ai, template) {
  const parts = [];

  // Include the product image for visual classification
  if (template.image) {
    const imageUrl = template.image.startsWith('http')
      ? template.image
      : `https://stiri.in${template.image}`;
    const imgRes = await fetch(imageUrl);
    if (imgRes.ok) {
      const buf = Buffer.from(await imgRes.arrayBuffer());
      parts.push({
        inlineData: { data: buf.toString('base64'), mimeType: 'image/webp' },
      });
    }
  }

  parts.push({
    text: TAG_PROMPT + `\n\nCreated: ${template.created_at || 'unknown'}`,
  });

  const response = await ai.models.generateContent({
    model: TAG_MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json' },
  });

  const tags = JSON.parse(response.text);
  const result = {};

  // Product metadata from Gemini
  if (tags.title) result.title = String(tags.title);
  if (tags.description) result.description = String(tags.description);
  if (Array.isArray(tags.tags)) result.tags = tags.tags.map(String).slice(0, 8);

  for (const field of ARRAY_FIELDS) {
    result[field] = Array.isArray(tags[field])
      ? tags[field].map(String).slice(0, 5)
      : [];
  }

  for (const field of SCALAR_FIELDS) {
    if (tags[field] != null) result[field] = String(tags[field]);
  }

  result.is_new_arrival = tags.is_new_arrival === true;

  // Map 'weight' from AI output to 'template_weight' column (avoids col name conflict)
  if (tags.weight != null) result.template_weight = String(tags.weight);

  return result;
}


// ── Shopify Price Enrichment ───────────────────────────────────

const PRICE_QUERY = `
  query ProductPrice($handle: String!) {
    productByHandle(handle: $handle) {
      availableForSale
      priceRange {
        minVariantPrice { amount }
        maxVariantPrice { amount }
      }
    }
  }
`;

async function fetchShopifyPrice(handle) {
  try {
    const data = await shopifyFetch(PRICE_QUERY, { handle });
    const p = data?.productByHandle;
    if (!p) return {};

    return {
      available_for_sale: p.availableForSale ?? true,
      min_price: p.priceRange?.minVariantPrice?.amount
        ? Math.round(Number(p.priceRange.minVariantPrice.amount) * 100)
        : null,
      max_price: p.priceRange?.maxVariantPrice?.amount
        ? Math.round(Number(p.priceRange.maxVariantPrice.amount) * 100)
        : null,
    };
  } catch (err) {
    console.warn(`[productSync] Price fetch failed for ${handle}:`, err.message);
    return {};
  }
}


// ── Sync Logic ─────────────────────────────────────────────────

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenAI({ apiKey });
}

/**
 * Sync a single template — generate AI tags + fetch Shopify price.
 * Updates the template row directly.
 * @param {object} supabase - admin Supabase client
 * @param {string} templateId - template.id (= Shopify handle)
 */
export async function syncSingleTemplate(supabase, templateId) {
  const { data: template, error: fetchErr } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (fetchErr || !template) {
    return { synced: false, templateId, error: fetchErr?.message || 'Not found' };
  }

  const ai = createGeminiClient();
  const tags = await generateTagsWithGemini(ai, template);
  const priceData = await fetchShopifyPrice(templateId);

  const update = {
    ...tags,
    ...priceData,
    tags_synced_at: new Date().toISOString(),
  };

  const { error: updateErr } = await supabase
    .from('templates')
    .update(update)
    .eq('id', templateId);

  if (updateErr) {
    return { synced: false, templateId, error: updateErr.message };
  }

  return { synced: true, templateId };
}

/**
 * Full sync — process all active templates through Gemini + Shopify price.
 * Updates templates table directly.
 * @param {object} supabase - admin Supabase client
 */
export async function syncAllTemplates(supabase) {
  const { data: templates, error } = await supabase
    .from('templates')
    .select('*')
    .eq('is_active', true);

  if (error) throw new Error(`Failed to fetch templates: ${error.message}`);

  const ai = createGeminiClient();
  let synced = 0;
  let errors = 0;
  const failures = [];

  for (const template of templates || []) {
    try {
      const tags = await generateTagsWithGemini(ai, template);
      const priceData = await fetchShopifyPrice(template.id);

      const update = {
        ...tags,
        ...priceData,
        tags_synced_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase
        .from('templates')
        .update(update)
        .eq('id', template.id);

      if (updateErr) {
        errors++;
        failures.push({ id: template.id, error: updateErr.message });
      } else {
        synced++;
      }
    } catch (err) {
      errors++;
      failures.push({ id: template.id, error: err.message });
    }
  }

  return {
    total: (templates || []).length,
    synced,
    errors,
    failures: failures.slice(0, 10),
  };
}
