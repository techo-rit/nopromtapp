/**
 * Outfit Pairing Algorithm — Two-phase: compatibility filter → harmony scorer.
 * See WARDROBE_MODEL.md §4 for full specification.
 */

// ────────────────────────────────────────────────────────────────────
// Constants & Lookup Tables
// ────────────────────────────────────────────────────────────────────

const WEIGHT_MAP = { lightweight: 1, midweight: 2, heavyweight: 3 };

const FIT_SCORES = {
  'fitted_relaxed': 0.95,   'fitted_regular': 0.85,
  'fitted_fitted': 0.70,    'fitted_oversized': 0.90,
  'regular_regular': 0.75,  'regular_relaxed': 0.80,
  'regular_fitted': 0.80,   'regular_oversized': 0.65,
  'relaxed_fitted': 0.95,   'relaxed_regular': 0.80,
  'relaxed_relaxed': 0.55,  'relaxed_oversized': 0.40,
  'oversized_fitted': 0.90, 'oversized_regular': 0.75,
  'oversized_relaxed': 0.45,'oversized_oversized': 0.35,
};

const LENGTH_BONUSES = {
  'crop_high': 0.15,
  'regular_high': 0.10,
  'crop_mid': 0.05,
};

const NEUTRALS = new Set(['black', 'white', 'grey', 'beige', 'cream']);

const AESTHETIC_COMPAT = {
  'minimal_coquette': 0.60,
  'streetwear_y2k': 0.65,
  'boho_cottagecore': 0.70,
  'old-money_preppy': 0.75,
  'minimal_old-money': 0.70,
  'indie_grunge': 0.65,
  'athleisure_streetwear': 0.70,
  'korean_minimal': 0.65,
  'ethnic-traditional_indo-western': 0.60,
  'soft-girl_coquette': 0.70,
  'dark-academia_preppy': 0.65,
  'maximalist_boho': 0.60,
};

const TEXTURE_COMPAT = {
  'matte_glossy': 0.85,
  'matte_matte': 0.70,
  'rough_smooth': 0.85,
  'smooth_smooth': 0.75,
  'knit_smooth': 0.80,
  'velvet_smooth': 0.85,
  'satin_matte': 0.90,
  'velvet_matte': 0.80,
  'knit_matte': 0.75,
  'satin_smooth': 0.80,
};

const CURRENT_TRENDS = new Set([
  'quiet-luxury', 'old-money', 'coquette', 'mob-wife',
  'coastal-grandmother', 'clean-girl', 'tomato-girl',
]);

const OPPOSED_SEASONS = [
  ['summer', 'winter'],
  ['summer', 'monsoon'],
];

const LAYER_TYPES = new Set([
  'jacket', 'cardigan', 'shrug', 'blazer', 'hoodie', 'coat', 'vest',
]);


// ────────────────────────────────────────────────────────────────────
// Color Utilities
// ────────────────────────────────────────────────────────────────────

export function hexToHSL(hex) {
  if (!hex || typeof hex !== 'string') return { h: 0, s: 0, l: 50 };
  hex = hex.replace('#', '');
  if (hex.length !== 6) return { h: 0, s: 0, l: 50 };

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}


// ────────────────────────────────────────────────────────────────────
// Phase 1: Compatibility Filter
// ────────────────────────────────────────────────────────────────────

