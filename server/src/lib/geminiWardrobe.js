/**
 * Gemini Wardrobe Analysis — Batch garment attribute extraction.
 * See WARDROBE_MODEL.md §3.2 for prompt specification.
 */

import { GoogleGenAI } from '@google/genai';
const logger = { warn: console.warn.bind(console), error: console.error.bind(console) };

const WARDROBE_MODEL = 'gemini-2.0-flash';
const MAX_IMAGES_PER_BATCH = 15;

const LAYER_TYPES = new Set([
  'jacket', 'cardigan', 'shrug', 'blazer', 'hoodie', 'coat', 'vest',
]);

const ANALYSIS_PROMPT = `You are a professional fashion analyst. Analyze each garment image and extract structured attributes.

For EACH image, return a JSON object with exactly these fields:
{
  "garment_type": "<one of: t-shirt, shirt, blouse, crop-top, tank-top, tunic, camisole, jeans, trousers, skirt, shorts, palazzos, leggings, dress, jumpsuit, saree, co-ord-set, romper, jacket, cardigan, shrug, blazer, hoodie, coat, heels, sneakers, flats, boots, sandals, slides, bag, watch, jewelry, glasses, scarf, belt, hair-accessory>",
  "garment_category": "<upperwear | lowerwear | fullbody | footwear | accessory>",
  "primary_color_hex": "<hex code of dominant color>",
  "secondary_color_hex": "<hex code of secondary color, or null>",
  "color_family": "<red | blue | green | yellow | orange | purple | pink | black | white | grey | brown | navy | teal | beige | maroon | olive | coral | lavender | burgundy | cream>",
  "color_temperature": "<warm | cool | neutral>",
  "color_intensity": "<pastel | muted | vibrant | neon | earth>",
  "fit": "<fitted | regular | relaxed | oversized>",
  "fit_silhouette": "<a_line | bodycon | relaxed | structured | flared | straight>",
  "length": "<crop | regular | long | ankle | floor>",
  "waist_position": "<high | mid | low | null>",
  "volume": "<low | medium | high>",
  "fabric": "<cotton | silk | linen | denim | wool | polyester | chiffon | satin | velvet | knit | leather | mesh | nylon | rayon | georgette | crepe>",
  "texture": "<matte | glossy | rough | smooth | knit | velvet | satin>",
  "weight": "<lightweight | midweight | heavyweight>",
  "stretch": <true | false>,
  "opacity": "<opaque | semi-sheer | sheer>",
  "pattern": "<solid | stripes | floral | checks | abstract | geometric | graphic | animal | paisley | polka-dot | camo | tie-dye>",
  "pattern_scale": "<small | medium | large | null>",
  "neckline": "<v-neck | round | square | collar | off-shoulder | halter | mandarin | boat | sweetheart | cowl | null>",
  "sleeve_length": "<sleeveless | cap | short | three-quarter | full | null>",
  "embellishment": "<plain | embroidered | sequin | lace | mirror-work | beaded | printed | applique>",
  "hardware": <true | false>,
  "formality": <0.0 to 1.0>,
  "occasion_tags": ["<from: casual, office, party, date, wedding, festive, brunch, college, concert, gym, beach, travel, mall, religious, funeral>"],
  "aesthetic_tags": ["<from: minimal, coquette, streetwear, y2k, cottagecore, old-money, indie, boho, grunge, preppy, athleisure, ethnic-traditional, indo-western, korean, maximalist, goth, soft-girl, dark-academia>"],
  "season_tags": ["<from: summer, winter, monsoon, spring, autumn, all-season>"],
  "perceived_quality": <0.0 to 1.0>,
  "style_tags": ["<fashion styles: bohemian, casual, ethnic, formal, streetwear, etc. 1-5 values>"],
  "body_type_fit": ["<body types this flatters: hourglass, pear, apple, rectangle, inverted-triangle, etc. 1-5 values>"],
  "skin_tone_complement": ["<skin tones this suits: fair, light, medium, olive, tan, dark, deep. 1-5 values>"],
  "age_group": ["<target demographics from: gen_z, millennial, gen_x, boomer>"],
  "trend_tag": ["<current fashion trends: cottagecore, y2k, quiet_luxury, mob-wife, clean-girl, etc. 1-5 values>"],
  "sustainability": ["<sustainability attributes if any: eco_friendly, handloom, organic, recycled, upcycled, or empty array>"],
  "price_tier": "<budget | mid | premium | luxury>",
  "gender": "<women | men | unisex>",
  "brand_tier": "<mass | bridge | designer | luxury>",
  "layering": "<base | mid | outer>",
  "care_level": "<easy | moderate | delicate>",
  "origin_aesthetic": "<indian | western | korean | mediterranean | bohemian | minimalist>",
  "versatility": "<high | medium | low>"
}

Return a JSON array with one object per image, in the same order as the images provided.
Analyze based on visual evidence only - do not guess brand or exact fabric if not visible.`;

