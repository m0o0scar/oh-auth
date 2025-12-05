# Change: Add POST encrypt API for secret URLs

## Why
Programmatic consumers need to encrypt URLs with a password without relying on browser redirects or form submissions.

## What Changes
- Add a POST `/secret/encrypt` flow that accepts JSON `{url, password}`, encrypts the url with the password, and returns the decrypt URL in JSON.
- Keep existing query-string and form-driven encryption behavior unchanged.

## Impact
- Affected specs: secret-encryption
- Affected code: `/secret/encrypt` route handler, encryption utilities/tests