export function isCompatible(garments) {
  const categories = garments.map(g => g.garment_category);
  const hasUpper = categories.includes('upperwear');
  const hasLower = categories.includes('lowerwear');
  const hasFullbody = categories.includes('fullbody');

  // RULE 1: Category validity
  if (!hasFullbody && !(hasUpper && hasLower)) return false;
  if (hasFullbody && (hasUpper || hasLower)) return false;
  const footwearCount = categories.filter(c => c === 'footwear').length;
  const accessoryCount = categories.filter(c => c === 'accessory').length;
  if (footwearCount > 1 || accessoryCount > 2) return false;

  // Core garments only for remaining rules
  const coreGarments = garments.filter(g =>
    ['upperwear', 'lowerwear', 'fullbody'].includes(g.garment_category)
  );

  // RULE 2: Fabric weight extremes
  for (let i = 0; i < coreGarments.length; i++) {
    for (let j = i + 1; j < coreGarments.length; j++) {
      const wA = WEIGHT_MAP[coreGarments[i].weight] || 2;
      const wB = WEIGHT_MAP[coreGarments[j].weight] || 2;
      if (Math.abs(wA - wB) > 1) return false;
    }
  }

  // RULE 3: Opacity conflict
  const sheerCount = coreGarments.filter(g =>
    g.opacity === 'sheer' || g.opacity === 'semi-sheer'
  ).length;
  const opaqueCount = coreGarments.filter(g => g.opacity === 'opaque').length;
  if (sheerCount >= 2 && opaqueCount === 0) return false;

  // RULE 4: Competing large-scale patterns
  const largePrints = coreGarments.filter(g =>
    g.pattern !== 'solid' && g.pattern_scale === 'large'
  );
  if (largePrints.length >= 2) return false;

  // RULE 5: Formality extreme mismatch
  const formalities = coreGarments.map(g => g.formality ?? 0.5);
  const maxF = Math.max(...formalities);
  const minF = Math.min(...formalities);
  if (maxF - minF > 0.5) return false;

  // RULE 6: Season incompatibility
  const seasonSets = coreGarments.map(g => new Set(g.season_tags || ['all-season']));
  for (let i = 0; i < seasonSets.length; i++) {
    for (let j = i + 1; j < seasonSets.length; j++) {
      const overlap = [...seasonSets[i]].filter(s => seasonSets[j].has(s));
      if (overlap.length === 0) {
        for (const [a, b] of OPPOSED_SEASONS) {
          const isClash =
            (seasonSets[i].has(a) && seasonSets[j].has(b)) ||
            (seasonSets[i].has(b) && seasonSets[j].has(a));
          if (isClash) return false;
        }
      }
    }
  }

  return true;
}


// ────────────────────────────────────────────────────────────────────
// Phase 2: Harmony Sub-Scorers (each returns 0-1)
// ────────────────────────────────────────────────────────────────────

export function colorHarmony(garments, shoes) {
  let totalScore = 0;
  let pairs = 0;

  const allItems = shoes ? [...garments, shoes] : [...garments];

  for (let i = 0; i < allItems.length; i++) {
    for (let j = i + 1; j < allItems.length; j++) {
      const A = allItems[i];
      const B = allItems[j];

      const isNeutralA = NEUTRALS.has(A.color_family);
      const isNeutralB = NEUTRALS.has(B.color_family);

      let pairScore;

      if (isNeutralA && isNeutralB) {
        pairScore = 0.90;
      } else if (isNeutralA || isNeutralB) {
        pairScore = 0.85;
      } else {
        const hslA = hexToHSL(A.primary_color_hex);
        const hslB = hexToHSL(B.primary_color_hex);
        const hueDiff = Math.abs(hslA.h - hslB.h);
        const normalizedDiff = hueDiff > 180 ? 360 - hueDiff : hueDiff;

        if (normalizedDiff <= 30) {
          pairScore = 0.92; // Monochromatic
        } else if (normalizedDiff <= 60) {
          pairScore = 0.88; // Analogous
        } else if (normalizedDiff >= 150 && normalizedDiff <= 210) {
          pairScore = 0.95; // Complementary
        } else if (normalizedDiff >= 100 && normalizedDiff <= 140) {
          pairScore = 0.75; // Triadic
        } else {
          pairScore = 0.30 + (normalizedDiff > 100 ? 0.15 : 0);
        }
      }

      // Temperature bonus
      if (A.color_temperature === B.color_temperature) {
        pairScore = Math.min(1.0, pairScore + 0.05);
      }

      // Vibrant overload penalty
      if (A.color_intensity === 'vibrant' && B.color_intensity === 'vibrant') {
        pairScore = Math.max(0, pairScore - 0.10);
      }
      if (A.color_intensity === 'neon' && B.color_intensity === 'neon') {
        pairScore = Math.max(0, pairScore - 0.15);
      }

      totalScore += pairScore;
      pairs++;
    }
  }

  return pairs > 0 ? totalScore / pairs : 0.5;
}

