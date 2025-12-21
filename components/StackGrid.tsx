import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Stack } from '../types';

interface StackGridProps {
  stacks: Stack[];
  onSelectStack: (stack: Stack) => void;
  firstCardRef?: React.RefObject<HTMLDivElement | null>;
}

export const StackGrid: React.FC<StackGridProps> = ({ stacks, onSelectStack, firstCardRef }) => {
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  // --- MOBILE FOCUS ENGINE ---
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
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
    
    // Safety check for bottom scroll
    const isAtBottom = Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 50;
    if (isAtBottom && stacks.length > 0) {
         const lastId = stacks[stacks.length - 1].id;
         if (focusedCardId !== lastId) setFocusedCardId(lastId);
         return;
    }

    if (closestId && closestId !== focusedCardId) {
      setFocusedCardId(closestId);
    }
  }, [focusedCardId, stacks]);

  useEffect(() => {
    if (window.innerWidth < 768) {
        handleScroll();
    }
  }, [stacks, handleScroll]);

  return (
    <>
      {/* MOBILE: SNAP LIST 
        - Using h-[100svh] to lock the viewport stability
      */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="
            md:hidden 
            w-full h-[85svh] /* Keep existing height constraint */
            overflow-y-scroll 
            snap-y snap-mandatory 
            scroll-smooth
            flex flex-col gap-8 
            
            /* PADDING FIX */
            /* Top: 5svh */
            /* Bottom: 30svh - Ensures the last card can 'float' to the middle */
            pt-[5svh] pb-[30svh]
            
            scrollbar-hide
        "
      >
        {stacks.map((stack, index) => {
          const isFocused = focusedCardId === stack.id;

          return (
            <div
              key={stack.id}
              ref={(el) => {
                setCardRef(stack.id, el);
                if (index === 0 && firstCardRef) {
                  (firstCardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                }
              }}
              data-card-id={stack.id}
              className={`
                /* SNAP */
                snap-center shrink-0 

                /* SIZE - STABLE SVH */
                w-full h-[75svh]

                /* ALIGNMENT FIX */
                mx-auto

                /* STYLE */
                relative rounded-[24px] overflow-hidden cursor-pointer 
                transition-all duration-300 ease-out 
                border border-[#2a2a2a]

                /* FOCUS */
                ${isFocused ? 'scale-[1.02] shadow-2xl border-[#c9a962]/50 z-10' : 'scale-95 opacity-80 z-0'}
              `}
              onClick={() => onSelectStack(stack)}
            >
              <img src={stack.imageUrl} alt={stack.name} className="w-full h-full object-cover object-[center_30%]" />
              <div className={`absolute inset-0 transition-colors duration-500 ${isFocused ? 'bg-black/20' : 'bg-black/60'}`} />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <h3 className={`
                  text-white text-4xl font-bold tracking-tight drop-shadow-lg transition-transform duration-500
                  ${isFocused ? 'scale-110' : 'scale-90 opacity-70'}
                `}>
                  {stack.name}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Grid (Unchanged) */}
      <div className="hidden md:grid grid-cols-2 gap-6 pb-12">
        {stacks.map(stack => (
          <div
            key={stack.id}
            className="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] border border-[#2a2a2a]"
            onClick={() => onSelectStack(stack)}
          >
            <img src={stack.imageUrl} alt={stack.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <h3 className="text-white text-3xl font-bold">{stack.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};