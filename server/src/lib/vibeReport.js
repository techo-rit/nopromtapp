/**
 * Vibe Report Engine — Editorial-tone outfit descriptions.
 * Zero AI cost — uses curated title bank + sentence templates.
 * See WARDROBE_MODEL.md §5 for specification.
 */

// ────────────────────────────────────────────────────────────────────
// Deterministic hash for pseudo-random template selection
// ────────────────────────────────────────────────────────────────────

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mode(arr) {
  if (!arr || arr.length === 0) return null;
  const counts = {};
  arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

function formatGarmentType(type) {
  if (!type) return 'piece';
  return type.replace(/-/g, ' ');
}

// ────────────────────────────────────────────────────────────────────
// Vibe Title Bank — keyed by {occasion}_{aesthetic}_{formality_bucket}
// ────────────────────────────────────────────────────────────────────

const VIBE_TITLES = {
  // Casual
  'casual_minimal_low':    ['Off-Duty Clean', 'Effortless Everyday', 'Quiet Confidence', 'Monday Reset'],
  'casual_minimal_mid':    ['Understated Power', 'Clean Slate Energy', 'Less is Literally More'],
  'casual_streetwear_low': ['Streets Ahead', 'Concrete Jungle Ready', 'Main Character Walk'],
  'casual_coquette_low':   ['Soft Girl Hours', 'Pretty & Unbothered', 'Bow Season'],
  'casual_boho_low':       ['Free Spirit Fridays', 'Wander Mood', 'Earthy & Easy'],
  'casual_korean_low':     ['Seoul Stroll', 'K-Clean Casual', 'Soft Focus'],
  'casual_athleisure_low': ['Gym to Brunch', 'Active Vibes Only', 'Sporty & Put Together'],

  // Office
  'office_minimal_mid':    ['Board Room Energy', 'Quiet Authority', 'Less Talk, More Style'],
  'office_old-money_mid':  ['Trust Fund Tuesdays', 'Old Money Mondays', 'Inherited Taste'],
  'office_preppy_mid':     ['Campus to Corner Office', 'Prep School Polished', 'Smart Casual Done Right'],
  'office_minimal_high':   ['Power Minimalist', 'Executive Clean', 'Corner Office Energy'],

  // Party / Night Out
  'party_coquette_mid':    ['He Won\'t Recover', 'Main Event Energy', 'Pink Fever'],
  'party_coquette_high':   ['Siren Mode', 'Dressed to Devastate', 'All Eyes On You'],
  'party_streetwear_mid':  ['After Dark Streetwear', 'Club Ready', 'Night Shift Drip'],
  'party_y2k_mid':         ['Y2K After Hours', '2000s Revival', 'Nostalgia Night'],
  'party_maximalist_mid':  ['More is More', 'Statement Night', 'Go Big Energy'],
  'party_minimal_mid':     ['Understated Entrance', 'Less is Luxe', 'Quiet Slay'],
  'party_minimal_high':    ['Silent Killer', 'Midnight Minimalist', 'Dark & Devastating'],

  // Date
  'date_minimal_mid':      ['First Date Clean', 'Effortlessly Into You', 'Subtle Flex'],
  'date_coquette_mid':     ['Butterflies & Bows', 'Soft Power Date', 'He\'s Paying'],
  'date_old-money_mid':    ['Old Money Romance', 'Country Club Date', 'Classic Chemistry'],
  'date_boho_mid':         ['Sunset Date Vibes', 'Romantic Wanderer', 'Candlelit Boho'],

  // Festive / Wedding
  'festive_ethnic-traditional_high': ['Festival Queen', 'Heritage Glow', 'Tradition Redefined'],
  'festive_indo-western_high':       ['Fusion Festive', 'Modern Tradition', 'East Meets Best'],
  'wedding_ethnic-traditional_high': ['Wedding Ready', 'Guest of Honor', 'Celebration Mode'],
  'wedding_minimal_high':            ['Modern Elegance', 'Less is Luxe', 'Refined Presence'],

  // College / Brunch
  'college_streetwear_low':  ['Campus Legend', 'Lecture Hall Drip', 'Study Break Style'],
  'college_minimal_low':     ['Clean Campus', 'Study Chic', 'Library to Lunch'],
  'brunch_boho_low':         ['Sunday Best', 'Brunch Club', 'Mimosa Ready'],
  'brunch_coquette_low':     ['Brunch Princess', 'Pink Sunday', 'Café Culture'],
  'brunch_minimal_mid':      ['Clean Brunch', 'Avocado Toast Energy', 'Weekend Reset'],

  // Travel
  'travel_minimal_low':      ['Pack Light, Look Right', 'Terminal Style', 'Wanderlust Ready'],
  'travel_athleisure_low':   ['Comfortable & Cool', 'Long-Haul Chic', 'Mile High Style'],

  // Concert
  'concert_streetwear_low':  ['Mosh Pit Ready', 'Front Row Energy', 'Sound Check Style'],
  'concert_y2k_mid':         ['Festival Circuit', 'Main Stage Y2K', 'Rave Revival'],
  'concert_grunge_low':      ['Grunge Revival', 'Underground Sound', 'Raw & Real'],
};

// ────────────────────────────────────────────────────────────────────
// "Why This Works" Sentence Templates
// ────────────────────────────────────────────────────────────────────

const WHY_TEMPLATES = {
  color_harmony: [
    'The {colorA} and {colorB} create a {harmony_type} palette that feels intentional, not accidental.',
    'Pairing {colorA} with {colorB} is a classic {harmony_type} combination — it draws the eye without overwhelming.',
    'This {harmony_type} color story ({colorA} meets {colorB}) sets a {mood} tone instantly.',
    'The {colorA}-{colorB} interplay grounds the outfit in a cohesive {mood} palette.',
    'Color-wise, this is a masterclass: {colorA} anchors while {colorB} adds dimension.',
    '{colorA} paired with {colorB} — the color wheel approves and so does the mirror.',
  ],
  silhouette_balance: [
    'The {fitA} {garmentA} against the {fitB} {garmentB} creates a proportional contrast that flatters.',
    'Volume play: the {fitA} top balances the {fitB} bottom for a polished silhouette.',
    'This pairing works because {fitA} on top and {fitB} below creates visual rhythm.',
    'The mix of {fitA} and {fitB} creates that effortless "I just threw this on" silhouette.',
    'Proportion perfection — the {fitA} {garmentA} lets the {fitB} {garmentB} take center stage.',
  ],
  body_proportion: [
    'This combination naturally draws attention to {feature}, creating a balanced line.',
    'The {lengthA} top with {lengthB} bottom defines {body_type} proportions beautifully.',
    'The {waist_effect} effect emphasizes the right lines for your frame.',
    'Strategically structured — the silhouette works with your body, not against it.',
  ],
  texture_contrast: [
    'The {textureA} {fabricA} against {textureB} {fabricB} adds tactile dimension you can almost feel.',
    'Mixing {textureA} and {textureB} textures is what takes this from good to editorial.',
    '{fabricA} meets {fabricB} — the texture contrast creates visual depth and interest.',
    'This {fabricA}-{fabricB} combination adds a sensory richness that solid textures can\'t match.',
  ],
};

// ────────────────────────────────────────────────────────────────────
// Accessory Suggestion Fallbacks
// ────────────────────────────────────────────────────────────────────

const NEUTRALS = new Set(['black', 'white', 'grey', 'beige', 'cream']);

const ACCESSORY_SUGGESTIONS = {
  'minimal_low':  ['Simple chain necklace', 'Clean white sneakers', 'Minimal tote bag'],
  'minimal_mid':  ['Dainty gold bracelet', 'Pointed flats', 'Structured mini bag'],
  'minimal_high': ['Statement watch', 'Classic pumps', 'Sleek clutch'],
  'streetwear_low': ['Chunky sneakers', 'Bucket hat', 'Crossbody bag'],
  'coquette_low':  ['Hair bow', 'Ballet flats', 'Pearl earrings'],
  'coquette_mid':  ['Ribbon choker', 'Mary Janes', 'Heart-shaped bag'],
  'old-money_mid': ['Gold studs', 'Loafers', 'Leather belt'],
  'old-money_high':['Pearl necklace', 'Kitten heels', 'Envelope clutch'],
  'boho_low':      ['Layered bracelets', 'Woven sandals', 'Fringe bag'],
  'ethnic-traditional_high': ['Statement jhumkas', 'Embroidered mojaris', 'Potli bag'],
  'indo-western_high':       ['Contemporary earrings', 'Block heels', 'Box clutch'],
  'korean_low':    ['Tiny studs', 'Platform sneakers', 'Canvas tote'],
  'athleisure_low':['Sport watch', 'Running shoes', 'Gym duffle'],
  'preppy_mid':    ['Headband', 'Loafers', 'Structured bag'],
  'grunge_low':    ['Chain necklace', 'Combat boots', 'Distressed backpack'],
  'y2k_mid':       ['Butterfly clips', 'Platform sandals', 'Mini shoulder bag'],
};

// ────────────────────────────────────────────────────────────────────
// Helper functions for template slot-filling
// ────────────────────────────────────────────────────────────────────

function detectHarmonyType(A, B) {
  if (!A || !B) return 'tonal';
  const isNeutralA = NEUTRALS.has(A.color_family);
  const isNeutralB = NEUTRALS.has(B.color_family);
  if (isNeutralA && isNeutralB) return 'neutral';
  if (isNeutralA || isNeutralB) return 'grounded';
  return 'complementary';
}

function deriveMood(outfit) {
  const garments = outfit.garments || [];
  const avgFormality = garments.reduce((s, g) => s + (g.formality || 0.5), 0) / (garments.length || 1);
  if (avgFormality < 0.3) return 'relaxed';
  if (avgFormality < 0.5) return 'casual';
  if (avgFormality < 0.7) return 'polished';
  return 'refined';
}

function detectWaistEffect(outfit) {
  const garments = outfit.garments || [];
  const top = garments.find(g => g.garment_category === 'upperwear');
  const bottom = garments.find(g => g.garment_category === 'lowerwear');
  if (top?.length === 'crop' && bottom?.waist_position === 'high') return 'waist-defining';
  if (bottom?.waist_position === 'high') return 'elongating';
  return 'balanced';
}

function fillSlots(template, outfit) {
  const garments = outfit.garments || [];
  const primary = garments.find(g => g.garment_category === 'upperwear') || garments[0];
  const secondary = garments.find(g => g.garment_category === 'lowerwear') || garments[1];

  return template
    .replace('{colorA}', primary?.color_family || 'dark')
    .replace('{colorB}', secondary?.color_family || 'light')
    .replace('{fitA}', primary?.fit || 'relaxed')
    .replace('{fitB}', secondary?.fit || 'fitted')
    .replace('{garmentA}', formatGarmentType(primary?.garment_type))
    .replace('{garmentB}', formatGarmentType(secondary?.garment_type))
    .replace('{textureA}', primary?.texture || 'smooth')
    .replace('{textureB}', secondary?.texture || 'matte')
    .replace('{fabricA}', primary?.fabric || 'cotton')
    .replace('{fabricB}', secondary?.fabric || 'linen')
    .replace('{lengthA}', primary?.length || 'regular')
    .replace('{lengthB}', secondary?.length || 'regular')
    .replace('{harmony_type}', detectHarmonyType(primary, secondary))
    .replace('{mood}', deriveMood(outfit))
    .replace('{body_type}', 'your')
    .replace('{feature}', 'waist')
    .replace('{waist_effect}', detectWaistEffect(outfit));
}


// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export function generateVibeReport(outfit, garments, userProfile, userAccessories) {
  const outfitWithGarments = { ...outfit, garments };

  // 1. Resolve vibe title
  const title = resolveVibeTitle(outfitWithGarments);

  // 2. Generate "Why This Works" text
  const why = generateWhyThisWorks(outfitWithGarments, outfit);

  // 3. Best occasions (top 3 from intersection)
  const occasions = resolveOccasions(garments);

  // 4. Accessory suggestions
  const accessories = suggestAccessories(outfitWithGarments, userAccessories || []);

  // 5. Match percentage
  const matchPct = Math.round(outfit.personalization_score || outfit.harmony_score || 50);

  return { title, why, occasions, accessories, match_pct: matchPct };
}


