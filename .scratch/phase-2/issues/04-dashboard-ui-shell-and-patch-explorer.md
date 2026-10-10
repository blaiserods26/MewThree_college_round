# 04: Dashboard UI Shell and Patch Explorer

**What to build:** An operator dashboard web application connecting to the PATCHWORK API. Allows operators to select active websites, view the live patch inventory with status tags and versions, inspect patch target fingerprints and operation payloads, and create new draft patches through an intuitive form.

**Blocked by:** 03: Patch Management HTTP API and Release Seams

**Status:** ready-for-agent

- [x] Create the dashboard application shell with website switcher and navigation layout.
- [x] Build the Patch Inventory list showing name, status badge, version counter, and last updated time.
- [x] Build the Patch Detail view showing target selector, attributes, operation details, and version history.
- [x] Implement a "New Patch" modal/drawer to submit draft patches to `POST /api/patches`.
- [x] Connect the UI to the live backend API with optimistic loading states and error handling.
