---
name: prd-to-issues
description: >
  Convert a PRD into GitHub issues. Use when the user says "break this into issues",
  "create tickets", "create GitHub issues from PRD", or "split into vertical slices".
---

# PRD to Issues — Vertical Slice Issue Creator

Convert a Product Requirements Document into independently-grabbable GitHub issues, each representing a vertical slice of functionality.

## Process

### Step 1: Locate the PRD
Ask the user to provide or point to the PRD. If one was recently created in chat, use that.

### Step 2: Explore the Codebase
Read the relevant parts of the codebase to understand:
- Existing architecture and patterns
- Where new code will live
- What can be reused vs. built from scratch

### Step 3: Draft Vertical Slices

Break the PRD into vertical slices. Each slice should:
- Deliver a thin, end-to-end piece of user-visible functionality
- Be independently implementable and testable
- Have clear acceptance criteria

Categorize each slice:
- **HITL** (Human-in-the-loop): Requires human judgment, design decisions, or approval
- **AFK** (Away-from-keyboard): Can be fully implemented by an AI agent autonomously

### Step 4: Quiz the User

Before creating issues, walk through the slices:
- Is the ordering correct? (dependencies flow correctly)
- Are any slices too big or too small?
- Are HITL/AFK labels correct?
- Any missing slices?

### Step 5: Create Issues

For each slice, create a GitHub issue with this structure:

```
Title: [HITL/AFK] Brief description

## Context
What this slice delivers and why.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Implementation Notes
- Files to create/modify
- Patterns to follow (reference docs/)
- Dependencies on other slices (if any)

## Testing
How to verify this slice works.
```

Order issues so that each can be started as soon as its dependencies are done.
