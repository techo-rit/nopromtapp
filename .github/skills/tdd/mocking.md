# Mocking Guidelines

## Core Principle: Mock at Boundaries Only

Only mock things at the boundary of your system:
- **Database calls**: Mock the Supabase client, not your own functions
- **External APIs**: Mock HTTP responses from Shopify, Razorpay, etc.
- **File system**: Mock fs operations when unavoidable
- **Time**: Mock `Date.now()` for time-dependent logic

## Don't Mock

- Your own modules (if you need to mock your own code, your design has too much coupling)
- Simple data transformations
- Pure functions

## Dependency Injection Pattern

Design functions to accept their dependencies:

```typescript
// Good: Dependencies injected, easy to test
function createOrderService(db: Database, paymentGateway: PaymentGateway) {
  return {
    async createOrder(userId: string, items: CartItem[]) {
      const order = await db.insert('orders', { userId, items });
      await paymentGateway.charge(order.total);
      return order;
    }
  };
}

// Test: Pass in test doubles
const fakeDb = { insert: vi.fn().mockResolvedValue({ id: '1', total: 100 }) };
const fakePayment = { charge: vi.fn().mockResolvedValue(true) };
const service = createOrderService(fakeDb, fakePayment);
```

```typescript
// Bad: Hard-coded dependencies, hard to test
import { supabase } from '../lib/supabase';
import { razorpay } from '../lib/razorpay';

async function createOrder(userId, items) {
  // Can't replace supabase or razorpay in tests
}
```

## Mock Hierarchy

From most preferred to least preferred:
1. **No mock**: Use the real thing (for pure functions, simple logic)
2. **Fake**: In-memory implementation (e.g., in-memory database)
3. **Stub**: Returns canned data (e.g., `vi.fn().mockReturnValue(...)`)
4. **Mock**: Verifies interactions (e.g., `expect(fn).toHaveBeenCalledWith(...)`)
5. **Spy**: Wraps real implementation with tracking

## Red Flags

If you find yourself:
- Mocking more than 2-3 things per test → your function does too much
- Mocking your own internal modules → refactor the coupling
- Mock setup is longer than the test → simplify the design
- Tests break when you refactor internals → you mocked too deep
