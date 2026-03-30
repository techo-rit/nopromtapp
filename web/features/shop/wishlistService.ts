// web/features/shop/wishlistService.ts — Frontend wishlist API
import { CONFIG } from '../../config';

const BASE = CONFIG.API.BASE_URL;

export interface WishlistItem {
  templateId: string;
  createdAt: string;
  template: {
    id: string;
    stack_id: string;
    title: string;
    image: string;
    aspect_ratio: string;
    trending: boolean;
    is_active: boolean;
  } | null;
}

export async function fetchWishlist(): Promise<WishlistItem[]> {
  const res = await fetch(`${BASE}/api/wishlist`, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 401) return []; // not logged in
    throw new Error('Failed to fetch wishlist');
  }
  const { items } = await res.json();
  return items || [];
}

export async function addToWishlist(templateId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/wishlist`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId }),
  });
  if (!res.ok) throw new Error('Failed to add to wishlist');
}

export async function removeFromWishlist(templateId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/wishlist/${encodeURIComponent(templateId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to remove from wishlist');
}
