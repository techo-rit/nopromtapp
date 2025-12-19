
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
    if (el) {
      cardRefs.current.set(id, el);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -20% 0px',
      threshold: [0.5, 0.6, 0.7]
    };

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      let mostVisibleCard: { id: string; ratio: number } | null = null;

      entries.forEach((entry) => {
        const cardId = entry.target.getAttribute('data-card-id');
        if (!cardId) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!mostVisibleCard || entry.intersectionRatio > mostVisibleCard.ratio) {
            mostVisibleCard = { id: cardId, ratio: entry.intersectionRatio };
          }
        }
      });

      if (mostVisibleCard) {
        setFocusedCardId(mostVisibleCard.id);
      }
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    cardRefs.current.forEach((el) => {
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [templates]);

  const handleKeyDown = (e: React.KeyboardEvent, template: Template) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectTemplate(template);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full pb-12">
      {templates.map(template => {
        const isFocused = focusedCardId === template.id;
        const quote = getManifestationQuote(template.name);
        
        return (
          <div
            key={template.id}
            ref={(el) => setCardRef(template.id, el)}
            data-card-id={template.id}
            className={`
              group relative w-full max-w-[1200px] h-[280px] md:h-[360px] lg:h-[480px] 
              cursor-pointer rounded-[2rem] overflow-hidden shadow-xl 
              transition-all duration-500 ease-out transform 
              focus:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a962]/50 
              border border-[#2a2a2a]
              md:hover:scale-[1.01] md:hover:shadow-2xl md:hover:shadow-black/40
              ${isFocused ? 'scale-[1.01] shadow-2xl shadow-black/40' : ''}
            `}
            role="button"
            tabIndex={0}
            aria-label={`Select template: ${template.name}`}
            onClick={() => onSelectTemplate(template)}
            onKeyDown={(e) => handleKeyDown(e, template)}
          >
            <img 
              src={template.imageUrl} 
              alt={template.name} 
              className={`w-full h-full object-cover object-[center_50%] transition-transform duration-700 group-hover:scale-105 ${isFocused ? 'scale-105' : ''}`}
              loading="lazy" 
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />
            
            <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full transform transition-transform duration-300">
              <h3 className="text-white text-[32px] md:text-[48px] lg:text-[56px] font-bold tracking-[-0.01em] md:tracking-[-0.015em] lg:tracking-[-0.02em] leading-[1.1] md:leading-[1.05] lg:leading-[1.0] mb-2 drop-shadow-md" style={{fontFamily: 'var(--font-sans)'}}>
                {template.name}
              </h3>
              <p className={`
                  text-[#E4C085] text-[17px] md:text-[19px] lg:text-[21px] font-medium tracking-normal md:tracking-[0.01em] lg:tracking-[0.015em] leading-[1.4] lg:leading-[1.33]
                  transition-opacity duration-500 

                  /* MOBILE LOGIC: Toggle strictly between 0 and 100 */
                  ${isFocused ? 'opacity-100' : 'opacity-0'}

                  /* DESKTOP LOGIC: Override mobile settings */
                  md:opacity-0 
                  md:group-hover:opacity-100

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
