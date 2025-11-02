Project: react-dashboard (React)
# What’s New

This changelog highlights recent additions and behavioral updates. It complements `react-UI.md`, `react-Backend.md`, and `react-ReactProjectStatus.md` to avoid duplication.

## API and Data Layer
- `updateUserContract` now calls `POST /contracts/user/:userId` with body `{ json: <contract> }`.
- `safeFetch` adds Bearer auth automatically (if available) and applies request timeouts using `AbortController`.
- `generateContractLLM` includes a local-only heuristic fallback when backend is unavailable or returns specific errors; responses are marked clearly as local.
- Environment:
  - `VITE_API_BASE_URL` used for API calls (proxied in dev).
  - `VITE_WS_URL` prepared for future realtime features.
 - `analyzeUserEvents` now returns both `painPoints` and `improvements` arrays from `POST /gemini/analyze-events`.

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