function resolveVibeTitle(outfit) {
  const garments = outfit.garments || [];
  const allOccasions = garments.flatMap(g => g.occasion_tags || []);
  const primaryOccasion = mode(allOccasions) || 'casual';

  const allAesthetics = garments.flatMap(g => g.aesthetic_tags || []);
  const primaryAesthetic = mode(allAesthetics) || 'minimal';

  const avgFormality = garments.reduce((s, g) => s + (g.formality || 0.5), 0) / (garments.length || 1);
  const formalityBucket = avgFormality < 0.35 ? 'low' : avgFormality < 0.7 ? 'mid' : 'high';

  const key = `${primaryOccasion}_${primaryAesthetic}_${formalityBucket}`;
  const titles = VIBE_TITLES[key];

  if (titles && titles.length > 0) {
    const hash = simpleHash(outfit.id || 'default');
    return titles[hash % titles.length];
  }

  return `${capitalize(primaryAesthetic)} ${capitalize(primaryOccasion)} Energy`;
}


function generateWhyThisWorks(outfit, scores) {
  const dimensionScores = [
    { dim: 'color', score: scores.color_harmony || 0, templates: WHY_TEMPLATES.color_harmony },
    { dim: 'silhouette', score: scores.silhouette_balance || 0, templates: WHY_TEMPLATES.silhouette_balance },
    { dim: 'body', score: scores.silhouette_balance || 0, templates: WHY_TEMPLATES.body_proportion },
    { dim: 'texture', score: scores.fabric_compatibility || 0, templates: WHY_TEMPLATES.texture_contrast },
  ].sort((a, b) => b.score - a.score);

  const top2 = dimensionScores.slice(0, 2);

  const sentences = top2.map(({ dim, templates }) => {
    const template = templates[simpleHash((outfit.id || '') + dim) % templates.length];
    return fillSlots(template, outfit);
  });

  return sentences.join(' ');
}


