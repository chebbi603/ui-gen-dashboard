Project: react-dashboard (React)
# UI Changes & Status

This document summarizes the UI refactors and current UX decisions.

## UsersTable
- Refactored to be the admin entry point for user discovery.
- Uses shadcn `Card`, `Table`, `Button`, and `Input` components.
- Fetches users on mount via `getUsers()` with explicit `loading` and `error` states.
- Error banner shows "Failed to load users" with a `Retry` button.
- Columns: `Name`, `Email`, `Contract Version`, `Action`.
- Action column provides a "View Details" button that triggers `onSelectUser(userId)`.
- Client-side search filters by name and email, case-insensitive, and displays "Showing X of Y users".
- Highlights the selected row via `selectedUserId` for visual clarity and accessibility.

## UserDetail
- Layout: shadcn `Sheet` containing two `Card` sections — Contract and Pain Points.
- Contract section:
  - Fetched via `getUserContract(userId)` when a user is selected.
  - Displays `Contract Version` and a read-only JSON preview with syntax highlighting.
  - Collapsible: JSON viewers have a `Show/Hide JSON` toggle to collapse long content.
  - Error handling: shows a destructive banner with `Retry` if load fails; displays "No contract assigned" when backend returns `null`.
  - Accessibility: preview container uses `pre > code` with mono font and overflow scrolling.
- Pain Points section:
  - Events fetched via `getUserEvents(userId)`; loaders and error banners with `Retry` are shown independently of the contract.
  - Aggregation performed by `src/lib/pain-point-detector.ts`: rage clicks, errors, long dwell, and form abandonment.
  - Filters: type (`All`, `Rage Clicks`, `Errors`, `Long Dwells`, `Form Abandonments`) and time range (`All Time`, `Last 24 Hours`, `Last 7 Days`, `Last 30 Days`).
  - Summary list: items show type label, severity (color-coded: low/muted, medium/amber, high/red), component/page, counts/duration, and first/last seen timestamps.
  - Empty states: "No events available for analysis" and "No pain points detected for this user in the selected time range".

### Optimization Trigger
- Button: `Optimize Contract with AI` is placed below the pain points list in `UserDetail`.
- Disabled states: no user selected, contract loading, events loading, no contract JSON, or optimization already in progress.
- Loading: shows `IconLoader2` spinner and label `Optimizing…` while the request is pending.
- Success: info banner shows `Job ID` and elapsed time; job ID is persisted in `localStorage` to resume polling later. On completion or failure, the stored key is cleared.
- Error: destructive banner shows the specific error message with a `Retry Optimization` button.
- Accessibility: button has `aria-label`, and the disabled reason is surfaced via `title`.

### Optimization Polling & Results
- Polling: after receiving `jobId`, the UI polls `GET /gemini/jobs/:jobId` every 2 seconds for up to 60 seconds. Active state shows a banner with spinner, `Job ID`, and `Elapsed time` increasing every second. Polling resumes automatically on return if a saved `jobId` exists and is non-empty.
- Completed: when `status === 'completed'`, the polling stops immediately. The UI fetches fresh `GET /contracts/user/:userId` and displays side-by-side cards:
  - Original Contract (with prior version)
  - Optimized Contract (with new version)
  - Explanation: collapsible section labeled "Optimization Explanation" that shows LLM-provided text (markdown/plain) if present; otherwise displays a fallback message.
- Failed: when `status === 'failed'`, the UI stops polling and shows a destructive banner with the backend error, plus a `Retry Optimization` button.
- Timeout: if 60 seconds elapse without completion or failure, the UI stops polling, shows a warning that the job may still be processing, and surfaces the `Job ID` for reference. A `Retry` button allows starting a new optimization.
- Actions: `Accept Optimization` (disabled in MVP), `Reject & Try Again` (re-triggers optimization), and `View Diff` (optional; disabled placeholder).

### Validation & Typing
- Strict typing: UI and API avoid `any`, using `unknown` plus guards for response normalization.
- `jobId` validation: the UI validates non-empty `jobId` before polling.
- Version extraction: display logic extracts `version` from either top-level or `meta.version` safely.

## Components Present but Unused
- `ContractDiff`: recursive JSON diff viewer with expand/collapse (available for future use, not rendered in current UX).

## Visual Consistency
- Spacing: `p-3`, `rounded-lg`, consistent small text sizes for secondary info.
- Color usage: destructive for errors; severity colors for pain points (red/amber/muted).
- Layout: compact filter controls and responsive list; contract preview in a bordered, scrollable container.
 - Buttons: outline and ghost variants explicitly set `text-foreground` to ensure readable contrast in both light and dark themes.

## Future Enhancements
- Drill-down into sessions with per-session events and charts.
- Add `ThemeToggle` and verify dark/light/system modes.
- Add badges for pain point types using shadcn `Badge`.
- Consider sparklines for error rates and trend indicators.