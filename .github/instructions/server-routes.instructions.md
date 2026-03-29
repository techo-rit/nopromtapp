---
description: >
  Security guidance for server routes. Applied automatically when editing
  Express route handlers and auth-related files.
applyTo: "server/src/routes/**"
---

# Server Route Security

When editing server route handlers:

- **Authentication**: All protected endpoints MUST use `getUserFromRequest(req, res)` from `server/src/lib/auth.js`. If it returns null, the response is already sent — just `return`.
- **Authorization**: Use `createAdminClient()` to bypass RLS only when the server needs to write data on behalf of a user. Never expose admin client to request handlers directly.
- **Input validation**: Validate all request body fields, query params, and path params at the handler entry point. Check file types, sizes, and base64 lengths.
- **Razorpay**: Never skip signature verification on payment webhooks.
- **No dangerous patterns**: Avoid `eval()`, `new Function()`, `child_process.exec()` with user input, `document.write()`.
