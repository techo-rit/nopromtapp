// web/shared/hooks/useWishlist.ts — Wishlist state with optimistic updates
import { useState, useEffect, useCallback } from 'react';
import { fetchWishlist, addToWishlist, removeFromWishlist } from '../../features/shop/wishlistService';
import type { WishlistItem } from '../../features/shop/wishlistService';

interface UseWishlistResult {
  items: WishlistItem[];
  wishlistedIds: Set<string>;
  isLoading: boolean;
  toggle: (templateId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWishlist(isLoggedIn: boolean): UseWishlistResult {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setItems([]);
      setWishlistedIds(new Set());
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchWishlist();
      setItems(data);
      setWishlistedIds(new Set(data.map((d) => d.templateId)));
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(async (templateId: string) => {
    if (!isLoggedIn) return;

    const isCurrently = wishlistedIds.has(templateId);

    // Optimistic update
    setWishlistedIds((prev) => {
      const next = new Set(prev);
      if (isCurrently) next.delete(templateId);
      else next.add(templateId);
      return next;
    });

    if (isCurrently) {
      setItems((prev) => prev.filter((i) => i.templateId !== templateId));
    }

    try {
      if (isCurrently) {
        await removeFromWishlist(templateId);
      } else {
        await addToWishlist(templateId);
        // Re-fetch to get the full template data for the new item
        const data = await fetchWishlist();
        setItems(data);
        setWishlistedIds(new Set(data.map((d) => d.templateId)));
      }
    } catch {
      // Revert on failure
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        if (isCurrently) next.add(templateId);
        else next.delete(templateId);
        return next;
      });
      if (isCurrently) {
        refresh();
      }
    }
  }, [isLoggedIn, wishlistedIds, refresh]);

  return { items, wishlistedIds, isLoading, toggle, refresh };
}
