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

  // UX IMPROVEMENT: The "Center Band" Focus Logic
  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    // On desktop, we prefer hover interactions (handled in JSX), so we skip observer
    if (!isMobile) return;

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
        // MAGIC FIX: Instead of threshold, we use negative margins to create a 
        // narrow "active area" in the vertical center of the screen.
        // Only the card passing through the middle 20% of the screen triggers focus.
        rootMargin: '-40% 0px -40% 0px', 
        threshold: 0 
      }
    );

    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [templates]);

  return (
    <div className="flex flex-col items-center w-full gap-8 md:gap-10 pb-24 md:pb-12">
      {templates.map(template => {
        const isFocused = focusedCardId === template.id;
        const quote = getManifestationQuote(template.name);

        return (
          <div
            key={template.id}
            ref={(el) => setCardRef(template.id, el)}
            data-card-id={template.id}
            onClick={() => onSelectTemplate(template)}
            // UX ADDITION: Desktop hover instantly focuses (Much snappier than scrolling on PC)
            onMouseEnter={() => window.innerWidth >= 768 && setFocusedCardId(template.id)}
            className={`
              /* LAYOUT - REMOVED SNAPPING */
              group relative w-full max-w-[1000px] md:max-w-[1200px] lg:max-w-[1400px] shrink-0

              /* HEIGHTS */
              h-[68vh] md:h-[500px] lg:h-[550px]

              /* STYLING */
              cursor-pointer rounded-[24px] md:rounded-[40px] overflow-hidden 
              transition-all duration-500 ease-out 
              border border-[#2a2a2a]

              /* BACKGROUND */
              bg-[#050505]

              /* FLEX STRUCTURE */
              flex flex-col md:block

              /* FOCUS STATE */
              ${isFocused ? 'scale-[1.02] shadow-2xl border-[#c9a962]/50' : 'scale-95 opacity-80 md:opacity-100 md:scale-100'}
            `}
          >
            {/* 1. IMAGE AREA */}
            <div className="relative w-full h-[60%] md:h-full md:absolute md:inset-0 overflow-hidden">
               <img 
                 src={template.imageUrl} 
                 alt={template.name} 
                 className={`
                   w-full h-full object-cover object-[center_40%] 
                   transition-transform duration-700 
                   ${isFocused ? 'scale-110' : 'scale-100'}
                   md:group-hover:scale-105
                 `}
                 loading="lazy" 
               />
               <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
               <div className="md:hidden absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#050505] to-transparent" />
            </div>

            {/* 2. CONTENT AREA */}
            <div className={`
                /* POSITIONING */
                relative w-full h-[40%] flex flex-col justify-center px-6 
                -mt-[1px] bg-[#050505]

                /* UNIFORM GAP SYSTEM */
                gap-3 md:gap-5 items-start

                /* Desktop Overrides */
                md:absolute md:bottom-0 md:left-0 md:h-auto md:bg-transparent md:border-0 md:p-12 md:justify-end md:mt-0
            `}>

              {/* A. LUXURY BUTTON */}
              <button className={`
                  /* Structure */
                  relative overflow-hidden group/button
                  bg-white
                  rounded-full font-bold tracking-wide 
                  flex items-center justify-center w-fit 
                  shadow-[0_0_20px_rgba(255,255,255,0.3)] 

                  /* Responsive Sizes */
                  px-6 py-2.5 text-sm md:px-10 md:py-4 md:text-lg 

                  /* Interaction */
                  active:scale-95 transition-all duration-300
              `}>
                  {/* Text Layer */}
                  <span className="relative z-10 text-black group-hover/button:text-white transition-colors duration-[600ms] ease-out">
                      Step into
                  </span>

                  {/* Golden Liquid Layer */}
                  <div className={`
                      absolute inset-0 z-0
                      bg-[#BFA770] 
                      translate-y-[101%] 
                      group-hover/button:translate-y-0
                      transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]
                  `} />
              </button>

              {/* B. HEADING */}
              <h3 className="text-[#f5f5f5] text-[24px] md:text-[56px] font-bold leading-tight md:drop-shadow-lg">
                {template.name}
              </h3>

              {/* C. DESCRIPTION */}
              <p className={`
                  text-[#E4C085] text-[17px] md:text-[19px] lg:text-[21px] 
                  font-normal md:font-medium 
                  italic
                  tracking-normal md:tracking-[0.01em] lg:tracking-[0.015em] 
                  leading-[1.4] lg:leading-[1.33]
                  transition-opacity duration-500 
                  ${isFocused ? 'opacity-100' : 'opacity-0'}
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