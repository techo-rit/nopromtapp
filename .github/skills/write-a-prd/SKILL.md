---
name: write-a-prd
description: >
  Create a Product Requirements Document through interview and codebase exploration.
  Use when the user says "write a PRD", "plan this feature", "help me spec this out",
  or "I need a requirements doc".
---

# Write a PRD — Product Requirements Document Creator

Create a thorough PRD by interviewing the user and exploring the codebase.

## Process

### Step 1: Get the Problem Description
Ask the user to describe:
- What problem they're solving
- Who the user is
- What "done" looks like

### Step 2: Explore the Repository
Read the codebase to understand:
- Current architecture (see `docs/ARCHITECTURE.md`)
- Existing patterns and conventions (see `docs/CODING_CONVENTIONS.md`)
- Related existing features
- Database schema (see `docs/DATABASE_REFERENCE.md`)

### Step 3: Interview Relentlessly
Ask one question at a time. Cover:
- User stories and workflows
- Edge cases and error states
- Performance requirements
- Security implications
- Integration points with existing systems
- What's explicitly out of scope

When the user is unsure, suggest the answer you'd recommend — then ask if they agree.

### Step 4: Sketch Modules
Before writing, sketch out the implementation:
- What modules/files will be created or modified
- Design for **deep modules**: simple interface, complex implementation (see TDD skill)
- Identify boundaries and dependencies

### Step 5: Write the PRD

Use this template:

```markdown
# PRD: [Feature Name]

## Problem
What problem does this solve? For whom?

## Solution
High-level description of the approach.

## User Stories
- As a [user], I want [action], so that [benefit]
- ...

## Implementation Decisions
Key technical decisions and their rationale:
- Decision 1: [choice] because [reason]
- ...

## Testing Strategy
How this feature will be tested:
- Unit tests for [what]
- Integration tests for [what]
- Manual verification for [what]

## Out of Scope
What this feature explicitly does NOT include.
```
