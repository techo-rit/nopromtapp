# Shopify Storefront API Integration for Stiri

## Overview

Stiri will integrate Shopify's Storefront API (GraphQL) to enable e-commerce capabilities for the 5 trending products (Maharaja Majesty, Classic Tailored Suit, Modern Festive Kurta, Silk Saree, Evening Gown).

Store: **stiri-in.myshopify.com**

---

## Authentication

### 1. Get Storefront Access Token

**Via Shopify Admin:**
1. Go to **Apps** → **Headless** channel
2. Create a new storefront
3. Copy the **Storefront API access token** (public token for browser use)

### 2. Configure in Stiri

Add to `server/.env`:
```env
SHOPIFY_STORE_DOMAIN=stiri-in.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=your_storefront_access_token
```

---

## API Endpoint

```
POST https://stiri-in.myshopify.com/api/2026-01/graphql.json
```

**Headers:**
```
Content-Type: application/json
X-Shopify-Storefront-Access-Token: {your_token}
```

---

## Core GraphQL Queries

### 1. Fetch All Products (Trending Section)

```graphql
query getTrendingProducts($first: Int!) {
  products(first: $first, sortKey: CREATED_AT, reverse: true) {
    edges {
      node {
        id
        title
        handle
        description
        vendor
        productType
        tags
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        featuredImage {
          url
          altText
          width
          height
        }
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              sku
              availableForSale
              quantityAvailable
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
              selectedOptions {
                name
                value
              }
              image {
                url
                altText
              }
            }
          }
        }
        availableForSale
      }
    }
  }
}
```

**Variables:**
```json
{
  "first": 5
}
```

---

### 2. Fetch Single Product by Handle

```graphql
query getProduct($handle: String!) {
  productByHandle(handle: $handle) {
    id
    title
    handle
    description
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      url
      altText
    }
    images(first: 10) {
      edges {
        node {
          url
          altText
        }
      }
    }
    variants(first: 20) {
      edges {
        node {
          id
          title
          price {
            amount
            currencyCode
          }
          availableForSale
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
}
```

**Variables:**
```json
{
  "handle": "maharaja-majesty"
}
```

---

### 3. Search Products

```graphql
query searchProducts($query: String!, $first: Int!) {
  products(first: $first, query: $query) {
    edges {
      node {
        id
        title
        handle
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        featuredImage {
          url
          altText
        }
      }
    }
  }
}
```

**Example Query Filters:**
- `tag:Indian Festive` - products with specific tag
- `product_type:Ethnic Wear` - by product type
- `vendor:Stiri` - by vendor
- `available_for_sale:true` - only available products
- `title:*kurta*` - text search in title

---

## Cart Mutations

### 1. Create Cart

```graphql
mutation cartCreate($input: CartInput!) {
  cartCreate(input: $input) {
    cart {
      id
      checkoutUrl
      totalQuantity
      cost {
        totalAmount {
          amount
          currencyCode
        }
        subtotalAmount {
          amount
          currencyCode
        }
      }
      lines(first: 10) {
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
                  featuredImage {
                    url
                  }
                }
                price {
                  amount
                  currencyCode
                }
              }
            }
            cost {
              totalAmount {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "lines": [
      {
        "merchandiseId": "gid://shopify/ProductVariant/123456",
        "quantity": 1
      }
    ],
    "buyerIdentity": {
      "countryCode": "IN"
    }
  }
}
```

---

### 2. Add Items to Cart

