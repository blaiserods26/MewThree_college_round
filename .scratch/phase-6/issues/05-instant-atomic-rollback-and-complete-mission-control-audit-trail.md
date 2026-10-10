# 05: Instant Atomic Rollback and Complete Mission-Control Audit Trail

**What to build:** One-click atomic rollback with live storefront state reversion and a comprehensive chronological audit trail in `@patchwork/server`, `@patchwork/dashboard`, and `@patchwork/runtime`. Restores the storefront instantly to the previous active release (or clean baseline) by switching the active release pointer without requiring site rebuilds or redeploys. Renders a rich audit trail timeline in the dashboard displaying all historical actions (`patch.created`, `patch.updated`, `patch.status_changed`, `verification.started`, `verification.passed`, `verification.failed`, `release.published`, `release.rolled_back`). Includes a full end-to-end automated test suite verifying conflict detection, resolution, release publishing, atomic rollback, and audit trail generation.

**Blocked by:** 03: Dashboard Conflict Detection and Interactive Resolution Panel, 04: Multi-Patch Release Bundling and Safe Release Gate Enforcement

**Status:** closed

- [x] Connect one-click "Rollback Release" button in dashboard to `POST /api/websites/:id/rollback`.
- [x] Atomically switch active release pointer to immediate prior release (or unpatched baseline if release 1).
- [x] Ensure client runtime reverts DOM state cleanly to the rolled-back target without page disruption.
- [x] Render complete mission-control Audit Trail timeline in dashboard with event badges, actor role, timestamp, entity ID, and diff details.
- [x] Add Playwright and API automated tests validating full end-to-end lifecycle: conflict creation -> resolution -> verification -> multi-patch release -> atomic rollback.
