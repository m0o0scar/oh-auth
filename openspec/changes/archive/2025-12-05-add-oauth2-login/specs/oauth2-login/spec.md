## ADDED Requirements

### Requirement: OAuth2 Provider Listing

The system SHALL expose `/` that lists supported OAuth2 providers (Google and Raindrop) and links to start authentication for each.

#### Scenario: Home lists providers

- **WHEN** a client requests `/`
- **THEN** the response includes entries for Google and Raindrop
- **AND** each entry links to `/auth/google` or `/auth/raindrop` respectively

### Requirement: Start OAuth2 Authorization

The system SHALL redirect `/auth/{provider}` requests for supported providers to the provider's authorization URL using configured client credentials and redirect URI.

#### Scenario: Supported provider redirect

- **GIVEN** `{provider}` is `google` or `raindrop` and required credentials are present
- **WHEN** a client requests `/auth/{provider}`
- **THEN** the server builds the provider authorization URL with client id, redirect URI, and required scopes/state
- **AND** responds with an HTTP 3xx redirect to that URL

#### Scenario: Unsupported provider

- **WHEN** a client requests `/auth/{provider}` with a provider outside the supported list
- **THEN** the server responds with a clear error (e.g., 404 or validation message) and does not redirect

### Requirement: Handle OAuth2 Callback

The system SHALL process `/auth/{provider}/callback` by exchanging the authorization code for access and refresh tokens and confirming receipt.

#### Scenario: Successful code exchange

- **GIVEN** `{provider}` is supported and credentials are configured
- **WHEN** `/auth/{provider}/callback` receives a valid `code`
- **THEN** the server exchanges the code for access and refresh tokens with the provider
- **AND** logs the received tokens to the console
- **AND** responds with a success message indicating tokens were received

#### Scenario: Missing or invalid code

- **WHEN** the callback is invoked without `code` or the provider returns an error
- **THEN** the server logs the error details
- **AND** responds with an error message without attempting token exchange

### Requirement: Provider Credentials From Environment

The system SHALL read OAuth2 credentials for each provider from `.env` and block flows when required values are absent.

#### Scenario: Missing credentials

- **WHEN** required environment variables for a provider are not set (client id, secret, redirect URI)
- **THEN** the system logs which variables are missing
- **AND** related auth routes return an error response instead of redirecting
