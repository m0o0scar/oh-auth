## OAuth2 playground

Minimal Next.js app to start OAuth2 flows for Google and Raindrop, redirect to provider authorization pages, and log received tokens on callback.

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
cp env.example .env.local
# then edit .env.local with real credentials
```

Required variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (e.g., http://localhost:3000/auth/google/callback)
- `RAINDROP_CLIENT_ID`
- `RAINDROP_CLIENT_SECRET`
- `RAINDROP_REDIRECT_URI` (e.g., http://localhost:3000/auth/raindrop/callback)

## Run

```bash
npm run dev
```

Visit `http://localhost:3000` to see supported providers. The "Start auth" buttons call `/auth/{provider}` and redirect to the provider's authorization URL.

The callback endpoint `/auth/{provider}/callback` exchanges the `code` for tokens, logs them to the server console, and returns a success message. If the provider returns an error or the code is missing, the route responds with a clear error payload.

## Manual test hints

- Use real OAuth credentials for both providers.
- Start the app, click a provider, complete the provider consent screen, and confirm the browser returns to the callback with a success message.
- Check the server console for the received access/refresh tokens.

## Secret URL encryption

- Browser flow: visit `/secret/encrypt` with optional `url` and `password` query params to auto-encrypt and redirect to `/secret/decrypt?secret=...`.
- Programmatic flow: send JSON to `POST /secret/encrypt` and receive the decrypt link in JSON.

Example:

```bash
curl -s -X POST http://localhost:3000/secret/encrypt \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com/private","password":"p@ssw0rd"}'
# => {"url":"http://localhost:3000/secret/decrypt?secret=..."}
```
