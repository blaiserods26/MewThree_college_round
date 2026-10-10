# 01: Deterministic Multi-Patch Conflict Detection Engine

**What to build:** A deterministic conflict detection engine in `@patchwork/contracts` and `@patchwork/server`. Evaluates pairs or sets of patches (proposed and active) to detect target fingerprint overlap and property collisions (e.g., two patches modifying `background-color`, conflicting `style.set` values, or competing `element.hide` vs `style.set` on the same target element). Allows non-overlapping patches (e.g. changing different CSS properties or targeting different elements) to coexist without false conflicts. Exposes collision analysis endpoints via `POST /api/patches/check-conflicts` and `GET /api/websites/:id/conflicts`.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Define ConflictDetectionResult and PatchConflict models in `@patchwork/contracts` identifying overlapping selectors, colliding operation types/properties, and conflicting patch IDs.
- [x] Implement deterministic collision detection logic comparing target fingerprints and operations.
- [x] Detect exact property collisions on same target element (e.g. `style.set` on `background-color` or `display`).
- [x] Detect incompatible operation combinations (e.g. `element.hide` vs `style.set` or `text.set` on same target).
- [x] Allow non-conflicting patches (different targets or non-overlapping CSS properties on same target) to pass cleanly.
- [x] Expose endpoints `POST /api/patches/check-conflicts` and `GET /api/websites/:id/conflicts` in `@patchwork/server`.
- [x] Add unit tests verifying collision detection, non-overlapping coexistence, and boundary conditions.
