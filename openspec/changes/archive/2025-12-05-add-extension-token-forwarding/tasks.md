## 1. Implementation

- [x] 1.1 Propagate caller-provided `state` (including `extensionId`) into provider authorization URLs.
- [x] 1.2 Parse callback `state` and send exchanged tokens to the referenced extension via `chrome.runtime.sendMessage`.
- [x] 1.3 Handle missing or invalid `extensionId` without breaking successful callback responses.
- [x] 1.4 Add or update validation (manual or automated) for Google and Raindrop flows with extension messaging.
