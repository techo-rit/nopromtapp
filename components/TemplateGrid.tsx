import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Template } from '../types';
import { getManifestationQuote } from '../manifestationQuotes';

interface TemplateGridProps {
  templates: Template[];
  onSelectTemplate: (template: Template) => void;
}

export const TemplateGrid: React.FC<TemplateGridProps> = ({ templates, onSelectTemplate }) => {
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  // UX: Focus Logic - Syncs the "Focused" state with the Snap position
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
             const id = entry.target.getAttribute('data-card-id');
             if (id) setFocusedCardId(id);
          }
        });
      },
      { 
        root: null,
        // Trigger focus only when the card is strictly in the center (2% window)
        // This prevents "early" triggering while scrolling
        rootMargin: '-49% 0px -49% 0px', 
        threshold: 0 
      }
    );

    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [templates]);

  return (
    <div className="
      /* CONTAINER LAYOUT */
      w-full h-[100dvh] /* Full mobile viewport height */

      /* SCROLL SNAP ENGINE */
      overflow-y-scroll 
      snap-y snap-mandatory 
      scroll-smooth 

      /* PHYSICS & FEEL */
      overscroll-y-contain /* Prevents rubber-banding the whole page */
      touch-pan-y /* Native touch handling */

      /* LAYOUT ALIGNMENT */
      flex flex-col items-center 
      gap-8 /* Keeps your original gap */

      /* EXACT CENTERING PADDING */
      /* Card is 68vh. Remaining space is 32vh. Top/Bottom needs 16vh to center. */
      py-[16vh]

      /* HIDE SCROLLBAR */
      scrollbar-hide
    ">
      {templates.map(template => {
        const isFocused = focusedCardId === template.id;
        const quote = getManifestationQuote(template.name);

        return (
          <div
            key={template.id}
            ref={(el) => setCardRef(template.id, el)}
            data-card-id={template.id}
            onClick={() => onSelectTemplate(template)}
            className={`
              /* SNAP ALIGNMENT - The "Apple Feel" */
              snap-center 
              snap-always /* <--- FORCE STOP: Prevents skipping cards on fast swipes */
              shrink-0

              /* NATIVE OFFSET FIX (Mobile Only) */
              /* scroll-mt-6 pushes the snap point UP, which pushes the card DOWN visually by 24px */
              scroll-mt-6 md:scroll-mt-0

              /* BASE LAYOUT */
              group relative w-full max-w-[1000px] md:max-w-[1200px] lg:max-w-[1400px]

              /* DIMENSIONS - RESTORED ORIGINAL HEIGHTS */
              h-[68vh] md:h-[500px] lg:h-[550px]

              /* STYLING */
              cursor-pointer rounded-[24px] md:rounded-[40px] overflow-hidden 
              transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1) /* Smoother, slower easing */
              border border-[#2a2a2a]
              bg-[#050505]

              /* FOCUS STATE SCALING - Removed translation to fix jitter bug */
              ${isFocused 
                ? 'scale-100 opacity-100 shadow-2xl border-[#c9a962]/50 z-10' 
                : 'scale-[0.93] opacity-60 blur-[0.5px] z-0' /* Subtle shrink for non-focused */
              }
            `}
          >
            {/* 1. IMAGE AREA */}
            <div className="relative w-full h-[60%] md:h-full md:absolute md:inset-0 overflow-hidden">
               <img 
                 src={template.imageUrl} 
                 alt={template.name} 
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