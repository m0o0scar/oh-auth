# Change: Add password-protected URL encryption flows

## Why
Users need a way to share URLs that stay hidden until a password holder decrypts them.

## What Changes
- Add `/secret/encrypt` to accept a target URL and password (via query params or form), encrypt the URL with that password, and redirect to `/secret/decrypt?secret=...`.
- Add `/secret/decrypt` to accept an encrypted secret, prompt for the password, decrypt to the original URL, and render a clickable link when successful.
- Introduce a shared client-side helper to perform password-based encryption/decryption and produce URL-safe secrets used by both routes.

## Impact
- Affected specs: secret-encryption
- Affected code: `src/app/secret/encrypt`, `src/app/secret/decrypt`, shared encryption/decryption utility.

