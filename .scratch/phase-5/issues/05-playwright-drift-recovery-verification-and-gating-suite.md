# 05: Playwright Drift Recovery Verification and Gating Suite

**What to build:** An automated Playwright test suite in `@patchwork/verification` and `@patchwork/server` validating the end-to-end drift detection and recovery demo scenario. Exercises the simulated storefront update (`#checkout-btn` changed to `<div class="payment-drawer"><button id="pay-now-action">`), verifies that the worker flags the patch as `stale`, retrieves candidate `#pay-now-action` with high similarity score, rebinds the patch, and re-executes Playwright verification to verify the patch succeeds and can subsequently be published to a release.

**Blocked by:** 03: Target Rebind and Versioned Migration API, 04: Stale Patch Resolution and Target Rebind UI

**Status:** closed
Completed: true

- [x] Add Playwright verification assertions for detecting stale targets when selectors diverge.
- [x] Exercise the storefront simulated drift button (`#simulate-drift-btn` -> `#pay-now-action`).
- [x] Assert that target resolution flags `#checkout-btn` as stale and identifies `#pay-now-action` as candidate with score >= 0.85.
- [x] Execute target rebind to `#pay-now-action` via API and verify new patch version is created.
- [x] Run Playwright automated verification on the rebound patch and assert status transitions to `verified`.
- [x] Verify the newly verified rebound patch can be successfully published to a production release.
