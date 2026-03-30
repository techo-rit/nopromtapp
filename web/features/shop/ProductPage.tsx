import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ShopifyProduct, ShopifyVariant } from '../../types';
import { fetchProduct, addToCart, formatPrice } from './shopifyService';
import { SkeletonProductPage } from '../../shared/ui/Skeleton';

interface ProductPageProps {
  onCartUpdate?: (totalQuantity: number) => void;
  wishlistedIds?: Set<string>;
  onToggleWishlist?: (handle: string) => void;
  onLoginRequired?: () => void;
  user?: { id: string } | null;
}

export const ProductPage: React.FC<ProductPageProps> = ({
  onCartUpdate,
  wishlistedIds,
  onToggleWishlist,
  onLoginRequired,
  user,
}) => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const isWishlisted = handle ? wishlistedIds?.has(handle) ?? false : false;

  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ShopifyVariant | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  // Zara-style toast: shows briefly at top then auto-dismisses
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const toastTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    clearTimeout(toastTimer.current);
    setToastMessage(message);
    setToastType(type);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2800);
  }, []);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchProduct(handle).then((p) => {
      if (cancelled) return;
      setLoading(false);
      if (p) {
        setProduct(p);
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
  }, [handle]);

  const handleAddToCart = useCallback(async () => {
    if (!selectedVariant || addingToCart) return;
    setAddingToCart(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Network issue — please try again')), 10000)
      );
      const cart = await Promise.race([addToCart(selectedVariant.id), timeout]);
      onCartUpdate?.(cart.totalQuantity);
      showToast('Added to bag');
    } catch (err: any) {
      showToast(err.message || 'Failed to add to cart', 'error');
    } finally {
      setAddingToCart(false);
    }
  }, [selectedVariant, addingToCart, onCartUpdate, showToast]);

  const [buyingNow, setBuyingNow] = useState(false);

  // Reset buyingNow on SPA navigation (handle change) and on browser back from
  // external checkout (bfcache restores the page with stale state)
  useEffect(() => {
    setBuyingNow(false);
  }, [handle]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBuyingNow(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const handleBuyNow = useCallback(async () => {
    if (!selectedVariant || addingToCart || buyingNow) return;
    setBuyingNow(true);
    try {
      const cart = await addToCart(selectedVariant.id);
      onCartUpdate?.(cart.totalQuantity);
      // Use window.open in same tab — allows browser back to work
      window.location.href = cart.checkoutUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to process purchase');
      setBuyingNow(false);
    }
  }, [selectedVariant, addingToCart, buyingNow, onCartUpdate]);

  // Build option groups for variant selection
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
    const desired = selectedVariant.selectedOptions.map((opt) =>
      opt.name === optionName ? { ...opt, value } : opt
    );
    const match = product.variants.find((v) =>
      v.selectedOptions.every((opt) =>
        desired.some((d) => d.name === opt.name && d.value === opt.value)
      )
    );
    if (match) {
      setSelectedVariant(match);
      if (match.image) {
        const imgIdx = product.images.findIndex((img) => img.url === match.image?.url);
        if (imgIdx >= 0) setActiveImageIndex(imgIdx);
      }
    }
  };

  // Discount calculation
  const discountPercent = selectedVariant?.compareAtPrice &&
    parseFloat(selectedVariant.compareAtPrice.amount) > parseFloat(selectedVariant.price.amount)
    ? Math.round((1 - parseFloat(selectedVariant.price.amount) / parseFloat(selectedVariant.compareAtPrice.amount)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="w-full h-full overflow-y-auto scrollbar-hide bg-[#0a0a0a]">
        <SkeletonProductPage />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] px-4">
        <p className="text-red-400 mb-4">{error || 'Product not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 text-sm text-[#a0a0a0] border border-[#2a2a2a] rounded-xl hover:bg-[#1a1a1a] transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide bg-[#0a0a0a] pb-32">
      {/* Image Gallery */}
      <div className="relative w-full max-w-[1440px] mx-auto">
        <div className="md:flex md:gap-0">
          {/* Mobile: single image — viewport-centered */}
          <div className="md:hidden relative bg-[#0a0a0a] flex items-center justify-center" style={{ height: 'calc(100vh - 130px)' }}>
            {product.images.length > 0 ? (
              <img
                src={product.images[activeImageIndex]?.url}
                alt={product.images[activeImageIndex]?.altText || product.title}
                className="max-w-[90%] max-h-[85%] object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#6b6b6b]">
                No image
              </div>
            )}
            {/* Image dots */}
            {product.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {product.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === activeImageIndex ? 'bg-white scale-110' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}
            {/* Wishlist heart */}
            {onToggleWishlist && handle && (
              <button
                onClick={() => onToggleWishlist(handle)}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-full"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? 'white' : 'none'} stroke="white" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </button>
            )}
          </div>

          {/* Desktop: hero image + thumbnails */}
          <div className="hidden md:flex md:flex-col md:w-[55%]">
            {/* Main image — centered container with contain */}
            <div className="relative w-full h-[85vh] bg-[#0a0a0a] flex items-center justify-center">
              {product.images.length > 0 ? (
                <img
                  src={product.images[activeImageIndex]?.url}
                  alt={product.images[activeImageIndex]?.altText || product.title}
                  className="max-w-[90%] max-h-[90%] object-contain"
                />
              ) : (
                <div className="text-[#6b6b6b]">No image</div>
              )}
            </div>
            {/* Thumbnail strip */}
            {product.images.length > 1 && (
              <div className="flex gap-[1px] mt-[1px]">
                {product.images.slice(0, 6).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative flex-1 aspect-square overflow-hidden transition-opacity ${
                      i === activeImageIndex ? 'opacity-100 ring-1 ring-[#c9a962]' : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.altText || `${product.title} ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop: product info sticky sidebar */}
          <div className="hidden md:flex md:w-[45%] md:sticky md:top-0 md:h-screen md:items-center md:overflow-y-auto scrollbar-hide">
            <div className="w-full px-12 py-10 space-y-6">
              {/* Vendor */}
              <p className="text-xs tracking-[0.2em] uppercase text-[#6b6b6b]">{product.vendor}</p>

              {/* Title */}
              <h1 className="text-2xl font-light text-[#f5f5f5] leading-tight">{product.title}</h1>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                {selectedVariant && (
                  <>
                    <span className="text-xl text-[#f5f5f5] tabular-nums">
                      {formatPrice(selectedVariant.price)}
                    </span>
                    {discountPercent > 0 && selectedVariant.compareAtPrice && (
                      <>
                        <span className="text-sm text-[#6b6b6b] line-through tabular-nums">
                          {formatPrice(selectedVariant.compareAtPrice)}
                        </span>
                        <span className="text-xs font-medium text-[#c9a962]">
                          {discountPercent}% off
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Variant Selector */}
              {Object.entries(optionGroups).map(([optName, values]) =>
                values.length > 1 ? (
                  <div key={optName}>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[#6b6b6b] mb-3">{optName}</label>
                    <div className="flex flex-wrap gap-2">
                      {values.map((val) => {
                        const isSelected = selectedVariant?.selectedOptions.some(
                          (o) => o.name === optName && o.value === val
                        );
                        return (
                          <button
                            key={val}
                            onClick={() => handleOptionChange(optName, val)}
                            className={`px-5 py-2.5 text-sm border transition-all ${
                              isSelected
                                ? 'border-[#f5f5f5] text-[#f5f5f5] bg-transparent'
                                : 'border-[#2a2a2a] text-[#6b6b6b] hover:border-[#4a4a4a] hover:text-[#a0a0a0]'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )}

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant?.availableForSale || addingToCart}
                  className="w-full py-4 text-sm font-medium tracking-[0.1em] uppercase bg-[#f5f5f5] text-[#0a0a0a] hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {addingToCart ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding...
                    </span>
                  ) : 'Add to Bag'}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!selectedVariant?.availableForSale || addingToCart || buyingNow}
                  className="w-full py-4 text-sm font-medium tracking-[0.1em] uppercase border border-[#f5f5f5] text-[#f5f5f5] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
              </div>

              {/* Try on link */}
              <button
                onClick={() => navigate(`/changing-room?product=${handle}`)}
                className="w-full py-3 text-sm text-[#6b6b6b] hover:text-[#c9a962] transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 512.026 512.026" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M417.758,108.407c-1.212-3.874-13.918-37.538-93.483-55.543V29.901v-5.41c0-8.124-5.794-14.916-13.901-16.427c-35.567-10.752-73.156-10.752-108.723,0c-8.107,1.51-13.909,8.303-13.909,16.427v5.41v22.963c-79.556,18.005-92.262,51.669-93.474,55.543c-0.657,2.108-0.469,4.386,0.512,6.366l14.242,28.493c12.425,24.841,18.987,52.651,18.987,80.427v262.733c0,14.114,11.486,25.6,25.6,25.6h93.867V68.292c0-0.094,0.051-0.162,0.051-0.247c-16.316-0.862-31.514-4.147-42.718-9.216V43.042c14.532,5.265,32.461,8.183,51.2,8.183c18.748,0,36.676-2.918,51.2-8.183v15.787c-11.196,5.069-26.394,8.354-42.709,9.216c0,0.085,0.043,0.154,0.043,0.247v443.733h93.867c14.123,0,25.6-11.486,25.6-25.6V223.693c0-27.776,6.571-55.586,18.995-80.427l14.242-28.493C418.227,112.794,418.415,110.515,417.758,108.407z M204.117,378.854l-25.6,59.733c-1.382,3.234-4.531,5.18-7.842,5.18c-1.118,0-2.261-0.23-3.354-0.7c-4.335-1.852-6.34-6.869-4.48-11.204l25.6-59.733c1.843-4.335,6.904-6.332,11.196-4.48C203.972,369.502,205.978,374.519,204.117,378.854z M307.209,24.602c-13.286,6.084-31.582,9.557-51.2,9.557c-19.439,0-37.598-3.405-50.859-9.395c0.316-0.06,0.64-0.119,0.947-0.205c32.666-9.984,67.166-9.984,99.831,0c0.085,0.017,0.179,0.026,0.256,0.026c0.341,0,0.683-0.162,1.024-0.094V24.602z M344.704,443.068c-1.092,0.469-2.236,0.7-3.362,0.7c-3.302,0-6.451-1.946-7.834-5.18l-25.6-59.733c-1.86-4.335,0.145-9.353,4.48-11.204c4.292-1.86,9.344,0.145,11.196,4.48l25.6,59.733C351.044,436.198,349.039,441.216,344.704,443.068z" />
                </svg>
                Try on in Changing Room
              </button>

              {/* Wishlist */}
              {onToggleWishlist && handle && (
                <button
                  onClick={() => onToggleWishlist(handle)}
                  className="w-full py-3 text-sm text-[#6b6b6b] hover:text-[#f5f5f5] transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isWishlisted ? 'white' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                  {isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                </button>
              )}

              {/* Description */}
              {product.description && (
                <div className="pt-4 border-t border-[#1a1a1a]">
                  <h3 className="text-xs tracking-[0.15em] uppercase text-[#6b6b6b] mb-3">Description</h3>
                  <p className="text-sm text-[#a0a0a0] leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Tags */}
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {product.tags.slice(0, 8).map((tag) => (
                    <span key={tag} className="text-[10px] tracking-[0.1em] uppercase px-3 py-1 bg-[#141414] text-[#6b6b6b] border border-[#1a1a1a] cursor-default transition-all duration-200 hover:border-[#c9a962]/40 hover:text-[#c9a962] hover:bg-[#c9a962]/5">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: product info below image */}
      <div className="md:hidden px-5 pt-6 space-y-5">
        {/* Vendor */}
        <p className="text-xs tracking-[0.2em] uppercase text-[#6b6b6b]">{product.vendor}</p>

        {/* Title */}
        <h1 className="text-xl font-light text-[#f5f5f5] leading-tight">{product.title}</h1>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          {selectedVariant && (
            <>
              <span className="text-lg text-[#f5f5f5] tabular-nums">
                {formatPrice(selectedVariant.price)}
              </span>
              {discountPercent > 0 && selectedVariant.compareAtPrice && (
                <>
                  <span className="text-sm text-[#6b6b6b] line-through tabular-nums">
                    {formatPrice(selectedVariant.compareAtPrice)}
                  </span>
                  <span className="text-xs font-medium text-[#c9a962]">
                    {discountPercent}% off
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* Variant Selector */}
        {Object.entries(optionGroups).map(([optName, values]) =>
          values.length > 1 ? (
            <div key={optName}>
              <label className="block text-xs tracking-[0.15em] uppercase text-[#6b6b6b] mb-3">{optName}</label>
              <div className="flex flex-wrap gap-2">
                {values.map((val) => {
                  const isSelected = selectedVariant?.selectedOptions.some(
                    (o) => o.name === optName && o.value === val
                  );
                  return (
                    <button
                      key={val}
                      onClick={() => handleOptionChange(optName, val)}
                      className={`px-5 py-2.5 text-sm border transition-all ${
                        isSelected
                          ? 'border-[#f5f5f5] text-[#f5f5f5] bg-transparent'
                          : 'border-[#2a2a2a] text-[#6b6b6b] hover:border-[#4a4a4a]'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null
        )}

        {/* Try on link */}
        <button
          onClick={() => navigate(`/changing-room?product=${handle}`)}
          className="w-full py-3 text-sm text-[#6b6b6b] hover:text-[#c9a962] transition-colors flex items-center justify-center gap-2 border border-[#1a1a1a] rounded-lg"
        >
          <svg width="16" height="16" viewBox="0 0 512.026 512.026" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M417.758,108.407c-1.212-3.874-13.918-37.538-93.483-55.543V29.901v-5.41c0-8.124-5.794-14.916-13.901-16.427c-35.567-10.752-73.156-10.752-108.723,0c-8.107,1.51-13.909,8.303-13.909,16.427v5.41v22.963c-79.556,18.005-92.262,51.669-93.474,55.543c-0.657,2.108-0.469,4.386,0.512,6.366l14.242,28.493c12.425,24.841,18.987,52.651,18.987,80.427v262.733c0,14.114,11.486,25.6,25.6,25.6h93.867V68.292c0-0.094,0.051-0.162,0.051-0.247c-16.316-0.862-31.514-4.147-42.718-9.216V43.042c14.532,5.265,32.461,8.183,51.2,8.183c18.748,0,36.676-2.918,51.2-8.183v15.787c-11.196,5.069-26.394,8.354-42.709,9.216c0,0.085,0.043,0.154,0.043,0.247v443.733h93.867c14.123,0,25.6-11.486,25.6-25.6V223.693c0-27.776,6.571-55.586,18.995-80.427l14.242-28.493C418.227,112.794,418.415,110.515,417.758,108.407z M204.117,378.854l-25.6,59.733c-1.382,3.234-4.531,5.18-7.842,5.18c-1.118,0-2.261-0.23-3.354-0.7c-4.335-1.852-6.34-6.869-4.48-11.204l25.6-59.733c1.843-4.335,6.904-6.332,11.196-4.48C203.972,369.502,205.978,374.519,204.117,378.854z M307.209,24.602c-13.286,6.084-31.582,9.557-51.2,9.557c-19.439,0-37.598-3.405-50.859-9.395c0.316-0.06,0.64-0.119,0.947-0.205c32.666-9.984,67.166-9.984,99.831,0c0.085,0.017,0.179,0.026,0.256,0.026c0.341,0,0.683-0.162,1.024-0.094V24.602z M344.704,443.068c-1.092,0.469-2.236,0.7-3.362,0.7c-3.302,0-6.451-1.946-7.834-5.18l-25.6-59.733c-1.86-4.335,0.145-9.353,4.48-11.204c4.292-1.86,9.344,0.145,11.196,4.48l25.6,59.733C351.044,436.198,349.039,441.216,344.704,443.068z" />
          </svg>
          Try on in Changing Room
        </button>

        {/* Description */}
        {product.description && (
          <div className="pt-4 border-t border-[#1a1a1a]">
            <h3 className="text-xs tracking-[0.15em] uppercase text-[#6b6b6b] mb-3">Description</h3>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {product.tags.slice(0, 8).map((tag) => (
              <span key={tag} className="text-[10px] tracking-[0.1em] uppercase px-3 py-1 bg-[#141414] text-[#6b6b6b] border border-[#1a1a1a] cursor-default transition-all duration-200 hover:border-[#c9a962]/40 hover:text-[#c9a962] hover:bg-[#c9a962]/5">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mobile: sticky bottom bar */}
      <div className="md:hidden fixed bottom-[calc(60px+env(safe-area-inset-bottom))] left-0 right-0 z-40 bg-[#0a0a0a] border-t border-[#1a1a1a] px-4 py-3">
        <div className="flex gap-3">
          <button
            onClick={handleAddToCart}
            disabled={!selectedVariant?.availableForSale || addingToCart}
            className="flex-1 py-3.5 text-sm font-medium tracking-[0.05em] uppercase border border-[#f5f5f5] text-[#f5f5f5] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition-colors disabled:opacity-40"
          >
            {addingToCart ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding
              </span>
            ) : 'Add to Bag'}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!selectedVariant?.availableForSale || addingToCart || buyingNow}
            className="flex-1 py-3.5 text-sm font-medium tracking-[0.05em] uppercase bg-[#f5f5f5] text-[#0a0a0a] hover:bg-white transition-colors disabled:opacity-40"
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* Full-page skeleton overlay for Buy Now */}
      {buyingNow && (
        <div className="fixed inset-0 z-[200] bg-[#0a0a0a] flex flex-col">
          {/* Skeleton header */}
          <div className="h-14 border-b border-[#1a1a1a] flex items-center px-6 gap-4">
            <div className="w-24 h-4 bg-[#1a1a1a] rounded animate-pulse" />
            <div className="ml-auto flex gap-6">
              <div className="w-16 h-3 bg-[#1a1a1a] rounded animate-pulse" />
              <div className="w-16 h-3 bg-[#1a1a1a] rounded animate-pulse" />
              <div className="w-16 h-3 bg-[#141414] rounded animate-pulse" />
            </div>
          </div>
          {/* Skeleton content */}
          <div className="flex-1 flex flex-col md:flex-row max-w-4xl mx-auto w-full px-6 py-10 gap-10">
            {/* Skeleton order summary */}
            <div className="flex-1 space-y-6">
              <div className="w-32 h-4 bg-[#1a1a1a] rounded animate-pulse" />
              <div className="flex gap-4">
                <div className="w-20 h-24 bg-[#141414] rounded animate-pulse" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="w-3/4 h-3 bg-[#1a1a1a] rounded animate-pulse" />
                  <div className="w-1/2 h-3 bg-[#141414] rounded animate-pulse" />
                  <div className="w-20 h-3 bg-[#1a1a1a] rounded animate-pulse" />
                </div>
              </div>
              <div className="border-t border-[#1a1a1a] pt-4 space-y-3">
                <div className="flex justify-between"><div className="w-16 h-3 bg-[#141414] rounded animate-pulse" /><div className="w-20 h-3 bg-[#141414] rounded animate-pulse" /></div>
                <div className="flex justify-between"><div className="w-20 h-3 bg-[#141414] rounded animate-pulse" /><div className="w-12 h-3 bg-[#141414] rounded animate-pulse" /></div>
                <div className="flex justify-between pt-2 border-t border-[#1a1a1a]"><div className="w-12 h-4 bg-[#1a1a1a] rounded animate-pulse" /><div className="w-24 h-4 bg-[#1a1a1a] rounded animate-pulse" /></div>
              </div>
            </div>
            {/* Skeleton payment form */}
            <div className="flex-1 space-y-5">
              <div className="w-40 h-4 bg-[#1a1a1a] rounded animate-pulse" />
              <div className="space-y-4">
                <div className="w-full h-11 bg-[#141414] rounded animate-pulse" />
                <div className="flex gap-3"><div className="flex-1 h-11 bg-[#141414] rounded animate-pulse" /><div className="flex-1 h-11 bg-[#141414] rounded animate-pulse" /></div>
                <div className="w-full h-11 bg-[#141414] rounded animate-pulse" />
                <div className="w-full h-11 bg-[#141414] rounded animate-pulse" />
              </div>
              <div className="w-full h-12 bg-[#1a1a1a] rounded animate-pulse mt-4" />
            </div>
          </div>
          {/* Redirecting text */}
          <div className="text-center pb-8">
            <p className="text-xs tracking-[0.15em] uppercase text-[#6b6b6b] animate-pulse">Redirecting to checkout</p>
          </div>
        </div>
      )}

      {/* Zara-style toast — slides down from top */}
      <div
        className={`fixed top-0 left-0 right-0 z-[100] flex justify-center transition-all duration-300 ease-out ${
          toastMessage ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className={`mt-3 px-6 py-3 text-xs tracking-[0.15em] uppercase backdrop-blur-md border shadow-lg ${
          toastType === 'success'
            ? 'bg-[#0a0a0a]/90 text-[#f5f5f5] border-[#2a2a2a]'
            : 'bg-red-950/90 text-red-200 border-red-800/40'
        }`}>
          {toastMessage}
        </div>
      </div>
    </div>
  );
};
