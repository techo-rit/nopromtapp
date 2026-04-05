import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import type { Template } from "../../types";
import { ChevronLeftIcon, ChevronRightIcon } from "../../shared/ui/Icons";
import { useNavigate } from "react-router-dom";

interface TrendingCarouselProps {
    templates: Template[];
    onSelectTemplate: (template: Template) => void;
    user?: { id: string } | null;
    onLoginRequired?: () => void;
}

export const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
    templates,
    onSelectTemplate,
    user,
    onLoginRequired,
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const navigate = useNavigate();

    const visibleTemplates = useMemo(() => templates.filter(t => t.imageUrl), [templates]);

    const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
        if (el) cardRefs.current.set(id, el);
        else cardRefs.current.delete(id);
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                let bestId: string | null = null;
                let bestRatio = 0;
                entries.forEach((entry) => {
                    const cardId = entry.target.getAttribute("data-card-id");
                    if (!cardId) return;
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        if (bestId === null || entry.intersectionRatio > bestRatio) {
                            bestId = cardId;
                            bestRatio = entry.intersectionRatio;
                        }
                    }
                });
                if (bestId) {
                    setFocusedCardId(bestId);
                    const idx = visibleTemplates.findIndex(t => t.id === bestId);
                    if (idx !== -1) setFocusedIndex(idx);
                }
            },
            { root: container, rootMargin: "-20% 0px -20% 0px", threshold: [0.5, 0.6, 0.7, 0.8] },
        );

        cardRefs.current.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [visibleTemplates]);

    const updateScrollButtons = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const threshold = 10;
        setCanScrollLeft(container.scrollLeft > threshold);
        setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - threshold);
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        updateScrollButtons();
        container.addEventListener("scroll", updateScrollButtons, { passive: true });
        window.addEventListener("resize", updateScrollButtons);
        return () => {
            container.removeEventListener("scroll", updateScrollButtons);
            window.removeEventListener("resize", updateScrollButtons);
        };
    }, [visibleTemplates, updateScrollButtons]);

    const scroll = (direction: "left" | "right") => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const firstCard = container.querySelector("[data-card-id]");
        const gap = window.innerWidth < 768 ? 16 : 32;
        const amount = firstCard ? (firstCard as HTMLElement).clientWidth + gap : 300;
        container.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
    };

    const handleCarouselWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        const page = document.querySelector("[data-home-scroll='true']") as HTMLElement | null;
        (page || window).scrollBy({ top: e.deltaY, behavior: "auto" });
    };

    const handleTryOn = (e: React.MouseEvent, template: Template) => {
        e.stopPropagation();
        if (!user) {
            onLoginRequired?.();
            return;
        }
        navigate(`/changing-room?product=${template.id}`);
    };

    if (visibleTemplates.length === 0) return null;

    const dotCount = Math.min(visibleTemplates.length, 8);

    return (
        <section className="bg-[#080808] pt-8 pb-6 md:py-14 relative overflow-hidden">

            {/* Editorial section label */}
            <div className="flex items-center gap-4 px-[7.5vw] mb-5 md:mb-7">
                <span
                    className="text-[10px] md:text-[11px] font-medium text-white/35 tracking-[0.28em] uppercase"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                >
                    Trending Now
                </span>
                <div className="flex-1 h-px bg-white/[0.08]" />
            </div>

            <div className="w-full relative">

                {/* Desktop scroll arrows — minimal, ghost style */}
                {canScrollLeft && (
                    <button
                        onClick={() => scroll("left")}
                        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-50 w-12 h-12 items-center justify-center text-white/50 hover:text-white/90 transition-all duration-200 active:scale-90"
                        aria-label="Scroll left"
                    >
                        <ChevronLeftIcon />
                    </button>
                )}
                {canScrollRight && (
                    <button
                        onClick={() => scroll("right")}
                        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-50 w-12 h-12 items-center justify-center text-white/50 hover:text-white/90 transition-all duration-200 active:scale-90"
                        aria-label="Scroll right"
                    >
                        <ChevronRightIcon />
                    </button>
                )}

                <div
                    ref={scrollContainerRef}
                    onWheel={handleCarouselWheel}
                    className="flex overflow-x-auto gap-3 md:gap-6 snap-x snap-mandatory scroll-smooth scrollbar-hide touch-pan-y items-center px-[7.5vw]"
                >
                    {visibleTemplates.map((template) => {
                        const isFocused = focusedCardId === template.id;

                        return (
                            <div
                                key={template.id}
                                ref={(el) => setCardRef(template.id, el)}
                                data-card-id={template.id}
                                className="snap-center snap-always shrink-0"
                            >
                                <div
                                    onClick={() => onSelectTemplate(template)}
                                    className="relative cursor-pointer w-[85vw] md:w-[82vw] max-w-[1500px] aspect-[4/5] md:aspect-[16/9] rounded-2xl md:rounded-[28px] overflow-hidden bg-[#111]"
                                    style={{
                                        transform: isFocused
                                            ? "scale(1)"
                                            : "scale(0.96)",
                                        filter: isFocused ? "none" : "brightness(0.82)",
                                        transition: "transform 600ms cubic-bezier(0.25,1,0.5,1), filter 600ms ease, box-shadow 600ms ease",
                                        boxShadow: isFocused
                                            ? "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)"
                                            : "0 8px 24px rgba(0,0,0,0.4)",
                                    }}
                                >
                                    {/* Hero image — full brightness, this is the star */}
                                    <img
                                        src={template.imageUrl}
                                        alt={template.name}
                                        decoding="async"
                                        className="w-full h-full object-cover object-top md:object-[center_15%]"
                                        style={{
                                            transform: isFocused ? "scale(1.04)" : "scale(1)",
                                            transition: "transform 2000ms cubic-bezier(0.25,1,0.5,1)",
                                        }}
                                        loading="lazy"
                                    />

                                    {/* Narrow bottom scrim only — image stays bright */}
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.32) 28%, rgba(0,0,0,0.06) 50%, transparent 65%)",
                                        }}
                                    />

                                    {/* Text content */}
                                    <div className="absolute inset-0 p-5 md:p-10 flex flex-col justify-end">
                                        <h3
                                            className="text-white leading-[1.05] md:leading-[0.95]"
                                            style={{
                                                fontFamily: "'Playfair Display', Georgia, serif",
                                                fontStyle: "italic",
                                                fontWeight: 600,
                                                fontSize: "clamp(1.75rem, 5vw, 3.8rem)",
                                                letterSpacing: "-0.01em",
                                                textShadow: "0 1px 16px rgba(0,0,0,0.7)",
                                                opacity: isFocused ? 1 : 0.8,
                                                transform: isFocused ? "translateY(0)" : "translateY(4px)",
                                                transition: "opacity 500ms ease, transform 500ms ease",
                                                maxWidth: "75%",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {template.name}
                                        </h3>

                                        {/* Try On — frosted glass, editorial luxury */}
                                        <div
                                            className="absolute bottom-5 right-5 md:bottom-10 md:right-10"
                                            style={{
                                                opacity: isFocused ? 1 : 0,
                                                transform: isFocused ? "translateY(0) scale(1)" : "translateY(6px) scale(0.92)",
                                                transition: "opacity 350ms ease, transform 350ms ease",
                                                pointerEvents: isFocused ? "auto" : "none",
                                            }}
                                        >
                                            <button
                                                onClick={(e) => handleTryOn(e, template)}
                                                className="flex items-center gap-1.5 px-4 py-2 md:px-5 md:py-2.5 rounded-full text-white/95 text-[12px] md:text-[13px] font-medium tracking-[0.04em] whitespace-nowrap active:scale-95 transition-transform duration-100"
                                                style={{
                                                    background: "rgba(255,255,255,0.10)",
                                                    backdropFilter: "blur(16px)",
                                                    WebkitBackdropFilter: "blur(16px)",
                                                    border: "1px solid rgba(255,255,255,0.28)",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                                                }}
                                            >
                                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="opacity-80">
                                                    <path d="M6 1a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2 10.5c0-2.2 1.79-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                                                </svg>
                                                Try On
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Dot indicators — mobile */}
                {dotCount > 1 && (
                    <div className="md:hidden flex items-center justify-center gap-1.5 mt-5">
                        {Array.from({ length: dotCount }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: i === focusedIndex ? 20 : 6,
                                    height: 5,
                                    borderRadius: 99,
                                    background: i === focusedIndex ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.18)",
                                    transition: "width 300ms ease, background 300ms ease",
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

if (typeof document !== "undefined" && !document.getElementById("scrollbar-hide-style")) {
    const style = document.createElement("style");
    style.id = "scrollbar-hide-style";
    style.textContent =
        ".scrollbar-hide::-webkit-scrollbar{display:none}" +
        ".scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}";
    document.head.append(style);
}
