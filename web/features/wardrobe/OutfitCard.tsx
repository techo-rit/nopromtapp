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
    <div className="group relative flex flex-col gap-2 transition-all duration-300">
      {/* Garment Collage Container */}
      <div className="relative aspect-[3/4] w-full rounded-[24px] overflow-hidden bg-surface-elevated">
        <div className={`grid h-full w-full ${garments.length >= 3 ? 'grid-cols-2 grid-rows-2' : garments.length === 2 ? 'grid-cols-2' : ''}`}>
          {garments.slice(0, 4).map((g, i) => (
            <div key={g.id} className={`relative overflow-hidden ${garments.length === 3 && i === 0 ? 'col-span-2' : ''}`}>
              <img
                src={g.image_url}
                alt={g.garment_type || 'Garment'}
                className="w-full h-full object-cover mix-blend-multiply"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Wishlist Heart Icon (Top Right) */}
        <button className="absolute top-4 right-4 z-10 text-gold/80 hover:text-gold transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Floating Try-On Pill (Bottom Center) */}
        {onTryOn && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center z-10">
            <button
              onClick={() => onTryOn(outfit)}
              className="px-6 py-2 rounded-full text-[13px] font-semibold text-base bg-text-primary hover:bg-white active:scale-95 transition-transform shadow-lg"
            >
              Try-on
            </button>
          </div>
        )}
      </div>

      {/* Meta Text below image */}
      <div className="px-1 flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-widest text-secondary font-medium">
          {outfit.vibe_occasions?.[0] || 'STYLED EDIT'}
        </span>
        <h3 className="font-display text-[16px] text-primary truncate tracking-wide">
          {outfit.vibe_title || 'Untitled Look'}
        </h3>
      </div>
    </div>
  );
};
