import React from 'react';
import type { WardrobeOutfit, WardrobeGarment } from '../../types';

interface OutfitCardProps {
  outfit: WardrobeOutfit & { garments: WardrobeGarment[] };
  onTryOn?: (outfit: WardrobeOutfit) => void;
}

export const OutfitCard: React.FC<OutfitCardProps> = ({ outfit, onTryOn }) => {
  const garments = outfit.garments || [];
  const matchPct = outfit.vibe_match_pct ?? Math.round(outfit.harmony_score);

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-surface to-base border border-border hover:border-gold/40 transition-all duration-300">
      {/* Garment Collage */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <div className={`grid h-full w-full ${garments.length >= 3 ? 'grid-cols-2 grid-rows-2' : garments.length === 2 ? 'grid-cols-2' : ''}`}>
          {garments.slice(0, 4).map((g, i) => (
            <div key={g.id} className={`relative overflow-hidden ${garments.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
              <img
                src={g.image_url}
                alt={g.garment_type || 'Garment'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Subtle interior border */}
              <div className="absolute inset-0 border-[0.5px] border-border" />
            </div>
          ))}
        </div>

        {/* Match percentage badge */}
        <div className="absolute top-3 right-3 bg-base/80 backdrop-blur-sm border border-gold/30 rounded-full px-2.5 py-1 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
          <span className="text-[11px] font-semibold text-gold tracking-wide">{matchPct}%</span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-transparent opacity-60" />
      </div>

      {/* Vibe Report */}
      <div className="p-4 space-y-2.5">
        <h3 className="font-display text-base text-white leading-tight truncate">
          {outfit.vibe_title || 'Untitled Look'}
        </h3>

        {outfit.vibe_why && (
          <p className="text-[12px] text-secondary leading-relaxed line-clamp-2">
            {outfit.vibe_why}
          </p>
        )}

        {/* Occasion pills */}
        {outfit.vibe_occasions && outfit.vibe_occasions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {outfit.vibe_occasions.slice(0, 3).map((occ) => (
              <span
                key={occ}
                className="text-[10px] uppercase tracking-widest text-gold/70 bg-gold/8 border border-gold/15 rounded-full px-2.5 py-0.5"
              >
                {occ}
              </span>
            ))}
          </div>
        )}

        {/* Try On button */}
        {onTryOn && (
          <button
            onClick={() => onTryOn(outfit)}
            className="w-full mt-2 py-2.5 rounded-xl text-[12px] uppercase tracking-[0.15em] font-semibold
              bg-gold text-base
              hover:bg-gold-hover active:scale-[0.98] transition-all duration-200"
          >
            Try This On
          </button>
        )}
      </div>
    </div>
  );
};
