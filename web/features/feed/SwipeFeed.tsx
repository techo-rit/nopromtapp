import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFeed } from "./feedService";
import { trackEvent } from "../tracking/trackingService";
import type { FeedItem, Template, User } from "../../types";

/* ── helpers ── */
function templateToFeedItem(t: Template): FeedItem {
  return {
    product_id: t.id,
    title: t.name,
    image: t.imageUrl,
    score: 0,
    isExploration: false,
    min_price: t.price ? Math.round(parseFloat(t.price.amount) * 100) : undefined,
  };
}

function formatPrice(paise: number): string {
  const rupees = Math.round(paise / 100);
  return rupees >= 1000 ? `${(rupees / 1000).toFixed(rupees % 1000 === 0 ? 0 : 1)}k` : `${rupees}`;
}

/* ── props ── */
interface SwipeFeedProps {
  trendingTemplates: Template[];
  user?: User | null;
  onLoginRequired?: () => void;
  onboardingPercent?: number;
  onOpenOnboarding?: () => void;
  wishlistedIds?: Set<string>;
  onToggleWishlist?: (templateId: string) => void;
}

/* ═══════════════════════════════════════════
   SwipeFeed — full-screen vertical snap feed
   ═══════════════════════════════════════════ */
export const SwipeFeed: React.FC<SwipeFeedProps> = ({
  trendingTemplates,
  user,
  onLoginRequired,
  wishlistedIds,
  onToggleWishlist,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── data ── */
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);

  /* ── tracking refs ── */
  const viewedRef = useRef<Set<string>>(new Set());
  const clickedRef = useRef<Set<string>>(new Set());

  const displayItems = useMemo(() => {
    if (feedItems.length > 0) return feedItems;
    return trendingTemplates.map(templateToFeedItem);
  }, [feedItems, trendingTemplates]);

  /* ── feed fetch ── */
  const loadFeed = useCallback(async (startOffset: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true);
      else setFeedLoading(true);
      const response = await fetchFeed(30, startOffset);
      setFeedItems(prev => (append ? [...prev, ...response.items] : response.items));
      setHasMore(response.hasMore);
      setOffset(startOffset + response.items.length);
    } catch {
      /* silent — falls back to trendingTemplates */
    } finally {
      setFeedLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadFeed(0, false); }, [loadFeed, user?.id]);

  /* ── infinite scroll sentinel ── */
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting && hasMore && !loadingMore) loadFeed(offset, true); },
      { threshold: 0.1 },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, offset, loadFeed]);

  /* ── track active card (view/skip) ── */
  const cardObserver = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    cardObserver.current = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const pid = entry.target.getAttribute("data-pid");
          if (!pid) continue;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!viewedRef.current.has(pid)) {
              viewedRef.current.add(pid);
              trackEvent(pid, "view", { source: "swipe-feed" });
            }
            const idx = Number(entry.target.getAttribute("data-idx"));
            if (!Number.isNaN(idx)) setActiveIdx(idx);
          } else if (!entry.isIntersecting && viewedRef.current.has(pid) && !clickedRef.current.has(pid)) {
            trackEvent(pid, "skip", { source: "swipe-feed" });
          }
        }
      },
      { threshold: [0, 0.5] },
    );
    return () => cardObserver.current?.disconnect();
  }, []);

  const observeCard = useCallback((el: HTMLDivElement | null) => {
    if (el) cardObserver.current?.observe(el);
  }, []);

  /* ── actions ── */
  const handleTryOn = (productId: string) => {
    clickedRef.current.add(productId);
    if (!user) { onLoginRequired?.(); return; }
    trackEvent(productId, "try_on", { source: "swipe-feed" });
    navigate(`/changing-room?product=${productId}`);
  };

  const handleProductClick = (productId: string) => {
    clickedRef.current.add(productId);
    navigate(`/product/${productId}`);
  };

  const handleWishlist = (productId: string) => {
    if (!user) { onLoginRequired?.(); return; }
    onToggleWishlist?.(productId);
  };

  /* ── loading state ── */
  if (feedLoading && feedItems.length === 0 && trendingTemplates.length === 0) {
    return (
      <div className="w-full h-full bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="w-8 h-8 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
          <p className="text-[11px] tracking-[0.3em] uppercase text-tertiary font-display">
            Curating your feed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-home-scroll="true"
      className="w-full h-full snap-y-mandatory overflow-y-auto scrollbar-hide bg-base"
    >
      {displayItems.map((item, i) => (
        <FeedCard
          key={item.product_id}
          item={item}
          index={i}
          total={displayItems.length}
          isWishlisted={wishlistedIds?.has(item.product_id) ?? false}
          onTryOn={() => handleTryOn(item.product_id)}
          onClick={() => handleProductClick(item.product_id)}
          onWishlist={() => handleWishlist(item.product_id)}
          observeRef={observeCard}
        />
      ))}

      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="h-[100dvh] snap-start flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   FeedCard — single full-viewport card
   ═══════════════════════════════════════════ */

interface FeedCardProps {
  item: FeedItem;
  index: number;
  total: number;
  isWishlisted: boolean;
  onTryOn: () => void;
  onClick: () => void;
  onWishlist: () => void;
  observeRef: (el: HTMLDivElement | null) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({
  item,
  index,
  total,
  isWishlisted,
  onTryOn,
  onClick,
  onWishlist,
  observeRef,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      ref={observeRef}
      data-pid={item.product_id}
      data-idx={index}
      className="relative w-full h-[100dvh] snap-start snap-always overflow-hidden"
    >
      {/* ── Product image — fills viewport ── */}
      {item.image ? (
        <img
          src={item.image}
          alt={item.title}
          decoding="async"
          loading={index < 3 ? "eager" : "lazy"}
          onLoad={() => setImgLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <div className="absolute inset-0 bg-surface" />
      )}

      {/* skeleton while loading */}
      {!imgLoaded && item.image && (
        <div className="absolute inset-0 skeleton" />
      )}

      {/* ── Gradient scrim — bottom fade ── */}
      <div className="scrim-bottom" />

      {/* ── Right action rail ── */}
      <div className="absolute right-3 bottom-[180px] md:bottom-[220px] flex flex-col items-center gap-5 z-10">
        {/* wishlist */}
        <button
          onClick={(e) => { e.stopPropagation(); onWishlist(); }}
          className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px]"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill={isWishlisted ? "var(--color-error)" : "none"} stroke={isWishlisted ? "var(--color-error)" : "white"} strokeWidth="1.8">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.share) {
              navigator.share({ title: item.title, url: `${window.location.origin}/product/${item.product_id}` }).catch(() => {});
            }
          }}
          className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px]"
          aria-label="Share"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>

        {/* details */}
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px]"
          aria-label="View details"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>

      {/* ── Bottom content overlay ── */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-8 z-10">
        {/* tags */}
        {item.style_tags && item.style_tags.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            {item.style_tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-medium"
              >
                {tag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {/* title */}
        <h2 className="text-white text-[22px] md:text-[28px] font-bold leading-tight tracking-tight mb-1.5 font-display drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            style={{ maxWidth: "75%" }}>
          {item.title}
        </h2>

        {/* price row */}
        <div className="flex items-center gap-3 mb-5">
          {item.min_price != null && (
            <span className="text-white/80 text-[15px] font-medium tabular-nums">
              Rs. {formatPrice(item.min_price)}
            </span>
          )}
          {item.occasion?.[0] && (
            <span className="text-[11px] uppercase tracking-[0.1em] text-gold/60 font-medium">
              {item.occasion[0].replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* CTA: Try On pill */}
        <button
          onClick={(e) => { e.stopPropagation(); onTryOn(); }}
          className="group flex items-center gap-2.5 h-[48px] px-7 rounded-[var(--radius-pill)] bg-primary text-base font-semibold text-[15px] tracking-wide shadow-[0_4px_24px_rgba(242,242,247,0.15)] active:scale-[0.97] transition-all"
          style={{ transitionTimingFunction: 'var(--ease-spring)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
          </svg>
          Try On
        </button>

        {/* index indicator */}
        <div className="mt-4 flex items-center gap-1.5">
          {total <= 8 ? (
            Array.from({ length: total }, (_, di) => (
              <div
                key={di}
                className={`h-[3px] rounded-full transition-all duration-300 ${
                  di === index ? "w-5 bg-white" : "w-1.5 bg-white/20"
                }`}
              />
            ))
          ) : (
            <span className="text-[11px] tabular-nums text-white/25 tracking-wider">
              {index + 1} / {total}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
