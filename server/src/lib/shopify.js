// server/src/lib/shopify.js — Shopify Storefront API GraphQL client (DRY)
import { createTtlCache } from './cache.js';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = '2025-01';

const productCache = createTtlCache(5 * 60 * 1000); // 5 min — purge via /api/admin/cache/purge

// Expose cache for admin purge endpoint
export { productCache };

// ─── Core fetch ──────────────────────────────────────────────

export async function shopifyFetch(query, variables = {}) {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN) {
    throw new Error('Shopify environment variables not configured');
  }

  const url = `https://${SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

// ─── GraphQL Fragments ──────────────────────────────────────

const IMAGE_FRAGMENT = `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`;

const VARIANT_FRAGMENT = `
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    price { amount currencyCode }
    compareAtPrice { amount currencyCode }
    selectedOptions { name value }
    image { ...ImageFields }
  }
`;

const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    availableForSale
    images(first: 10) {
      edges { node { ...ImageFields } }
    }
    variants(first: 30) {
      edges { node { ...VariantFields } }
    }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    compareAtPriceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
  }
`;

// ─── Product queries ────────────────────────────────────────

export async function getProducts(first = 50) {
  const cacheKey = `products:${first}`;
  const cached = productCache.get(cacheKey);
  if (cached) return cached;

  const query = `
    ${IMAGE_FRAGMENT}
    ${VARIANT_FRAGMENT}
    ${PRODUCT_FRAGMENT}
    query GetProducts($first: Int!) {
      products(first: $first, sortKey: TITLE) {
        edges {
          node { ...ProductFields }
        }
      }
    }
  `;

  const data = await shopifyFetch(query, { first });
  const products = data.products.edges.map((e) => normalizeProduct(e.node));
  productCache.set(cacheKey, products);
  return products;
}

export async function getProductByHandle(handle) {
  const cacheKey = `product:${handle}`;
  const cached = productCache.get(cacheKey);
  if (cached) return cached;

  const query = `
    ${IMAGE_FRAGMENT}
    ${VARIANT_FRAGMENT}
    ${PRODUCT_FRAGMENT}
    query GetProductByHandle($handle: String!) {
      product(handle: $handle) {
        ...ProductFields
      }
    }
  `;

  const data = await shopifyFetch(query, { handle });
  if (!data.product) return null;
  const product = normalizeProduct(data.product);
  productCache.set(cacheKey, product);
  return product;
}

export async function getProductsByHandles(handles) {
  if (!handles || handles.length === 0) return [];

  // Check cache first — only fetch missing ones
  const results = [];
  const missing = [];
  for (const h of handles) {
    const cached = productCache.get(`product:${h}`);
    if (cached) {
      results.push(cached);
    } else {
      missing.push(h);
    }
  }

  if (missing.length === 0) return results;

  // Build inline aliases for each missing handle
  const aliasQueries = missing.map(
    (h, i) => `p${i}: product(handle: "${h.replace(/"/g, '\\"')}") { ...ProductFields }`
  ).join('\n');

  const query = `
    ${IMAGE_FRAGMENT}
    ${VARIANT_FRAGMENT}
    ${PRODUCT_FRAGMENT}
    query GetProductsByHandles {
      ${aliasQueries}
    }
  `;

  const data = await shopifyFetch(query);
  for (let i = 0; i < missing.length; i++) {
    const raw = data[`p${i}`];
    if (raw) {
      const product = normalizeProduct(raw);
      productCache.set(`product:${missing[i]}`, product);
      results.push(product);
    }
  }

  return results;
}

// ─── Cart mutations ─────────────────────────────────────────

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      totalAmount { amount currencyCode }
      subtotalAmount { amount currencyCode }
    }
    lines(first: 50) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              product {
                title
                handle
                featuredImage { url altText width height }
              }
              price { amount currencyCode }
              selectedOptions { name value }
            }
          }
          cost {
            totalAmount { amount currencyCode }
          }
        }
      }
    }
  }
`;

export async function createCart(lines = []) {
  const query = `
    ${CART_FRAGMENT}
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
  `;

  const input = lines.length > 0
    ? { lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity || 1 })) }
    : {};

  const data = await shopifyFetch(query, { input });
  if (data.cartCreate.userErrors?.length > 0) {
    throw new Error(data.cartCreate.userErrors.map((e) => e.message).join(', '));
  }
  return normalizeCart(data.cartCreate.cart);
}

export async function getCart(cartId) {
  const query = `
    ${CART_FRAGMENT}
    query GetCart($cartId: ID!) {
      cart(id: $cartId) { ...CartFields }
    }
  `;

  const data = await shopifyFetch(query, { cartId });
  if (!data.cart) return null;
  return normalizeCart(data.cart);
}

export async function addCartLines(cartId, lines) {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
  `;

  const formattedLines = lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity || 1 }));
  const data = await shopifyFetch(query, { cartId, lines: formattedLines });
  if (data.cartLinesAdd.userErrors?.length > 0) {
    throw new Error(data.cartLinesAdd.userErrors.map((e) => e.message).join(', '));
  }
  return normalizeCart(data.cartLinesAdd.cart);
}

export async function updateCartLines(cartId, lines) {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
  `;

  const formattedLines = lines.map((l) => ({ id: l.lineId, quantity: l.quantity }));
  const data = await shopifyFetch(query, { cartId, lines: formattedLines });
  if (data.cartLinesUpdate.userErrors?.length > 0) {
    throw new Error(data.cartLinesUpdate.userErrors.map((e) => e.message).join(', '));
  }
  return normalizeCart(data.cartLinesUpdate.cart);
}

export async function removeCartLines(cartId, lineIds) {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch(query, { cartId, lineIds });
  if (data.cartLinesRemove.userErrors?.length > 0) {
    throw new Error(data.cartLinesRemove.userErrors.map((e) => e.message).join(', '));
  }
  return normalizeCart(data.cartLinesRemove.cart);
}

// ─── Normalizers ────────────────────────────────────────────

function normalizeProduct(raw) {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description,
    descriptionHtml: raw.descriptionHtml,
    vendor: raw.vendor,
    productType: raw.productType,
    tags: raw.tags,
    availableForSale: raw.availableForSale,
    images: raw.images.edges.map((e) => e.node),
    variants: raw.variants.edges.map((e) => e.node),
    priceRange: raw.priceRange,
    compareAtPriceRange: raw.compareAtPriceRange,
  };
}

function normalizeCart(raw) {
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    cost: raw.cost,
    lines: raw.lines.edges.map((e) => e.node),
  };
}
