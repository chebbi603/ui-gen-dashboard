Project: react-dashboard (React)
# Backend API & Connectivity

This doc outlines the API endpoints used by the dashboard, env configuration, and fallback behavior.

## Environment & Proxy
- `VITE_API_BASE_URL` controls the base hostname for API calls.
- In development, Vite proxies `/api` to `VITE_API_BASE_URL` to avoid CORS.
- In production, if `VITE_API_BASE_URL` is set, absolute URLs are used; otherwise, same-origin relative paths (`/api/...`).

## API Module (`src/lib/api.ts`)
- `generateContractLLM(payload: GenerateContractInput): Promise<GenerateContractResponse>`
  - Calls `POST /api/llm/generate`.
  - On failure, falls back by bumping the minor version and slightly reducing `thresholds.errorRate`.
- `updateUserContract(userId: string, next: UserContract): Promise<{ success: boolean }>`
  - Calls `POST /api/users/:id/contract` with `{ contract: next }`.
  - On failure, returns an optimistic `{ success: true }` for MVP.
- Internal helpers:
  - `buildURL(path: string)` builds an absolute URL when `VITE_API_BASE_URL` is set.
  - `safeFetch<T>(input, init)` wraps `fetch`, throwing on non-`ok` responses.

## Request & Response Types
- `GenerateContractInput`:
  - `userId: string`
  - `currentContract: UserContract`
  - `painPoints: PainPoint[]`
  - `analytics?: Record<string, unknown>` (optional)
- `GenerateContractResponse`:
  - `contract: UserContract`

## Endpoints
- `POST /api/llm/generate`
  - Content-Type: `application/json`
  - Body: `GenerateContractInput`
  - Response: `GenerateContractResponse`
- `POST /api/users/:id/contract`
  - Content-Type: `application/json`
  - Body: `{ contract: UserContract }`
  - Response: `{ success: boolean }`

### Public Canonical Contract (Optional)
- Read-only canonical endpoints exposed by the backend:
  - `GET /contracts/canonical` — latest canonical contract (public)
  - `GET /contracts/public/canonical` — public alias; identical response
- Use these when you need to preview or bootstrap from the canonical contract without authentication.

## Notes & Future Work
- Add authentication headers (e.g., bearer tokens) if backend requires it.
- Consider adding request timeout using `AbortController` and `VITE_API_TIMEOUT_MS`.
- Expand fallback logic to consider more pain point signals.