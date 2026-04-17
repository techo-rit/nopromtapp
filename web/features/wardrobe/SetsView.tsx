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
        <div className="w-6 h-6 border-2 border-[#c9a962] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (outfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="text-4xl mb-4">✨</div>
        <h3 className="font-['Playfair_Display'] text-lg text-white mb-2">No outfits yet</h3>
        <p className="text-[13px] text-[#666] max-w-[260px]">
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
            className="text-[12px] uppercase tracking-[0.12em] font-semibold text-[#c9a962] hover:text-[#d4b872] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};
