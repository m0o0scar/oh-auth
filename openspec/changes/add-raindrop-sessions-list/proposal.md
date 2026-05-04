# Change: Show synced browser sessions on the Raindrop workspace

## Why
Users want `/raindrop` to surface the browser sessions that the extension syncs to Raindrop, so they can discover and open saved device collections from the web workspace.

## What Changes
- Load child collections under `nenya / sessions` from Raindrop for authenticated `/raindrop` users.
- Show a Sessions section below the pinned results when the search field is idle.
- Keep the sessions list read-only and link each session to its Raindrop collection.

## Impact
- Affected specs: `raindrop-browser-workspace`
- Affected code: `src/app/raindrop/page.tsx`, `src/app/api/raindrop/sessions/route.ts`, `src/lib/raindrop-api.ts`, `tests/**`
