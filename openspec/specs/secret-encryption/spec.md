# secret-encryption Specification

## Purpose
TBD - created by archiving change add-secret-url-encryption. Update Purpose after archive.
## Requirements
### Requirement: Password-based URL encryption flow
The system SHALL provide `/secret/encrypt` to produce an encrypted secret for a target URL using a user-supplied password and redirect to the decrypt route with that secret.

#### Scenario: Auto-encrypt from query parameters
- **GIVEN** `/secret/encrypt` is requested with query parameters `url` and `password`
- **WHEN** the page loads
- **THEN** the system encrypts the provided url using the password into an opaque, URL-safe secret string
- **AND** redirects the user to `/secret/decrypt?secret={secret}`

#### Scenario: Form-driven encryption
- **GIVEN** `/secret/encrypt` is rendered without both `url` and `password` provided
- **WHEN** the user enters a url and password and submits the form
- **THEN** the system encrypts the entered url with the password into an opaque, URL-safe secret string
- **AND** navigates to `/secret/decrypt?secret={secret}`

#### Scenario: Missing input prevents encryption
- **WHEN** a user attempts to submit without both a url and password
- **THEN** the system shows a validation error message
- **AND** does not attempt encryption or redirect

#### Scenario: Programmatic POST encryption returns decrypt URL
- **GIVEN** a POST request to `/secret/encrypt` with a JSON body containing `url` and `password`
- **WHEN** both values are provided
- **THEN** the system encrypts the url using the password into an opaque, URL-safe secret string
- **AND** responds with a JSON body that includes a `url` field pointing to `/secret/decrypt?secret={secret}` on the same host

### Requirement: Password-based URL decryption flow
The system SHALL provide `/secret/decrypt` that accepts an encrypted secret query parameter, prompts for a password, and attempts to decrypt to the original URL.

#### Scenario: Successful decryption
- **GIVEN** the page is loaded with a `secret` query parameter
- **AND** the user enters the correct password used during encryption
- **WHEN** the user submits the form
- **THEN** the system decrypts the secret to the original url
- **AND** renders the decrypted url as a clickable link the user can follow

#### Scenario: Incorrect password
- **GIVEN** the page is loaded with a `secret` query parameter
- **AND** the user enters an incorrect password
- **WHEN** the user submits the form
- **THEN** the system rejects the decryption attempt and shows an error indicating the password is invalid
- **AND** does not reveal or open any url

#### Scenario: Missing secret
- **WHEN** `/secret/decrypt` is opened without a `secret` query parameter
- **THEN** the system informs the user that a secret is required
- **AND** does not attempt decryption until a secret is provided

