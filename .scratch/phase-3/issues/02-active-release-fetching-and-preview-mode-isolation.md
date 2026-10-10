# 02: Active Release Fetching and Preview Mode Isolation

**What to build:** End-to-end integration connecting the client runtime script to the live PATCHWORK backend API. In standard production mode, fetches and applies the active release bundle (`GET /api/websites/:id/active-release`). In preview mode (detected via `?patchwork_preview=<patchId>`), fetches the unreleased draft patch in complete isolation, renders a floating "PATCHWORK PREVIEW MODE" visual badge, and guarantees draft changes never alter production sessions.

**Blocked by:** 01: Client Patch Runtime Core and Safe DOM Mutation Engine

**Status:** ready-for-agent

- [ ] Implement backend bundle fetching reading `data-website-id` from the host script tag.
- [ ] Implement preview mode detection via `?patchwork_preview=<patchId>` query parameter.
- [ ] Fetch isolated draft patch payload from backend preview endpoint without triggering production bundle mutations.
- [ ] Render a non-intrusive floating indicator badge ("PATCHWORK PREVIEW MODE") on the host viewport.
- [ ] Add tests verifying that preview parameters apply isolated draft patches while standard sessions apply only published releases.
