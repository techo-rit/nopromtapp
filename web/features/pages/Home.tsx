import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFeed } from "../feed/feedService";
import { trackEvent } from "../tracking/trackingService";
import { ChevronLeftIcon, ChevronRightIcon, RemixLogoIcon } from "../../shared/ui/Icons";
import type { FeedItem, Template, User } from "../../types";

/* ── Label helpers ─── */
const OCCASION_LABELS: Record<string, string> = {
  wedding: "Wedding Edit",
  party: "Party Wear",
  casual: "Everyday Luxe",
  office: "Power Dressing",
  festival: "Festival Ready",
  bridal: "Bridal Collection",
  date_night: "Date Night",
};

function getOccasionLabel(item: FeedItem): string | null {
  if (!item.occasion?.length) return null;
  return OCCASION_LABELS[item.occasion[0]] || item.occasion[0].replace(/_/g, " ");
}

interface HomeProps {
  trendingTemplates: Template[];
  templatesByStack: Map<string, Template[]>;
  isLoading?: boolean;
  onSelectTemplate: (template: Template) => void;
  onTryOn?: (template: Template) => void;
  user?: User | null;
  onLoginRequired?: () => void;
  onboardingPercent?: number;
  onOpenOnboarding?: () => void;
  wishlistedIds?: Set<string>;
  onToggleWishlist?: (templateId: string) => void;
}

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

