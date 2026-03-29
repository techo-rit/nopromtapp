---
description: >
  Code quality and testing standards applied to all source files.
  Includes TDD principles, test behavior guidelines, mocking rules, and refactoring signals.
applyTo: "**/*.{js,ts,tsx,jsx,mjs}"
---

# Code Quality & Testing Standards

These principles apply automatically to ALL code written in this project.

## Testing Principles (Always Active)

- **Test behavior, not implementation**: Tests describe what the system does, not how it does it internally.
- **Vertical slices, not horizontal layers**: Each test exercises meaningful user-facing behavior through all layers. Don't test layers in isolation.
- **Red → Green → Refactor**: Write a failing test first, make it pass with the simplest code, then refactor.
- **Arrange → Act → Assert**: Every test follows this structure.

## What to Test
- Happy paths (normal expected behavior)
- Edge cases (empty inputs, boundary values, null/undefined)
- Error cases (invalid inputs, network failures)
- Behavior contracts (what the public API promises)

## What NOT to Test
- Private methods (test through public API)
- Third-party library internals
- Trivial getters/setters with no logic

## Mocking Rules
- **Mock at boundaries only**: Database calls, external APIs (Shopify, Razorpay), file system, time.
- **Don't mock your own modules**: If you need to mock your own code, the design has too much coupling.
- **Dependency injection**: Design functions to accept dependencies as parameters.
- **Red flags**: Mocking 3+ things per test = function does too much. Mock setup longer than test = simplify design.

## Interface Design
- **Small interface, deep implementation**: Modules should have few methods but handle complexity internally.
- **Accept dependencies, return results**: Functions accept what they need as params, return results instead of mutating state.
- **≤3 parameters**: If a function needs more, group related params into an object.

## Refactoring Signals
- **Duplication**: Two places doing the same thing → extract shared function
- **Shallow modules**: Interface as complex as implementation → deepen by absorbing related functionality
- **Feature envy**: Function reaches into another module's data more than its own → move it
- **Change amplification**: Small change needs many file edits → abstraction boundary is wrong
- **Safety**: All tests must pass before AND after refactoring. Never refactor and add behavior in the same step.

## Code Review Awareness (Always Active)

When writing code, self-check for:
- Convention compliance with `docs/CODING_CONVENTIONS.md`
- Cart loop risk: Nothing increments `refreshTrigger` inside `handleCartUpdate`
- Missing null checks at system boundaries
- Type mismatches between frontend types and API responses
- Re-added removed columns (`shopify_handle`, `negative_prompt`, `style_preset`)
- Input validation at system boundaries
