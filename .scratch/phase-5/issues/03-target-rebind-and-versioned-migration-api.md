# 03: Target Rebind and Versioned Migration API

**What to build:** A target migration and rebind API in `@patchwork/server`. Adds endpoint `POST /api/patches/:id/rebind` allowing developers to accept a candidate element or provide a corrected selector and target fingerprint. Generates an immutable new `PatchVersion` preserving full historical definition records, resets the patch status from `stale` to `previewing` or `draft`, emits structured audit events (`patch.updated` with changeNote noting target migration), and requires the rebound patch to undergo automated verification before release.

**Blocked by:** 01: Multi-Signal Target Fingerprint Extractor and Weighted Matcher

**Status:** closed
Completed: true

- [x] Create endpoint `POST /api/patches/:id/rebind` accepting updated selector and target fingerprint.
- [x] Increment patch version number and append immutable `PatchVersion` record to patch version history.
- [x] Transition patch status out of `stale` into `previewing` / `draft`.
- [x] Emit structured `AuditEvent` with action `patch.updated` and details capturing selector migration (`fromSelector` -> `toSelector`).
- [x] Enforce gating rule: rebound patch cannot transition directly to `published` until re-verified.
- [x] Add unit and API integration tests verifying rebind mechanics and audit trail generation.
