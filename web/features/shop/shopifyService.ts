// web/features/shop/shopifyService.ts — Frontend Shopify API service (DRY)
import { CONFIG } from '../../config';
import type { ShopifyProduct, ShopifyCart } from '../../types';

const BASE = CONFIG.API.BASE_URL;

async function shopifyGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Shopify API error: ${res.status}`);
  }
  return res.json();
}

async function shopifyPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Shopify API error: ${res.status}`);
  }
  return res.json();
}

async function shopifyPut<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Shopify API error: ${res.status}`);
  }
  return res.json();
}

async function shopifyDelete<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Shopify API error: ${res.status}`);
  }
  return res.json();
}

// ─── Products ───────────────────────────────────────────────

export async function fetchProducts(first = 50): Promise<ShopifyProduct[]> {
  const data = await shopifyGet<{ success: boolean; products: ShopifyProduct[] }>(
    `/api/shopify/products?first=${first}`
  );
  return data.products;
}

export async function fetchProduct(handle: string): Promise<ShopifyProduct | null> {
  try {
    const data = await shopifyGet<{ success: boolean; product: ShopifyProduct }>(
      `/api/shopify/product/${encodeURIComponent(handle)}`
    );
    return data.product;
  } catch {
    return null;
  }
}

export async function fetchProductsByHandles(handles: string[]): Promise<ShopifyProduct[]> {
  if (handles.length === 0) return [];
  const data = await shopifyPost<{ success: boolean; products: ShopifyProduct[] }>(
    '/api/shopify/products/batch',
    { handles }
  );
  return data.products;
}

// ─── Cart ───────────────────────────────────────────────────

const CART_ID_KEY = 'stiri_shopify_cart_id';

function getCachedCartId(): string | null {
  try { return localStorage.getItem(CART_ID_KEY); } catch { return null; }
}

function setCachedCartId(cartId: string) {
  try { localStorage.setItem(CART_ID_KEY, cartId); } catch { /* ignore */ }
}

export function clearCachedCartId() {
  try { localStorage.removeItem(CART_ID_KEY); } catch { /* ignore */ }
}

// In-memory cart cache: avoids redundant fetches when drawer opens repeatedly
let _cartCache: ShopifyCart | null = null;
let _cartCacheTime = 0;
const CART_CACHE_TTL = 5 * 60 * 1000; // 5 minutes — invalidated on mutations anyway

function getCachedCart(): ShopifyCart | null {
  if (_cartCache && Date.now() - _cartCacheTime < CART_CACHE_TTL) return _cartCache;
  return null;
}

function setCachedCart(cart: ShopifyCart) {
  _cartCache = cart;
  _cartCacheTime = Date.now();
}

/** Clear the in-memory cart cache (call when you know cart changed externally) */
export function invalidateCartCache() {
  _cartCache = null;
  _cartCacheTime = 0;
}

export async function getOrCreateCart(): Promise<ShopifyCart> {
  // Return cached if available (no mutation happened)
  const cached = getCachedCart();
  if (cached) return cached;

  const cartId = getCachedCartId();
  const data = await shopifyPost<{ success: boolean; cart: ShopifyCart }>(
    '/api/shopify/cart',
    { cartId: cartId || undefined }
  );
  setCachedCartId(data.cart.id);
  setCachedCart(data.cart);
  return data.cart;
}

export async function fetchCart(cartId: string): Promise<ShopifyCart | null> {
  try {
    const data = await shopifyGet<{ success: boolean; cart: ShopifyCart }>(
      `/api/shopify/cart/${encodeURIComponent(cartId)}`
    );
    return data.cart;
  } catch {
    return null;
  }
}

export async function addToCart(
  variantId: string,
  quantity = 1
): Promise<ShopifyCart> {
  const cartId = getCachedCartId();
  const data = await shopifyPost<{ success: boolean; cart: ShopifyCart }>(
    '/api/shopify/cart/lines',
    { cartId: cartId || undefined, lines: [{ variantId, quantity }] }
  );
  setCachedCartId(data.cart.id);
  setCachedCart(data.cart); // Update cache with fresh mutation result
  return data.cart;
}

export async function updateCartLine(
  cartId: string,
  lineId: string,
  quantity: number
): Promise<ShopifyCart> {
  const data = await shopifyPut<{ success: boolean; cart: ShopifyCart }>(
    '/api/shopify/cart/lines',
    { cartId, lines: [{ lineId, quantity }] }
  );
  setCachedCart(data.cart); // Update cache with fresh mutation result
  return data.cart;
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[]
): Promise<ShopifyCart> {
  const data = await shopifyDelete<{ success: boolean; cart: ShopifyCart }>(
    '/api/shopify/cart/lines',
    { cartId, lineIds }
  );
  setCachedCart(data.cart); // Update cache with fresh mutation result
  return data.cart;
}

// ─── Formatting ─────────────────────────────────────────────

export function formatPrice(price: { amount: string; currencyCode: string }): string {
  const amount = parseFloat(price.amount);
  if (price.currencyCode === 'INR') {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  }).format(amount);
}
