// web/features/templates/templateService.ts — Fetch templates from Supabase API
import { CONFIG } from '../../config';
import type { Template } from '../../types';

const BASE = CONFIG.API.BASE_URL;

/** DB row → frontend Template (snake_case → camelCase) */
function normalizeTemplate(row: Record<string, any>): Template {
  return {
    id: row.id,
    name: row.title,
    imageUrl: row.image,
    prompt: (() => {
      try { return JSON.parse(row.prompt); }
      catch { return row.prompt; }
    })(),
    aspectRatio: row.aspect_ratio || '1:1',
    keywords: row.tags || [],
    // Enriched price data from server-side Shopify join
    price: row.price || undefined,
    compareAtPrice: row.compare_at_price || undefined,
    availableForSale: row.available_for_sale ?? undefined,
    shopifyProduct: row.shopify_product || undefined,
  };
}

/** Fetch all active templates */
export async function fetchTemplates(): Promise<Template[]> {
  const url = `${BASE}/api/templates`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch templates: ${res.status}`);
  const { templates } = await res.json();
  return (templates || []).map(normalizeTemplate);
}

/** Fetch only trending templates (in order) */
export async function fetchTrendingTemplates(): Promise<Template[]> {
  const res = await fetch(`${BASE}/api/templates/trending`);
  if (!res.ok) throw new Error(`Failed to fetch trending templates: ${res.status}`);
  const { templates } = await res.json();
  return (templates || []).map(normalizeTemplate);
}

/** Fetch a single template by ID */
export async function fetchTemplateById(id: string): Promise<Template | null> {
  const res = await fetch(`${BASE}/api/templates/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch template: ${res.status}`);
  const row = await res.json();
  return normalizeTemplate(row);
}
