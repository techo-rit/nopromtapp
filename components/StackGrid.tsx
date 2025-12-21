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

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // FIX: Reduced threshold slightly to be more forgiving on fast scrolls
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const id = entry.target.getAttribute('data-card-id');
            if (id) setFocusedCardId(id);
          }
        });
      },
      { root: null, threshold: 0.5 }
    );
    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [stacks]);

  return (
    <>
      {/* Mobile: Snap Vertical List with Peek View */}
      <div className="md:hidden flex flex-col gap-8 w-full pb-32">
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

                /* SIZE - FIX: Used 75svh instead of 75vh */
                /* This prevents the card from stretching when address bar hides, keeping snap points stable */
                w-full h-[75svh]

                /* STYLE */
                relative rounded-[24px] overflow-hidden cursor-pointer 
                transition-all duration-300 ease-out 
                border border-[#2a2a2a]

                /* FOCUS */
                ${isFocused ? 'scale-[1.02] shadow-2xl border-[#c9a962]/50' : 'scale-95 opacity-80'}
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