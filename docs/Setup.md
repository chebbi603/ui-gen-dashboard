# Setup & Environment Guide

This guide explains how to configure environment variables, run the development server, and build the project.

## Prerequisites
- Node.js 18+
- npm 9+

## Install
- `npm install`

## Environment Variables
- Copy the example env file: `cp .env.example .env`
- Set `VITE_API_BASE_URL` to your backend (e.g., `http://localhost:3000`).
- Optional: set `VITE_API_TIMEOUT_MS` (default example is `10000`).

### Notes
- `.gitignore` is configured to ignore local env files while keeping `.env.example` tracked.
- Vite only exposes env vars that start with `VITE_` to the client bundle.

## Development
- Start dev: `npm run dev`
- Open the URL shown in the terminal (e.g., `http://localhost:5173` or `5174`).
- In dev, requests to `/api/...` are proxied to `VITE_API_BASE_URL` (avoids CORS).

## Build
- Production build: `npm run build`
- Outputs to `dist/`.

## Troubleshooting
- Port in use: Vite auto-selects another port. Check the terminal for the new URL.
- Backend unreachable: the generation flow falls back and still updates the editor; set `VITE_API_BASE_URL` correctly.
- Env changes not reflected: restart `npm run dev` after editing `.env` or `vite.config.ts`.