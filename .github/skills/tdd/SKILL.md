---
name: tdd
description: >
  Test-driven development workflow. Use when the user says "write tests", "TDD",
  "red-green-refactor", "test-driven", or asks for tests before implementation.
  Includes test patterns, mocking guidelines, and interface design principles.
---

# TDD — Test-Driven Development Skill

## Philosophy

- **Test behavior, not implementation.** Tests should describe what the system does, not how it does it internally.
- **Vertical slices, not horizontal layers.** Each test should exercise a meaningful user-facing behavior through all layers, not test a single layer in isolation.
- **Red → Green → Refactor.** Write a failing test first, make it pass with the simplest code, then refactor.

## Anti-Pattern: Horizontal Slicing

Don't write tests like "test the repository layer" then "test the service layer" then "test the controller layer." Instead, write tests like "when a user adds an item to cart, the cart total updates."

## Workflow

### 1. Planning Phase
- Identify the behavior to implement (user story or acceptance criteria)
- Break into vertical slices — each slice is a thin, end-to-end behavior
- Order slices: start with the "tracer bullet" (simplest path through all layers)

### 2. Tracer Bullet
- Write one test for the simplest happy path
- Implement just enough to make it pass through ALL layers
- This forces interface design decisions early: See `interface-design.md` and `deep-modules.md`

### 3. Incremental Loop
For each remaining slice:
1. **Red**: Write a failing test for the next behavior
2. **Green**: Make it pass with the simplest possible code
3. **Refactor**: Clean up duplication, improve naming, extract helpers. See `refactoring.md`

### 4. Refactor Phase
- Look for test duplication → extract test helpers
- Look for production duplication → extract modules
- Look for shallow modules → deepen them (see `deep-modules.md`)
- Run all tests after every refactor

## Checklist Per Cycle

- [ ] Test is written BEFORE implementation
- [ ] Test describes behavior, not implementation details
- [ ] Test fails for the right reason (not a syntax error)
- [ ] Implementation is the simplest code that makes the test pass
- [ ] All existing tests still pass after implementation
- [ ] Refactoring doesn't change behavior (tests still pass)
- [ ] Mocking follows boundary rules (see `mocking.md`)
