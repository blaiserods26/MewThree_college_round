# 01: End-to-End Lifecycle Scenario Suite

**What to build:** A single automated end-to-end scenario that drives the whole product from the baseline storefront to final rollback. Starting from the baseline site, select the checkout button, create and save a patch, preview it, run Playwright verification, publish the verified release, and confirm the live storefront reflects the patch. Then simulate a structural site update, detect and recover (or review) the stale target, create a conflicting patch and resolve it, run a deliberately failing test and confirm publication is blocked, roll back to the last known-good release, and confirm the page and audit trail match the final state.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Scenario runs unattended from a clean baseline with one command.
- [x] Each step asserts the visible storefront state and the persisted patch/release state.
- [x] Failing verification demonstrably blocks publication.
- [x] Final storefront DOM and audit trail match the rolled-back release.
- [x] Any defects found are fixed or filed as follow-up tickets.
