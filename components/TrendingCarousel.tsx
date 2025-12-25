import React, { useRef, useState, useEffect, useCallback } from "react";
import type { Template } from "../types";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { getManifestationQuote } from "../manifestationQuotes";

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

    // --- Logic for focusing cards ---
    const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
        if (el) {
            cardRefs.current.set(id, el);
        } else {
            cardRefs.current.delete(id);
        }
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const observerOptions = {
            root: container,
            rootMargin: "-20% 0px -20% 0px",
            threshold: [0.5, 0.6, 0.7, 0.8],
        };

        const handleIntersect: IntersectionObserverCallback = (entries) => {
            let mostVisibleCard: { id: string; ratio: number } | null = null;
            entries.forEach((entry) => {
                const cardId = entry.target.getAttribute("data-card-id");
                if (!cardId) return;
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    if (
                        !mostVisibleCard ||
                        entry.intersectionRatio > mostVisibleCard.ratio
                    ) {
                        mostVisibleCard = {
                            id: cardId,
                            ratio: entry.intersectionRatio,
                        };
                    }
                }
            });
            if (mostVisibleCard) {
                setFocusedCardId(mostVisibleCard.id);
            }
        };

        const observer = new IntersectionObserver(
            handleIntersect,
            observerOptions,
        );
        cardRefs.current.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [templates]);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const screenWidth = window.innerWidth;
            
            const firstCard = container.querySelector('[data-card-id]');
            let scrollAmount = 0;

            if (firstCard) {
                 const cardWidth = firstCard.clientWidth;
                 // Matches CSS gap: mobile 16px (gap-4), desktop 32px (gap-8)
                 const gap = screenWidth < 768 ? 16 : 32; 
                 const totalItemWidth = cardWidth + gap;
                 scrollAmount = direction === "left" ? -totalItemWidth : totalItemWidth;
            } else {
                 scrollAmount = direction === "left" ? -300 : 300;
            }

            container.scrollBy({
                left: scrollAmount,
                behavior: "smooth",
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, template: Template) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectTemplate(template);
        }
    };

    return (
        <section className="bg-[#0a0a0a] pt-6 pb-6 md:py-16 relative overflow-hidden">
            <div className="w-full h-full relative group/section">

                {/* Scroll Buttons */}
                {/* UX FIX: Arrows are visible on mobile but smaller to avoid overwhelming the card */}
                <div className="block">
                    <button
                        onClick={() => scroll("left")}
                        className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 md:w-16 md:h-16 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white/90 hover:bg-black/50 hover:scale-110 transition-all duration-300 active:scale-95"
                        aria-label="Scroll left"
                    >
                        <ChevronLeftIcon />
                    </button>
                    <button
                        onClick={() => scroll("right")}
                        className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 md:w-16 md:h-16 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white/90 hover:bg-black/50 hover:scale-110 transition-all duration-300 active:scale-95"
                        aria-label="Scroll right"
                    >
                        <ChevronRightIcon />
                    </button>
                </div>

                {/* Carousel Container */}
                <div
                    ref={scrollContainerRef}
                    className="
                        flex overflow-x-auto 
                        gap-4 md:gap-8 
                        snap-x snap-mandatory 
                        scroll-smooth scrollbar-hide 
                        items-center
                        /* FIX: Padding matches exactly (100vw - 85vw) / 2 = 7.5vw */
                        /* This ensures the first card starts exactly in the center */
                        px-[7.5vw] 
                        /* REMOVED: scroll-pl-* (This was causing the rightward shift) */
                    "
                >
                    {templates.map((template) => {
                        const isFocused = focusedCardId === template.id;
                        const quote = getManifestationQuote(template.name);

                        return (
                            <div
                                key={template.id}
                                ref={(el) => setCardRef(template.id, el)}
                                data-card-id={template.id}
                                // snap-always ensures we stop on every card
                                className="snap-center snap-always shrink-0 flex justify-center"
                            >
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onSelectTemplate(template)}
                                    onKeyDown={(e) =>
                                        handleKeyDown(e, template)
                                    }
                                    aria-label={`Select trending template: ${template.name}`}
                                    className={`
                                        /* FIX: Consistent 85vw on mobile matches the padding logic */
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
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />

                                    <div className="absolute inset-0 p-6 md:p-14 flex flex-col justify-end items-start">
                                        <button 
                                            className={`
                                                relative overflow-hidden group/button
                                                bg-white rounded-full font-bold tracking-wide 
                                                flex items-center justify-center w-fit 
                                                shadow-[0_0_20px_rgba(255,255,255,0.3)] 
                                                mb-3 md:mb-6
                                                px-6 py-2.5 text-sm md:px-10 md:py-4 md:text-lg 
                                                active:scale-95 transition-all duration-300
                                            `}
                                        >
                                            <span className="relative z-10 text-black group-hover/button:text-white transition-colors duration-[600ms] ease-out">
                                                Step into
                                            </span>
                                            <div className="absolute inset-0 z-0 bg-[#BFA770] translate-y-[101%] group-hover/button:translate-y-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]" />
                                        </button>

                                        <h3 className="text-white text-[32px] md:text-[48px] lg:text-[64px] font-bold uppercase tracking-[-0.01em] md:leading-[1.0] drop-shadow-2xl mb-4 md:mb-6 max-w-[90%]" style={{fontFamily: 'var(--font-sans)'}}>
                                            {template.name}
                                        </h3>

                                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 md:gap-8 w-full">
                                            <p className={`
                                                text-[#E4C085] text-[17px] md:text-[19px] lg:text-[21px] 
                                                font-normal md:font-medium italic
                                                transition-opacity duration-500 
                                                ${isFocused ? 'opacity-100' : 'opacity-0'}
                                                max-w-2xl
                                            `}>
                                                {quote}
                                            </p>
                                        </div>
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
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
`;
    document.head.append(style);
}