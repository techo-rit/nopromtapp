import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFeed } from "../feed/feedService";
import { trackEvent } from "../tracking/trackingService";
import { ChevronLeftIcon, ChevronRightIcon } from "../../shared/ui/Icons";
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
    min_price: t.price ? parseFloat(t.price.amount) : undefined,
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

  const displayItems = useMemo(() => {
    if (feedItems.length > 0) return feedItems;
    return trendingTemplates.map(templateToFeedItem);
  }, [feedItems, trendingTemplates]);

  const topPicks = useMemo(() => displayItems.slice(0, 5), [displayItems]);

  /* ── Group items by occasion for stack sections ── */
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, FeedItem[]>();
    for (const item of displayItems.slice(5)) {
      const occ = item.occasion?.[0] || "trending";
      if (!groups.has(occ)) groups.set(occ, []);
      const arr = groups.get(occ)!;
      if (arr.length < 6) arr.push(item);
    }
    return Array.from(groups.entries())
      .filter(([, items]) => items.length >= 2)
      .slice(0, 4);
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
    <div data-home-scroll="true" className="w-full h-full overflow-y-auto scrollbar-hide bg-[#0a0a0a]">

      {/* ═══ HEADER — "Choose your form" ═══ */}
      <header className="pt-6 pb-3 md:pt-10 md:pb-6 px-5 md:px-[7.5vw]">
        <h1
          className="text-[22px] md:text-[40px] font-light text-[#f5f5f5] tracking-[-0.02em] leading-[1.15]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Choose your <span className="text-[#c9a962] italic font-normal">form</span>
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
        <>
        <div className="px-5 md:px-[7.5vw] mb-3">
          <h2 className="text-[13px] tracking-[0.15em] uppercase text-[#c9a962]/80 font-medium" style={{ fontFamily: "var(--font-serif)" }}>
            Only For You
          </h2>
        </div>
        <TrendingCarousel
          items={topPicks}
          onTryOn={handleTryOn}
          onClick={handleProductClick}
          observeCard={observeCard}
        />
        </>
      )}

      {/* ═══ CATEGORY STACKS — horizontal scroll groups ═══ */}
      {categoryGroups.length > 0 && (
        <section className="mt-10 md:mt-14">
          {categoryGroups.map(([occasion, items]) => {
            const label = OCCASION_LABELS[occasion] || occasion.replace(/_/g, " ");
            return (
              <div key={occasion} className="mb-10">
                <div className="px-6 md:px-[7.5vw] mb-4 flex items-center justify-between">
                  <h3
                    className="text-[15px] md:text-[17px] font-medium text-[#a0a0a0] capitalize"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {label}
                  </h3>
                  <span className="text-[11px] text-[#6b6b6b] tabular-nums">{items.length} looks</span>
                </div>
                <div className="flex overflow-x-auto gap-3 px-6 md:px-[7.5vw] snap-x snap-mandatory scrollbar-hide pb-2">
                  {items.map((item) => (
                    <div
                      key={item.product_id}
                      ref={observeCard}
                      data-pid={item.product_id}
                      className="snap-start shrink-0 w-[45vw] md:w-[220px]"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleProductClick(item.product_id)}
                        className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#141414] border border-[#2a2a2a] cursor-pointer hover:border-[#3a3a3a] transition-colors"
                      >
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover object-top" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#141414] to-[#0a0a0a]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h4 className="text-[13px] font-semibold text-white leading-tight line-clamp-2 mb-1">{item.title}</h4>
                          {item.min_price != null && (
                            <span className="text-[11px] text-white/50 tabular-nums">₹{Math.round(item.min_price / 100)}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleTryOn(item.product_id)}
                        className="w-full mt-2 py-2 text-[11px] font-semibold tracking-[0.08em] uppercase text-[#c9a962] border border-[#c9a962]/30 rounded-lg hover:bg-[#c9a962]/5 transition-all active:scale-[0.97] cursor-pointer"
                      >
                        Step into
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ═══ FULL FEED — snap-scroll editorial cards ═══ */}
      {displayItems.length > 5 && (
        <section className="pb-32">
          <div className="px-6 md:px-[7.5vw] py-8">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#6b6b6b]" style={{ fontFamily: "var(--font-serif)" }}>
              Keep exploring
            </p>
          </div>
          <div className="flex flex-col items-center">
            {displayItems.slice(5).map((item, i) => (
              <FeedCard
                key={item.product_id}
                item={item}
                index={i}
                onTryOn={() => handleTryOn(item.product_id)}
                onClick={() => handleProductClick(item.product_id)}
                observeRef={observeCard}
              />
            ))}
          </div>
        </section>
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
   Gold quote, "Step into" CTA with hover fill, intersection focus
   ═══════════════════════════════════════════════════════════════════ */

interface TrendingCarouselProps {
  items: FeedItem[];
  onTryOn: (productId: string) => void;
  onClick: (productId: string) => void;
  observeCard: (el: HTMLDivElement | null) => void;
}

const TrendingCarousel: React.FC<TrendingCarouselProps> = ({ items, onTryOn, onClick, observeCard }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const obs = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null;
        entries.forEach((entry) => {
          const cid = entry.target.getAttribute("data-card-id");
          if (!cid) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!best || entry.intersectionRatio > best.ratio) best = { id: cid, ratio: entry.intersectionRatio };
          }
        });
        if (best) setFocusedId(best.id);
      },
      { root: container, rootMargin: "-15% 0px -15% 0px", threshold: [0.5, 0.6, 0.7, 0.8] },
    );
    cardRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  const scroll = (dir: "left" | "right") => {
    const c = scrollRef.current;
    if (!c) return;
    const firstCard = c.querySelector("[data-card-id]");
    const gap = window.innerWidth < 768 ? 16 : 24;
    const amount = firstCard ? (firstCard as HTMLElement).clientWidth + gap : 300;
    c.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden">
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
          className="flex overflow-x-auto gap-4 md:gap-6 snap-x snap-mandatory scroll-smooth scrollbar-hide items-center px-[7.5vw]"
          style={{ overscrollBehaviorX: 'contain' }}
          onWheel={(e) => {
            // Let vertical scrolling pass through to the page
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.currentTarget.style.overflowX = 'hidden';
              requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.style.overflowX = 'auto'; });
            }
          }}
        >
          {items.map((item, i) => {
            const isFocused = focusedId === item.product_id;

            return (
              <div
                key={item.product_id}
                ref={(el) => { setCardRef(item.product_id, el); observeCard(el); }}
                data-card-id={item.product_id}
                data-pid={item.product_id}
                className="snap-center snap-always shrink-0 flex justify-center"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onClick(item.product_id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(item.product_id); } }}
                  className={`
                    w-[78vw] md:w-[78vw] max-w-[1400px]
                    aspect-[3/4] md:aspect-[16/9]
                    rounded-[24px] md:rounded-[40px] overflow-hidden
                    relative cursor-pointer group
                    transform transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
                    bg-[#141414] border
                    ${isFocused
                      ? "scale-[1.02] md:scale-[1.01] border-white/10"
                      : "scale-100 opacity-85 border-white/5"
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
                    {/* "Step into" CTA with gold hover fill */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onTryOn(item.product_id); }}
                      className="relative overflow-hidden group/button bg-white rounded-full font-bold tracking-wide flex items-center justify-center w-fit mb-4 px-6 py-2.5 text-sm md:px-10 md:py-4 md:text-base active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                      <span className="relative z-10 text-[#0a0a0a] group-hover/button:text-white transition-colors duration-[600ms] ease-out">
                        Step into
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
   FEED CARD — Full-width snap card for the main feed stream
   (old TemplateGrid style — vertical snap, "Step into" CTA)
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
          bg-[#141414] border
          ${isFocused
            ? "scale-100 opacity-100 border-[#c9a962]/30"
            : "scale-[0.96] opacity-60 border-white/5"
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
          {/* "Step into" CTA */}
          <button
            onClick={(e) => { e.stopPropagation(); onTryOn(); }}
            className="relative overflow-hidden group/button bg-white rounded-full font-bold tracking-wide flex items-center justify-center w-fit mb-4 px-6 py-2.5 text-sm md:px-8 md:py-3 md:text-base active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <span className="relative z-10 text-[#0a0a0a] group-hover/button:text-white transition-colors duration-[600ms] ease-out">
              Step into
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
