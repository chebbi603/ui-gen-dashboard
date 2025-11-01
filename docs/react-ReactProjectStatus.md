Project: react-dashboard (React)
# Project Status and File Guide

This document captures the current state of the project, how it works end‑to‑end, what each file does, and known limitations or next steps. It is intended to be a single source of truth that you can hand to any teammate and have them up and running quickly.

## Status Snapshot

- Build: Production build succeeds (`npm run build`).
- Dev server: Runs cleanly (`npm run dev`) at `http://localhost:5173` (or next free port). No console errors observed.
- Backend connectivity: Configured via `VITE_API_BASE_URL` with dev proxy for `/auth`, `/users`, `/contracts`, `/events`, `/ping`, and `/api` (Swagger).
- Auth: JWT injected automatically into API calls from `localStorage` (`accessToken`) or `VITE_API_TOKEN` (dev fallback). No UI login implemented yet.
- Users: `UsersTable` fetches from `GET /users`; falls back to local mock data if backend is offline.
- Contracts: Generation is local (simple heuristic); sending uses `POST /contracts/user/:userId`. Diff UI removed; success banner displays.
- Lint: ESLint configured; lints TypeScript and React hooks.
- Styling: Tailwind CSS v4 with custom theme tokens; UI components from shadcn-style wrappers.

## Architecture Overview

- Frontend framework: React 19 + Vite (Rolldown-Vite).
- Language: TypeScript with strict settings.
- Styling: Tailwind CSS v4, `tw-animate-css`, and custom CSS variables for light/dark themes.
- UI Library: Locally maintained UI components (shadcn-style) under `src/components/ui/*`.
- API layer: Fetch wrapper that injects `Authorization` header, URL builder with `VITE_API_BASE_URL` fallback.
- Environment handling: `.env` variables loaded by Vite; proxying configured for local dev to avoid CORS.

## Root Files

- `index.html`
  - Bootstraps the app; sets `<div id="root">`, loads `src/main.tsx`. Adds `class="dark"` on `<html>` to default dark theme.
  - Limitations: No dynamic theme toggle; assumes dark mode globally.

- `package.json`
  - Scripts: `dev`, `build`, `lint`, `preview`.
  - Dependencies: React 19, Tailwind CSS v4, Radix UI, Tabler Icons, clsx, tailwind-merge.
  - Dev deps: ESLint, React Refresh, Vite plugin, TypeScript.
  - Limitations: No test runner configured; no formatting script (e.g., Prettier).

- `vite.config.ts`
  - Configures React plugin and Tailwind plugin; defines path alias `@` → `./src`.
  - Dev proxy routes to `VITE_API_BASE_URL` for `/api`, `/auth`, `/users`, `/contracts`, `/events`, `/ping` to bypass CORS.
  - Limitations: No HTTPS proxy or path rewrites; expects backend to expose the same route shapes.

- `.env.example`
  - Documents `VITE_API_BASE_URL`, optional `VITE_API_TOKEN` (dev JWT), and `VITE_API_TIMEOUT_MS` (not enforced yet).
  - Limitations: Timeout variable is currently informational; code does not enforce request timeouts.

- `.gitignore`
  - Ensures `.env` files are ignored while keeping `.env.example` tracked.

- `eslint.config.js`
  - ESLint configured for TS and React hooks; ignores `dist/`.
  - Limitations: No custom rules for project conventions; relies on recommended configs.

## TypeScript Config

- `tsconfig.json`
  - Composite project referencing `tsconfig.app.json` and `tsconfig.node.json`.
  - Path alias: `@/*` → `./src/*`.

- `tsconfig.app.json`
  - Strict TypeScript settings, bundler mode, JSX `react-jsx`.
  - Lint-like compiler options enabled (e.g., `noUnusedLocals`).
  - Limitations: `noEmit` set; compilation checks only, assumes Vite bundling.

- `tsconfig.node.json`
  - Node-specific settings for building config files; strict, `noEmit`.

## Documentation Folder

- `docs/README.md`
  - Project overview and quick start.

- `docs/Setup.md`
  - Environment configuration, dev/prod run instructions, troubleshooting.

- `docs/Backend.md`
  - Backend environment variables, proxy behavior, API module docs, endpoints used.

