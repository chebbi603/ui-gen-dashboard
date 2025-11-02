Project: react-dashboard (React)
# Backend API & Connectivity

This doc outlines the API endpoints used by the dashboard, env configuration, and fallback behavior.

## Environment & Proxy
- `VITE_API_BASE_URL` controls the base hostname for API calls.
- WebSocket base derives from `VITE_WS_URL` or `VITE_API_BASE_URL` (rewritten to `ws://`).
- In development, Vite proxies API routes to `VITE_API_BASE_URL` to avoid CORS.
- In production, absolute URLs are used when `VITE_API_BASE_URL` is set; otherwise, same-origin relative paths.

## API Module (`src/lib/api.ts`)
- `generateContractLLM(payload: GenerateContractInput): Promise<GenerateContractResponse>`
  - Local-only heuristic generation (no backend call yet).
  - Bumps the minor version and slightly reduces `thresholds.errorRate`.
- `updateUserContract(userId: string, next: UserContract): Promise<{ success: boolean }>`
  - Calls `POST /contracts/user/:userId` with `{ json: next }`.
  - On failure, returns an optimistic `{ success: true }` for MVP.
- Internal helpers:
  - `buildURL(path: string)` builds an absolute URL when `VITE_API_BASE_URL` is set.
  - `safeFetch<T>(input, init)` wraps `fetch`, adds bearer token when available, enforces timeout via `AbortController` using `VITE_API_TIMEOUT_MS` (default 8000 ms), and throws on non-`ok` responses.

## Request & Response Types
- `GenerateContractInput`:
  - `userId: string`
  - `currentContract: UserContract`
  - `painPoints: PainPoint[]`
  - `analytics?: Record<string, unknown>` (optional)
- `GenerateContractResponse`:
  - `contract: UserContract`

## Endpoints
- `POST /contracts/user/:userId`
  - Content-Type: `application/json`
  - Body: `{ json: UserContract }`
  - Response: `{ success: boolean }`

### Public Canonical Contract (Optional)
- Read-only canonical endpoints exposed by the backend:
  - `GET /contracts/canonical` — latest canonical contract (public)
  - `GET /contracts/public/canonical` — public alias; identical response
- Use these when you need to preview or bootstrap from the canonical contract without authentication.

## Notes & Future Work
- Bearer authentication is injected automatically from `localStorage` or `VITE_API_TOKEN`.
- Expand heuristic generation to consider analytics and pain point filters, then swap to backend LLM when available (`/llm/generate-contract`).