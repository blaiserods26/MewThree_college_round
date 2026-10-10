# 02: Edge-Case Hardening: Server, Runtime and Verification Failures

**What to build:** Deterministic, tested behaviour for failure paths across the server, client runtime and verification worker. Each failure yields a clear, structured result instead of a crash or silent no-op: target element missing, selector matching multiple elements, disallowed operation, verification worker failure or timeout, two patches conflicting, and rollback requested when no previous release exists.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Missing target marks the patch stale/failed with a descriptive reason and never breaks the page.
- [x] Ambiguous (multi-match) selectors are rejected or flagged, not applied blindly.
- [x] Operations outside the allowlist are rejected by the server with a clear error.
- [x] Worker crash or timeout records a failed verification and blocks publication.
- [x] Conflicting patches are surfaced and block release until resolved.
- [x] Rollback with no prior release returns a meaningful response (baseline or explicit error) and leaves state consistent.
- [x] Automated tests cover each case.
