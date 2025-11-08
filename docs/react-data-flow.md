# React Dashboard — Data Flow and Architecture

This document explains how data moves through the React dashboard, how UI components interact with backend services, and where key logic lives. It is intended to be technically precise and easy to operate against when debugging or extending the app.

## Overview

- Purpose: Visualize users, inspect their tracking events, analyze UX pain points, and trigger contract optimizations via the backend LLM pipeline.
- Tech: Vite + React + TypeScript. UI primitives under `src/components/ui/`. API helpers under `src/lib/`.
- Backends: Talks to the NestJS service for users, events, contracts, and Gemini job orchestration.

## Key Files and Responsibilities

- `src/main.tsx`: App entry, renders `<App />` inside `StrictMode`.
- `src/App.tsx`: Top-level layout, page switcher, sidebar provider, and selected user management.
- `src/components/UsersTable.tsx`: Lists users with search/pagination; emits selected user.
- `src/components/UserDetail.tsx`: Shows selected user details, contract section, event analysis controls and results, and Gemini optimization job handling.
- `src/hooks/useEventAnalysis.ts`: Fetches events for a user and calls backend analysis endpoints. Manages pain points, improvements, and loading/error states.
- `src/lib/api.ts`: All network calls; includes `safeFetch` and typed helpers.
- `src/lib/types.ts`: Shared TypeScript models (User, Event, PainPoint, Contract, etc.).
- `src/lib/auth.ts`: Handles JWT storage and authenticated requests (register/login/me/ping).

## Startup & Layout Flow

1. `main.tsx` mounts `<App />`.
2. `App.tsx` provides layout using `SidebarProvider` and renders a sidebar + content area.
3. Page state: `Home | Users | Settings`. Selected user state (`selectedUser`) is maintained in `App.tsx` and is passed down to `UserDetail` when present.
4. `UsersTable` renders when `page === 'Users'`. Selecting a user sets `selectedUser` in `App.tsx`, revealing `UserDetail`.
5. `Settings` shows `<RegisterForm />` for creating new users.

## API Integration and Data Fetching

All requests route through `src/lib/api.ts` or `src/lib/auth.ts` and ultimately use `safeFetch` for consistent error handling, timeouts, and auth headers.

### Base Helpers

- `safeFetch(url, options?)`: Adds `Authorization` header when a token exists, applies timeout, and throws on non-`ok` responses with helpful diagnostics.
- `normalizeJobStatusPayload(raw)`: Normalizes Gemini job status responses to a standard structure.

### Primary Endpoints

- `getUsers(query)`: `GET /users` (Nest `UserController.findAll`). Supports search and pagination on client side; the server returns a summary list with `lastActive` and `contractVersion`.
- `getUserContract(userId)`: `GET /users/:id/contract` returns the merged and filtered contract (canonical + personalized) prepared for Flutter.
- `updateUserContract(userId, payload)`: `POST /users/:id/contract` writes a new personalized contract version.
- `getUserEvents(userId)`: `GET /users/:id/tracking-events` returns tracking events for the target user, not the requester.
- `triggerContractOptimization(userId)`: `POST /gemini/generate-contract` enqueues a job to produce an optimized contract for the user.
- `getOptimizationJobStatus(jobId)`: `GET /gemini/jobs/:jobId` polls the job status.
- `analyzeUserEvents(userId)`: `POST /gemini/analyze-events` returns pain points and improvement suggestions for the user’s events.

## Users Page Flow

1. `UsersTable` calls `getUsers` on mount and whenever search/pagination inputs change.
2. The component handles loading and error states, rendering a table of `User` items (id, username, email, lastActive, contractVersion).
3. Selecting a row sets `selectedUser` in `App.tsx`, which reveals `UserDetail` in the right panel.

## User Detail Flow

`UserDetail` is the operational workhorse. It covers two major flows:

### A) Contract Optimization (Gemini)

- Action: Click "Optimize Contract" (or equivalent control).
- Request: `triggerContractOptimization(user.id)` enqueues a generation job.
- Polling: `getOptimizationJobStatus(jobId)` polls until status is `completed | failed | timeout`.
- Success Path:
  - Result contains `{ contractId, version, explanation }`.
  - UI updates with the optimized contract metadata and any LLM explanation text.
  - Buttons for "Accept Optimization"/"Reject & Try Again"/"View Diff" control follow-up actions.
- Failure Path:
  - Shows error and offers to retry or inspect logs.
- Timeout/Active State:
  - Keeps polling with backoff; shows progress, active state, or timeouts.

### B) Event Analysis (UX Pain Points)

- Hook: `useEventAnalysis(user.id)` encapsulates the analysis lifecycle.
- Steps:
  1. Validate `userId`.
  2. Fetch events via `getUserEvents(user.id)`.
  3. If no events, set an informative empty state.
  4. Call `analyzeUserEvents(user.id)` to get pain points and improvement suggestions.
  5. Update local state: `painPoints`, `improvements`, `loading`, `error`.
- Display: Renders pain points (type, severity, frequency) and suggestions.

## Types and Data Contracts

Defined in `src/lib/types.ts`:

- `User`: id, username, email, lastActive (ISO string), contractVersion.
- `Event`: id, userId, eventType, timestamp (ISO), page, component, payload, sessionId.
- `PainPoint`: type (`PainPointType`), severity (`Severity`), description, frequency, component/page context, example events.
- `UserContract`: versioned JSON rules with `meta`, `createdAt`, `updatedAt`.
- `DetectedPainPoint`: structure used when analyzing events and presenting results.

## Error Handling and Resilience

- `safeFetch` centralizes timeouts and error messaging.
- UI components render clear error states and loading indicators.
- `UserDetail` manages job polling, showing active, completed, or failed states with messages.
- Missing/invalid user IDs short-circuit flows in `useEventAnalysis` with safe fallbacks.

## Backend Mapping

- `GET /users` → `UserController.findAll` produces summaries using `EventService.getLastForUser` and `ContractService.findLatestByUser`.
- `GET /users/:id/contract` → Merges canonical + personalized, filters for Flutter, caches for 5 minutes.
- `POST /users/:id/contract` → Persists new version and invalidates cache.
- `GET /users/:id/tracking-events` → Validates ObjectId, returns events for target user regardless of requester.
- `POST /gemini/generate-contract` + `GET /gemini/jobs/:jobId` → Queue job and poll status.
- `POST /gemini/analyze-events` → Direct analysis of events into pain points and improvements.

## Operational Notes

- Auth: `src/lib/auth.ts` stores JWT in localStorage and adds it to `Authorization` headers for protected endpoints.
- Environment: Base API URL and timeout configured via project `.env` and `safeFetch` defaults.
- UI Library: Components in `src/components/ui` encapsulate styling and behavior for tables, cards, inputs, sheets, sidebar, tooltips.

## Testing and Documentation

- Test results for this project live in `docs/react-test-results.md`.
- When changes affect data flow or backend wiring, prefer adding small smoke tests or mocks around `api.ts` and hooks.
- This document complements `docs/react-UI.md` and `docs/react-Backend.md` by focusing on end-to-end data movement.

## Future Improvements

- Add visual diffs for optimized contracts, enabling "Accept" to persist and "Reject" to revert.
- Expand event filters in `UsersTable` (by page/component/severity) to streamline analysis sessions.
- Introduce caching/memoization for event analysis results per user.