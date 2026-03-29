---
description: >
  Automated PR code review. Checks for compliance with project conventions,
  detects bugs, and provides high-signal feedback. Use with: /code-review
---

# Code Review

Perform a thorough code review of the current changes or a specified PR.

## Process

### 1. Gather Context
- Read `.github/copilot-instructions.md` for project rules
- Read `docs/CODING_CONVENTIONS.md` for patterns and anti-patterns
- Read `docs/KNOWN_PITFALLS.md` for historical bugs to watch for

### 2. Identify Changed Files
Look at the current git diff or PR diff to understand what was changed.

### 3. Review Categories

**Convention Compliance**:
- Do changes follow patterns in `docs/CODING_CONVENTIONS.md`?
- Are new API endpoints documented in `docs/API_CONTRACTS.md`?
- Do schema changes update `docs/DATABASE_REFERENCE.md` and `web/types/index.ts`?
- Does `constants.ts` stay under ~70 lines?
- Are auth endpoints using `getUserFromRequest()` pattern?

**Bug Detection**:
- Are there infinite loop risks in state management?
- Cart loop: Does anything increment `refreshTrigger` inside `handleCartUpdate`?
- Missing null checks at system boundaries?
- Type mismatches between frontend types and API responses?
- Re-added removed columns (`shopify_handle`, `negative_prompt`, `style_preset`)?

**Security**:
- Input validation at system boundaries?
- RLS policies for new tables?
- Razorpay signature verification present?
- No `eval()`, `dangerouslySetInnerHTML`, or `innerHTML` with untrusted input?

### 4. Report Findings

For each issue found, report:
- **File and location**: Exact file path and line range
- **Severity**: Critical / Warning / Info
- **Description**: What's wrong and why it matters
- **Suggestion**: How to fix it

### 5. High Signal Only

Filter out:
- Pre-existing issues not introduced by the changes
- Pedantic style nitpicks that linters catch
- General quality improvements unrelated to the changes
- False positives

Only report issues that are genuinely important.
