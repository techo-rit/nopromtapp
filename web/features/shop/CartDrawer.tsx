// web/features/shop/CartDrawer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { ShopifyCart } from '../../types';
import { getOrCreateCart, updateCartLine, removeFromCart, formatPrice } from './shopifyService';
import { CloseIcon, HeartFilledIcon } from '../../shared/ui/Icons';
import { Spinner } from '../../shared/ui/Spinner';
import type { WishlistItem } from './wishlistService';

type Tab = 'cart' | 'wishlist';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate?: (totalQuantity: number) => void;
  refreshTrigger?: number;
  wishlistItems: WishlistItem[];
  wishlistLoading: boolean;
  onRemoveWishlistItem: (templateId: string) => void;
  onProductDetails?: (handle: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onCartUpdate,
  refreshTrigger = 0,
  wishlistItems,
  wishlistLoading,
  onRemoveWishlistItem,
  onProductDetails,
}) => {
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingLineId, setUpdatingLineId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('cart');

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getOrCreateCart();
      setCart(c);
      onCartUpdate?.(c.totalQuantity);
    } catch {
      // Cart may not exist yet
    } finally {
      setLoading(false);
    }
  }, [onCartUpdate]);

  useEffect(() => {
    if (isOpen) loadCart();
  }, [isOpen, loadCart, refreshTrigger]);

  const handleQuantityChange = useCallback(async (lineId: string, newQty: number) => {
    if (!cart) return;
    setUpdatingLineId(lineId);
    try {
      if (newQty <= 0) {
        const updated = await removeFromCart(cart.id, [lineId]);
        setCart(updated);
        onCartUpdate?.(updated.totalQuantity);
      } else {
        const updated = await updateCartLine(cart.id, lineId, newQty);
        setCart(updated);
        onCartUpdate?.(updated.totalQuantity);
      }
    } catch {
      // silent
    } finally {
      setUpdatingLineId(null);
    }
  }, [cart, onCartUpdate]);

  const handleRemove = useCallback(async (lineId: string) => {
    if (!cart) return;
    setUpdatingLineId(lineId);
    try {
      const updated = await removeFromCart(cart.id, [lineId]);
      setCart(updated);
      onCartUpdate?.(updated.totalQuantity);
    } catch {
      // silent
    } finally {
      setUpdatingLineId(null);
    }
  }, [cart, onCartUpdate]);

  const handleCheckout = () => {
    if (cart?.checkoutUrl) window.location.href = cart.checkoutUrl;
  };

  if (!isOpen) return null;

  const cartItemCount = cart?.totalQuantity || 0;
  const wishlistCount = wishlistItems.length;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative z-10 w-full max-w-[420px] h-full bg-[#111111] border-l border-[#222] flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="shrink-0 px-5 pt-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#f5f5f5] tracking-tight">Shopping</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-[#666] hover:text-[#f5f5f5] transition-colors rounded-full hover:bg-[#1a1a1a]"
              aria-label="Close"
            >
              <CloseIcon width={18} height={18} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-[#222]">
            <button
              onClick={() => setActiveTab('cart')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'cart'
                  ? 'text-[#c9a962]'
                  : 'text-[#666] hover:text-[#999]'
              }`}
            >
              Cart{cartItemCount > 0 && ` (${cartItemCount})`}
              {activeTab === 'cart' && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[#c9a962] rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'wishlist'
                  ? 'text-[#c9a962]'
                  : 'text-[#666] hover:text-[#999]'
              }`}
            >
              Wishlist{wishlistCount > 0 && ` (${wishlistCount})`}
              {activeTab === 'wishlist' && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[#c9a962] rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {activeTab === 'cart' ? (
            <CartTabContent
              cart={cart}
              loading={loading}
              updatingLineId={updatingLineId}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
              onClose={onClose}
            />
          ) : (
            <WishlistTabContent
              items={wishlistItems}
              loading={wishlistLoading}
              onRemove={onRemoveWishlistItem}
              onProductDetails={onProductDetails}
              onClose={onClose}
            />
          )}
        </div>

        {/* Footer – only for cart tab when items exist */}
        {activeTab === 'cart' && cart && cart.lines.length > 0 && (
          <div className="shrink-0 px-5 py-4 border-t border-[#222] bg-[#111111]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-[#888]">Subtotal</span>
              <span className="text-xl font-bold text-[#f5f5f5]">
                {formatPrice(cart.cost.subtotalAmount)}
              </span>
            </div>
            <p className="text-xs text-[#555] mb-4">Shipping &amp; taxes calculated at checkout</p>
            <button
              onClick={handleCheckout}
              className="w-full py-3.5 text-sm font-bold bg-[#c9a962] text-[#0a0a0a] rounded-xl hover:bg-[#d4b872] active:scale-[0.98] transition-all duration-200"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </div>
  );
};

/* ─── Cart Tab ─────────────────────────────────────────── */

interface CartTabProps {
  cart: ShopifyCart | null;
  loading: boolean;
  updatingLineId: string | null;
  onQuantityChange: (lineId: string, qty: number) => void;
  onRemove: (lineId: string) => void;
  onClose: () => void;
}

const CartTabContent: React.FC<CartTabProps> = ({ cart, loading, updatingLineId, onQuantityChange, onRemove, onClose }) => {
  if (loading) {
    return (
      <div className="px-4 py-3 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3.5 p-3 bg-[#161616] rounded-xl border border-[#222] animate-pulse">
            <div className="w-[76px] h-[76px] bg-[#1a1a1a] rounded-lg shrink-0" />
            <div className="flex-1 space-y-2.5 py-1">
              <div className="h-3.5 bg-[#1a1a1a] rounded w-3/4" />
              <div className="h-3 bg-[#1a1a1a] rounded w-1/2" />
              <div className="h-4 bg-[#1a1a1a] rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-10">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-[#444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <p className="text-[#999] text-base font-medium">Your cart is empty</p>
        <p className="text-[#555] text-sm mt-1.5 max-w-[240px]">Explore our collection and discover something you'll love</p>
        <button
          onClick={onClose}
          className="mt-6 px-7 py-2.5 text-sm font-medium text-[#c9a962] border border-[#c9a962]/25 rounded-xl hover:bg-[#c9a962]/8 transition-colors"
        >
          Continue Browsing
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {cart.lines.map((line) => {
        const isUpdating = updatingLineId === line.id;
        const image = line.merchandise.product.featuredImage;
        const hasCompare = line.cost.totalAmount.amount !== line.cost.totalAmount.amount; // Shopify handles compare at line level

        return (
          <div
            key={line.id}
            className={`flex gap-3.5 p-3 bg-[#161616] rounded-xl border border-[#222] transition-opacity ${isUpdating ? 'opacity-40 pointer-events-none' : ''}`}
          >
            {/* Image */}
            <div className="w-[76px] h-[76px] bg-[#0e0e0e] rounded-lg overflow-hidden shrink-0">
              {image ? (
                <img src={image.url} alt={image.altText || ''} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#333]">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#f5f5f5] truncate leading-snug">
                  {line.merchandise.product.title}
                </p>
                {line.merchandise.title !== 'Default Title' && (
                  <p className="text-[11px] text-[#666] mt-0.5">{line.merchandise.title}</p>
                )}
                <p className="text-sm font-bold text-[#c9a962] mt-1">
                  {formatPrice(line.cost.totalAmount)}
                </p>
              </div>

              {/* Qty + Remove */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center bg-[#0e0e0e] rounded-lg border border-[#222]">
                  <button
                    onClick={() => onQuantityChange(line.id, line.quantity - 1)}
                    disabled={isUpdating}
                    className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#f5f5f5] transition-colors text-sm"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="px-2 text-xs font-medium text-[#f5f5f5] min-w-[20px] text-center">{line.quantity}</span>
                  <button
                    onClick={() => onQuantityChange(line.id, line.quantity + 1)}
                    disabled={isUpdating}
                    className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#f5f5f5] transition-colors text-sm"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => onRemove(line.id)}
                  disabled={isUpdating}
                  className="text-[11px] text-[#555] hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Order summary */}
      <div className="bg-[#161616] rounded-xl border border-[#222] p-4 mt-2">
        <p className="text-xs font-medium text-[#666] uppercase tracking-wider mb-3">Order Summary</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#888]">Items ({cart.totalQuantity})</span>
            <span className="text-[#ccc]">{formatPrice(cart.cost.subtotalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#888]">Shipping</span>
            <span className="text-[#888] text-xs italic">Calculated at checkout</span>
          </div>
          <div className="border-t border-[#222] pt-2 mt-2 flex justify-between">
            <span className="font-medium text-[#f5f5f5]">Subtotal</span>
            <span className="font-bold text-[#f5f5f5]">{formatPrice(cart.cost.subtotalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Wishlist Tab ─────────────────────────────────────── */

interface WishlistTabProps {
  items: WishlistItem[];
  loading: boolean;
  onRemove: (templateId: string) => void;
  onProductDetails?: (handle: string) => void;
  onClose: () => void;
}

const WishlistTabContent: React.FC<WishlistTabProps> = ({ items, loading, onRemove, onProductDetails, onClose }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Spinner />
        <p className="text-[#555] text-sm mt-4">Loading wishlist...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-10">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-5">
          <HeartFilledIcon width={24} height={24} className="text-[#444]" />
        </div>
        <p className="text-[#999] text-base font-medium">Your wishlist is empty</p>
        <p className="text-[#555] text-sm mt-1.5 max-w-[240px]">Tap the heart icon on any product to save it for later</p>
        <button
          onClick={onClose}
          className="mt-6 px-7 py-2.5 text-sm font-medium text-[#c9a962] border border-[#c9a962]/25 rounded-xl hover:bg-[#c9a962]/8 transition-colors"
        >
          Discover Products
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {items.map((item) => {
        const t = item.template;
        if (!t) return null;
        return (
          <div
            key={item.templateId}
            className="flex gap-3.5 p-3 bg-[#161616] rounded-xl border border-[#222] group"
          >
            {/* Image */}
            <div
              className="w-[76px] h-[76px] bg-[#0e0e0e] rounded-lg overflow-hidden shrink-0 cursor-pointer"
              onClick={() => onProductDetails?.(item.templateId)}
            >
              {t.image ? (
                <img src={t.image} alt={t.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#333]">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#f5f5f5] truncate leading-snug">{t.title}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => onProductDetails?.(item.templateId)}
                  className="text-xs font-medium text-[#c9a962] hover:text-[#d4b872] transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => onRemove(item.templateId)}
                  className="text-[11px] text-[#555] hover:text-[#a0a0a0] transition-colors flex items-center gap-1"
                >
                  <HeartFilledIcon width={12} height={12} className="text-white" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
