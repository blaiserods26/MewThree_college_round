# 04: Data Contracts and Type Definitions

**What to build:** Canonical data schemas and TypeScript interfaces for all system entities: `Website`, `TargetFingerprint`, `PatchOperation`, `Patch`, `PatchVersion`, `Release`, `VerificationRun`, and `AuditEvent`. Establishes strict validation rules ensuring patch definitions remain completely independent of the target website's codebase, supporting immutable versioning and structured fingerprints.

**Blocked by:** 03: Patch Lifecycle and State Machine Specification

**Status:** ready-for-agent

- [x] Define the schema and TypeScript types for `TargetFingerprint` (tag, role, accessible name, text, attributes, parent context, selector).
- [x] Define the schema and TypeScript types for allowlisted `PatchOperation` types (`style.set`, `text.set`, `attribute.set`, `element.hide`, `element.show`).
- [x] Define schemas and types for `Patch` and `PatchVersion` with immutable version tracking.
- [x] Define schemas and types for `Release` and `VerificationRun` with assertion and screenshot records.
- [x] Define schemas and types for `AuditEvent` capturing actor, action, timestamp, and target entity IDs.
