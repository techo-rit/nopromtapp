import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Template } from '../types';
import { getManifestationQuote } from '../manifestationQuotes';

interface TemplateGridProps {
  templates: Template[];
  onSelectTemplate: (template: Template) => void;
}

export const TemplateGrid: React.FC<TemplateGridProps> = ({ templates, onSelectTemplate }) => {
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Register card refs for position calculation
  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  // --- INDUSTRY STANDARD FOCUS ENGINE ---
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    window.requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;

        const containerCenter = container.scrollTop + (container.clientHeight / 2);

        let closestId = null;
        let minDiff = Infinity;

        cardRefs.current.forEach((el, id) => {
          const cardCenter = el.offsetTop + (el.offsetHeight / 2);
          const diff = Math.abs(containerCenter - cardCenter);

          if (diff < minDiff) {
            minDiff = diff;
            closestId = id;
          }
        });

        if (closestId && closestId !== focusedCardId) {
          setFocusedCardId(closestId);
        }
    });
  }, [focusedCardId]);

  useEffect(() => {
    handleScroll();
  }, [templates, handleScroll]);

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="
        /* CONTAINER LAYOUT */
        w-full 
        /* FIX: Changed from 100svh to h-full. 
           It now fills the flex parent provided by App.tsx */
        h-full
        
        /* SCROLL ENGINE */
        overflow-y-scroll 
        snap-y snap-mandatory 
        scroll-smooth 

        /* PHYSICS */
        overscroll-y-contain
        touch-pan-y 

        /* ALIGNMENT */
        flex flex-col items-center 
        gap-8 

        /* PADDING FIX: 
           Reduced from 16svh to 8vh. 
           This fixes 'starting from a lot lower' and ensures proper centering 
           within the remaining space under the header. */
        py-[8vh]
        
        /* HIDE SCROLLBAR */
        scrollbar-hide
      "
    >
      {templates.map(template => {
        const isFocused = focusedCardId === template.id;
        const quote = getManifestationQuote(template.name);

        return (
          <div
            key={template.id}
            ref={(el) => setCardRef(template.id, el)}
            onClick={() => onSelectTemplate(template)}
            className={`
              /* SNAP ALIGNMENT */
              snap-center 
              snap-always
              shrink-0

              /* LAYOUT */
              mx-auto
              relative 
              w-full max-w-[1000px] md:max-w-[1200px] lg:max-w-[1400px]

              /* DIMENSIONS */
              /* Kept relative to viewport height to ensure consistency across devices */
              h-[68svh] md:h-[500px] lg:h-[550px]

              /* VISUAL STYLING */
              cursor-pointer rounded-[24px] md:rounded-[40px] overflow-hidden 
              transition-all duration-500 cubic-bezier(0.2, 0.8, 0.2, 1)
              border border-[#2a2a2a]
              bg-[#050505]

              /* FOCUS STATE */
              ${isFocused 
                ? 'scale-100 opacity-100 shadow-2xl border-[#c9a962]/50 z-10' 
                : 'scale-[0.95] opacity-60 blur-[1px] z-0'
              }
            `}
          >
            {/* 1. IMAGE AREA */}
            <div className="relative w-full h-[60%] md:h-full md:absolute md:inset-0 overflow-hidden">
               <img 
                 src={template.imageUrl} 
                 alt={template.name} 
                 decoding="async"
                 className={`
                   w-full h-full object-cover object-[center_30%] 
                   transition-transform duration-[1000ms] ease-out
                   ${isFocused ? 'scale-110' : 'scale-100'}
                 `}
                 loading="lazy" 
               />
               <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
               <div className="md:hidden absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#050505] to-transparent" />
            </div>

            {/* 2. CONTENT AREA */}
            <div className={`
                relative w-full h-[40%] flex flex-col justify-center px-6 
                -mt-[1px] bg-[#050505]
                gap-3 md:gap-5 items-start
                md:absolute md:bottom-0 md:left-0 md:h-auto md:bg-transparent md:border-0 md:p-12 md:justify-end md:mt-0
            `}>
              {/* BUTTON */}
              <button className={`
                  relative overflow-hidden group/button
                  bg-white rounded-full font-bold tracking-wide 
                  flex items-center justify-center w-fit 
                  shadow-[0_0_20px_rgba(255,255,255,0.3)] 
                  px-6 py-2.5 text-sm md:px-10 md:py-4 md:text-lg 
                  active:scale-95 transition-all duration-300
              `}>
                  <span className="relative z-10 text-black group-hover/button:text-white transition-colors duration-[600ms] ease-out">
                      Step into
                  </span>
                  <div className="absolute inset-0 z-0 bg-[#BFA770] translate-y-[101%] group-hover/button:translate-y-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]" />
              </button>

              {/* HEADING */}
              <h3 className="text-[#f5f5f5] text-[24px] md:text-[56px] font-bold leading-tight md:drop-shadow-lg">
                {template.name}
              </h3>

              {/* DESCRIPTION */}
              <p className={`
                  text-[#E4C085] text-[17px] md:text-[19px] lg:text-[21px] 
                  italic leading-[1.4] lg:leading-[1.33]
                  transition-all duration-700 delay-150
                  ${isFocused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  max-w-2xl
              `}>
                  {quote}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};