Project: react-dashboard (React)
# Setup & Environment Guide

This guide explains how to configure environment variables, run the development server, and build the project.

## Prerequisites
- Node.js 18+
- npm 9+

## Install
- `npm install`

## Environment Variables
- Copy the example env file: `cp .env.example .env`
 - Set `VITE_API_BASE_URL` to your backend (Nest dev default: `http://localhost:8081`).
 - Optional: set `VITE_API_TIMEOUT_MS` (default example is `10000`).
 - Optional: set `VITE_GEMINI_TIMEOUT_MS` (default example is `24000`) for `/gemini/*` endpoints.
- Optional: set `VITE_API_TOKEN` (dev JWT or API token). When absent, a dev fallback may be used.

### Notes
- `.gitignore` is configured to ignore local env files while keeping `.env.example` tracked.
- Vite only exposes env vars that start with `VITE_` to the client bundle.
 - After editing `.env`, restart `npm run dev` to apply changes.

## Development
- Start dev: `npm run dev`
- Open the URL shown in the terminal (e.g., `http://localhost:5173` or `5174`).
 - In dev, requests to `/api`, `/auth`, `/users`, `/contracts`, `/events`, `/gemini`, and `/ping` are proxied to `VITE_API_BASE_URL` (avoids CORS).

### Canonical Endpoint Usage (Optional)
- For read-only canonical contract access during development:
  - `GET /contracts/canonical` (public)
  - `GET /contracts/public/canonical` (public alias)

## Build
- Production build: `npm run build`
- Outputs to `dist/`.

## Troubleshooting
- Port in use: Vite auto-selects another port. Check the terminal for the new URL.
 - Backend unreachable: set `VITE_API_BASE_URL` correctly (Nest dev default `http://localhost:8081`).
- Env changes not reflected: restart `npm run dev` after editing `.env` or `vite.config.ts`.