function resolveOccasions(garments) {
  let commonOccasions;
  for (const g of garments) {
    const tags = new Set(g.occasion_tags || []);
    if (!commonOccasions) {
      commonOccasions = tags;
    } else {
      commonOccasions = new Set([...commonOccasions].filter(t => tags.has(t)));
    }
  }

  if (!commonOccasions || commonOccasions.size === 0) {
    // Fall back to most frequent tags
    const all = garments.flatMap(g => g.occasion_tags || []);
    const counts = {};
    all.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  }

  return [...commonOccasions].slice(0, 3);
}


function suggestAccessories(outfit, userAccessories) {
  const garments = outfit.garments || [];
  const primaryAesthetic = mode(garments.flatMap(g => g.aesthetic_tags || [])) || 'minimal';
  const avgFormality = garments.reduce((s, g) => s + (g.formality || 0.5), 0) / (garments.length || 1);
  const formalityBucket = avgFormality < 0.35 ? 'low' : avgFormality < 0.7 ? 'mid' : 'high';

  // Check user's own accessories
  if (userAccessories.length > 0) {
    const outfitColors = garments.map(g => g.color_family);
    const matchingOwned = userAccessories.filter(acc => {
      const colorMatch = outfitColors.includes(acc.color_family) || NEUTRALS.has(acc.color_family);
      const aestheticMatch = (acc.aesthetic_tags || []).some(a =>
        garments.some(g => (g.aesthetic_tags || []).includes(a))
      );
      return colorMatch || aestheticMatch;
    });

    if (matchingOwned.length >= 2) {
      return matchingOwned.slice(0, 3).map(a => formatGarmentType(a.garment_type));
    }
  }

  // Fallback to curated suggestions
  const key = `${primaryAesthetic}_${formalityBucket}`;
  return ACCESSORY_SUGGESTIONS[key] || ['Simple jewelry', 'Clean sneakers', 'Minimal bag'];
}
