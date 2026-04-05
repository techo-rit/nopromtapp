import React from 'react';
import type { Template } from '../../types';
import { HeartIcon, HeartFilledIcon } from '../../shared/ui/Icons';
import { formatPrice } from './shopifyService';

interface ProductCardProps {
  template: Template;
  isWishlisted?: boolean;
  onToggleWishlist?: (id: string) => void;
  onClick: () => void;
  onTryOn?: () => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  template,
  isWishlisted,
  onToggleWishlist,
  onClick,
  onTryOn,
  className = '',
}) => {
  const hasDiscount =
    template.compareAtPrice &&
    template.price &&
    parseFloat(template.compareAtPrice.amount) > parseFloat(template.price.amount);

  const discountPercent = hasDiscount
    ? Math.round(
        ((parseFloat(template.compareAtPrice!.amount) - parseFloat(template.price!.amount)) /
          parseFloat(template.compareAtPrice!.amount)) *
          100,
      )
    : 0;

  return (
    <div
      className={`group cursor-pointer rounded-2xl overflow-hidden border border-[#1f1f1f] bg-[#141414] transition-all duration-200 hover:border-[#2a2a2a] hover:scale-[1.02] hover:shadow-lg ${className}`}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#0e0e0e]">
        <img
          src={template.imageUrl}
          alt={template.name}
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />

        {/* Wishlist heart — top-right */}
        {onToggleWishlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(template.id);
            }}
            className="absolute top-2.5 right-2.5 z-10 p-2 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 hover:bg-black/50 active:scale-90 transition-all duration-200"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isWishlisted ? (
              <HeartFilledIcon width={16} height={16} className="text-white" />
            ) : (
              <HeartIcon width={16} height={16} className="text-white/70" />
            )}
          </button>
        )}

        {/* Discount badge — top-left */}
        {hasDiscount && discountPercent > 0 && (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[11px] font-bold bg-[#1a1610] text-[#c9a962] rounded-md border border-[#c9a962]/20">
            {discountPercent}% OFF
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        <p className="text-[13px] font-medium text-[#f5f5f5] truncate leading-snug">
          {template.name}
        </p>
        <div className="flex items-center justify-between gap-2 mt-1.5 min-h-[26px]">
          {template.price ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-bold text-[#f5f5f5]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatPrice(template.price)}
              </span>
              {hasDiscount && template.compareAtPrice && (
                <span className="text-xs text-[#555] line-through" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatPrice(template.compareAtPrice)}
                </span>
              )}
            </div>
          ) : (
            <div />
          )}
          {onTryOn && (
            <button
              onClick={(e) => { e.stopPropagation(); onTryOn(); }}
              className="shrink-0 text-[11px] font-semibold text-[#0a0a0a] bg-[#f0f0f0] hover:bg-white active:scale-90 rounded-full px-3 py-1 transition-all whitespace-nowrap"
              aria-label="Try On"
            >
              Try On
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
