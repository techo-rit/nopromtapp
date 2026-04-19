import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFeed } from "../feed/feedService";
import { trackEvent } from "../tracking/trackingService";
import { getManifestationQuote } from "../../data/manifestationQuotes";
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

function getGarmentLabel(item: FeedItem): string | null {
  if (!item.garment_type) return null;
  return item.garment_type.replace(/_/g, " ");
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
  const [activeIdx, setActiveIdx] = useState(0);
  const viewedRef = useRef<Set<string>>(new Set());
  const clickedRef = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const displayItems = useMemo(() => {
    if (feedItems.length > 0) return feedItems;
    return trendingTemplates.map(templateToFeedItem);
  }, [feedItems, trendingTemplates]);

  const topPicks = useMemo(() => displayItems.slice(0, 5), [displayItems]);
  const feedStream = useMemo(() => displayItems, [displayItems]);

  /* ── Group items by occasion for category sections ── */
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, FeedItem[]>();
    for (const item of displayItems.slice(5)) {
      const occ = item.occasion?.[0] || 'trending';
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
      setFeedItems((prev) => append ? [...prev, ...response.items] : response.items);
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

  // Track views + skip penalty (viewed but didn't interact)
  const cardObserver = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    cardObserver.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pid = entry.target.getAttribute("data-pid");
          if (!pid) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Card entered viewport — track view
            if (!viewedRef.current.has(pid)) {
              viewedRef.current.add(pid);
              trackEvent(pid, "view", { source: "for-you-feed" });
            }
          } else if (!entry.isIntersecting && viewedRef.current.has(pid) && !clickedRef.current.has(pid)) {
            // Card LEFT viewport without any interaction → skip penalty
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

  if (feedLoading && feedItems.length === 0 && trendingTemplates.length === 0) {
    return (
      <div className="w-full h-full bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="w-8 h-8 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
          <p className="text-[11px] tracking-[0.3em] uppercase text-white/20" style={{ fontFamily: "var(--font-display)" }}>
            Curating your looks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-home-scroll="true" className="w-full h-full overflow-y-auto scrollbar-hide bg-base">

      {/* ═══ EDITORIAL HEADER ═══ */}
      <header className="relative pt-14 pb-8 md:pt-20 md:pb-12 px-6 md:px-[7.5vw]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
          <span className="text-[10px] tracking-[0.35em] uppercase text-gold/60" style={{ fontFamily: "var(--font-display)" }}>
            Styled for you
          </span>
        </div>
        <h1
          className="text-[36px] md:text-[56px] lg:text-[72px] font-light text-white leading-[1.05] tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your
          <span className="block italic font-normal text-gold">Edit</span>
        </h1>
        <p className="mt-4 text-[13px] md:text-[15px] text-white/30 max-w-md leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {feedItems.length > 0
            ? `${feedItems.length} looks curated from your style DNA`
            : "Explore our latest collection"
          }
        </p>

        {/* Onboarding */}
        {user && onboardingPercent !== undefined && onboardingPercent < 100 && (
          <button
            onClick={onOpenOnboarding}
            className="mt-5 flex items-center gap-3 px-4 py-2.5 rounded-full border border-gold/20 hover:border-gold/40 bg-gold/5 transition-all group"
          >
            <div className="relative w-8 h-8 shrink-0">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#1a1a1a" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#c9a962" strokeWidth="2.5" strokeDasharray={`${onboardingPercent} 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-gold">{onboardingPercent}%</span>
            </div>
            <span className="text-[12px] text-white/50 group-hover:text-primary/70 transition-colors tracking-wide">
              Complete style profile
            </span>
            <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-gold transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </header>

      {/* ═══ HERO CAROUSEL — "Only For You" top 5 picks ═══ */}
      {topPicks.length > 0 && (
        <>
          <div className="px-6 md:px-[7.5vw] mb-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-gold" />
              <h2 className="text-[13px] md:text-[14px] tracking-[0.2em] uppercase text-gold font-medium font-display">
                Only For You
              </h2>
            </div>
            <p className="text-[12px] text-tertiary mt-1 ml-[calc(4px+12px+12px)]">
              Top picks based on your style DNA
            </p>
          </div>
          <HeroCarousel
            items={topPicks}
            onTryOn={handleTryOn}
            onClick={handleProductClick}
            observeCard={observeCard}
          />
        </>
      )}

      {/* ═══ CATEGORY SECTIONS — grouped by occasion ═══ */}
      {categoryGroups.length > 0 && (
        <section className="mt-10 md:mt-14">
          {categoryGroups.map(([occasion, items]) => {
            const label = OCCASION_LABELS[occasion] || occasion.replace(/_/g, ' ');
            return (
              <div key={occasion} className="mb-10">
                <div className="px-6 md:px-[7.5vw] mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 rounded-full bg-border-active" />
                    <h3 className="text-[13px] tracking-[0.15em] uppercase text-secondary font-medium font-display">{label}</h3>
                  </div>
                  <span className="text-[11px] text-tertiary tabular-nums">{items.length} looks</span>
                </div>
                <div className="flex overflow-x-auto gap-3 px-6 md:px-[7.5vw] snap-x snap-mandatory scrollbar-hide pb-2">
                  {items.map((item) => (
                    <div
                      key={item.product_id}
                      ref={observeCard}
                      data-pid={item.product_id}
                      className="snap-start shrink-0 w-[45vw] md:w-[220px] group"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleProductClick(item.product_id)}
                        className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer"
                      >
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover object-top" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-surface to-base" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h4 className="text-[13px] font-semibold text-white leading-tight line-clamp-2 mb-1">{item.title}</h4>
                          {item.min_price != null && (
                            <span className="text-[11px] text-white/60 tabular-nums">₹{Math.round(item.min_price / 100)}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleTryOn(item.product_id)}
                        className="w-full mt-2 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase text-gold border border-gold/30 rounded-lg hover:bg-gold-subtle transition-all active:scale-[0.97]"
                      >
                        Try On
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ═══ TRANSITION DIVIDER ═══ */}
      <div className="px-6 md:px-[7.5vw] py-10 md:py-14">
        <div className="flex items-center gap-5">
          <span
            className="text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-white/20"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Keep scrolling
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          <span className="text-[11px] text-white/15 tabular-nums">{activeIdx + 1} / {feedStream.length}</span>
        </div>
      </div>

      {/* ═══ FULL-VIEWPORT SNAP FEED — one card at a time ═══ */}
      <section className="pb-32">
        <div className="flex flex-col items-center">
          {feedStream.map((item, i) => (
            <EditorialCard
              key={item.product_id}
              item={item}
              index={i}
              total={feedStream.length}
              onTryOn={() => handleTryOn(item.product_id)}
              onClick={() => handleProductClick(item.product_id)}
              observeRef={observeCard}
              onBecomeActive={() => setActiveIdx(i)}
            />
          ))}
        </div>
      </section>

      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════
   HERO CAROUSEL — Horizontal scroll picks
   ═══════════════════════════════════════════════════════════════════ */

interface HeroCarouselProps {
  items: FeedItem[];
  onTryOn: (productId: string) => void;
  onClick: (productId: string) => void;
  observeCard: (el: HTMLDivElement | null) => void;
}

const HeroCarousel: React.FC<HeroCarouselProps> = ({ items, onTryOn, onClick, observeCard }) => {
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
      { root: container, rootMargin: "-20% 0px -20% 0px", threshold: [0.5, 0.6, 0.7, 0.8] },
    );
    cardRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  const scroll = (dir: "left" | "right") => {
    const c = scrollRef.current;
    if (!c) return;
    const firstCard = c.querySelector("[data-card-id]");
    const gap = window.innerWidth < 768 ? 16 : 32;
    const amount = firstCard ? (firstCard as HTMLElement).clientWidth + gap : 300;
    c.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden">
      <div className="w-full relative group/section">
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 md:w-14 md:h-14 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white/70 hover:text-primary hover:bg-black/50 transition-all duration-300 active:scale-95"
          aria-label="Scroll left"
        >
          <ChevronLeftIcon />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 md:w-14 md:h-14 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white/70 hover:text-primary hover:bg-black/50 transition-all duration-300 active:scale-95"
          aria-label="Scroll right"
        >
          <ChevronRightIcon />
        </button>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 md:gap-8 snap-x snap-mandatory scroll-smooth scrollbar-hide items-center px-[7.5vw]"
        >
          {items.map((item, i) => {
            const isFocused = focusedId === item.product_id;
            const quote = getManifestationQuote(item.title);
            const occasionLabel = getOccasionLabel(item);

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
                    w-[85vw] md:w-[85vw] max-w-[1600px]
                    aspect-[4/5] md:aspect-[16/9]
                    rounded-[24px] md:rounded-[40px] overflow-hidden
                    relative cursor-pointer group
                    transform transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
                    bg-surface border shadow-2xl
                    ${isFocused ? "scale-[1.02] md:scale-[1.01] border-white/15" : "scale-100 opacity-90 md:opacity-100 border-white/5"}
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
                    <div className="w-full h-full bg-gradient-to-br from-surface to-base" />
                  )}

                  {/* Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

                  {/* Top labels */}
                  <div className="absolute top-5 left-5 md:top-8 md:left-10 flex items-center gap-2">
                    {item.is_new_arrival && (
                      <span className="px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] rounded-full bg-gold text-base">
                        New
                      </span>
                    )}
                    {occasionLabel && (
                      <span className="px-3 py-1 text-[9px] font-medium uppercase tracking-[0.12em] rounded-full bg-white/10 backdrop-blur-md text-white/70 border border-border">
                        {occasionLabel}
                      </span>
                    )}
                    {item.isExploration && (
                      <span className="px-3 py-1 text-[9px] font-medium uppercase tracking-[0.12em] rounded-full bg-white/10 backdrop-blur-md text-white/50 border border-border">
                        Discover
                      </span>
                    )}
                  </div>

                  {/* Card number */}
                  <div className="absolute top-5 right-5 md:top-8 md:right-10">
                    <span className="text-[11px] tabular-nums text-white/20 tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute inset-0 p-6 md:p-14 flex flex-col justify-end items-start">
                    <button
                      onClick={(e) => { e.stopPropagation(); onTryOn(item.product_id); }}
                      className="relative overflow-hidden group/button bg-white rounded-full font-bold tracking-wide flex items-center justify-center w-fit shadow-[0_0_20px_rgba(255,255,255,0.3)] mb-3 md:mb-6 px-6 py-2.5 text-sm md:px-10 md:py-4 md:text-lg active:scale-95 transition-all duration-300"
                    >
                      <span className="relative z-10 text-base group-hover/button:text-white transition-colors duration-[600ms] ease-out">
                        Try On
                      </span>
                      <div className="absolute inset-0 z-0 bg-gold-hover translate-y-[101%] group-hover/button:translate-y-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]" />
                    </button>

                    <h3
                      className="text-white text-[32px] md:text-[48px] lg:text-[64px] font-bold uppercase tracking-[-0.01em] md:leading-[1.0] drop-shadow-2xl mb-2 md:mb-4 max-w-[90%]"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {item.title}
                    </h3>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                      {item.min_price != null && (
                        <span className="text-white/60 text-[14px] md:text-[16px] font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {"\u20B9"}{Math.round(item.min_price / 100)}
                        </span>
                      )}
                      {item.style_tags && item.style_tags.length > 0 && (
                        <>
                          <span className="w-px h-3 bg-white/15" />
                          <span className="text-white/30 text-[12px] capitalize tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            {item.style_tags.slice(0, 2).map(t => t.replace(/_/g, " ")).join(" \u00B7 ")}
                          </span>
                        </>
                      )}
                      {item.color_family && item.color_family.length > 0 && (
                        <>
                          <span className="w-px h-3 bg-white/15" />
                          <span className="text-white/25 text-[11px] capitalize" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            {item.color_family[0]}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Quote */}
                    <p className={`text-gold text-[16px] md:text-[19px] lg:text-[21px] italic transition-all duration-700 max-w-2xl ${isFocused ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      {quote}
                    </p>
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
   EDITORIAL CARD — Full-viewport snap card (one at a time)
   ═══════════════════════════════════════════════════════════════════ */

interface EditorialCardProps {
  item: FeedItem;
  index: number;
  total: number;
  onTryOn: () => void;
  onClick: () => void;
  observeRef: (el: HTMLDivElement | null) => void;
  onBecomeActive: () => void;
}

const EditorialCard: React.FC<EditorialCardProps> = ({ item, index, total, onTryOn, onClick, observeRef, onBecomeActive }) => {
  const [isFocused, setIsFocused] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const focused = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        setIsFocused(focused);
        if (focused) onBecomeActive();
      },
      { root: null, rootMargin: "-5% 0px -5% 0px", threshold: [0, 0.3, 0.5, 0.7] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onBecomeActive]);

  const quote = getManifestationQuote(item.title);
  const occasionLabel = getOccasionLabel(item);
  const garmentLabel = getGarmentLabel(item);

  return (
    <div
      ref={(el) => { cardRef.current = el; observeRef(el); }}
      data-pid={item.product_id}
      className="w-full px-4 md:px-[7.5vw] snap-start snap-always"
      style={{ minHeight: "90svh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "2vh", paddingBottom: "2vh" }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
        className={`
          w-full max-w-[1600px]
          rounded-[28px] md:rounded-[44px] overflow-hidden
          relative cursor-pointer group
          transform transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
          bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.5)]
          ${isFocused
            ? "scale-100 opacity-100 border border-border"
            : "scale-[0.94] opacity-50 border border-white/[0.03]"
          }
        `}
        style={{ aspectRatio: "3/4", maxHeight: "86svh" }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            decoding="async"
            className={`w-full h-full object-cover object-top md:object-[center_20%] transition-transform duration-[2s] ease-out ${isFocused ? "scale-110" : "scale-100"}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface to-base" />
        )}

        {/* Multi-layered gradient for editorial depth */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.2) 100%)",
        }} />

        {/* ── Top bar: labels + index ── */}
        <div className="absolute top-0 left-0 right-0 p-5 md:p-10 flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {item.is_new_arrival && (
              <span className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] rounded-full bg-gold text-base shadow-lg">
                New In
              </span>
            )}
            {occasionLabel && (
              <span className="px-3 py-1 text-[9px] font-medium uppercase tracking-[0.12em] rounded-full bg-white/8 backdrop-blur-lg text-white/60 border border-border">
                {occasionLabel}
              </span>
            )}
            {garmentLabel && (
              <span className="px-3 py-1 text-[9px] font-medium uppercase tracking-[0.12em] rounded-full bg-white/8 backdrop-blur-lg text-white/40 border border-white/8">
                {garmentLabel}
              </span>
            )}
            {item.isExploration && (
              <span className="px-3 py-1 text-[9px] font-medium uppercase tracking-[0.12em] rounded-full bg-gold/10 backdrop-blur-lg text-gold/70 border border-gold/20">
                For You
              </span>
            )}
          </div>
          <span
            className="text-[12px] tabular-nums text-white/15 tracking-widest"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {String(index + 1).padStart(2, "0")}<span className="text-white/8">/{String(total).padStart(2, "0")}</span>
          </span>
        </div>

        {/* ── Bottom content ── */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 md:p-12 transition-all duration-700 ${isFocused ? "translate-y-0 opacity-100" : "translate-y-3 opacity-40"}`}>
          {/* Style tags as editorial labels */}
          {item.style_tags && item.style_tags.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              {item.style_tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-white/30"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}
                >
                  {tag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h2
            className="text-white text-[36px] md:text-[52px] lg:text-[68px] font-bold uppercase tracking-[-0.02em] leading-[0.95] drop-shadow-2xl mb-4 md:mb-6"
            style={{ fontFamily: "var(--font-sans)", maxWidth: "85%" }}
          >
            {item.title}
          </h2>

          {/* Price + color info */}
          <div className="flex items-center gap-3 mb-5 md:mb-7">
            {item.min_price != null && (
              <span className="text-white/70 text-[16px] md:text-[18px] font-medium tracking-wide" style={{ fontVariantNumeric: "tabular-nums" }}>
                {"\u20B9"}{Math.round(item.min_price / 100)}
              </span>
            )}
            {item.min_price != null && item.max_price != null && item.max_price !== item.min_price && (
              <span className="text-white/25 text-[14px]">&ndash; {"\u20B9"}{Math.round(item.max_price / 100)}</span>
            )}
            {item.color_family && item.color_family.length > 0 && (
              <>
                <span className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-1.5">
                  {item.color_family.slice(0, 3).map((c) => (
                    <span key={c} className="text-[11px] text-white/25 capitalize" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      {c}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quote */}
          <p
            className={`text-gold text-[15px] md:text-[18px] lg:text-[20px] italic leading-relaxed transition-all duration-700 delay-100 max-w-xl mb-6 md:mb-8 ${isFocused ? "opacity-80 translate-y-0" : "opacity-0 translate-y-2"}`}
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {quote}
          </p>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onTryOn(); }}
              className="relative overflow-hidden group/button bg-white rounded-full font-bold tracking-wide flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] px-7 py-3 text-[13px] md:px-10 md:py-4 md:text-[15px] active:scale-95 transition-all duration-300"
            >
              <span className="relative z-10 text-base group-hover/button:text-white transition-colors duration-[600ms] ease-out uppercase tracking-[0.08em]">
                Try On
              </span>
              <div className="absolute inset-0 z-0 bg-gold-hover translate-y-[101%] group-hover/button:translate-y-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="px-6 py-3 md:px-8 md:py-4 rounded-full text-[12px] md:text-[13px] font-medium uppercase tracking-[0.08em] text-white/50 border border-border hover:border-white/25 hover:text-primary/70 bg-white/[0.03] backdrop-blur-sm transition-all duration-300 active:scale-95"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
