Project: react-dashboard (React)
# What's New

- 2025-11-05 — Fixed "Detected Pain Points" labels showing `unknown — Unknown / Unknown`. The UI now maps pain points from backend fields (`title`, `elementId`, `page`) and hides missing values. Timestamps prefer item-level values and fall back to the response-level `timestamp`. This produces concise, accurate labels without placeholders.

- 2025-11-03 — Added a registration form under Settings. The form calls `POST /auth/register` to create a new user. The form requires `email`, `username`, `password` (removed `name`). With the latest backend changes, newly registered users automatically receive a personalized contract derived from the latest canonical contract when present.

- 2025-11-03 — Removed the `name` field from user objects and deleted `src/data/mockUsers.ts`. The UI and API now use `username` consistently; `UsersTable` column renamed to `Username` and search updated to use `username` and `email`.

This changelog highlights recent additions and behavioral updates. It complements `react-UI.md`, `react-Backend.md`, and `react-ReactProjectStatus.md` to avoid duplication.

## API and Data Layer
- `updateUserContract` now calls `POST /contracts/user/:userId` with body `{ json: <contract> }`.
- `safeFetch` adds Bearer auth automatically (if available) and applies request timeouts using `AbortController`.
- `generateContractLLM` includes a local-only heuristic fallback when backend is unavailable or returns specific errors; responses are marked clearly as local.
- Environment:
  - `VITE_API_BASE_URL` used for API calls (proxied in dev).
  - `VITE_WS_URL` prepared for future realtime features.
 - `analyzeUserEvents` sends `{ userId }` in the POST body and returns both `painPoints` and `improvements` arrays from `POST /gemini/analyze-events`.

## UI and UX
- UsersTable migrated to shadcn-style components; client-side search and sort with reactive inputs.
- UserDetail improved editor styling, rich preview, and clearer error display; filters for fields and pain points.
- `ContractDiff` component present but currently unused; slated for future diff visualizations.
- Visual consistency: typography and spacing aligned across table, sheet, and sidebar.
 - Safer JSON highlighter in `UserDetail` escapes HTML and applies minimal token coloring using capture-group replacements (no callback parameters).
 - Event Analysis adds a "Suggested Improvements" section alongside "Detected Pain Points" with priority badges.

## Dev Experience
- React 19 + Vite + TypeScript + Tailwind v4; Radix primitives powering headless UI parts.
- Linting is configured; current issues documented in `docs/react-test-results.md` along with successful build status.

## Notes
- Authentication flows remain minimal (token injection only); no full login UI yet.
- Client-side search/sort only; server-side support is a future enhancement.