export const Home: React.FC<HomeProps> = ({
  trendingTemplates,
  user,
  onLoginRequired,
  onboardingPercent,
  onOpenOnboarding,
}) => {
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const viewedRef = useRef<Set<string>>(new Set());
  const clickedRef = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const homeScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileNavRef = useRef<HTMLDivElement | null>(null);

  // Reset scroll to top on mount so page starts at first card
  useEffect(() => {
    window.scrollTo(0, 0);
    if (homeScrollRef.current) homeScrollRef.current.scrollTop = 0;
  }, []);

  // When feed data swaps in, reset scroll to prevent snap jumping to wrong card
  useEffect(() => {
    if (homeScrollRef.current) homeScrollRef.current.scrollTop = 0;
  }, [feedItems]);

  // Callback ref: attach scroll listener immediately when scroll container mounts.
  // Uses direct DOM manipulation (no React state) so the animation is instant + reliable.
  const homeScrollCallbackRef = useCallback((el: HTMLDivElement | null) => {
    homeScrollRef.current = el;
    if (!el) return;
    let lastY = 0;
    const setNavVisible = (visible: boolean) => {
      const nav = mobileNavRef.current;
      if (!nav) return;
      nav.style.transform = visible ? 'translateY(0)' : 'translateY(-100%)';
      nav.style.opacity = visible ? '1' : '0';
    };
    const onScroll = () => {
      const y = el.scrollTop;
      setNavVisible(y < 30 || y < lastY);
      lastY = y;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
  }, []);

  const displayItems = useMemo(() => {
    if (feedItems.length > 0) return feedItems;
    return trendingTemplates.map(templateToFeedItem);
  }, [feedItems, trendingTemplates]);

  const topPicks = useMemo(() => displayItems.slice(0, 5), [displayItems]);

  /* ── Group items by occasion for category grid ── */
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, FeedItem[]>();
    for (const item of displayItems) {
      const occ = item.occasion?.[0] || "trending";
      if (!groups.has(occ)) groups.set(occ, []);
      const arr = groups.get(occ)!;
      if (arr.length < 6) arr.push(item);
    }
    return Array.from(groups.entries())
      .filter(([, items]) => items.length >= 1)
      .slice(0, 6);
  }, [displayItems]);

  const loadFeed = useCallback(async (startOffset: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true);
      else setFeedLoading(true);
      const response = await fetchFeed(30, startOffset);
      setFeedItems((prev) => (append ? [...prev, ...response.items] : response.items));
      setHasMore(response.hasMore);
      setOffset(startOffset + response.items.length);
    } catch {
      // Silent — fallback to trendingTemplates
    } finally {
      setFeedLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadFeed(0, false); }, [loadFeed, user?.id]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasMore && !loadingMore) loadFeed(offset, true);
      },
      { threshold: 0.1 },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, offset, loadFeed]);

  // Track views + skip penalty
  const cardObserver = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    cardObserver.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pid = entry.target.getAttribute("data-pid");
          if (!pid) continue;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!viewedRef.current.has(pid)) {
              viewedRef.current.add(pid);
              trackEvent(pid, "view", { source: "for-you-feed" });
            }
          } else if (!entry.isIntersecting && viewedRef.current.has(pid) && !clickedRef.current.has(pid)) {
            trackEvent(pid, "skip", { source: "for-you-feed" });
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

  const handleTryOn = (productId: string) => {
    clickedRef.current.add(productId);
    if (!user) { onLoginRequired?.(); return; }
    trackEvent(productId, "try_on", { source: "for-you-feed" });
    navigate(`/changing-room?product=${productId}`);
  };

  const handleProductClick = (productId: string) => {
    clickedRef.current.add(productId);
    navigate(`/product/${productId}`);
  };

  /* ── Loading state ── */
  if (feedLoading && feedItems.length === 0 && trendingTemplates.length === 0) {
    return (
      <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-7 h-7 border-2 border-[#c9a962]/40 border-t-[#c9a962] rounded-full animate-spin" />
          <p className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] font-serif italic">
            Curating your looks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={homeScrollCallbackRef} data-home-scroll="true" className="w-full h-full overflow-y-scroll snap-y snap-proximity overscroll-y-contain scrollbar-hide bg-[#0a0a0a]" style={{ scrollPaddingBottom: '56px' }}>

      {/* ═══ MOBILE TOP NAV — premium brand bar, hides on scroll ═══ */}
      <div
        ref={mobileNavRef}
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-start h-[52px] px-4 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#1a1a1a]/60"
        style={{ transform: 'translateY(0)', opacity: '1', transition: 'transform 400ms cubic-bezier(0.25,1,0.5,1), opacity 400ms cubic-bezier(0.25,1,0.5,1)' }}
      >
        <div className="flex items-center gap-2">
          <img src="/ico/favicon.svg" alt="Stiri" width="28" height="28" className="block" />
          <span
            className="text-[18px] font-light tracking-[0.08em] text-[#f5f5f5]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            stiri
          </span>
          <span className="w-[3px] h-[3px] rounded-full bg-[#c9a962]/60" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#c9a962]/60 font-medium">in</span>
        </div>
      </div>

      {/* ═══ HERO — entry point ═══ */}
      <header className="snap-start snap-always pt-[60px] md:pt-8 pb-4 md:pb-6 px-5 md:px-[7.5vw]">
        <p className="text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-[#c9a962]/70 font-medium mb-2 md:hidden" style={{ fontFamily: "var(--font-serif)" }}>
          fashion, personalized
        </p>
        <p className="text-[11px] tracking-[0.2em] uppercase text-[#c9a962]/70 font-medium mb-2 hidden md:block" style={{ fontFamily: "var(--font-serif)" }}>
          Stiri &mdash; fashion, personalized
        </p>
        <h1
          className="text-[26px] md:text-[42px] font-light text-[#f5f5f5] tracking-[-0.02em] leading-[1.2]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Looks crafted <span className="text-[#c9a962] italic font-normal">only for you</span>
        </h1>

        {/* Onboarding progress */}
        {user && onboardingPercent !== undefined && onboardingPercent < 100 && (
          <button
            onClick={onOpenOnboarding}
            className="mt-5 flex items-center gap-3 px-4 py-2.5 rounded-full border border-[#2a2a2a] hover:border-[#c9a962]/40 bg-[#141414] transition-all group cursor-pointer"
          >
            <div className="relative w-7 h-7 shrink-0">
              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#1a1a1a" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#c9a962" strokeWidth="2.5" strokeDasharray={`${onboardingPercent} 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-[#c9a962]">{onboardingPercent}%</span>
            </div>
            <span className="text-[12px] text-[#6b6b6b] group-hover:text-[#a0a0a0] transition-colors">
              Complete style profile
            </span>
          </button>
        )}
      </header>

      {/* ═══ TRENDING CAROUSEL ═══ */}
      {topPicks.length > 0 && (
        <TrendingCarousel
          className="snap-start snap-always"
          items={topPicks}
          onTryOn={handleTryOn}
          onClick={handleProductClick}
          observeCard={observeCard}
        />
      )}

      {/* ═══ CATEGORY GRID — editorial tiles by occasion ═══ */}
      {categoryGroups.length > 0 && (
        <section className="snap-start snap-always mt-10 md:mt-14 px-4 md:px-[7.5vw]">
          <div className="flex items-baseline justify-between mb-5 md:mb-6">
            <h2
              className="text-[18px] md:text-[22px] font-light text-[#f5f5f5] tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Shop by <span className="text-[#c9a962] italic">occasion</span>
            </h2>
            <span className="text-[10px] tracking-[0.15em] uppercase text-[#6b6b6b]">{categoryGroups.length} collections</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {categoryGroups.map(([occasion, items], idx) => {
              const label = OCCASION_LABELS[occasion] || occasion.replace(/_/g, " ");
              const heroItem = items[0];
              // First two on mobile get taller treatment
              const isFeature = idx < 2;

              return (
                <div
                  key={occasion}
                  role="button"
                  tabIndex={0}
                  onClick={() => heroItem && handleProductClick(heroItem.product_id)}
                  className={`
                    relative rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer group
                    ${isFeature ? 'aspect-[3/4]' : 'aspect-[4/5]'}
                  `}
                >
                  {heroItem?.image ? (
                    <img
                      src={heroItem.image}
                      alt={label}
                      className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]" />
                  )}

                  {/* Dark vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

                  {/* Category label */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                    <p
                      className="text-[14px] md:text-[16px] font-medium text-white tracking-wide capitalize leading-tight"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {label}
                    </p>
                    <span className="text-[10px] text-white/40 tracking-[0.1em] uppercase mt-1 block">
                      {items.length} {items.length === 1 ? 'look' : 'looks'}
                    </span>
                  </div>

                  {/* Subtle gold corner accent on hover */}
                  <div className="absolute top-3 right-3 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
                      <path d="M6 2h12v12" stroke="#c9a962" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ CURATED FEED — snap-scroll cards, one per screen ═══ */}
      {displayItems.length > 0 && (
        <>
          {/* Section label — inline, not a snap point */}
          <div className="px-5 md:px-[7.5vw] pt-12 md:pt-16 pb-4">
            <h2
              className="text-[22px] md:text-[28px] font-light text-[#f5f5f5] tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Curated <span className="text-[#c9a962] italic">for you</span>
            </h2>
            <p className="text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mt-2">
              Ranked by your style profile
            </p>
          </div>

          {displayItems.map((item) => (
            <CuratedCard
              key={item.product_id}
              item={item}
              onTryOn={handleTryOn}
              onClick={handleProductClick}
              observeRef={observeCard}
              scrollRoot={homeScrollRef}
            />
          ))}
        </>
      )}

      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#c9a962]/30 border-t-[#c9a962] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════
   TRENDING CAROUSEL — 85vw hero snap cards (original nopromt.ai)
   Gold quote, "Try-on" CTA with hover fill, intersection focus
   ═══════════════════════════════════════════════════════════════════ */

interface TrendingCarouselProps {
  items: FeedItem[];
  onTryOn: (productId: string) => void;
  onClick: (productId: string) => void;
  observeCard: (el: HTMLDivElement | null) => void;
  className?: string;
}

const TrendingCarousel: React.FC<TrendingCarouselProps> = ({ items, onTryOn, onClick, observeCard, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  // Mobile: JS-driven horizontal swipe (no overflow-x, no scroll hijacking)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
    if (!isMobile) return;
    if (!el) return;
    let startX = 0, startY = 0, locked = '', dragging = false, startScrollLeft = 0;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startScrollLeft = el.scrollLeft;
      locked = '';
      dragging = false;
    };
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!locked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        locked = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h';
      }
      if (locked === 'h') {
        e.preventDefault();
        dragging = true;
        el.scrollLeft = startScrollLeft - dx;
      }
      // 'v' = don't interfere, page scrolls normally
    };
    const onEnd = () => {
      if (dragging) {
        // Snap to nearest card
        const cardW = el.querySelector('[data-card-id]');
        if (cardW) {
          const gap = 16;
          const w = (cardW as HTMLElement).clientWidth + gap;
          const idx = Math.round(el.scrollLeft / w);
          el.scrollTo({ left: idx * w, behavior: 'smooth' });
          setActiveIndex(Math.max(0, Math.min(idx, items.length - 1)));
        }
      }
      locked = '';
      dragging = false;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [isMobile, items.length]);

  // Desktop: intersection observer for focus state
  useEffect(() => {
    if (isMobile) {
      // On mobile, use activeIndex for focus
      if (items[activeIndex]) setFocusedId(items[activeIndex].product_id);
      return;
    }
    const container = scrollRef.current;
    if (!container) return;
    const obs = new IntersectionObserver(
      (entries) => {
        let bestId: string | null = null;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const cid = entry.target.getAttribute("data-card-id");
          if (!cid) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && entry.intersectionRatio > bestRatio) {
            bestId = cid;
            bestRatio = entry.intersectionRatio;
          }
        });
        if (bestId) setFocusedId(bestId);
      },
      { root: container, rootMargin: "-15% 0px -15% 0px", threshold: [0.5, 0.6, 0.7, 0.8] },
    );
    cardRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items, isMobile, activeIndex]);

  const scroll = (dir: "left" | "right") => {
    const c = scrollRef.current;
    if (!c) return;
    const firstCard = c.querySelector("[data-card-id]");
    const gap = window.innerWidth < 768 ? 16 : 24;
    const amount = firstCard ? (firstCard as HTMLElement).clientWidth + gap : 300;
    c.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className={`relative overflow-hidden ${className || ''}`}>
      <div className="w-full relative">
        {/* Scroll arrows — transparent, appear on hover */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#f5f5f5] hover:bg-white/5 transition-all active:scale-95 cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeftIcon />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#f5f5f5] hover:bg-white/5 transition-all active:scale-95 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRightIcon />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-hidden md:overflow-x-auto md:overflow-y-hidden md:snap-x md:snap-mandatory scrollbar-hide items-center px-[7.5vw]"
          style={{ touchAction: 'pan-y', scrollPaddingLeft: '7.5vw' }}
        >
          {items.map((item, i) => {
            const isFocused = focusedId === item.product_id;

            return (
              <div
                key={item.product_id}
                ref={(el) => { setCardRef(item.product_id, el); observeCard(el); }}
                data-card-id={item.product_id}
                data-pid={item.product_id}
                className="md:snap-center md:snap-always shrink-0 flex justify-center first:scroll-ml-0"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onClick(item.product_id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(item.product_id); } }}
                  className={`
                    w-[78vw] md:w-[60vw] max-w-[1100px]
                    aspect-[3/4] md:aspect-[16/9]
                    max-h-[65svh] md:max-h-[70vh]
                    rounded-[24px] md:rounded-[32px] overflow-hidden
                    relative cursor-pointer group
                    transform transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
                    bg-[#0a0a0a]
                    ${isFocused
                      ? "scale-[1.02] md:scale-[1.01]"
                      : "scale-100 opacity-85"
                    }
                  `}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      decoding="async"
                      className={`w-full h-full object-cover object-top md:object-[center_15%] transition-transform duration-[1.5s] ease-out ${isFocused ? "scale-105" : "scale-100"}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#141414] to-[#0a0a0a]" />
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />



                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
                    {/* "Try-on" CTA with gold hover fill */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onTryOn(item.product_id); }}
                      className="relative overflow-hidden group/button bg-white rounded-full font-bold tracking-wide flex items-center justify-center w-fit mb-4 px-6 py-2.5 text-sm md:px-10 md:py-4 md:text-base active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                      <span className="relative z-10 text-[#0a0a0a] group-hover/button:text-white transition-colors duration-[600ms] ease-out">
                        Try-on
                      </span>
                      <div className="absolute inset-0 z-0 bg-[#c9a962] translate-y-[101%] group-hover/button:translate-y-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]" />
                    </button>

                    {/* Title — bold uppercase */}
                    <h3
                      className="text-white text-[28px] md:text-[42px] lg:text-[56px] font-bold uppercase tracking-tight leading-[1.0] mb-2 md:mb-4 max-w-[90%]"
                    >
                      {item.title}
                    </h3>

                    {/* Price */}
                    {item.min_price != null && (
                      <p className="text-white/50 text-[14px] md:text-[16px] font-medium tabular-nums mb-3">
                        ₹{Math.round(item.min_price / 100)}
                      </p>
                    )}


                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


/* ═══════════════════════════════════════════════════════════════════
   CURATED CARD — Reels-style snap card for the ranked feed
   Uses page-level snap-y snap-mandatory (on homeScrollRef)
   ═══════════════════════════════════════════════════════════════════ */

interface CuratedCardProps {
  item: FeedItem;
  onTryOn: (productId: string) => void;
  onClick: (productId: string) => void;
  observeRef: (el: HTMLDivElement | null) => void;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
}

const CuratedCard: React.FC<CuratedCardProps> = ({ item, onTryOn, onClick, observeRef, scrollRoot }) => {
  const [isFocused, setIsFocused] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsFocused(entry.isIntersecting && entry.intersectionRatio >= 0.5);
      },
      { root: scrollRoot.current, rootMargin: "-10% 0px -10% 0px", threshold: [0, 0.3, 0.5, 0.7] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [scrollRoot]);

  return (
    <div
      ref={(el) => { cardRef.current = el; observeRef(el); }}
      data-pid={item.product_id}
      className="snap-center snap-always shrink-0 w-full px-4 md:px-[7.5vw] flex items-center justify-center"
      style={{ minHeight: 'calc(100svh - 56px)', paddingTop: '2vh', paddingBottom: 'calc(2vh + 56px)' }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(item.product_id)}
        className={`
          w-full max-w-[1000px] md:max-w-[1400px]
          rounded-[24px] md:rounded-[40px] overflow-hidden
          relative cursor-pointer group
          transform transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]
          bg-[#0a0a0a]
          ${isFocused
            ? 'scale-100 opacity-100'
            : 'scale-[0.96] opacity-60'
          }
        `}
        style={{ aspectRatio: '3/4', maxHeight: '80svh' }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            decoding="async"
            className={`w-full h-full object-cover object-top transition-transform duration-[1.5s] ease-out ${isFocused ? "scale-105" : "scale-100"}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#141414] to-[#0a0a0a]" />
        )}

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Occasion tag */}
        {item.occasion?.[0] && (
          <span className="absolute top-3 left-3 px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase font-medium text-[#c9a962] bg-black/60 backdrop-blur-sm rounded-full">
            {OCCASION_LABELS[item.occasion[0]] || item.occasion[0].replace(/_/g, " ")}
          </span>
        )}

        {/* Bottom content */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 md:p-10 transition-all duration-700 ${isFocused ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-40'}`}>
          {/* Try-on CTA */}
          <button
            onClick={(e) => { e.stopPropagation(); onTryOn(item.product_id); }}
            className="relative overflow-hidden bg-white rounded-full font-bold tracking-wide flex items-center justify-center w-fit mb-4 px-6 py-2.5 text-sm md:px-10 md:py-4 md:text-base active:scale-95 transition-all duration-300 cursor-pointer group/btn"
          >
            <span className="relative z-10 text-[#0a0a0a] group-hover/btn:text-white transition-colors duration-[600ms] ease-out">
              Try-on
            </span>
            <div className="absolute inset-0 z-0 bg-[#c9a962] translate-y-[101%] group-hover/btn:translate-y-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]" />
          </button>

          {/* Title */}
          <h3 className="text-white text-[24px] md:text-[36px] lg:text-[48px] font-bold uppercase tracking-tight leading-[1.0] mb-2 md:mb-4 max-w-[90%]">
            {item.title}
          </h3>

          {/* Price */}
          {item.min_price != null && (
            <p className="text-white/50 text-[14px] md:text-[16px] font-medium tabular-nums">
              ₹{Math.round(item.min_price / 100)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════
   FEED CARD — Full-width snap card for the main feed stream
   (old TemplateGrid style — vertical snap, "Try-on" CTA)
   ═══════════════════════════════════════════════════════════════════ */

interface FeedCardProps {
  item: FeedItem;
  index: number;
  onTryOn: () => void;
  onClick: () => void;
  observeRef: (el: HTMLDivElement | null) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ item, index, onTryOn, onClick, observeRef }) => {
  const [isFocused, setIsFocused] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsFocused(entry.isIntersecting && entry.intersectionRatio >= 0.5);
      },
      { root: null, rootMargin: "-10% 0px -10% 0px", threshold: [0, 0.3, 0.5, 0.7] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={(el) => { cardRef.current = el; observeRef(el); }}
      data-pid={item.product_id}
      className="w-full px-4 md:px-[7.5vw] snap-start snap-always"
      style={{ minHeight: "68svh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "2vh", paddingBottom: "2vh" }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
        className={`
          w-full max-w-[1000px] md:max-w-[1400px]
          rounded-[24px] md:rounded-[40px] overflow-hidden
          relative cursor-pointer group
          transform transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
          bg-[#0a0a0a]
          ${isFocused
            ? "scale-100 opacity-100"
            : "scale-[0.96] opacity-60"
          }
        `}
        style={{ aspectRatio: "3/4", maxHeight: "80svh" }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            decoding="async"
            className={`w-full h-full object-cover object-top transition-transform duration-[1.5s] ease-out ${isFocused ? "scale-105" : "scale-100"}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#141414] to-[#0a0a0a]" />
        )}

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />



        {/* Bottom content */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 md:p-10 transition-all duration-700 ${isFocused ? "translate-y-0 opacity-100" : "translate-y-2 opacity-40"}`}>
          {/* "Try-on" CTA */}
          <button
            onClick={(e) => { e.stopPropagation(); onTryOn(); }}
            className="relative overflow-hidden group/button bg-white rounded-full font-bold tracking-wide flex items-center justify-center w-fit mb-4 px-6 py-2.5 text-sm md:px-8 md:py-3 md:text-base active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <span className="relative z-10 text-[#0a0a0a] group-hover/button:text-white transition-colors duration-[600ms] ease-out">
              Try-on
            </span>
            <div className="absolute inset-0 z-0 bg-[#c9a962] translate-y-[101%] group-hover/button:translate-y-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]" />
          </button>

          {/* Title */}
          <h2 className="text-white text-[28px] md:text-[42px] font-bold uppercase tracking-tight leading-[1.0] mb-2 max-w-[85%]">
            {item.title}
          </h2>

          {/* Price */}
          {item.min_price != null && (
            <p className="text-white/50 text-[14px] font-medium tabular-nums mb-3">
              ₹{Math.round(item.min_price / 100)}
            </p>
          )}


        </div>
      </div>
    </div>
  );
};