export function silhouetteBalance(garments) {
  if (garments.length === 1) {
    const g = garments[0];
    return g.fit === 'fitted' ? 0.85 : g.fit === 'regular' ? 0.80 : 0.65;
  }

  const top = garments.find(g => g.garment_category === 'upperwear');
  const bottom = garments.find(g => g.garment_category === 'lowerwear');

  if (!top || !bottom) return 0.5;

  const fitKey = `${top.fit}_${bottom.fit}`;
  let score = FIT_SCORES[fitKey] ?? 0.60;

  const lengthKey = `${top.length}_${bottom.waist_position}`;
  score += LENGTH_BONUSES[lengthKey] ?? 0;

  const volumes = { low: 1, medium: 2, high: 3 };
  const vDiff = Math.abs((volumes[top.volume] || 2) - (volumes[bottom.volume] || 2));
  if (vDiff >= 2) score += 0.05;
  if (vDiff === 0 && top.volume === 'high') score -= 0.10;

  return Math.min(1.0, Math.max(0, score));
}

export function occasionFit(garments) {
  let commonOccasions;
  for (const g of garments) {
    const tags = new Set(g.occasion_tags || []);
    if (!commonOccasions) {
      commonOccasions = tags;
    } else {
      commonOccasions = new Set([...commonOccasions].filter(t => tags.has(t)));
    }
  }

  const overlapCount = commonOccasions ? commonOccasions.size : 0;
  const maxTags = Math.max(...garments.map(g => (g.occasion_tags || []).length), 1);
  const tagScore = overlapCount / maxTags;

  const formalities = garments.map(g => g.formality ?? 0.5);
  const formalityRange = Math.max(...formalities) - Math.min(...formalities);
  const formalityScore = 1.0 - (formalityRange * 2);

  return 0.6 * tagScore + 0.4 * Math.max(0, formalityScore);
}

export function aestheticAlignment(garments) {
  const allTags = garments.flatMap(g => g.aesthetic_tags || []);
  const uniqueTags = [...new Set(allTags)];
  const overlapCount = allTags.length - uniqueTags.length;

  if (overlapCount >= 1) {
    return Math.min(1.0, 0.85 + (overlapCount * 0.05));
  }

  const garmentTags = garments.map(g => g.aesthetic_tags || []);
  if (garmentTags.length >= 2) {
    for (const tagA of garmentTags[0]) {
      for (const tagB of garmentTags[1] || []) {
        const key1 = `${tagA}_${tagB}`;
        const key2 = `${tagB}_${tagA}`;
        const compat = AESTHETIC_COMPAT[key1] || AESTHETIC_COMPAT[key2];
        if (compat) return compat;
      }
    }
  }

  return 0.35;
}

export function fabricCompatibility(garments) {
  if (garments.length < 2) return 0.7;

  const A = garments[0];
  const B = garments[1];

  const tKey1 = `${A.texture}_${B.texture}`;
  const tKey2 = `${B.texture}_${A.texture}`;
  let score = TEXTURE_COMPAT[tKey1] || TEXTURE_COMPAT[tKey2] || 0.60;

  const WEIGHT_VAL = { lightweight: 1, midweight: 2, heavyweight: 3 };
  const wDiff = Math.abs((WEIGHT_VAL[A.weight] || 2) - (WEIGHT_VAL[B.weight] || 2));
  if (wDiff === 0) score = Math.min(1.0, score + 0.05);
  if (wDiff === 1) score = Math.min(1.0, score + 0.02);

  if (A.stretch !== B.stretch) score = Math.min(1.0, score + 0.05);

  return score;
}

