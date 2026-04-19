import React, { useState, useEffect, useCallback } from 'react';
import type { WardrobeOutfit, WardrobeGarment } from '../../types';
import { listOutfits } from './wardrobeService';
import { OutfitCard } from './OutfitCard';

interface SetsViewProps {
  onTryOn?: (outfit: WardrobeOutfit) => void;
  refreshTrigger?: number;
}

export const SetsView: React.FC<SetsViewProps> = ({ onTryOn, refreshTrigger }) => {
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
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-elevated flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-gold)"><path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
        </div>
        <h3 className="font-display text-lg text-white mb-2">No outfits yet</h3>
        <p className="text-[13px] text-tertiary max-w-[260px]">
          Add at least 10 garments and tap "Sync Pairs" to generate outfit combinations.
        </p>
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
