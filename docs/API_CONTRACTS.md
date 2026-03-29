# Stiri — API Contracts

> Complete request/response contracts for all API endpoints.

---

## Auth

### POST /auth/otp/send
```json
// Request
{ "phone": "+91XXXXXXXXXX" }
// Response 200
{ "success": true }
```

### POST /auth/otp/verify
```json
// Request
{ "phone": "+91XXXXXXXXXX", "otp": "123456" }
// Response 200 (sets auth cookies)
{ "user": { "id": "uuid", "email": "...", "phone": "..." }, "session": { "access_token": "..." } }
```

### GET /auth/me
```json
// Response 200
{ "user": { "id": "uuid", "email": "...", "name": "...", "accountType": "free", ... } }
// Response 401
{ "error": "Not authenticated" }
```

### POST /auth/logout
```json
// Response 200 (clears auth cookies)
{ "success": true }
```

---

## Templates

### GET /api/templates
```json
// Query: ?stack_id=flex (optional)
// Response 200
{ "templates": [{ "id": "template-handle", "stackId": "flex", "name": "...", "imageUrl": "...", "prompt": "...", "aspectRatio": "1:1", "keywords": [] }] }
```

### GET /api/templates/trending
```json
// Response 200
{ "templates": [/* sorted by trending_order */] }
```

### GET /api/templates/:id
```json
// Response 200
{ "template": { "id": "...", "stackId": "...", "name": "...", ... } }
// Response 404
{ "error": "Template not found" }
```

### GET /api/templates/stream (SSE)
Server-Sent Events stream. Emits `template-update` events when templates table changes via Supabase Realtime.
```
event: template-update
data: {"type":"UPDATE","id":"template-handle"}
```

---

## Wishlist (Auth Required)

### GET /api/wishlist
```json
// Response 200
{ "data": [{ "templateId": "...", "createdAt": "...", "template": { "id": "...", "stack_id": "...", "title": "...", "image": "..." } }] }
```

### POST /api/wishlist
```json
// Request
{ "templateId": "template-handle" }
// Response 200
{ "success": true }
```

### DELETE /api/wishlist/:templateId
```json
// Response 200
{ "success": true }
```

---

## Shopify

### GET /api/shopify/products
```json
// Query: ?first=20&after=cursor (optional)
// Response 200
{ "products": [ShopifyProduct], "pageInfo": { "hasNextPage": boolean, "endCursor": "..." } }
```

### GET /api/shopify/product/:handle
```json
// Response 200
{ "product": ShopifyProduct }
// Response 404
{ "error": "Product not found" }
```

### POST /api/shopify/cart
```json
// Request
{ "lines": [{ "merchandiseId": "gid://shopify/ProductVariant/...", "quantity": 1 }] }
// Response 200
{ "cart": ShopifyCart }
```

### POST /api/shopify/cart/lines
```json
// Request
{ "cartId": "gid://shopify/Cart/...", "lines": [{ "merchandiseId": "...", "quantity": 1 }] }
// Response 200
{ "cart": ShopifyCart }
```

### PUT /api/shopify/cart/lines
```json
// Request
{ "cartId": "...", "lines": [{ "id": "line-id", "quantity": 2 }] }
// Response 200
{ "cart": ShopifyCart }
```

### DELETE /api/shopify/cart/lines
```json
// Request
{ "cartId": "...", "lineIds": ["line-id-1"] }
// Response 200
{ "cart": ShopifyCart }
```

---

## Payments (Auth Required)

### POST /api/create-order
```json
// Request
{ "planId": "essentials_monthly" }
// Response 200
{ "success": true, "orderId": "order_...", "amount": 12900, "currency": "INR", "keyId": "rzp_..." }
```

### POST /api/verify-payment
```json
// Request
{ "razorpay_order_id": "order_...", "razorpay_payment_id": "pay_...", "razorpay_signature": "..." }
// Response 200
{ "success": true }
```

### GET /api/user-subscription
```json
// Response 200
{ "accountType": "essentials", "monthlyQuota": 50, "monthlyUsed": 12, "extraCredits": 5, "creationsLeft": 43 }
```

---

## Profile (Auth Required)

### GET /api/profile
```json
// Response 200
{ "profile": UserProfile, "onboardingPercent": 60, "addresses": [UserAddress] }
```

### PUT /api/profile
```json
// Request (partial update)
{ "full_name": "...", "colors": ["red", "blue"], "styles": ["casual"] }
// Response 200
{ "profile": UserProfile }
```

---

## Generate (Auth Required)

### POST /api/generate
```json
// Request
{ "selfieBase64": "data:image/...", "templateId": "template-handle", "mode": "tryon" }
// Response 200
{ "images": ["https://storage.url/image1.png", "https://storage.url/image2.png"] }
// Response 429
{ "error": "Rate limit exceeded" }
```

---

## Health

### GET /api/health
```json
// Response 200
{ "status": "ok", "uptime": 12345 }
```