export function trendFactor(garments, userProfile) {
  const outfitAesthetics = garments.flatMap(g => g.aesthetic_tags || []);
  const hasTrend = outfitAesthetics.some(a => CURRENT_TRENDS.has(a));
  const allBasic = outfitAesthetics.every(a =>
    ['minimal', 'casual'].includes(a) || !a
  );

  if (hasTrend) {
    const userStyles = userProfile?.styles || [];
    const matchesUser = outfitAesthetics.some(a => userStyles.includes(a));
    return matchesUser ? 0.95 : 0.65;
  }

  if (allBasic) return 0.50;
  return 0.60;
}

export function practicality(garments) {
  let score = 0.5;

  const seasonSets = garments.map(g => new Set(g.season_tags || ['all-season']));
  let commonSeasons = seasonSets[0];
  for (let i = 1; i < seasonSets.length; i++) {
    commonSeasons = new Set([...commonSeasons].filter(s => seasonSets[i].has(s)));
  }
  score += commonSeasons.size > 0 ? 0.20 : 0;
  if (commonSeasons.has('all-season')) score += 0.10;

  const allStretch = garments.every(g => g.stretch);
  if (allStretch) score += 0.10;

  const hasBreathable = garments.some(g =>
    ['cotton', 'linen', 'rayon'].includes(g.fabric)
  );
  if (hasBreathable) score += 0.05;

  const avgQuality = garments.reduce((sum, g) => sum + (g.perceived_quality || 0.5), 0) / garments.length;
  score += avgQuality * 0.05;

  return Math.min(1.0, score);
}


// ────────────────────────────────────────────────────────────────────
// Harmony Score (weighted sum of all sub-scores)
// ────────────────────────────────────────────────────────────────────

export function harmonyScore(garments, userProfile) {
  const core = garments.filter(g =>
    ['upperwear', 'lowerwear', 'fullbody'].includes(g.garment_category)
  );
  const shoes = garments.find(g => g.garment_category === 'footwear');

  const color   = colorHarmony(core, shoes);
  const silh    = silhouetteBalance(core);
  const occ     = occasionFit(core);
  const aesth   = aestheticAlignment(core);
  const fabric  = fabricCompatibility(core);
  const trend   = trendFactor(core, userProfile);
  const pract   = practicality(core);

  const total = (
      25 * color
    + 20 * silh
    + 15 * occ
    + 15 * aesth
    + 10 * fabric
    + 10 * trend
    +  5 * pract
  );

  return {
    total,
    color_harmony: color,
    silhouette_balance: silh,
    occasion_fit: occ,
    aesthetic_alignment: aesth,
    fabric_compatibility: fabric,
    trend_factor: trend,
    practicality: pract,
  };
}


// ────────────────────────────────────────────────────────────────────
// Composite Tags (union of garment attributes for personalization)
// ────────────────────────────────────────────────────────────────────

function buildCompositeTags(garments) {
  const tags = {
    style_tags: [],
    color_family: [],
    occasion: [],
    season: [],
    garment_type: [],
    fit_silhouette: [],
    fabric: [],
    pattern: [],
    aesthetic: [],
  };

  for (const g of garments) {
    if (g.aesthetic_tags) tags.style_tags.push(...g.aesthetic_tags);
    if (g.color_family) tags.color_family.push(g.color_family);
    if (g.occasion_tags) tags.occasion.push(...g.occasion_tags);
    if (g.season_tags) tags.season.push(...g.season_tags);
    if (g.garment_type) tags.garment_type.push(g.garment_type);
    if (g.fit) tags.fit_silhouette.push(g.fit);
    if (g.fabric) tags.fabric.push(g.fabric);
    if (g.pattern) tags.pattern.push(g.pattern);
    if (g.aesthetic_tags) tags.aesthetic.push(...g.aesthetic_tags);
  }

  // Deduplicate
  for (const key of Object.keys(tags)) {
    tags[key] = [...new Set(tags[key])];
  }

  return tags;
}


