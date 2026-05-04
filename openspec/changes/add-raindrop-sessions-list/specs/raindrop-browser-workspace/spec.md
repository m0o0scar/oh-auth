## ADDED Requirements
### Requirement: Show Synced Browser Sessions

The system SHALL show authenticated `/raindrop` users the synced browser sessions stored in Raindrop under `nenya / sessions`.

#### Scenario: Load sessions from Raindrop

- **GIVEN** the user is authenticated on `/raindrop`
- **WHEN** the page loads the `nenya / sessions` collection
- **THEN** it lists direct child collections as browser sessions
- **AND** it renders each session with a collection icon instead of a numeric count badge
- **AND** each session links to its Raindrop collection
- **AND** sessions are ordered by recent Raindrop activity when that metadata is available

#### Scenario: Expand a session

- **GIVEN** synced sessions are visible on `/raindrop`
- **WHEN** the user expands a session
- **THEN** the page loads the Raindrop items in that session collection
- **AND** it shows saved windows, tab groups, and tabs using the metadata stored on each item
- **AND** tab links use the original URL when the extension stored an internal `nenya.local` wrapper URL

#### Scenario: Missing sessions collection yields an empty state

- **GIVEN** the `nenya / sessions` parent collection is missing
- **WHEN** `/raindrop` loads
- **THEN** the page shows an empty synced sessions state
- **AND** it does not create or mutate Raindrop collections

#### Scenario: Search mode keeps focus on search results

- **GIVEN** synced sessions are loaded on `/raindrop`
- **WHEN** the user enters a search query with at least three characters
- **THEN** the page shows search results instead of the idle pinned and sessions sections
