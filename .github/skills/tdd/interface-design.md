# Interface Design for Testability

## Principles

### Accept Dependencies, Return Results

Functions should:
- **Accept** everything they need as parameters (dependency injection)
- **Return** their results rather than mutating external state
- Have a **small surface area** — few parameters, focused responsibility

### Small Interface, Deep Implementation

A well-designed module has:
- A **small, simple interface** (few methods, clear parameters)
- A **deep implementation** (handles complexity internally)
- See `deep-modules.md` for more on this principle

## Interface Design Checklist

- [ ] Can this function be tested without mocking internal modules?
- [ ] Does the function accept its dependencies as parameters?
- [ ] Does the function return its result instead of mutating global state?
- [ ] Is the parameter list small (≤3 parameters)?
- [ ] Does the function have a single, clear responsibility?

## Example: Good Interface

```typescript
// Small interface, deep implementation
interface TemplateService {
  getById(id: string): Promise<Template | null>;
  search(query: string, filters: SearchFilters): Promise<Template[]>;
}
```

## Example: Bad Interface

```typescript
// Large interface, shallow implementation — every internal detail exposed
interface TemplateService {
  connectToDb(): void;
  buildQuery(table: string, conditions: Record<string, any>): string;
  executeQuery(query: string): Promise<any[]>;
  parseResults(raw: any[]): Template[];
  cacheResults(key: string, data: Template[]): void;
  getFromCache(key: string): Template[] | null;
  invalidateCache(key: string): void;
  getById(id: string): Promise<Template | null>;
}
```
