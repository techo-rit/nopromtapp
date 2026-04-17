/**
 * Wardrobe Concierge — AI chat pipeline.
 * Gemini parses free-text → structured filters → algorithmic outfit filtering.
 * See WARDROBE_MODEL.md §AI Concierge Pipeline.
 */

import { parseConciergPrompt } from './geminiWardrobe.js';
const logger = { warn: console.warn.bind(console), error: console.error.bind(console) };

/**
 * Filter outfits based on structured filters from AI or button refinement.
 */
export function filterOutfits(outfits, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return outfits.slice(0, 10);
  }

  let filtered = [...outfits];

  // Filter by occasion
  if (filters.occasion?.length > 0) {
    filtered = filtered.filter(o => {
      const tags = o.vibe_occasions || [];
      return filters.occasion.some(occ => tags.includes(occ));
    });
  }

  // Filter by aesthetic (check composite_tags)
  if (filters.aesthetic?.length > 0) {
    filtered = filtered.filter(o => {
      const tags = o.composite_tags?.style_tags || o.composite_tags?.aesthetic || [];
      return filters.aesthetic.some(a => tags.includes(a));
    });
  }

  // Filter by season
  if (filters.season?.length > 0) {
    filtered = filtered.filter(o => {
      const tags = o.composite_tags?.season || [];
      return filters.season.some(s => tags.includes(s));
    });
  }

  // Filter by formality range
  if (filters.formality_min != null || filters.formality_max != null) {
    filtered = filtered.filter(o => {
      const score = o.harmony_score / 100;
      if (filters.formality_min != null && score < filters.formality_min) return false;
      if (filters.formality_max != null && score > filters.formality_max) return false;
      return true;
    });
  }

  // Filter by color preference
  if (filters.color_preference?.length > 0) {
    filtered = filtered.filter(o => {
      const colors = o.composite_tags?.color_family || [];
      return filters.color_preference.some(c => colors.includes(c));
    });
  }

  // Sort by display score
  filtered.sort((a, b) => b.display_score - a.display_score);

  return filtered.slice(0, 10);
}

/**
 * Generate contextual refinement buttons based on current filters and results.
 */
export function generateRefinementButtons(filters, results) {
  const buttons = [];

  // Occasion-based refinements
  if (!filters.occasion || filters.occasion.length === 0) {
    buttons.push(
      { label: 'Date Night', emoji: '💕', filter_patch: { occasion: ['date'] } },
      { label: 'Office Ready', emoji: '💼', filter_patch: { occasion: ['office'] } },
      { label: 'Party Mode', emoji: '🎉', filter_patch: { occasion: ['party'] } },
    );
  } else {
    // Suggest formality adjustments
    buttons.push(
      { label: 'More Casual', emoji: '☀️', filter_patch: { formality_max: 0.4 } },
      { label: 'More Dressy', emoji: '✨', filter_patch: { formality_min: 0.6 } },
    );
  }

  // Season refinement
  if (!filters.season) {
    buttons.push(
      { label: 'Summer Vibes', emoji: '🌊', filter_patch: { season: ['summer'] } },
    );
  }

  // Aesthetic refinement
  if (!filters.aesthetic) {
    buttons.push(
      { label: 'Minimal Clean', emoji: '🤍', filter_patch: { aesthetic: ['minimal'] } },
      { label: 'Bold & Trendy', emoji: '🔥', filter_patch: { aesthetic: ['streetwear', 'y2k'] } },
    );
  }

  // Color refinement if results exist
  if (results.length > 0) {
    buttons.push(
      { label: 'Dark Palette', emoji: '🖤', filter_patch: { color_preference: ['black', 'navy', 'grey'] } },
    );
  }

  return buttons.slice(0, 5);
}

/**
 * Get Stiri product recommendation when outfits are weak.
 * Triggered when best matching outfit score < 60.
 */
export function getStiriRecommendation(filters, bestScore, products, profile) {
  if (bestScore >= 60 || !products || products.length === 0) return null;

  // Filter products by same occasion/aesthetic
  let candidates = [...products];

  if (filters.occasion?.length > 0) {
    const filtered = candidates.filter(p =>
      filters.occasion.some(occ => (p.occasion || []).includes(occ))
    );
    if (filtered.length > 0) candidates = filtered;
  }

  if (filters.aesthetic?.length > 0) {
    const filtered = candidates.filter(p =>
      filters.aesthetic.some(a => (p.style_tags || []).includes(a))
    );
    if (filtered.length > 0) candidates = filtered;
  }

  return candidates[0] || null;
}

/**
 * Process a concierge chat message.
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function processChatMessage({
  message,
  buttonFilter,
  sessionFilters,
  conversationHistory,
  allOutfits,
  stiriProducts,
  userProfile,
}) {
  let filters;

  if (buttonFilter) {
    // Button refinement: merge with existing filters, NO Gemini call
    filters = { ...sessionFilters, ...buttonFilter };
  } else if (message) {
    // Free-text: parse with Gemini
    filters = await parseConciergPrompt(message, conversationHistory);
  } else {
    filters = sessionFilters || {};
  }

  // Filter outfits
  const matchingOutfits = filterOutfits(allOutfits, filters);

  // Generate refinement buttons
  const refinementButtons = generateRefinementButtons(filters, matchingOutfits);

  // Check for Stiri recommendation
  const bestScore = matchingOutfits.length > 0 ? matchingOutfits[0].display_score : 0;
  const stiriRec = getStiriRecommendation(filters, bestScore, stiriProducts, userProfile);

  // Generate response message
  let responseMessage;
  if (matchingOutfits.length > 0) {
    responseMessage = `Found ${matchingOutfits.length} looks that match. Tap any outfit to try it on!`;
  } else if (stiriRec) {
    responseMessage = "Your wardrobe doesn't have a perfect match for this — but this Stiri set was made for it.";
  } else {
    responseMessage = "No matching outfits found. Try adjusting your request or add more pieces to your wardrobe.";
  }

  return {
    filters,
    outfits: matchingOutfits,
    refinement_buttons: refinementButtons,
    stiri_recommendation: stiriRec,
    message: responseMessage,
  };
}