// ────────────────────────────────────────────────────────────────────
// Diversity Penalty
// ────────────────────────────────────────────────────────────────────

export function applyDiversityPenalty(outfits) {
  const garmentAppearances = {};

  return outfits.map(outfit => {
    let penalty = 0;
    for (const gId of outfit.garment_ids) {
      const appearances = garmentAppearances[gId] || 0;
      penalty += appearances * 0.05;
    }

    for (const gId of outfit.garment_ids) {
      garmentAppearances[gId] = (garmentAppearances[gId] || 0) + 1;
    }

    return {
      ...outfit,
      harmony_score: outfit.harmony_score * (1 - Math.min(penalty, 0.40)),
    };
  });
}


// ────────────────────────────────────────────────────────────────────
// Combo Generation (Tiered) + Full Pipeline
// ────────────────────────────────────────────────────────────────────

export function generateOutfits(garments, userProfile) {
  // Categorize garments
  const uppers    = garments.filter(g => g.garment_category === 'upperwear');
  const lowers    = garments.filter(g => g.garment_category === 'lowerwear');
  const fullbodys = garments.filter(g => g.garment_category === 'fullbody');
  const layers    = garments.filter(g => g.garment_category === 'layer');
  const shoes     = garments.filter(g => g.garment_category === 'footwear');
  const accessories = garments.filter(g => g.garment_category === 'accessory');

  const rawCombos = [];

  // Tier 1: Core combos
  for (const u of uppers) {
    for (const l of lowers) {
      rawCombos.push([u, l]);
    }
  }
  for (const f of fullbodys) {
    rawCombos.push([f]);
  }

  // Cap raw combos to prevent explosion
  const maxRawCombos = 500;
  if (rawCombos.length > maxRawCombos) {
    rawCombos.length = maxRawCombos;
  }

  // Tier 2: Add footwear
  let tier2 = [];
  if (shoes.length > 0) {
    for (const combo of rawCombos) {
      // Base combo without shoes
      tier2.push([...combo]);
      for (const s of shoes) {
        tier2.push([...combo, s]);
      }
    }
  } else {
    tier2 = rawCombos.map(c => [...c]);
  }

  // Layer enhancement
  let withLayers = [];
  for (const combo of tier2) {
    withLayers.push([...combo]);
    for (const y of layers) {
      withLayers.push([...combo, y]);
    }
  }

  // Cap total combos
  if (withLayers.length > 1000) {
    withLayers.length = 1000;
  }

  // Phase 1: Filter incompatible combos
  const compatible = withLayers.filter(combo => isCompatible(combo));

  // Phase 2: Score compatible combos
  const scored = compatible.map(combo => {
    const scores = harmonyScore(combo, userProfile);
    const ids = combo.map(g => g.id);
    return {
      garment_ids: ids,
      garments: combo,
      harmony_score: scores.total,
      color_harmony: scores.color_harmony,
      silhouette_balance: scores.silhouette_balance,
      occasion_fit: scores.occasion_fit,
      aesthetic_alignment: scores.aesthetic_alignment,
      fabric_compatibility: scores.fabric_compatibility,
      trend_factor: scores.trend_factor,
      practicality: scores.practicality,
      composite_tags: buildCompositeTags(combo),
    };
  });

  // Sort by harmony score
  scored.sort((a, b) => b.harmony_score - a.harmony_score);

  // Top 200 before diversity penalty
  const top200 = scored.slice(0, 200);

  // Apply diversity penalty
  const diversified = applyDiversityPenalty(top200);

  // Re-sort after diversity penalty and return top 50
  diversified.sort((a, b) => b.harmony_score - a.harmony_score);
  return diversified.slice(0, 50);
}
