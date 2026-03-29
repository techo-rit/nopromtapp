# Architecture Improvement Reference

## Dependency Categories

When analyzing architecture, categorize each dependency:

### 1. In-Process Dependencies
Dependencies within the same process (imports, function calls).
- **Testing**: Use real implementations whenever possible
- **Refactoring**: Extract interfaces, use dependency injection

### 2. Local-Substitutable Dependencies
Dependencies that can be swapped with local alternatives (databases, caches).
- **Testing**: Use in-memory fakes (e.g., SQLite for Postgres, Map for Redis)
- **Refactoring**: Create ports & adapters pattern

### 3. Remote-Owned Dependencies (Ports & Adapters)
External services you control the integration with (your own microservices).
- **Testing**: Use contract tests, mock at the adapter boundary
- **Refactoring**: Define a port interface, implement adapters

### 4. True-External Dependencies
Third-party services you don't control (Shopify, Razorpay, external APIs).
- **Testing**: Record/replay, mock at the HTTP boundary
- **Refactoring**: Wrap in an adapter, never let external types leak into domain

## Testing Strategy by Dependency Type

| Type | Unit Test | Integration Test | E2E Test |
|------|-----------|-----------------|----------|
| In-Process | Real impl | Real impl | Real impl |
| Local-Substitutable | Fake | Real | Real |
| Remote-Owned | Mock adapter | Contract test | Real |
| True-External | Mock HTTP | Record/replay | Skip or sandbox |

## Issue Template for Architecture RFCs

```markdown
# RFC: [Title]

## Problem
[Current state and why it's problematic]

## Proposed Solution
[Recommended design with implementation sketch]

## Alternatives Considered
[Other designs and why they were rejected]

## Migration Plan
1. [Step 1 — backward compatible]
2. [Step 2 — migrate callers]
3. [Step 3 — remove old code]

## Rollback Strategy
[How to undo if things go wrong]

## Acceptance Criteria
- [ ] All existing tests pass
- [ ] New tests cover the refactored code
- [ ] No behavior changes for users
```
