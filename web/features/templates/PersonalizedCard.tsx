import React, { useState, useEffect, useRef } from 'react';
import type { Template } from '../../types';
import { requestCarouselTryOn } from './carouselService';

interface PersonalizedCardProps {
  template: Template;
  isFocused: boolean;
  onClick: () => void;
}

export const PersonalizedCard: React.FC<PersonalizedCardProps> = ({
  template,
  isFocused,
  onClick,
}) => {
  const [tryOnImageUrl, setTryOnImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef(false);

  // Lazy generation on viewport entry
  useEffect(() => {
    const el = cardRef.current;
    if (!el || hasTriggeredRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          hasTriggeredRef.current = true;
          observer.disconnect();
          triggerGeneration();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const triggerGeneration = async () => {
    if (isGenerating || tryOnImageUrl || hasError) return;
    setIsGenerating(true);
    try {
      const result = await requestCarouselTryOn(template.id, template.imageUrl);
      setTryOnImageUrl(result.imageUrl);
    } catch {
      setHasError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`
        w-[85vw] md:w-[85vw] max-w-[1600px]
        aspect-[4/5] md:aspect-[16/9]
        rounded-[24px] md:rounded-[40px] overflow-hidden
        relative cursor-pointer group
        transform transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
        bg-surface border border-white/5 shadow-2xl
        ${isFocused ? "scale-[1.02] md:scale-[1.01] border-active" : "scale-100 opacity-90 md:opacity-100"}
      `}
    >
      {/* 2x1 collage layout */}
      <div className="absolute inset-0 flex">
        {/* Left: Product image */}
        <div className="w-1/2 h-full relative overflow-hidden">
          <img
            src={template.imageUrl}
            alt={template.name}
            decoding="async"
            className={`
              w-full h-full object-cover object-top
              transition-transform duration-[1.5s] ease-out
              ${isFocused ? "scale-105" : "scale-100"}
            `}
            loading="lazy"
          />
        </div>

        {/* Right: Try-on result or shimmer */}
        <div className="w-1/2 h-full relative overflow-hidden">
          {tryOnImageUrl ? (
            <img
              src={tryOnImageUrl}
              alt={`${template.name} try-on`}
              className={`
                w-full h-full object-cover
                transition-transform duration-[1.5s] ease-out
                ${isFocused ? "scale-105" : "scale-100"}
              `}
              loading="lazy"
            />
          ) : isGenerating ? (
            <div className="w-full h-full bg-surface animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hasError ? (
            <div className="w-full h-full bg-surface flex items-center justify-center">
              <img
                src={template.imageUrl}
                alt={template.name}
                className="w-full h-full object-cover opacity-40"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-surface shimmer-placeholder" />
          )}

          {/* "Your Look" badge on try-on side */}
          {tryOnImageUrl && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
              <span className="text-[10px] font-medium text-white/80 tracking-wide uppercase">Your Look</span>
            </div>
          )}
        </div>

        {/* Center divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

      {/* Title */}
      <div className="absolute inset-0 p-6 md:p-14 flex flex-col justify-end pointer-events-none">
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

      <style>{`
        .shimmer-placeholder {
          background: linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};