- `docs/UI.md`
  - UI changes, removal of contract diff, success banner behavior, current UX.

- `docs/ProjectStatus.md` (this file)
  - Comprehensive, file-by-file status and limitations.

## Source Code Breakdown

- `src/main.tsx`
  - Bootstraps React application with `StrictMode` and mounts `<App />`.
  - Limitations: No error boundary; global providers (e.g., theme, auth) not yet added.

- `src/App.tsx`
  - Top-level layout with a sidebar and three pages: `Home`, `Users`, `Settings`.
  - Renders `UsersTable` and `UserDetail` when `Users` is active; manages `selectedUser` and panel open state.
  - Limitations: Page switching is local state, not a router; `Settings` page is a placeholder.

- `src/index.css`
  - Tailwind v4 imports and theme tokens (`--background`, `--foreground`, etc.) for light/dark.
  - Applies base styles via `@layer base` helpers for headings, paragraphs, links.
  - Limitations: Global dark theme by default; no per-user theme preference handling.

- `src/App.css`
  - Currently empty; available for app-specific styles if needed.

### UI Components (`src/components/ui/*`)

- `button.tsx`
  - Button component with variants and Tailwind classes.

- `card.tsx`
  - Card layout primitives: `Card`, `CardHeader`, `CardTitle`, `CardContent`.

- `input.tsx`
  - Input field wrapper with consistent styling.

- `separator.tsx`
  - Horizontal rule separator with theming.

- `sheet.tsx`
  - Side panel (drawer) components used by `UserDetail`.

- `sidebar.tsx`
  - Sidebar layout primitives and triggers; used in `App.tsx`.

- `skeleton.tsx`
  - Skeleton loading components; not widely used yet.

- `table.tsx`
  - Table primitives (`Table`, `TableHeader`, etc.) used in `UsersTable`.

- `tooltip.tsx`
  - Tooltip wrapper components; not widely used yet.

### Feature Components

- `src/components/UsersTable.tsx`
  - Displays a filterable/sortable table of users.
  - Data loading: Fetches `GET /users` on mount if no `users` prop is passed; includes JWT automatically. Falls back to `mockUsers` on error.
  - UI features: Search by name/contract version, sort by `lastActive`, shows loading and small error indicators.
  - Limitations:
    - Client-side search/sort only; no server pagination or filters.
    - Assumes backend returns a list or `{ users | items | data }`; shape normalization is best effort.
    - Minimal error display; no retry button or empty state illustration.

- `src/components/UserDetail.tsx`
  - Side panel showing selected user’s contract JSON editor and a syntax-highlighted preview.
  - Validates JSON (`parseJSONSafe`) and contract structure (`validateContractStructure`).
  - Contract generation: Local heuristic (`generateContractLLM`) bumps minor version and tightens `errorRate`; then sends with `updateUserContract` (`POST /contracts/user/:userId`).
  - Success notification banner: “Contract generated and sent.” shown above the editor; diff UI removed.
  - Pain points: Filter by type (`rage-click`, `error`, `long dwell`) and time range (`all`, `24h`, `7d`).
  - Limitations:
    - No backend LLM generation call; generation is local and simplistic.
    - Success banner does not auto-dismiss; not persisted across reloads.
    - Preview uses `dangerouslySetInnerHTML` but safely escapes JSON; nevertheless, keep an eye on XSS if you change highlight code.
    - No diff/approval workflow (intentionally removed per product decision).

### Data and Types

- `src/data/mockUsers.ts`
  - Types: `PainPoint`, `UserContract`, `User`.
  - Mock data: `mockUsers` array for local/offline testing.
  - Utility: `formatDateTime(iso)` for safe date string formatting.
  - Limitations: Mock shape may diverge from backend over time; ensure types are aligned when consuming live APIs.

### Hooks

- `src/hooks/use-mobile.ts`
  - Hook that reports `true` if viewport width is under `768px`.
  - Limitations: Uses `matchMedia` listener only; does not account for SSR.

### Lib Modules

