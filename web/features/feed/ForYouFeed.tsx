import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFeed } from './feedService';
import { trackEvent } from '../tracking/trackingService';
import type { FeedItem } from '../../types';

interface ForYouFeedProps {
  user?: { id: string } | null;
  onLoginRequired?: () => void;
}

const PAGE_SIZE = 20;

export const ForYouFeed: React.FC<ForYouFeedProps> = ({ user, onLoginRequired }) => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  const loadFeed = useCallback(async (startOffset: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const response = await fetchFeed(PAGE_SIZE, startOffset);

      setItems((prev) => append ? [...prev, ...response.items] : response.items);
      setHasMore(response.hasMore);
      setOffset(startOffset + response.items.length);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load feed';
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(0, false);
  }, [loadFeed, user?.id]);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          loadFeed(offset, true);
        }
      },
      { threshold: 0.1 },
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, loadingMore, offset, loadFeed]);

  // Track views via IntersectionObserver
  const cardObserver = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    cardObserver.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const pid = entry.target.getAttribute('data-product-id');
            if (pid && !viewedRef.current.has(pid)) {
              viewedRef.current.add(pid);
              trackEvent(pid, 'view', { source: 'for-you-feed' });
            }
          }
        }
      },
      { threshold: 0.5 },
    );

    return () => cardObserver.current?.disconnect();
  }, []);

  const setCardRef = useCallback((el: HTMLDivElement | null) => {
    if (el) cardObserver.current?.observe(el);
  }, []);

  const handleTryOn = (item: FeedItem) => {
    if (!user) {
      onLoginRequired?.();
      return;
    }
    trackEvent(item.product_id, 'try_on', { source: 'for-you-feed' });
    navigate(`/changing-room?template=${item.product_id}`);
  };

  const handleProductClick = (item: FeedItem) => {
    navigate(`/product/${item.product_id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-6">
        <p className="text-neutral-500 text-sm">{error}</p>
        <button
          onClick={() => loadFeed(0, false)}
          className="px-4 py-2 text-sm font-medium text-neutral-900 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-2 px-6">
        <p className="text-neutral-500 text-sm">No recommendations yet</p>
        <p className="text-neutral-400 text-xs">Browse some products to get personalized picks</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">For You</h2>
        <p className="text-xs text-neutral-500 mt-0.5">Curated based on your style</p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-6 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.product_id}
            ref={setCardRef}
            data-product-id={item.product_id}
            className="group relative flex flex-col rounded-xl overflow-hidden bg-white border border-neutral-100 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Card header badges */}
            <div className="absolute top-2 left-2 z-10 flex gap-1">
              {item.is_new_arrival && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-green-500 text-white rounded">
                  New
                </span>
              )}
              {item.isExploration && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-500 text-white rounded">
                  Explore
                </span>
              )}
            </div>

            {/* Tappable product area */}
            <button
              onClick={() => handleProductClick(item)}
              className="w-full text-left focus:outline-none"
            >
              <div className="aspect-[3/4] bg-neutral-50 flex items-center justify-center">
                <span className="text-neutral-300 text-xs">Product Image</span>
              </div>
              <div className="px-3 pt-2 pb-1">
                <h3 className="text-sm font-medium text-neutral-900 line-clamp-2 leading-tight">
                  {item.title}
                </h3>
                {item.style_tags && item.style_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.style_tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-[10px] text-neutral-500 bg-neutral-50 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {item.min_price != null && (
                  <p className="text-xs text-neutral-600 mt-1">
                    ₹{Math.round(item.min_price / 100)}
                  </p>
                )}
              </div>
            </button>

            {/* Try-on CTA */}
            <div className="px-3 pb-3 mt-auto">
              <button
                onClick={() => handleTryOn(item)}
                className="w-full py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 active:scale-[0.98] transition-all"
              >
                Try On
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
