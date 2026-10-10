# 02: Conflict Resolution Workflow and Audit Logging API

**What to build:** A conflict resolution service and API in `@patchwork/server`. Adds endpoint `POST /api/patches/:id/resolve-conflict` allowing developers to resolve collisions between conflicting patches. Supports resolution actions: `keep_this` (keeps target patch, transitions loser to `archived` or `draft`), `revise_value` (updates property value on winner), or `discard` (archives the patch). Transitions resolved winner patch to `previewing` so it undergoes mandatory browser verification before release. Emits structured audit events (`patch.conflict_resolved`) capturing the collision context, winning patch, superseded patch, and reason.

**Blocked by:** 01: Deterministic Multi-Patch Conflict Detection Engine

**Status:** closed

- [x] Create endpoint `POST /api/patches/:id/resolve-conflict` accepting resolution strategy (`keep_this`, `revise_value`, `discard`), optional revised operation, and superseded patch ID.
- [x] Transition winning patch status to `previewing` and mandate re-verification prior to release.
- [x] Transition superseded or conflicting alternative patches to `archived` or `draft`.
- [x] Emit structured `AuditEvent` with action `patch.status_changed` / `patch.updated` capturing conflict resolution details (`conflictId`, `winnerPatchId`, `supersededPatchId`, `reason`).
- [x] Enforce release gating: patches in `conflict` status strictly cannot be included in any production release.
- [x] Add unit and API integration tests verifying resolution mechanics, state transitions, and audit records.