/**
 * Analyze a batch of garment images using Gemini.
 * @param {Array<{id: string, imageUrl: string, imageBuffer?: Buffer}>} garments
 * @returns {Promise<Array<{id: string, attributes: object|null, error: string|null}>>}
 */
export async function analyzeGarmentsBatch(garments) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const ai = new GoogleGenAI({ apiKey });
  const results = [];

  // Split into batches of MAX_IMAGES_PER_BATCH
  for (let i = 0; i < garments.length; i += MAX_IMAGES_PER_BATCH) {
    const batch = garments.slice(i, i + MAX_IMAGES_PER_BATCH);
    const batchResults = await analyzeBatch(ai, batch);
    results.push(...batchResults);
  }

  return results;
}

async function analyzeBatch(ai, garments) {
  const parts = [];

  // Add prompt with image index markers
  let promptWithMarkers = ANALYSIS_PROMPT + '\n\n';
  for (let i = 0; i < garments.length; i++) {
    promptWithMarkers += `Image ${i + 1}: garment_id="${garments[i].id}"\n`;
  }

  parts.push({ text: promptWithMarkers });

  // Add images
  for (const garment of garments) {
    if (garment.imageBuffer) {
      parts.push({
        inlineData: {
          mimeType: 'image/webp',
          data: garment.imageBuffer.toString('base64'),
        },
      });
    } else if (garment.imageUrl) {
      parts.push({
        fileData: {
          fileUri: garment.imageUrl,
          mimeType: 'image/webp',
        },
      });
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: WARDROBE_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      logger.warn('Gemini returned non-array response for garment batch');
      return garments.map(g => ({ id: g.id, attributes: null, error: 'Non-array response' }));
    }

    // Match responses to garments by index
    return garments.map((garment, idx) => {
      const attrs = parsed[idx] || null;
      if (!attrs) {
        return { id: garment.id, attributes: null, error: 'Missing in response' };
      }

      // Post-process: layer reclassification
      if (attrs.garment_category === 'upperwear' && LAYER_TYPES.has(attrs.garment_type)) {
        attrs.garment_category = 'layer';
      }

      return { id: garment.id, attributes: attrs, error: null };
    });
  } catch (err) {
    logger.error(`Gemini garment analysis failed: ${err.message}`);
    return garments.map(g => ({ id: g.id, attributes: null, error: err.message }));
  }
}

/**
 * Parse AI Concierge free-text prompt into structured filters.
 * @param {string} message - User's natural language query
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<object>} Structured filters
 */
export async function parseConciergPrompt(message, conversationHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `You are an AI fashion assistant for a wardrobe app. Parse the user's outfit request into structured filters.

Return a JSON object with any applicable filters (omit fields that aren't mentioned):
{
  "occasion": ["casual", "office", "party", "date", "wedding", "festive", "brunch", "college", "concert", "gym", "beach", "travel"],
  "aesthetic": ["minimal", "coquette", "streetwear", "y2k", "boho", "old-money", "indie", "preppy", "athleisure", "ethnic-traditional", "korean"],
  "season": ["summer", "winter", "monsoon", "spring", "autumn"],
  "color_preference": ["red", "blue", "black", "white", "neutral", "bright", "pastel"],
  "formality_min": 0.0,
  "formality_max": 1.0,
  "garment_types": ["dress", "jeans", "blazer"],
  "mood": "description of the vibe they want"
}

Consider conversation history for context. Only return the JSON, no explanation.`;

  const historyParts = conversationHistory.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const response = await ai.models.generateContent({
      model: WARDROBE_MODEL,
      contents: [
        ...historyParts,
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser message: "${message}"` }] },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '{}';
    return JSON.parse(text);
  } catch (err) {
    logger.error(`Concierge prompt parsing failed: ${err.message}`);
    return {};
  }
}
