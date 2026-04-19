import React, { useState, useEffect, useCallback } from 'react';
import type { WardrobeGarment } from '../../types';
import { listGarments, deleteGarment } from './wardrobeService';

interface AllItemsViewProps {
  refreshTrigger?: number;
  onUpload?: () => void;
}

const CATEGORY_ORDER = ['upperwear', 'lowerwear', 'fullbody', 'layer', 'footwear', 'accessory', 'uncategorized'];
const CATEGORY_LABELS: Record<string, string> = {
  upperwear: 'Tops',
  lowerwear: 'Bottoms',
  fullbody: 'Dresses & More',
  layer: 'Layers',
  footwear: 'Footwear',
  accessory: 'Accessories',
  uncategorized: 'Pending Analysis',
};

export const AllItemsView: React.FC<AllItemsViewProps> = ({ refreshTrigger, onUpload }) => {
  const [garments, setGarments] = useState<WardrobeGarment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [cap, setCap] = useState(30);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadGarments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listGarments();
      setGarments(data.garments);
      setTotal(data.total);
      setCap(data.cap);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGarments();
  }, [loadGarments, refreshTrigger]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteGarment(id);
      setGarments(prev => prev.filter(g => g.id !== id));
      setTotal(prev => prev - 1);
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  // Group by category
  const grouped = garments.reduce<Record<string, WardrobeGarment[]>>((acc, g) => {
    const cat = g.garment_category || (g.is_analyzed ? 'uncategorized' : 'uncategorized');
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(g);
    return acc;
  }, {});

  if (loading && garments.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (garments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-elevated flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5"><path d="M20.38 3.46L16 2 12 5.5 8 2 3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47c.06.37.29.7.62.89L8 13v9l4-3 4 3v-9l4.52-2.95c.33-.19.56-.52.62-.89l.58-3.47a2 2 0 00-1.34-2.23z"/></svg>
        </div>
        <h3 className="font-display text-lg text-white mb-2">Your wardrobe is empty</h3>
        <p className="text-[13px] text-tertiary max-w-[260px] mb-6">
          Upload photos of your clothes to build your digital wardrobe.
        </p>
        {onUpload && (
          <button
            onClick={onUpload}
            className="px-6 py-2.5 rounded-xl text-[12px] uppercase tracking-[0.15em] font-semibold
              bg-gold text-base
              hover:bg-gold-hover active:scale-[0.98] transition-all"
          >
            Add First Item
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Counter */}
      <div className="px-4 flex items-center justify-between">
        <span className="text-[12px] text-tertiary tracking-wide">{total} / {cap} items</span>
        <div className="h-1 flex-1 mx-3 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${Math.min((total / cap) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Category sections */}
      {CATEGORY_ORDER.filter(cat => grouped[cat]?.length > 0).map(cat => (
        <div key={cat}>
          <h3 className="px-4 text-[11px] uppercase tracking-[0.2em] text-tertiary font-semibold mb-3">
            {CATEGORY_LABELS[cat]} ({grouped[cat].length})
          </h3>
          <div className="grid grid-cols-3 gap-2 px-4">
            {grouped[cat].map(garment => (
              <div
                key={garment.id}
                className="relative group rounded-xl overflow-hidden bg-surface border border-border aspect-square"
              >
                <img
                  src={garment.image_url}
                  alt={garment.garment_type || 'Garment'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Analysis pending indicator */}
                {!garment.is_analyzed && !garment.analysis_failed && (
                  <div className="absolute inset-0 bg-base/50 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* Analysis failed indicator */}
                {garment.analysis_failed && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white">!</span>
                  </div>
                )}

                {/* Delete button on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(garment.id); }}
                  disabled={deletingId === garment.id}
                  className="absolute top-1.5 left-1.5 w-6 h-6 bg-base/70 backdrop-blur-sm rounded-full
                    flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                    hover:bg-red-500/80"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>

                {/* Type label */}
                {garment.garment_type && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-base to-transparent pt-4 pb-1.5 px-2">
                    <span className="text-[9px] uppercase tracking-wider text-secondary">{garment.garment_type}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
