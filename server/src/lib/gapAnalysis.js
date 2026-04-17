/**
 * Gap Analysis Engine — Detects stylistic gaps in user's wardrobe.
 * See WARDROBE_MODEL.md §6 for specification.
 */

const CORE_OCCASIONS = ['casual', 'office', 'party', 'date', 'festive'];
const MIN_GARMENTS_FOR_GAPS = 15;

const GAP_DETECTORS = [
  {
    type: 'occasion',
    detect: (garments) => {
      const missing = [];
      for (const occ of CORE_OCCASIONS) {
        const count = garments.filter(g => (g.occasion_tags || []).includes(occ)).length;
        if (count < 2) missing.push(occ);
      }

      if (missing.length > 0) {
        return {
          gap_type: 'occasion',
          severity: missing.length / CORE_OCCASIONS.length,
          missing_occasions: missing,
          headline: `No ${missing[0]} options`,
          description: `Your closet is missing looks for ${missing.join(', ')} occasions.`,
        };
      }
      return null;
    },
  },
  {
    type: 'aesthetic',
    detect: (garments, userProfile) => {
      const userStyles = userProfile?.styles || [];
      const wardrobeAesthetics = garments.flatMap(g => g.aesthetic_tags || []);
      const wardrobeCounts = {};
      wardrobeAesthetics.forEach(a => { wardrobeCounts[a] = (wardrobeCounts[a] || 0) + 1; });

      for (const style of userStyles) {
        const count = wardrobeCounts[style] || 0;
        const total = garments.length;
        if (count / total < 0.15) {
          return {
            gap_type: 'aesthetic',
            severity: 1 - (count / total),
            desired_aesthetic: style,
            wardrobe_percentage: Math.round((count / total) * 100),
            headline: 'Your vibe is evolving',
            description: `Your Style DNA says ${style}, but only ${Math.round((count / total) * 100)}% of your closet matches.`,
          };
        }
      }
      return null;
    },
  },
  {
    type: 'season',
    detect: (garments) => {
      const seasonCounts = { summer: 0, winter: 0, monsoon: 0, spring: 0, autumn: 0 };
      garments.forEach(g => {
        (g.season_tags || []).forEach(s => {
          if (s in seasonCounts) seasonCounts[s]++;
        });
      });

      const total = garments.length;
      for (const [season, count] of Object.entries(seasonCounts)) {
        if (count / total < 0.10) {
          return {
            gap_type: 'season',
            severity: 1 - (count / total),
            missing_season: season,
            headline: `Not ${season}-ready`,
            description: `You have almost no ${season} pieces. One good ${season} set changes everything.`,
          };
        }
      }
      return null;
    },
  },
  {
    type: 'color_palette',
    detect: (garments) => {
      const colorCounts = {};
      garments.forEach(g => {
        if (g.color_family) {
          colorCounts[g.color_family] = (colorCounts[g.color_family] || 0) + 1;
        }
      });

      const total = garments.length;
      const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
      const dominantColor = sorted[0];

      if (dominantColor && dominantColor[1] / total > 0.50) {
        return {
          gap_type: 'color_palette',
          severity: dominantColor[1] / total,
          dominant_color: dominantColor[0],
          percentage: Math.round((dominantColor[1] / total) * 100),
          headline: 'Your palette is narrow',
          description: `${Math.round((dominantColor[1] / total) * 100)}% of your closet is ${dominantColor[0]}. A pop of contrast would open up new combos.`,
        };
      }
      return null;
    },
  },
  {
    type: 'versatility',
    detect: (garments) => {
      const singleOccasionCount = garments.filter(g =>
        (g.occasion_tags || []).length <= 1
      ).length;

      if (singleOccasionCount / garments.length > 0.60) {
        return {
          gap_type: 'versatility',
          severity: singleOccasionCount / garments.length,
          headline: 'Low outfit flexibility',
          description: 'Most of your pieces are single-occasion. Versatile sets multiply your daily rotation.',
        };
      }
      return null;
    },
  },
];

/**
 * Detect all gaps in the user's wardrobe.
 * Returns empty array if fewer than MIN_GARMENTS_FOR_GAPS garments.
 */
export function detectGaps(garments, userProfile) {
  if (!garments || garments.length < MIN_GARMENTS_FOR_GAPS) return [];

  return GAP_DETECTORS
    .map(detector => detector.detect(garments, userProfile))
    .filter(Boolean)
    .sort((a, b) => b.severity - a.severity);
}

/**
 * Match Stiri products to fill a detected gap.
 * Reuses the ranking infrastructure — caller provides pre-ranked products.
 */
export function matchStiriSetToGap(gap, stiriProducts, userProfile) {
  let candidates;

  switch (gap.gap_type) {
    case 'occasion':
      candidates = stiriProducts.filter(p =>
        gap.missing_occasions.some(occ => (p.occasion || []).includes(occ))
      );
      break;
    case 'aesthetic':
      candidates = stiriProducts.filter(p =>
        (p.style_tags || []).includes(gap.desired_aesthetic)
      );
      break;
    case 'season':
      candidates = stiriProducts.filter(p =>
        (p.season || []).includes(gap.missing_season)
      );
      break;
    case 'color_palette':
      candidates = stiriProducts.filter(p =>
        !(p.color_family || []).includes(gap.dominant_color)
      );
      break;
    case 'versatility':
      candidates = stiriProducts.filter(p =>
        (p.occasion || []).length >= 3
      );
      break;
    default:
      candidates = [];
  }

  // Return top 3 matching products (already ranked by personalization)
  return candidates.slice(0, 3);
}

/**
 * Detect which monetization trigger type applies to a gap.
 */
export function detectTriggerType(gap, userProfile, bestOutfitScore) {
  switch (gap.gap_type) {
    case 'occasion':
      return {
        trigger: 'occasion_rescue',
        copy: `Your best wardrobe look for ${gap.missing_occasions?.[0] || 'this'} scores ${bestOutfitScore || '—'}, but this Stiri set was designed for exactly this.`,
      };
    case 'aesthetic':
      return {
        trigger: 'aesthetic_gap',
        copy: `Your vibe says ${gap.desired_aesthetic || 'something new'} but your closet says otherwise.`,
      };
    case 'color_palette':
      return {
        trigger: 'wardrobe_multiplier',
        copy: 'This set creates new combos with pieces you already own.',
      };
    case 'versatility':
      return {
        trigger: 'trend_injection',
        copy: 'Modernize your rotation with one trend-forward set.',
      };
    default:
      return {
        trigger: 'body_proportion',
        copy: `Engineered for your ${userProfile?.bodyType || ''} body type.`,
      };
  }
}
