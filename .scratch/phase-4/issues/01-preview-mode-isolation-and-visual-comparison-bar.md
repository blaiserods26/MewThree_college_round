# 01: Preview Mode Isolation and Visual Comparison Bar

**What to build:** An isolated preview execution mode on the host storefront (`@patchwork/storefront`) and dashboard (`@patchwork/dashboard`). Allows viewing and interacting with draft or previewing patches (`?patchwork_preview=<patchId>`) in real-time without modifying the live published release bundle. Surfaces a persistent floating preview status banner on the storefront displaying active preview metadata (patch name, operation, version), provides an instant "Reset to Baseline" toggle to revert preview mutations, and enables one-click preview launching directly from the dashboard.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Support URL query param and runtime initialization for loading isolated draft patches in preview mode (`?patchwork_preview=<patchId>`).
- [x] Ensure preview mutations apply strictly in memory and never alter the active published release bundle.
- [x] Render a non-intrusive floating Preview Indicator Bar on the storefront showing patch name, target selector, and operation details.
- [x] Implement a "Reset to Baseline" button in the preview bar that immediately reverts in-memory mutations to untouched original DOM state.
- [x] Add a "Launch Preview" button in the dashboard patch inspector that opens the storefront in preview mode in a new tab or iframe context.
- [x] Add automated tests verifying preview state isolation from active release endpoints.
