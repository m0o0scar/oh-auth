## 1. Implementation
- [x] 1.1 Build `/secret/encrypt` page that accepts url/password via query or form, encrypts, and redirects with the secret.
- [x] 1.2 Build `/secret/decrypt` page that reads the secret param, prompts for password, decrypts, shows the URL, and enables navigation.
- [x] 1.3 Add a shared encryption helper that derives from the password, produces URL-safe secrets, and is reused by both routes.
- [x] 1.4 Surface validation and error messaging for missing inputs and incorrect password attempts.

## 2. Validation
- [x] 2.1 Manually verify encrypt→redirect→decrypt success and wrong-password failure flows.
- [x] 2.2 Run `openspec validate add-secret-url-encryption --strict`.

