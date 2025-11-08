Project: react-dashboard (React)
# Backend API & Connectivity

This doc outlines the API endpoints used by the dashboard, env configuration, and fallback behavior.

## Environment & Proxy
- `VITE_API_BASE_URL` controls the base hostname for API calls.
- WebSocket base derives from `VITE_WS_URL` or `VITE_API_BASE_URL` (rewritten to `ws://`).
- In development, Vite proxies API routes to `VITE_API_BASE_URL` to avoid CORS.
- In production, absolute URLs are used when `VITE_API_BASE_URL` is set; otherwise, same-origin relative paths.

### Dev Proxy Paths
- Proxied routes in `vite.config.ts` (development):
  - `/api`, `/auth`, `/users`, `/contracts`, `/events`, `/gemini`, `/ping`
- These map to `VITE_API_BASE_URL` to ensure local calls like `POST /gemini/analyze-events` work without CORS.

## API Module (`src/lib/api.ts`)
- Local LLM generation removed. Optimization is backend-only via Gemini endpoints.
- `updateUserContract(userId: string, next: UserContract): Promise<{ success: boolean }>`
  - Calls `POST /contracts/user/:userId` with `{ json: next }`.
  - On failure, returns an optimistic `{ success: true }` for MVP.
- `triggerContractOptimization(userId: string): Promise<{ jobId: string }>`
  - Calls `POST /gemini/generate-contract` with `{ userId }` to enqueue an optimization job.
  - Returns `{ jobId }` on success; UI transitions to polling state.
- Internal helpers:
  - `buildURL(path: string)` builds an absolute URL when `VITE_API_BASE_URL` is set.
  - `safeFetch<T>(input, init)` wraps `fetch`, adds bearer token when available, enforces timeout via `AbortController` using `VITE_API_TIMEOUT_MS` (default 8000 ms), and throws on non-`ok` responses.
  - `getUsers(params?: { page?: number; limit?: number; search?: string }): Promise<User[]>`
    - Calls `GET /users` with optional query params.
    - Accepts payloads shaped as array or `{ users|items|data }` and normalizes into `User[]`.
    - Extracts `id`, `name`, optional `email`, `lastActive`, and provides a minimal `contract` placeholder when version is unknown.
  - `getUserContract(userId: string): Promise<{ json: UserContract } | null>`
    - Calls `GET /contracts/user/:userId`.
    - Returns `{ json }` when present; returns `null` when no personalized contract exists.
    - UI uses `null` to show "No contract assigned".
  - `getUserEvents(userId: string): Promise<Event[]>`
    - Calls `GET /events/user/:userId`.
    - Normalizes payload from array or `{ events|items|data }` into `Event[]` with shape `{ id, userId, timestamp, eventType, componentId?, data?, sessionId? }`.
    - On error, returns an empty array to allow partial UI rendering.

## Request & Response Types
- `GenerateContractInput`:
  - `userId: string`
  - `currentContract: UserContract`
  - `painPoints: PainPoint[]`
  - `analytics?: Record<string, unknown>` (optional)
- `GenerateContractResponse`:
  - `contract: UserContract`
- `OptimizationRequest`:
  - `userId: string`
  - `baseContract: UserContract`
  - `painPoints: PainPoint[]`
  - `analytics?: Record<string, unknown>` (optional)
- `OptimizationResponse`:
  - `jobId: string`

## Endpoints
- `GET /users`
  - Query params: `page` (number), `limit` (number), `search` (string)
  - Returns: array or an object containing `users|items|data`
  - Notes: missing fields are normalized; invalid records (missing `id` or `name`) are skipped client-side.
- `POST /contracts/user/:userId`
  - Content-Type: `application/json`
  - Body: `{ json: UserContract }`
  - Response: `{ success: boolean }`
 - `GET /contracts/user/:userId`
   - Returns the latest personalized contract JSON for a user or `null`.
   - Used by `UserDetail` to render a read-only configuration view.
 - `GET /events/user/:userId`
   - Returns tracking events for the specified user.
   - Currently not used by `UserDetail` in the simplified MVP UI.
 - `POST /gemini/generate-contract`
   - Content-Type: `application/json`
   - Body (enqueue job): `{ userId }`
   - Response: `{ jobId: string }`
   - Notes: Job status is retrieved via `GET /gemini/jobs/:jobId`.
- `GET /gemini/jobs/:jobId`
  - Polls optimization job status every 5 seconds (UI) up to 60 seconds.
  - Response: `{ status: 'active' | 'completed' | 'failed', result?: { contract: UserContract, originalSnapshot?: UserContract, explanation?: string }, error?: string }`
  - `result.originalSnapshot` represents the exact baseline JSON used by the optimizer. The UI prefers this baseline for the "Original Contract" panel when present.
  - When `status === 'completed'`, UI fetches fresh `GET /contracts/user/:userId` and displays side-by-side Original vs Optimized contracts and an optional LLM explanation (which may include a textual diff).
  - When `status === 'failed'`, UI shows error banner with the backend-provided message.
  - On timeout (>60s without terminal state), UI shows a warning and the `jobId` for reference, with a Retry option.
   - Persistence & resume: UI stores `jobId` in `localStorage` as `optimizationJobId:{userId}` when starting or during polling. It automatically resumes polling on return if the job is still active. The stored key is cleared on completion or failure.

- `POST /gemini/analyze-events` (Public)
  - Content-Type: `application/json`
  - Body: `{ userId: string }`
  - Returns: `{ painPoints: { title, description, elementId?, page?, severity }[], improvements: { title, description, elementId?, page?, priority }[], eventCount, timestamp }`
  - Notes:
    - Public endpoint in MVP: no JWT required; Vite proxy enables same-origin dev calls.
    - `safeFetch` conditionally injects `Authorization` when a token is present, but explicitly skips adding the header for `/gemini/*` routes.

### Public Canonical Contract (Optional)
- Read-only canonical endpoints exposed by the backend:
  - `GET /contracts/canonical` — latest canonical contract (public)
  - `GET /contracts/public/canonical` — public alias; identical response
- Use these when you need to preview or bootstrap from the canonical contract without authentication.

## Notes & Future Work
- Bearer authentication is injected automatically from `localStorage` or `VITE_API_TOKEN`.
- Users list prioritizes backend; mock data remains available for local development only.
 - Gemini endpoints may use an extended timeout (configurable via `VITE_GEMINI_TIMEOUT_MS`); other API calls use `VITE_API_TIMEOUT_MS`.