# 03: Patch Lifecycle and State Machine Specification

**What to build:** Formal definition and validation logic for patch and release lifecycle statuses. Specifies legal transitions between states (`draft`, `previewing`, `verified`, `published`, `verification_failed`, `stale`, `conflict`, `rolled_back`, `archived`), enforces that only verified patches can be published, and formalizes rollback semantics (deactivating an active release and restoring the previous active set).

**Blocked by:** 02: Architecture and Runtime Seams Specification

**Status:** ready-for-agent

- [x] Define the exhaustive list of status values for patches and releases.
- [x] Specify all permitted and forbidden state transitions with clear validation rules.
- [x] Ensure that a patch in `verification_failed`, `stale`, or `conflict` status cannot be published.
- [x] Specify atomic rollback mechanics that restore the prior active patch set and update release records.
- [x] Define the required audit trail event payload for every state transition.
