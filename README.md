# React Dashboard MVP — Documentation Overview

This documentation summarizes the features implemented so far, how to configure and run the project, how the backend connectivity works, and the current status of the application.

## Overview
- Refactored `UsersTable` to use shadcn UI `Card` and `Table` components for cleaner layout and consistent typography.
- Improved `UserDetail` formatting and UX with consistent paddings, headings, and controls.
- Implemented LLM contract generation flow with validation, loading state, and a success notification (no diff screen).
- Added environment-based backend connectivity using `VITE_API_BASE_URL` and a Vite dev proxy for `/api`.
- Created API and validation utilities to support contract generation, updates, and JSON safety checks.

## Current Status
- Dev server runs and UI loads without runtime errors (`npm run dev`).
- Production build passes cleanly (`npm run build`).
- Contract generation:
  - Validates current JSON (syntax + structure) before sending.
  - Calls `/api/llm/generate` (proxied in dev) or falls back to local generation.
  - Sends the generated contract to `/api/users/:id/contract` and updates the editor.
  - Shows a green success banner: "Contract generated and sent." (no diff page).
- Backend connectivity:
  - `VITE_API_BASE_URL` controls endpoint base; when absent, same-origin paths are used.
  - Dev proxy routes `/api` to your backend to avoid CORS during development.

## Key Modules
- `src/components/UsersTable.tsx` — Refactored with shadcn `Card`/`Table` for clarity.
- `src/components/UserDetail.tsx` — Consistent typography and spacing; generation and success notification.
- `src/lib/api.ts` — Env-driven base URL, safe fetch helper, generation fallback, and contract update.
- `src/lib/validation.ts` — `parseJSONSafe` and `validateContractStructure` utilities.
- `src/components/ContractDiff.tsx` — JSON diff viewer (currently unused per UX request).
- `vite.config.ts` — Loads env and configures dev proxy for `/api`.
- `.env.example` — Documents required environment variables.
- `.gitignore` — Ignores local env files, keeps `.env.example` tracked.

## Running Locally
1. Install dependencies: `npm install`
2. Create env file: `cp .env.example .env`, then set `VITE_API_BASE_URL` (e.g., `http://localhost:3000`).
3. Start dev: `npm run dev` (see terminal for the local URL, typically `http://localhost:5173` or `5174`).
4. Build for production: `npm run build`.

## Backend Connectivity
- Set `VITE_API_BASE_URL` to your backend host. In dev, Vite proxies `/api` to this target.
- Endpoints used:
  - `POST /api/llm/generate` → returns `{ contract: UserContract }`.
  - `POST /api/users/:id/contract` → returns `{ success: boolean }`.
- Fallback logic when backend is unavailable:
  - Increases minor version of the existing contract.
  - Slightly reduces `thresholds.errorRate` for safer defaults.

Note: The backend also exposes public canonical endpoints `GET /contracts/canonical` and `GET /contracts/public/canonical` (alias) for read-only access to the latest canonical contract.

## UI Decisions
- No contract diff screen for now; show a success banner and update the editor to the generated contract.
- Error feedback uses destructive colors with icon and compact message.
- Editor and preview are side-by-side on `md+` (`grid-cols-1 md:grid-cols-2`).

## Next Steps (Optional)
- Persist last-sent timestamp and backend response details.
- Add theme toggle and ensure all components follow theme tokens.
- Add unit/integration tests (e.g., Vitest) for generation, validation, and notifications.
- Consider token-based auth and timeouts in API calls when backend requires it.