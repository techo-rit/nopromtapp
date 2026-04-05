# Stiri — Coding Conventions

> Enforced patterns and anti-patterns. Read this before writing any code.

---

## General

- **Node 20**, ESM modules (`import/export`), no CommonJS
- **TypeScript** on frontend, plain JS on backend
- **No external state library** — props flow from `App.tsx` down
- **No ORMs** — Supabase JS client for all DB access
- **Single-origin** — API and SPA served from the same Express process

---

## Backend (server/)

### File Organization
- One route file per feature domain: `routes/shopify.js`, `routes/wishlist.js`, etc.
- Shared utilities in `lib/`: `auth.js`, `cache.js`, `shopify.js`, `logger.js`, `cors.js`, `cookies.js`, `ratelimit.js`, `serverConfig.js`
- Route registration centralized in `app.js`

### Handler Pattern
```javascript
export async function myHandler(req, res) {
  // 1. Auth check (if needed)
  const { user, error, status } = await getUserFromRequest(req, res);
  if (error) return res.status(status).json({ error });

  // 2. Input validation
  const { field } = req.body;
  if (!field) return res.status(400).json({ error: 'field is required' });

  // 3. Business logic (Supabase admin client)
  const supabase = createAdminClient();
  const { data, error: dbError } = await supabase.from('table').select('*');

  // 4. Response
  if (dbError) return res.status(500).json({ error: dbError.message });
  res.json({ data });
}
```

### Auth Pattern
- `getUserFromRequest(req, res)` → `{ user: { id }, error?, status? }`
- Uses `createAdminClient()` for DB writes (bypasses RLS)
- Cookie-based JWT sessions (Supabase Auth)

### Caching
- Use `lib/cache.js` for in-memory TTL caching
- Shopify products: 30s TTL
- Templates: 10min TTL, invalidated by Supabase Realtime

---

## Frontend (web/)

### File Organization
- Features grouped by domain: `features/auth/`, `features/shop/`, `features/templates/`
- Shared components: `shared/ui/` (Icons, Spinner)
- Shared hooks: `shared/hooks/` (useWishlist, useImagePaste)
- Types centralized in `types/index.ts`
- Config centralized in `config.ts`
- Static data in `data/constants.ts` (PRICING_PLANS and STACKS only — no template arrays)

### Component Pattern
```tsx
interface MyComponentProps {
  required: string;
  optional?: boolean;
  onAction?: (id: string) => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  required,
  optional,
  onAction,
}) => { /* ... */ };
```

### Service Pattern
```typescript
export async function fetchData(): Promise<DataType[]> {
  const res = await fetch(`${CONFIG.API.BASE_URL}/api/endpoint`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}
```

### Hook Pattern (with optimistic updates)
```typescript
export function useMyFeature(isLoggedIn: boolean) {
  const [items, setItems] = useState<Item[]>([]);
  const [ids, setIds] = useState<Set<string>>(new Set());

  const toggle = useCallback(async (id: string) => {
    // Optimistic update
    setIds(prev => { /* flip membership */ });
    try {
      await apiCall(id);
    } catch {
      // Revert on failure
      setIds(prev => { /* flip back */ });
    }
  }, [ids]);

  return { items, ids, toggle };
}
```

### Styling
- **Tailwind CSS** — utility-first, no CSS modules
- Dark theme: `bg-[#0a0a0a]` base, `text-[#f5f5f5]` primary, `text-[#c9a962]` / `text-[#E4C085]` gold accent
- Rounded corners: `rounded-xl` / `rounded-2xl`
- Borders: `border-[#2a2a2a]` standard, `border-[#3a3a3a]` hover
- Transitions: `transition-all duration-300`

---

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| DB columns | `snake_case` | `user_id`, `created_at` |
| JS/TS variables | `camelCase` | `userId`, `createdAt` |
| React components | `PascalCase` | `CartDrawer`, `TrendingCarousel` |
| Route handlers | `camelCase` + `Handler` suffix | `getWishlistHandler` |
| Service functions | `camelCase` verb prefix | `fetchWishlist`, `addToCart` |
| Hook functions | `use` prefix | `useWishlist`, `useTemplates` |
| Type interfaces | `PascalCase` | `ShopifyProduct`, `Template` |
| File names (server) | `camelCase.js` | `shopify.js`, `createOrder.js` |
| File names (web) | `PascalCase.tsx` for components, `camelCase.ts` for services | `CartDrawer.tsx`, `shopifyService.ts` |

---

## Anti-Patterns (DO NOT)

- **DO NOT** add template arrays to `constants.ts` — templates come from Supabase
- **DO NOT** add a `shopify_handle` column — `template.id` IS the Shopify handle
- **DO NOT** use external state management (Redux, Zustand, etc.)
- **DO NOT** create CSS files — use Tailwind utilities inline
- **DO NOT** add `negative_prompt` or `style_preset` columns — removed from schema
- **DO NOT** increment `refreshTrigger` inside `handleCartUpdate` — causes infinite loops
- **DO NOT** bypass RLS with raw SQL — use `createAdminClient()` for server writes
