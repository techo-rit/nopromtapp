import React, { useState, useEffect, useCallback } from 'react';
import type { WardrobeOutfit, WardrobeGarment } from '../../types';
import { listOutfits } from './wardrobeService';
import { OutfitCard } from './OutfitCard';

interface SetsViewProps {
  onTryOn?: (outfit: WardrobeOutfit) => void;
  refreshTrigger?: number;
  onUpload?: () => void;
}

export const SetsView: React.FC<SetsViewProps> = ({ onTryOn, refreshTrigger, onUpload }) => {
  const [outfits, setOutfits] = useState<(WardrobeOutfit & { garments: WardrobeGarment[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const loadOutfits = useCallback(async (p: number) => {
    try {
      setLoading(true);
      const data = await listOutfits(p, 20);
      if (p === 1) {
        setOutfits(data.outfits as any);
      } else {
        setOutfits(prev => [...prev, ...(data.outfits as any)]);
      }
      setHasMore(data.hasMore);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    loadOutfits(1);
  }, [loadOutfits, refreshTrigger]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadOutfits(next);
  };

  if (loading && outfits.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (outfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-10 text-center mt-4">
        {/* Minimalist Rack and Mirror Illustration in Gold */}
        <div className="mb-6 w-full max-w-[230px] mx-auto text-gold">
          <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-auto opacity-[0.85]">
            {/* RACK FRAME */}
            <path d="M 40 106 V 38 c 0 -4 4 -6 7 -6 h 50 c 4 0 7 2 7 6 v 68" />
            <path d="M 37 38 h 70" />
            {/* RACK FEET */}
            <path d="M 35 106 h 10 v 6 h -10 z" />
            <path d="M 99 106 h 10 v 6 h -10 z" />
            <path d="M 45 106 h 54" />
            
            {/* HANGERS */}
            <path d="M 54 38 c 0 -3 -3 -5 -6 -5 s -6 2 -6 5 m 6 -5 v 3 l -14 12 h 28 z" />
            <path d="M 74 38 c 0 -3 -3 -5 -6 -5 s -6 2 -6 5 m 6 -5 v 3 l -14 12 h 28 z" />
            <path d="M 94 38 c 0 -3 -3 -5 -6 -5 s -6 2 -6 5 m 6 -5 v 3 l -14 12 h 28 z" />

            {/* MIRROR STAND */}
            <path d="M 118 106 l 6 -72 c 1 -4 -1 -8 -5 -8 h -12 c -4 0 -6 4 -5 8 l 6 72" />
            <path d="M 110 106 c 2 0 4 0 4 -2 v -72" />
            <path d="M 104 106 l 8 -70" />
            {/* MIRROR REFLECTION LINES */}
            <path d="M 116 35 l 6 -5" />
            <path d="M 114 45 l 8 -7" />
            {/* MIRROR FEET */}
            <path d="M 104 106 v 6 m 8 -6 l -4 6 m 16 -6 l 2 6" />
          </svg>
        </div>

        <h3 className="font-display text-[26px] leading-[1.1] text-gold mb-4 text-center tracking-wide">
          Welcome to your digital wardrobe.
        </h3>
        
        <p className="text-[15px] font-text text-secondary leading-relaxed mb-8">
          Start by adding your favorite garments to see curated outfit ideas and styled looks.
        </p>
        
        <button 
          onClick={onUpload}
          className="flex items-center justify-center gap-2 w-full max-w-[240px] h-[52px] rounded-full bg-gold text-base font-medium active:scale-95 transition-transform"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="text-[16px]">Add First Garment</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 px-4">
        {outfits.map(outfit => (
          <OutfitCard key={outfit.id} outfit={outfit} onTryOn={onTryOn} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-[12px] uppercase tracking-[0.12em] font-semibold text-gold hover:text-gold-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};