- `src/lib/api.ts`
  - URL building: `buildURL(path)` uses `VITE_API_BASE_URL` when defined; otherwise uses relative path.
  - Fetch wrapper: `safeFetch<T>(input, init)` adds `Content-Type` for non-GET requests and injects `Authorization: Bearer <token>` when available; throws on non-`ok` with status and response text.
  - Users:
    - `getUsers(params?)` → `User[]`; normalizes list payloads from array or `{ users | items | data }`.
  - Contracts:
    - `getUserContract(userId)` → `{ json: UserContract } | null`.
    - `updateUserContract(userId, next, contractId?)` → `{ success: boolean }` (returns success `true` on catch to preserve UX).
    - `generateContractLLM(payload)` → local heuristic returns next contract.
  - Limitations:
    - No request timeout or abort support; `VITE_API_TIMEOUT_MS` not currently enforced.
    - Error payloads are treated as text; does not parse standardized backend `error` format yet.
    - `updateUserContract` success fallback may mask backend errors; consider surfacing failures in UI.

- `src/lib/auth.ts`
  - Types: `RegisterInput`, `LoginInput`, `LoginResponse`.
  - Token management: `setToken`, `clearToken`, `getToken` (localStorage first, then `VITE_API_TOKEN`).
  - Endpoints: `register`, `login` (auto-saves token), `me`, `ping`.
  - Limitations:
    - No refresh token handling or token expiry checks.
    - No UI components for login/logout; pure functions only.
    - Error handling is generic; does not map backend error codes.

- `src/lib/validation.ts`
  - `parseJSONSafe(text)` → `{ value, error }` to avoid exceptions when editing JSON.
  - `validateContractStructure(contract)` → validates `version`, `rules`, `thresholds` shapes.
  - Limitations: Does not validate business semantics of rules/thresholds beyond type checks.

- `src/lib/utils.ts`
  - `cn(...inputs)` → merges Tailwind class names using `clsx` and `tailwind-merge`.

## Behavior in Development vs Production

- Development
  - Dev server proxies API calls to `VITE_API_BASE_URL`; avoids CORS during local dev.
  - Optional `VITE_API_TOKEN` lets you hit protected endpoints without a login UI.
  - `UsersTable` shows loading and small error indicator; falls back to mock users if fetch fails.

- Production
  - The app builds cleanly and references `VITE_API_BASE_URL` for runtime calls; ensure the server is configured for same-origin or proper CORS.
  - No proxy; calls go directly to the base URL.

## Known Limitations and Next Steps

- Authentication
  - No UI login/logout; add a small login form wired to `auth.login`.
  - Missing refresh token and token expiry checks; add interceptor logic and auto-logout.

- API Layer
  - No timeout/abort; implement `AbortController` and honor `VITE_API_TIMEOUT_MS`.
  - Standardized error shape from backend not parsed; map errors to user-friendly messages.
  - Consider stricter typing for responses (e.g., DTOs) instead of `any` fallbacks.

- Users Page
  - Client-only search/sort; add server-side pagination and query params (`page`, `limit`, `search`).
  - Enhance error states and retries; add empty-state display.

- Contracts Flow
  - Local-only generation; integrate backend LLM endpoint when available.
  - Persist `contractId` returned by backend and handle versioning.
  - Success banner UX: auto-dismiss and show last-sent timestamp.

- Testing
  - No unit/e2e tests; add basic tests for API layer, validation, and UI rendering.

- Performance
  - Large lists not virtualized; consider table virtualization for scalability.

## How to Verify Status Quickly

- Set up `.env` based on `.env.example`.
- Start backend at `VITE_API_BASE_URL`.
- Run `npm run dev` and navigate to the `Users` page.
  - Confirm `GET /users` succeeds (network tab).
  - Select a user, generate contract; confirm `POST /contracts/user/:userId` with JWT.
- Run `npm run build` to confirm a clean production build.

## Glossary of Key Behaviors

- Path alias `@`: Resolves to `./src`, simplifying imports.
- Authorization header: Added for all API requests if a token is available.
- Proxy behavior: Only active in dev; production calls go directly to `VITE_API_BASE_URL`.
- Dark mode default: `<html class="dark">` enforces dark theme unless changed.

---

If you need deeper architecture diagrams or sequence charts, consider adding `docs/Architecture.md` next, focusing on data flow between `UsersTable → UserDetail → API` and the backend services.