---
name: improve-codebase-architecture
description: >
  Find architecture improvement opportunities in the codebase. Use when the user says
  "improve architecture", "find refactoring opportunities", "module deepening",
  "reduce coupling", or "find tech debt".
---

# Improve Codebase Architecture

Explore the codebase organically to find opportunities for module-deepening, coupling reduction, and architecture improvement.

## Process

### Step 1: Explore Organically
Read through the codebase without a fixed agenda. Look for:
- Shallow modules (interface as complex as implementation)
- Tight coupling between unrelated features
- Change amplification (small change needs many file edits)
- Duplicated logic across features
- God objects or functions doing too many things

### Step 2: Present Candidates
List 3-5 improvement candidates, each with:
- **What**: Description of the problem
- **Where**: Specific files and line ranges
- **Impact**: How fixing this improves the codebase
- **Risk**: What could go wrong during refactoring

### Step 3: Frame the Problem
For the chosen candidate, write a clear problem statement:
- Current state (what the code does now)
- Why it's problematic (coupling, duplication, complexity)
- Constraints (backward compatibility, data migration, etc.)

### Step 4: Design Alternatives
Propose 3+ different designs, each with different constraints:
- **Design A**: Optimize for simplicity
- **Design B**: Optimize for extensibility
- **Design C**: Optimize for performance
- Each design should include trade-offs and implementation sketch

### Step 5: Compare and Recommend
Create a comparison table:

| Criterion | Design A | Design B | Design C |
|-----------|----------|----------|----------|
| Simplicity | ✅ | ⚠️ | ❌ |
| Extensibility | ⚠️ | ✅ | ⚠️ |
| Lines of code | ~50 | ~120 | ~80 |
| Risk | Low | Medium | High |

Recommend one design with clear justification.

### Step 6: Write RFC Issue
Create a GitHub issue (or markdown document) with:
- Problem statement
- Proposed solution (the recommended design)
- Alternative designs considered
- Migration plan (if applicable)
- Rollback strategy

See `REFERENCE.md` for dependency categorization and testing strategy.
