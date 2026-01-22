---
"amplify-adapter": minor
---

feat: add dynamic Brotli/Gzip compression for SSR responses

- Automatically compress SSR responses based on client's Accept-Encoding header
- Prefer Brotli over Gzip for better compression ratios
- Support q-value parsing to respect client encoding preferences
- Only compress text-based content types (text/*, application/json, etc.)
- Use streaming compression for memory efficiency
