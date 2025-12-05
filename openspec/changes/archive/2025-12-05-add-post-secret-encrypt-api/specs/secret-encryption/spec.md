## MODIFIED Requirements
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

