---
description: >
  Security patterns to watch for when editing any code file.
  Detects common vulnerability patterns and provides safe alternatives.
applyTo: "**/*.{js,ts,tsx,jsx,mjs}"
---

# Security Guidance

When editing code files, watch for these security patterns:

## Dangerous Patterns — Avoid

| Pattern | Risk | Safe Alternative |
|---------|------|-----------------|
| `eval()` | Code injection | `JSON.parse()` for data, redesign for logic |
| `new Function()` | Code injection | Alternative design patterns |
| `dangerouslySetInnerHTML` | XSS | Use React components, or sanitize with DOMPurify |
| `.innerHTML =` | XSS | Use `textContent` for text, DOM methods for HTML |
| `document.write()` | XSS | `createElement()` + `appendChild()` |
| `child_process.exec()` | Command injection | `child_process.execFile()` with array args |
| `os.system()` | Command injection | `subprocess.run()` with list args |
| `pickle.loads()` | Arbitrary code execution | `json.loads()` for data |

## Project-Specific Security Rules

- **Authentication**: All protected endpoints use `getUserFromRequest(req, res)` — check `server/src/lib/auth.js`
- **RLS**: Row Level Security enabled on all Supabase tables
- **Payments**: Razorpay signature verification is mandatory — never skip it
- **Input validation**: Validate at system boundaries: file types, sizes, base64 lengths
- **Admin client**: `createAdminClient()` bypasses RLS — use only when server needs to write on behalf of users

## GitHub Actions Workflows

If editing `.github/workflows/*.yml`:
- Never use untrusted input in `run:` commands directly
- Use `env:` variables instead of inline `${{ github.event.* }}` expressions
- Risky inputs: issue titles, PR descriptions, commit messages, branch names
