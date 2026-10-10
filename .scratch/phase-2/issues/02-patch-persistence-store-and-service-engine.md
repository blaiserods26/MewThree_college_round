# 02: Patch Persistence Store and Service Engine

**What to build:** A persistent storage layer and domain service engine for managing `Website`, `Patch`, `PatchVersion`, `Release`, and `AuditEvent` entities across application restarts. Enforces immutable versioning on patch definition updates, validates all status transitions using the `@patchwork/contracts` state machine, and automatically records audit events for all creates, edits, and state transitions.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Implement file-based or embedded persistent repository for `Website`, `Patch`, `Release`, and `AuditEvent`.
- [x] Implement `createPatch` generating a new patch in `draft` status (version 1) and recording an audit event.
- [x] Implement `updatePatchDraft` which creates an immutable `PatchVersion` record and increments the version counter without overwriting history.
- [x] Implement `transitionPatchStatus` validating transitions against `@patchwork/contracts` and rejecting illegal transitions.
- [x] Implement `createRelease` and atomic rollback execution using the contracts rollback helper.
- [x] Add unit tests verifying persistence across restarts, version bumping, transition rejection, and audit log accuracy.
