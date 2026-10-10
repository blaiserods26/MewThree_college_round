# 03: Patch Management HTTP API and Release Seams

**What to build:** An HTTP REST service exposing endpoints for patch lifecycle operations and runtime integration. Exposes endpoints to create, fetch, update, and transition patches, retrieve releases and audit trails, and serve `GET /api/websites/:id/active-release` consumed by the client runtime script. Returns structured error payloads for invalid operations or forbidden transitions.

**Blocked by:** 02: Patch Persistence Store and Service Engine

**Status:** ready-for-agent

- [ ] Implement `POST /api/patches` to create a new draft patch with request schema validation.
- [ ] Implement `GET /api/patches` and `GET /api/patches/:id` with optional website and status filters.
- [ ] Implement `PUT /api/patches/:id` to update draft patch operations and generate new versions.
- [ ] Implement `POST /api/patches/:id/transition` to validate and execute patch lifecycle status transitions.
- [ ] Implement `GET /api/websites/:id/active-release` to deliver the active release bundle to the runtime script.
- [ ] Implement `POST /api/websites/:id/rollback` to trigger atomic release rollback.
- [ ] Implement `GET /api/audit-events` returning chronological immutable audit history.
- [ ] Add automated integration tests verifying API endpoint responses, status codes, and error payloads.
