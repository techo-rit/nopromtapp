import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Stack } from '../types';

interface StackGridProps {
  stacks: Stack[];
  onSelectStack: (stack: Stack) => void;
  firstCardRef?: React.RefObject<HTMLDivElement | null>;
}

export const StackGrid: React.FC<StackGridProps> = ({ stacks, onSelectStack, firstCardRef }) => {
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Note: 'containerRef' removed as we now rely on the main viewport for scrolling

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

    // FIX: Use viewport (root: null) instead of containerRef. 
    // This allows the Focus logic to work with the main window scroll.
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -20% 0px', // Trigger focus in the middle 60% of the screen
      threshold: [0.6, 0.7, 0.8]
    };

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      let mostVisibleCard: { id: string; ratio: number } | null = null;

      entries.forEach((entry) => {
        const cardId = entry.target.getAttribute('data-card-id');
        if (!cardId) return;

        // Logic ensures only one card is "focused" (most visible) at a time
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
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
  }, [stacks]);

  const handleKeyDown = (e: React.KeyboardEvent, stack: Stack) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectStack(stack);
    }
  };

  return (
    <>
      {/* Mobile: Vertical list without internal scroll (Fixes double scrolling) */}
      <div className="md:hidden flex flex-col gap-5 pb-20">
        {stacks.map((stack, index) => {
          const isFocused = focusedCardId === stack.id;
          
          return (
            <div
              key={stack.id}
              ref={(el) => {
                setCardRef(stack.id, el);
                if (index === 0 && firstCardRef) {
                  // Connects to App.tsx for the "Trending -> Creator" scroll snap logic
                  (firstCardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                }
              }}
              data-card-id={stack.id}
              role="button"
              tabIndex={0}
              aria-label={`Select stack: ${stack.name}`}
              className={`
                snap-center shrink-0 relative h-[70vh] rounded-2xl overflow-hidden cursor-pointer 
                transition-all duration-300 ease-out transform 
                focus:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a962]/50 
                border border-[#2a2a2a]
                ${isFocused ? 'scale-[1.02] shadow-2xl shadow-black/40' : ''}
              `}
              onClick={() => onSelectStack(stack)}
              onKeyDown={(e) => handleKeyDown(e, stack)}
            >
              <img src={stack.imageUrl} alt={stack.name} className="w-full h-full object-cover object-[center_25%]" />
              <div className={`absolute inset-0 transition-colors duration-300 ${isFocused ? 'bg-black/50' : 'bg-black/30'}`} />
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'}`}>
                <h3 className="text-white text-3xl font-bold tracking-tight">{stack.name}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Regular grid with hover effects (Unchanged) */}
      <div className="hidden md:grid grid-cols-2 gap-6">
        {stacks.map(stack => (
          <div
            key={stack.id}
            role="button"
            tabIndex={0}
            aria-label={`Select stack: ${stack.name}`}
            className="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a962]/50 border border-[#2a2a2a]"
            onClick={() => onSelectStack(stack)}
            onKeyDown={(e) => handleKeyDown(e, stack)}
          >
            <img src={stack.imageUrl} alt={stack.name} className="w-full h-full object-cover object-[center_25%]" />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <h3 className="text-white text-3xl font-bold tracking-tight">{stack.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
