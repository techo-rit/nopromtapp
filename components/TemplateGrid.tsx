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

  // FOCUS DETECTION
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
             const id = entry.target.getAttribute('data-card-id');
             if (id) setFocusedCardId(id);
          }
        });
      },
      { root: null, threshold: 0.6 } // Strict threshold for center focus
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
            className={`
              /* LAYOUT & SNAP */
              group relative w-full max-w-[1000px] md:max-w-[1200px] lg:max-w-[1400px] shrink-0
              snap-center

              /* HEIGHTS - "PEEK" LOGIC */
              /* Mobile: 68vh - taller cards while still showing peek of next */
              /* Desktop: wider and less tall for cinematic look */
              h-[68vh] md:h-[450px] lg:h-[500px]

              /* STYLING */
              cursor-pointer rounded-[24px] md:rounded-[40px] overflow-hidden 
              transition-all duration-500 ease-out 
              border border-[#2a2a2a]

              /* FLEX STRUCTURE (Mobile) */
              flex flex-col md:block

              /* FOCUS STATE */
              ${isFocused ? 'scale-[1.02] shadow-2xl border-[#c9a962]/50' : 'scale-95 opacity-80 md:opacity-100 md:scale-100 bg-[#141414]'}
            `}
          >
            {/* 1. IMAGE AREA (Top 70% on mobile) */}
            <div className="relative w-full h-[70%] md:h-full md:absolute md:inset-0 overflow-hidden bg-[#1a1a1a]">
               <img 
                src={template.imageUrl} 
                alt={template.name} 
                className={`
                  w-full h-full object-cover object-[center_20%] 
                  transition-transform duration-700 
                  ${isFocused ? 'scale-110' : 'scale-100'}
                  md:group-hover:scale-105
                `}
                loading="lazy" 
              />
              {/* Desktop Gradient Overlay */}
              <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            </div>

            {/* 2. CONTENT AREA (Bottom 30% on mobile) */}
            <div className={`
                /* Mobile: Solid block below image */
                relative w-full h-[30%] flex flex-col justify-center px-6 bg-[#0F0F0F] border-t border-[#2a2a2a]

                /* Desktop: Overlay */
                md:absolute md:bottom-0 md:left-0 md:h-auto md:bg-transparent md:border-0 md:p-12 md:justify-end
            `}>
              <h3 className="text-[#f5f5f5] text-[24px] md:text-[56px] font-bold leading-tight mb-2 md:mb-3 md:drop-shadow-lg">
                {template.name}
              </h3>
              <p className={`
                  text-[#c9a962] text-[15px] md:text-[20px] font-medium 
                  transition-opacity duration-500
                  ${isFocused ? 'opacity-100' : 'opacity-60'}
                  md:group-hover:opacity-100
                  line-clamp-2 md:line-clamp-none
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