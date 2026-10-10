# 04: Stale Patch Resolution and Target Rebind UI

**What to build:** An interactive Target Drift & Recovery panel in `@patchwork/dashboard`. Displays a prominent warning when a selected patch has experienced DOM drift, rendering candidate matches, confidence badges (`High Confidence`, `Review Required`, `Stale`), and signal-by-signal matching breakdown. Provides an interactive "Confirm Rebind" action calling the rebind API, updates the patch selector and fingerprint seamlessly, and presents a clear callout indicating that the rebound patch must pass automated browser verification before it can be released.

**Blocked by:** 02: Client Drift Detection Engine and Stale Target Watermark, 03: Target Rebind and Versioned Migration API

**Status:** closed
Completed: true

- [x] Render a dedicated Drift Recovery card in patch detail view when patch is in `stale` status or drift candidate is detected.
- [x] Display confidence badge with color coding (Green for >= 0.85, Amber for 0.60-0.85, Red for < 0.60).
- [x] Render comparison table showing original fingerprint vs candidate element signals (tag, text, role, parent).
- [x] Provide a "Confirm Target Rebind" button invoking `POST /api/patches/:id/rebind`.
- [x] Render success confirmation banner with prompt to "Run Automated Verification" on the rebound patch.
- [x] Prevent adding stale or unverified rebound patches to releases in the dashboard UI.
