# 04: Multi-Patch Release Bundling and Safe Release Gate Enforcement

**What to build:** An end-to-end multi-patch release bundling and gate enforcement engine in `@patchwork/server`, `@patchwork/runtime`, and `@patchwork/dashboard`. Allows grouping multiple independent, verified, non-conflicting patches into versioned immutable `Release` records (`Release V1`, `Release V2`, etc.). Ensures client runtime applies all bundle patches in deterministic order with cumulative original state capture for clean rollback. Extends dashboard release management to support multi-patch release creation with pre-flight verification gate validation.

**Blocked by:** 02: Conflict Resolution Workflow and Audit Logging API, 03: Dashboard Conflict Detection and Interactive Resolution Panel

**Status:** closed

- [x] Create a release modal in `@patchwork/dashboard` allowing selection of multiple verified patches for publication.
- [x] Enforce strict pre-flight release gates in API and UI: reject releases containing unverified, stale, failed, or conflicting patches.
- [x] Generate versioned, immutable `Release` records with active pointer update in `@patchwork/server`.
- [x] Update client runtime (`@patchwork/runtime`) to apply multi-patch bundles in deterministic sequence and capture cumulative element states.
- [x] Expose active release bundle endpoint `GET /api/websites/:id/active-release` serving the complete set of active patches.
- [x] Add automated tests asserting that multi-patch bundles apply deterministically without interfering with unrelated page elements.
