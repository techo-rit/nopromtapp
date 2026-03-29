# Deep Modules

*From "A Philosophy of Software Design" by John Ousterhout*

## The Concept

A **deep module** provides a simple interface that hides significant complexity. A **shallow module** exposes most of its complexity through its interface.

```
Deep Module:          Shallow Module:
┌──────────┐          ┌──────────────────────┐
│ interface │          │      interface       │
├──────────┤          ├──────────────────────┤
│          │          │   implementation     │
│  impl.   │          └──────────────────────┘
│          │
│          │
└──────────┘
```

## Why It Matters for TDD

- Deep modules are **easier to test** because the interface is small
- Deep modules **hide decisions** — tests don't couple to internals
- Shallow modules force tests to know about implementation details

## Guidelines

### DO: Make Modules Deep
- Hide implementation decisions behind a simple API
- Handle error cases internally when possible
- Provide sensible defaults
- Let the module manage its own state

### DON'T: Create Shallow Wrappers
- Don't create a class that just wraps another class with the same interface
- Don't create a function that just calls another function with the same parameters
- Don't split a cohesive operation into multiple tiny functions that must be called in sequence

## Examples

### Deep: Cache with automatic expiry
```typescript
const cache = createCache({ ttl: 30000 });
const value = await cache.get('key', () => expensiveFetch());
// Cache handles: expiry, refresh, stampede protection, serialization
```

### Shallow: Cache that exposes everything
```typescript
const cache = new Cache();
if (!cache.has('key') || cache.isExpired('key')) {
  const value = await expensiveFetch();
  cache.set('key', value, Date.now() + 30000);
}
const value = cache.get('key');
```
