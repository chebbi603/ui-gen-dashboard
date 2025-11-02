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
- `triggerContractOptimization(userId: string, currentContract: UserContract, painPoints: PainPoint[]): Promise<{ jobId: string }>`
  - Calls `POST /gemini/generate-contract` to enqueue an optimization job.
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
   - Used by `UserDetail` to compute and summarize pain points.
 - `POST /gemini/generate-contract`
   - Content-Type: `application/json`
   - Body (enqueue job): `{ userId, priority?: number }`
   - Response: `{ jobId: string }`
   - Notes: Job status is retrieved via `GET /gemini/jobs/:jobId`.
 - `GET /gemini/jobs/:jobId`
   - Polls optimization job status every 2 seconds (UI) up to 60 seconds.
   - Response: `{ status: 'active' | 'completed' | 'failed', result?: { contract: UserContract, explanation?: string }, error?: string }`
   - When `status === 'completed'`, UI fetches fresh `GET /contracts/user/:userId` and displays side-by-side Original vs Optimized contracts and an optional LLM explanation.
   - When `status === 'failed'`, UI shows error banner with the backend-provided message.
   - On timeout (>60s without terminal state), UI shows a warning and the `jobId` for reference, with a Retry option.
    - Persistence & resume: UI stores `jobId` in `localStorage` as `optimizationJobId:{userId}` when starting or during polling. It automatically resumes polling on return if the job is still active. The stored key is cleared on completion or failure.

### Public Canonical Contract (Optional)
- Read-only canonical endpoints exposed by the backend:
  - `GET /contracts/canonical` — latest canonical contract (public)
  - `GET /contracts/public/canonical` — public alias; identical response
- Use these when you need to preview or bootstrap from the canonical contract without authentication.

## Notes & Future Work
- Bearer authentication is injected automatically from `localStorage` or `VITE_API_TOKEN`.
- Expand heuristic generation to consider analytics and pain point filters, then swap to backend LLM when available (`/llm/generate-contract`).
 - Users list prioritizes backend; mock data remains available for local development only.