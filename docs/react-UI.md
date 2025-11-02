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
- Layout: shadcn `Sheet` containing two `Card` sections — Contract and AI Optimization.
- Contract section:
  - Fetched via `getUserContract(userId)` when a user is selected.
  - Displays `Contract Version` and a read-only JSON preview with syntax highlighting.
  - Collapsible: JSON viewers have a `Show/Hide JSON` toggle to collapse long content.
  - Error handling: shows a destructive banner with `Retry` if load fails; displays "No contract assigned" when backend returns `null`.
  - Accessibility: preview container uses `pre > code` with mono font and overflow scrolling.
  - Syntax highlighting: minimal highlighter escapes HTML and colors tokens — keys violet, string values teal, numbers blue, booleans orange, and `null` gray — using non-callback regex capture replacements to avoid TypeScript warnings.
### AI Optimization section
  - Streamlined UI with a single action to optimize the user's contract.
  - No events or pain point filters are shown in MVP.
  - Sheet description updated: "Optimize the user's contract with AI (Gemini)."

### Optimization Trigger
- Button: `Optimize Contract with AI` is placed in the AI Optimization card.
- Disabled states: no user selected, no contract JSON, or optimization already in progress.
- Loading: shows `IconLoader2` spinner and label `Optimizing…` while the request is pending.
- Success: info banner shows `Job ID` and elapsed time; job ID is persisted in `localStorage` to resume polling later. On completion or failure, the stored key is cleared.
- Error: destructive banner shows the specific error message with a `Retry Optimization` button.
- Accessibility: button has `aria-label`, and the disabled reason is surfaced via `title`.

### Optimization Polling & Results
- Polling: after receiving `jobId`, the UI polls `GET /gemini/jobs/:jobId` every 5 seconds for up to 60 seconds. Active state shows a banner with spinner, `Job ID`, and `Elapsed time` increasing every second. Polling resumes automatically on return if a saved `jobId` exists and is non-empty.

- Compare: when optimization finishes, the UI shows Original vs Optimized contract viewers and a short explanation. Actions: `Update Contract` (sends to backend) and `Cancel` (dismiss).

- Trigger call shape: `triggerContractOptimization(userId)` — sends `{ userId }` only.
- Completed: when `status === 'completed'`, the polling stops immediately. The UI fetches fresh `GET /contracts/user/:userId` and displays side-by-side cards:
  - Original Contract (with prior version)
  - Optimized Contract (with new version)
  - Explanation: collapsible section labeled "Optimization Explanation" that shows LLM-provided text (markdown/plain) if present; otherwise displays a fallback message.
- Failed: when `status === 'failed'`, the UI stops polling and shows a destructive banner with the backend error, plus a `Retry Optimization` button.
- Timeout: if 60 seconds elapse without completion or failure, the UI stops polling, shows a warning that the job may still be processing, and surfaces the `Job ID` for reference. A `Retry` button allows starting a new optimization.
- Actions: `Accept Optimization` (disabled in MVP), `Reject & Try Again` (re-triggers optimization), and `View Diff` (optional; disabled placeholder).

### Event Analysis UX
- Loading: shows a banner "Analysis in progress…" with a spinner beneath the Analyze button.
- Success: results are rendered in two sections side by side:
  - "Detected Pain Points" list with type, page/component, and timestamp.
  - "Suggested Improvements" list showing `title`, short `description`, optional `page`/`elementId`, and a `priority` badge (`low|medium|high`).
- Empty states:
  - Pain points: when analysis completes with no detected pain points, a neutral info box appears: "No pain points detected for this user." This makes it clear the job ran successfully.
  - Improvements: when the backend returns an empty `improvements` array, an info box appears: "No suggestions available for this user yet."

### Validation & Typing
- Strict typing: UI and API avoid `any`, using `unknown` plus guards for response normalization.
- `jobId` validation: the UI validates non-empty `jobId` before polling.
- Version extraction: display logic extracts `version` from either top-level or `meta.version` safely.

## Components Present but Unused
- `ContractDiff`: recursive JSON diff viewer with expand/collapse (available for future use, not rendered in current UX).

## Visual Consistency
- Spacing: `p-3`, `rounded-lg`, consistent small text sizes for secondary info.
- Color usage: destructive for errors; severity colors for pain points (red/amber/muted).
 - Layout: compact optimization card; contract preview in a bordered, scrollable container.
 - Buttons: outline and ghost variants explicitly set `text-foreground` to ensure readable contrast in both light and dark themes.

## Future Enhancements
- Drill-down into sessions with per-session events and charts.
- Add `ThemeToggle` and verify dark/light/system modes.
- Add badges for pain point types using shadcn `Badge`.
- Consider sparklines for error rates and trend indicators.