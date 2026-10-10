# 04: Automated Verification Gate and State Machine Enforcement

**What to build:** Strict lifecycle gating and release protection enforcing that only verified patches can be included in published releases. Automatically transitions patch status from `draft`/`previewing` to `verified` when all verification assertions and visual checks pass, or to `verification_failed` if any check fails or browser console errors occur. Records immutable audit events (`verification.started`, `verification.passed`, `verification.failed`), and rejects release creation requests containing unverified, failed, or stale patches with informative validation messages.

**Blocked by:** 02: Playwright Verification Worker Service and Execution API

**Status:** ready-for-agent

- [x] Transition patch status to `verified` automatically upon successful verification run.
- [x] Transition patch status to `verification_failed` if any assertion fails, console error occurs, or visual diff exceeds threshold.
- [x] Emit structured `AuditEvent` records for `verification.started`, `verification.passed`, and `verification.failed`.
- [x] Enforce release creation gating in `PatchService.createRelease`: reject with HTTP 400 if any referenced patch is not in `verified` status.
- [x] Provide failure reason and failed assertion summary in the patch model when `verification_failed` occurs.
- [x] Add test suite verifying that invalid/broken patches cannot transition to `verified` and are blocked from release publication.
