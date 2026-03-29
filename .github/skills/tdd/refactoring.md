# Refactoring Signals

## When to Refactor

Refactor during the "Refactor" phase of Red → Green → Refactor. Look for these signals:

### 1. Duplication
Two or more places doing the same thing → extract a shared function or module.

But beware: not all duplication is bad. Two pieces of code that look the same but change for different reasons should stay separate (they're coincidental duplication, not real duplication).

### 2. Shallow Modules
A module whose interface is almost as complex as its implementation → deepen it by absorbing related functionality. See `deep-modules.md`.

### 3. Feature Envy
A function that reaches into another module's data more than its own → move the function to the module it's envious of, or rethink the boundary.

### 4. Long Parameter Lists
A function with many parameters → group related parameters into an object, or split the function.

### 5. Primitive Obsession
Passing raw strings/numbers everywhere when a domain type would be clearer → create a type alias or value object.

### 6. Change Amplification
A small change requires edits in many files → the abstraction boundary is in the wrong place.

## Refactoring Safety Rules

1. **All tests must pass before AND after refactoring**
2. **Never refactor and add behavior in the same step**
3. **Small steps**: Extract → Rename → Move → Inline, one at a time
4. **Run tests after every step**
5. **If tests break during refactoring, your tests couple to implementation** — fix the tests first
