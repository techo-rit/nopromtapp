# Test Writing Guidelines

## Good Tests

Good tests are:
- **Descriptive**: The test name explains the behavior being verified
- **Independent**: Each test can run alone without depending on other tests
- **Fast**: Tests run in milliseconds, not seconds
- **Deterministic**: Same result every time, no flaky behavior

### Example of a Good Test

```typescript
test('adding an item to empty cart shows cart count of 1', async () => {
  const cart = createCart();
  await cart.addItem({ productId: 'shirt-1', quantity: 1 });
  expect(cart.itemCount).toBe(1);
});
```

### Example of a Bad Test

```typescript
// Bad: Tests implementation details, not behavior
test('cart internal array has length 1 after push', () => {
  const cart = new Cart();
  cart._items.push({ id: 'shirt-1' });
  expect(cart._items.length).toBe(1);
});
```

## Test Structure

Use **Arrange → Act → Assert** (AAA) pattern:
1. **Arrange**: Set up the test context (create objects, mock dependencies)
2. **Act**: Perform the action being tested (call a function, trigger an event)
3. **Assert**: Verify the expected outcome

## What to Test

- **Happy paths**: The normal, expected behavior
- **Edge cases**: Empty inputs, boundary values, null/undefined
- **Error cases**: Invalid inputs, network failures, permission denied
- **Behavior contracts**: What the public API promises to callers

## What NOT to Test

- Private methods directly (test through public API)
- Third-party library internals
- Configuration values that don't affect behavior
- Trivial getters/setters with no logic
