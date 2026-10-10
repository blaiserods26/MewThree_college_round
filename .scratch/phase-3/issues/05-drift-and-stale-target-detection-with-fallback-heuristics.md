# 05: Drift and Stale Target Detection with Fallback Heuristics

**What to build:** Runtime DOM drift detection when host web application changes invalidate patch selectors. When the storefront simulates a site update (renaming `#checkout-btn` -> `#pay-now-action` and nesting inside `div.payment-drawer`), the runtime detects primary selector failure, triggers fallback fingerprint heuristics (tag, role, text content, attributes), marks the patch status as `stale` on the backend via API, logs a diagnostic drift report, and safely aborts execution without breaking the host page.

**Blocked by:** 01: Client Patch Runtime Core and Safe DOM Mutation Engine, 02: Active Release Fetching and Preview Mode Isolation

**Status:** ready-for-agent

- [x] Implement fingerprint heuristic scoring to locate mutated elements when the primary selector returns null.
- [x] Calculate confidence scores based on tag match, accessible role, text similarity, and parent context.
- [x] Transition patch to `stale` status via API endpoint when drift threshold is triggered.
- [x] Safe failure mode: abort patch application gracefully without throwing exceptions or corrupting the host page.
- [x] Add automated tests simulating DOM restructuring and verifying stale status reporting.
