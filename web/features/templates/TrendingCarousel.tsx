import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import type { Template } from "../../types";
import { ChevronLeftIcon, ChevronRightIcon } from "../../shared/ui/Icons";

interface TrendingCarouselProps {
    templates: Template[];
    onSelectTemplate: (template: Template) => void;
}

export const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
    templates,
    onSelectTemplate,
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

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
                let best: { id: string; ratio: number } | null = null;
                entries.forEach((entry) => {
                    const cardId = entry.target.getAttribute("data-card-id");
                    if (!cardId) return;
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        if (!best || entry.intersectionRatio > best.ratio) {
                            best = { id: cardId, ratio: entry.intersectionRatio };
                        }
                    }
                });
                if (best) setFocusedCardId(best.id);
            },
            { root: container, rootMargin: "-20% 0px -20% 0px", threshold: [0.5, 0.6, 0.7, 0.8] },
        );

        cardRefs.current.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [visibleTemplates]);

    // Track scroll position to hide arrows at boundaries
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
        container.addEventListener('scroll', updateScrollButtons, { passive: true });
        window.addEventListener('resize', updateScrollButtons);
        return () => {
            container.removeEventListener('scroll', updateScrollButtons);
            window.removeEventListener('resize', updateScrollButtons);
        };
    }, [visibleTemplates, updateScrollButtons]);

    const scroll = (direction: "left" | "right") => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const firstCard = container.querySelector('[data-card-id]');
        const gap = window.innerWidth < 768 ? 16 : 32;
        const amount = firstCard ? firstCard.clientWidth + gap : 300;
        container.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
    };

    const handleCarouselWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        const page = document.querySelector('[data-home-scroll="true"]') as HTMLElement | null;
        (page || window).scrollBy({ top: e.deltaY, behavior: "auto" });
    };

    if (visibleTemplates.length === 0) return null;

    return (
        <section className="bg-[#0a0a0a] pt-12 pb-6 md:py-16 relative overflow-hidden">
            <div className="w-full h-full relative group/section">

                {/* Scroll Buttons */}
                {canScrollLeft && (
                <button
                    onClick={() => scroll("left")}
                    className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 md:w-16 md:h-16 bg-transparent flex items-center justify-center text-white/80 hover:text-white hover:scale-110 transition-all duration-300 active:scale-95 drop-shadow-lg"
                    aria-label="Scroll left"
                >
                    <ChevronLeftIcon />
                </button>
                )}
                {canScrollRight && (
                <button
                    onClick={() => scroll("right")}
                    className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 md:w-16 md:h-16 bg-transparent flex items-center justify-center text-white/80 hover:text-white hover:scale-110 transition-all duration-300 active:scale-95 drop-shadow-lg"
                    aria-label="Scroll right"
                >
                    <ChevronRightIcon />
                </button>
                )}

                {/* Carousel */}
                <div
                    ref={scrollContainerRef}
                    onWheel={handleCarouselWheel}
                    className="flex overflow-x-auto gap-4 md:gap-8 snap-x snap-mandatory scroll-smooth scrollbar-hide touch-pan-y items-center px-[7.5vw]"
                >
                    {visibleTemplates.map((template) => {
                        const isFocused = focusedCardId === template.id;


                    return (
                            <div
                                key={template.id}
                                ref={(el) => setCardRef(template.id, el)}
                                data-card-id={template.id}
                                className="snap-center snap-always shrink-0 flex justify-center"
                            >
                                <div
                                    onClick={() => onSelectTemplate(template)}
                                    className={`
                                        w-[85vw] md:w-[85vw] max-w-[1600px]
                                        aspect-[4/5] md:aspect-[16/9]
                                        rounded-[24px] md:rounded-[40px] overflow-hidden
                                        relative cursor-pointer group
                                        transform transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
                                        bg-[#141414] border border-white/5 shadow-2xl
                                        ${isFocused ? "scale-[1.02] md:scale-[1.01] border-white/20" : "scale-100 opacity-90 md:opacity-100"}
                                    `}
                                >
                                    <img
                                        src={template.imageUrl}
                                        alt={template.name}
                                        decoding="async"
                                        className={`
                                            w-full h-full object-cover object-top md:object-[center_15%]
                                            transition-transform duration-[1.5s] ease-out
                                            ${isFocused ? "scale-105" : "scale-100"}
                                        `}
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                                    <div className="absolute inset-0 p-6 md:p-14 flex flex-col justify-end">
                                        <h3
                                            className={`
                                                text-white text-[32px] md:text-[48px] lg:text-[64px]
                                                font-bold uppercase tracking-[-0.01em] md:leading-[1.0]
                                                drop-shadow-2xl max-w-[90%]
                                                transition-opacity duration-500
                                                ${isFocused ? 'opacity-100' : 'opacity-70'}
                                            `}
                                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                                        >
                                            {template.name}
                                        </h3>
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

if (typeof document !== 'undefined' && !document.getElementById('scrollbar-hide-style')) {
    const style = document.createElement("style");
    style.id = 'scrollbar-hide-style';
    style.textContent = `
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
`;
    document.head.append(style);
}