```graphql
mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart {
      id
      totalQuantity
      cost {
        totalAmount {
          amount
          currencyCode
        }
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
                }
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

**Variables:**
```json
{
  "cartId": "gid://shopify/Cart/abc123",
  "lines": [
    {
      "merchandiseId": "gid://shopify/ProductVariant/789012",
      "quantity": 2
    }
  ]
}
```

---

### 3. Update Cart Lines

```graphql
mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart {
      id
      totalQuantity
      cost {
        totalAmount {
          amount
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

**Variables:**
```json
{
  "cartId": "gid://shopify/Cart/abc123",
  "lines": [
    {
      "id": "gid://shopify/CartLine/xyz789",
      "quantity": 3
    }
  ]
}
```

---

### 4. Remove Cart Lines

```graphql
mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart {
      id
      totalQuantity
    }
    userErrors {
      field
      message
    }
  }
}
```

---

## Implementation Plan for Stiri

### Phase 1: Backend Service Layer

**Create `server/src/lib/shopify.js`:**

```javascript
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = '2026-01';

async function shopifyFetch(query, variables = {}) {
  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0].message);
  }

  return json.data;
}

export async function getTrendingProducts(first = 5) {
  const query = `
    query getTrendingProducts($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              url
              altText
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch(query, { first });
  return data.products.edges.map(edge => edge.node);
}

export async function getProductByHandle(handle) {
  const query = `
    query getProduct($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        description
        variants(first: 20) {
          edges {
            node {
              id
              title
              price {
                amount
                currencyCode
              }
              availableForSale
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch(query, { handle });
  return data.productByHandle;
}

export async function createCart(lines, countryCode = 'IN') {
  const mutation = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          totalQuantity
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch(mutation, {
    input: {
      lines,
      buyerIdentity: { countryCode }
    }
  });

  return data.cartCreate.cart;
}
```

---

### Phase 2: API Routes

**`server/src/routes/shopify.js`:**

```javascript
import { getTrendingProducts, getProductByHandle, createCart } from '../lib/shopify.js';

export async function getTrendingHandler(req, res) {
  try {
    const products = await getTrendingProducts(5);
    return res.json({ success: true, products });
  } catch (error) {
    console.error('Trending products error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getProductHandler(req, res) {
  try {
    const { handle } = req.params;
    const product = await getProductByHandle(handle);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    return res.json({ success: true, product });
  } catch (error) {
    console.error('Product fetch error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function createCartHandler(req, res) {
  try {
    const { lines } = req.body;
    const cart = await createCart(lines);
    return res.json({ success: true, cart });
  } catch (error) {
    console.error('Cart creation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
```

**Register routes in `server/src/app.js`:**

```javascript
import { getTrendingHandler, getProductHandler, createCartHandler } from './routes/shopify.js';

app.get('/api/shopify/trending', getTrendingHandler);
app.get('/api/shopify/product/:handle', getProductHandler);
app.post('/api/shopify/cart', createCartHandler);
```

---

### Phase 3: Frontend Integration

**Create `web/features/shop/shopService.ts`:**

```typescript
import { CONFIG } from '../../config';

export const shopService = {
  async getTrendingProducts() {
    const resp = await fetch(`${CONFIG.API.BASE_URL}/api/shopify/trending`, {
      credentials: 'include',
    });
    const data = await resp.json();
    if (!data.success) throw new Error(data.error);
    return data.products;
  },

  async getProduct(handle: string) {
    const resp = await fetch(`${CONFIG.API.BASE_URL}/api/shopify/product/${handle}`, {
      credentials: 'include',
    });
    const data = await resp.json();
    if (!data.success) throw new Error(data.error);
    return data.product;
  },

  async createCart(lines: Array<{ merchandiseId: string; quantity: number }>) {
    const resp = await fetch(`${CONFIG.API.BASE_URL}/api/shopify/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ lines }),
    });
    const data = await resp.json();
    if (!data.success) throw new Error(data.error);
    return data.cart;
  },
};
```

---

### Phase 4: Trending Carousel Component

**`web/features/shop/TrendingCarousel.tsx`:**

```typescript
import React, { useState, useEffect } from 'react';
import { shopService } from './shopService';

export const TrendingCarousel: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shopService.getTrendingProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-[#6b6b6b]">Loading trending...</div>;

  return (
    <div className="py-12">
      <h2 className="text-2xl font-semibold text-[#f5f5f5] mb-6">Trending Now</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {products.map(product => (
          <div
            key={product.id}
            className="group cursor-pointer"
            onClick={() => window.location.href = `/shop/${product.handle}`}
          >
            <div className="aspect-square bg-[#141414] rounded-xl overflow-hidden mb-3">
              <img
                src={product.featuredImage?.url}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <h3 className="text-[#f5f5f5] text-sm font-medium mb-1">{product.title}</h3>
            <p className="text-[#c9a962] text-sm font-semibold">
              {product.priceRange.minVariantPrice.currencyCode}{' '}
              {product.priceRange.minVariantPrice.amount}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Testing Flow

1. **Upload CSV** to Shopify Admin → Products → Import
2. **Verify products** appear in stiri-in.myshopify.com (with password `beshee`)
3. **Get Storefront token** from Headless channel
4. **Test GraphQL** queries using Postman/Insomnia
5. **Implement backend** routes
6. **Build frontend** carousel
7. **Test add-to-cart** flow

---

## Rate Limits

- **Tokenless**: 1,000 complexity points
- **With token**: Higher limits (check Shopify docs for current tier)
- Use **pagination** (first: 20 max recommended) to stay under limits

---

## Best Practices

1. **Cache products** in Redis/memory for 5-10 minutes
2. **Use CDN URLs** from Shopify for images (automatically optimized)
3. **Handle errors gracefully** - Shopify API can return user-facing error messages
4. **Store cart ID** in localStorage for persistent cart across sessions
5. **Use `checkoutUrl`** from cart to redirect to Shopify hosted checkout

---

## Next Steps

1. Import `stiri_products.csv` into Shopify
2. Get Storefront Access Token
3. Implement backend Shopify service layer
4. Build TrendingCarousel component
5. Add product detail page
6. Implement add-to-cart functionality
