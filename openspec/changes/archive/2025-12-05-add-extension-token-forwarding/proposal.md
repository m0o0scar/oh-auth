# Change: Add extension token forwarding

## Why

Extensions that initiate OAuth need issued tokens sent back automatically; today tokens are only logged on the server.

## What Changes

- Forward caller-provided `state` (e.g., JSON with `extensionId`) from `/auth/{provider}` into the provider authorization URL unchanged.
- Parse returned `state` on callback and, when it contains `extensionId`, send tokens to that extension via `chrome.runtime.sendMessage`.
- Preserve existing provider validation and error handling for unsupported providers or missing credentials.

## Impact

- Affected specs: oauth2-login
- Affected code: `src/app/auth/[provider]/route.ts`, `src/app/auth/[provider]/callback/route.ts`, `src/lib/oauth.ts`
