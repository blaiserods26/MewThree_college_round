# 03: Dashboard Resilience and Useful Error Surfacing

**What to build:** A dashboard that survives page refreshes and backend failures. Reloading during normal use restores the current view (selected website, patch, panels) from persisted state. When any backend request fails, the user sees an actionable error message and can retry, rather than a blank panel or stuck spinner. The edge-case failures from ticket 02 are rendered with their reasons.

**Blocked by:** 02: Edge-Case Hardening: Server, Runtime and Verification Failures

**Status:** closed

- [x] Refresh mid-workflow restores data and selection without loss.
- [x] Failed API calls show a descriptive error and a retry affordance.
- [x] Loading, empty and error states exist for every dashboard panel.
- [x] Server-side failure reasons (stale, conflict, blocked publish, no prior release) are visible in the UI.
- [x] Browser console shows no critical errors during these flows.
- [x] Automated UI tests cover refresh and backend-failure behaviour.
