# Change: Add OAuth2 login for Google and Raindrop

## Why

We need a minimal OAuth2 login flow so users can start authentication with Google and Raindrop from the app and observe received tokens.

## What Changes

- Add a home route (`/`) that lists supported providers with links to start OAuth2.
- Add `/auth/{provider}` to redirect to the provider authorization page.
- Add `/auth/{provider}/callback` to handle the authorization code and log access/refresh tokens.
- Load provider credentials from `.env` and surface clear errors when missing.

## Impact

- Affected specs: `oauth2-login`
- Affected code: server routes for `/`, `/auth/{provider}`, `/auth/{provider}/callback`, environment configuration for provider credentials
