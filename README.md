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

## API Endpoints

### Initiate Authorization

`GET /auth/{provider}`

Starts the OAuth flow for the specified provider.

**Parameters:**

- `provider`: (path) The provider ID (e.g., `google`, `raindrop`).
- `scope`: (query, optional) Additional scopes to request.
- `show_token`: (query, optional) If `true`, the callback page will display the tokens.
- `state`: (query, optional) A custom state string. If a JSON string is provided, it can include:
  - `extensionId`: Chrome extension ID for messaging.
  - `show_token`: Boolean to display tokens on the callback page.
- `hd`: (query, optional) Hosted domain (Google only).

### Callback

`GET /auth/{provider}/callback`

The redirect URI registered with the OAuth provider. Handles the code exchange.

**Parameters:**

- `provider`: (path) The provider ID.
- `code`: (query) The authorization code returned by the provider.
- `state`: (query) The state string passed in the initiation.
- `error`: (query) Error message from the provider.

### Refresh Token

`POST /auth/{provider}/refresh`

Refreshes the access token using a refresh token.

**Parameters:**

- `provider`: (path) The provider ID.

**Body (JSON or Form Data):**

- `refresh_token`: The refresh token.

**Response:**

JSON object containing the new tokens.

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
