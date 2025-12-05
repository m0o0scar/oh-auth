## MODIFIED Requirements

### Requirement: Start OAuth2 Authorization

The system SHALL redirect `/auth/{provider}` requests for supported providers to the provider's authorization URL using configured client credentials and redirect URI, and SHALL forward any caller-provided `state` query payload (including `extensionId`) unchanged so it is returned on callback.

#### Scenario: Supported provider redirect with state passthrough

- **GIVEN** `{provider}` is `google` or `raindrop` and required credentials are present
- **AND** the client supplies a `state` query parameter (e.g., JSON string containing `extensionId`)
- **WHEN** a client requests `/auth/{provider}`
- **THEN** the server builds the provider authorization URL with client id, redirect URI, required scopes, and the provided `state`
- **AND** responds with an HTTP 3xx redirect to that URL

#### Scenario: Unsupported provider

- **WHEN** a client requests `/auth/{provider}` with a provider outside the supported list
- **THEN** the server responds with a clear error (e.g., 404 or validation message) and does not redirect

### Requirement: Handle OAuth2 Callback

The system SHALL process `/auth/{provider}/callback` by exchanging the authorization code for access and refresh tokens, confirming receipt, and, when `state` includes an `extensionId`, sending those tokens to that Chrome extension via `chrome.runtime.sendMessage` with the provider and token payload.

#### Scenario: Successful code exchange with extension notification

- **GIVEN** `{provider}` is supported and credentials are configured
- **AND** the callback includes a valid `code`
- **AND** the `state` contains `extensionId`
- **WHEN** `/auth/{provider}/callback` receives the request
- **THEN** the system exchanges the code for access and refresh tokens with the provider
- **AND** sends `chrome.runtime.sendMessage` to the provided `extensionId` with `{ type: 'oauth_success', provider, tokens: { access_token, refresh_token, expires_in } }`
- **AND** responds with a success message indicating tokens were received

#### Scenario: Successful code exchange without extension id

- **GIVEN** `{provider}` is supported and credentials are configured
- **AND** the callback includes a valid `code`
- **AND** the `state` does not contain `extensionId`
- **WHEN** `/auth/{provider}/callback` receives the request
- **THEN** the system exchanges the code for access and refresh tokens with the provider
- **AND** logs the received tokens to the server console
- **AND** responds with a success message indicating tokens were received

#### Scenario: Missing or invalid code

- **WHEN** the callback is invoked without `code` or the provider returns an error
- **THEN** the system logs the error details
- **AND** responds with an error message without attempting token exchange
