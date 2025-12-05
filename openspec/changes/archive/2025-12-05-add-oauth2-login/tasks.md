## 1. Implementation

- [x] 1.1 Define required `.env` variables for Google and Raindrop OAuth2 credentials (client id, secret, redirect URI).
- [x] 1.2 Build `/` route to list supported providers (Google, Raindrop) with links to start auth.
- [x] 1.3 Implement `/auth/{provider}` to validate provider, assemble provider-specific authorization URL, and redirect.
- [x] 1.4 Implement `/auth/{provider}/callback` to validate inputs, exchange the code for access/refresh tokens, and log them to the console.
- [x] 1.5 Add provider configuration with validation for missing or unsupported providers.
- [x] 1.6 Handle OAuth2 and configuration errors with clear console messages and HTTP responses.
- [x] 1.7 Manually test login flow for Google and Raindrop using sample `.env` values.
