// web/features/shop/ProductDetailModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { ShopifyProduct, ShopifyVariant } from '../../types';
import { fetchProduct, addToCart, formatPrice } from './shopifyService';
import { CloseIcon, HeartIcon, HeartFilledIcon } from '../../shared/ui/Icons';
import { Spinner } from '../../shared/ui/Spinner';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  handle: string | null;
  onCartUpdate?: (totalQuantity: number) => void;
  onTryOn?: () => void;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  handle,
  onCartUpdate,
  onTryOn,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ShopifyVariant | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    if (!isOpen || !handle) {
      setProduct(null);
      setSelectedVariant(null);
      setActiveImageIndex(0);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchProduct(handle).then((p) => {
      if (cancelled) return;
      setLoading(false);
      if (p) {
        setProduct(p);
        // Select first available variant
        const first = p.variants.find((v) => v.availableForSale) || p.variants[0];
        setSelectedVariant(first || null);
      } else {
        setError('Product not found');
      }
    }).catch((e) => {
      if (cancelled) return;
      setLoading(false);
      setError(e.message || 'Failed to load product');
    });
    return () => { cancelled = true; };
  }, [isOpen, handle]);

  const handleAddToCart = useCallback(async () => {
    if (!selectedVariant || addingToCart) return;
    setAddingToCart(true);
    try {
      const cart = await addToCart(selectedVariant.id);
      onCartUpdate?.(cart.totalQuantity);
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  }, [selectedVariant, addingToCart, onCartUpdate]);

  const handleBuyNow = useCallback(async () => {
    if (!selectedVariant || addingToCart) return;
    setAddingToCart(true);
    try {
      const cart = await addToCart(selectedVariant.id);
      onCartUpdate?.(cart.totalQuantity);
      // Redirect to Shopify checkout
      window.location.href = cart.checkoutUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to process purchase');
      setAddingToCart(false);
    }
  }, [selectedVariant, addingToCart, onCartUpdate]);

  // Get unique options for variant selection
  const optionGroups = product
    ? product.variants.reduce<Record<string, string[]>>((acc, v) => {
        v.selectedOptions.forEach((opt) => {
          if (!acc[opt.name]) acc[opt.name] = [];
          if (!acc[opt.name].includes(opt.value)) acc[opt.name].push(opt.value);
        });
        return acc;
      }, {})
    : {};

  const handleOptionChange = (optionName: string, value: string) => {
    if (!product || !selectedVariant) return;

    // Build desired options
    const desired = selectedVariant.selectedOptions.map((opt) =>
      opt.name === optionName ? { ...opt, value } : opt
    );

    // Find matching variant
    const match = product.variants.find((v) =>
      v.selectedOptions.every((opt) =>
        desired.some((d) => d.name === opt.name && d.value === opt.value)
      )
    );
    if (match) {
      setSelectedVariant(match);
      // Update image to variant image if available
      if (match.image) {
        const imgIdx = product.images.findIndex((img) => img.url === match.image?.url);
        if (imgIdx >= 0) setActiveImageIndex(imgIdx);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-[#141414] border border-[#2a2a2a] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] shrink-0">
          <h2 className="text-lg font-semibold text-[#f5f5f5] truncate">
            {product?.title || 'Product Details'}
          </h2>
          <div className="flex items-center gap-1">
            {onToggleWishlist && (
              <button
                onClick={onToggleWishlist}
                className="p-2 text-[#6b6b6b] hover:text-[#f5f5f5] transition-colors"
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                {isWishlisted ? (
                  <HeartFilledIcon width={20} height={20} className="text-white" />
                ) : (
                  <HeartIcon width={20} height={20} />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-[#6b6b6b] hover:text-[#f5f5f5] transition-colors"
              aria-label="Close"
            >
              <CloseIcon width={20} height={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Spinner />
              <p className="text-[#6b6b6b] mt-4">Loading product...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-8 text-center">
              <p className="text-red-400">{error}</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 text-sm text-[#a0a0a0] border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a]">
                Close
              </button>
            </div>
          )}

          {product && !loading && (
            <div className="pb-4">
              {/* Image Gallery */}
              <div className="relative aspect-square bg-[#0a0a0a]">
                {product.images.length > 0 ? (
                  <img
                    src={product.images[activeImageIndex]?.url}
                    alt={product.images[activeImageIndex]?.altText || product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#6b6b6b]">
                    No image available
                  </div>
                )}
                {/* Image dots */}
                {product.images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {product.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImageIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === activeImageIndex ? 'bg-white' : 'bg-white/30'
                        }`}
                        aria-label={`View image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="px-5 pt-5 space-y-4">
                {/* Price */}
                <div className="flex items-baseline gap-3">
                  {selectedVariant && (
                    <>
                      <span className="text-2xl font-bold text-[#f5f5f5]">
                        {formatPrice(selectedVariant.price)}
                      </span>
                      {selectedVariant.compareAtPrice &&
                        parseFloat(selectedVariant.compareAtPrice.amount) > parseFloat(selectedVariant.price.amount) && (
                          <span className="text-base text-[#6b6b6b] line-through">
                            {formatPrice(selectedVariant.compareAtPrice)}
                          </span>
                        )}
                      {selectedVariant.compareAtPrice &&
                        parseFloat(selectedVariant.compareAtPrice.amount) > parseFloat(selectedVariant.price.amount) && (
                          <span className="text-sm font-medium text-green-400">
                            {Math.round(
                              (1 - parseFloat(selectedVariant.price.amount) / parseFloat(selectedVariant.compareAtPrice.amount)) * 100
                            )}% off
                          </span>
                        )}
                    </>
                  )}
                </div>

                {/* Vendor + Type */}
                <div className="flex items-center gap-2 text-sm text-[#6b6b6b]">
                  <span>{product.vendor}</span>
                  {product.productType && (
                    <>
                      <span>·</span>
                      <span>{product.productType}</span>
                    </>
                  )}
                </div>

                {/* Variant Selector */}
                {Object.entries(optionGroups).map(([optName, values]) => (
                  values.length > 1 && (
                    <div key={optName}>
                      <label className="block text-sm font-medium text-[#a0a0a0] mb-2">{optName}</label>
                      <div className="flex flex-wrap gap-2">
                        {values.map((val) => {
                          const isSelected = selectedVariant?.selectedOptions.some(
                            (o) => o.name === optName && o.value === val
                          );
                          return (
                            <button
                              key={val}
                              onClick={() => handleOptionChange(optName, val)}
                              className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                                isSelected
                                  ? 'border-[#c9a962] text-[#c9a962] bg-[#c9a962]/10'
                                  : 'border-[#2a2a2a] text-[#a0a0a0] hover:border-[#3a3a3a] hover:text-[#f5f5f5]'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
                ))}

                {/* Description */}
                {product.description && (
                  <div>
                    <h3 className="text-sm font-medium text-[#a0a0a0] mb-2">Description</h3>
                    <p className="text-sm text-[#6b6b6b] leading-relaxed">{product.description}</p>
                  </div>
                )}

                {/* Tags */}
                {product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {product.tags.slice(0, 8).map((tag) => (
                      <span key={tag} className="text-xs px-2.5 py-1 bg-[#1a1a1a] text-[#6b6b6b] rounded-full border border-[#2a2a2a]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {product && !loading && (
          <div className="shrink-0 px-5 py-4 border-t border-[#2a2a2a] space-y-3">
            {/* Buy Now + Add to Cart */}
            <div className="flex gap-3">
              <button
                onClick={handleBuyNow}
                disabled={!selectedVariant?.availableForSale || addingToCart}
                className="flex-1 py-3.5 text-sm font-semibold bg-[#c9a962] text-[#0a0a0a] rounded-xl hover:bg-[#d4b872] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {addingToCart ? 'Processing...' : 'Buy Now'}
              </button>
              <button
                onClick={handleAddToCart}
                disabled={!selectedVariant?.availableForSale || addingToCart}
                className="flex-1 py-3.5 text-sm font-semibold border border-[#c9a962]/30 text-[#c9a962] rounded-xl hover:bg-[#c9a962]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {addedFeedback ? '✓ Added!' : addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>

            {/* Try On */}
            {onTryOn && (
              <button
                onClick={() => { onClose(); onTryOn(); }}
                className="w-full py-3 text-sm font-medium text-[#a0a0a0] border border-[#2a2a2a] rounded-xl hover:bg-[#1a1a1a] hover:text-[#f5f5f5] transition-colors"
              >
                Try On with AI
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
