# ADR 0002: Patch Lifecycle, State Machine, and Rollback Mechanics

## Status
Accepted

## Context
PATCHWORK needs a rigorous, deterministic state machine governing patches and releases. Erroneous patches must not be published, broken patches must fail verification and stay blocked, stale and conflicting patches must require remediation, and operators must be able to roll back releases atomically with a full audit trail.

## Decision

### 1. Status Model

#### Patch Statuses
The exhaustive set of patch statuses is:
- `draft`: Newly created or updated patch definition under active authoring.
- `previewing`: Patch actively loaded in isolated preview mode for visual inspection.
- `verified`: Patch has successfully executed automated Playwright verification without errors.
- `published`: Patch is bundled into an active release deployed on the host website.
- `verification_failed`: Automated verification assertions failed, or target was not found.
- `stale`: Host website DOM changed (selector mismatch or fingerprint drift); patch is paused.
- `conflict`: Patch collides with another patch targeting the same element and property.
- `rolled_back`: Patch was active in a release that has been deactivated via rollback.
- `archived`: Patch is retired/deprecated and no longer eligible for release.

#### Release Statuses
- `active`: The currently deployed release bundle applied by the runtime to the website. Only one release per website can be `active` at any given time.
- `superseded`: A past release that was replaced by a subsequent release publication.
- `rolled_back`: A release that was explicitly deactivated due to a rollback command.

---

### 2. Legal Patch State Transition Matrix

| Current State | Permitted Next States | Validation Rules & Preconditions |
|---|---|---|
| `draft` | `previewing`, `archived` | Can enter preview or be abandoned. |
| `previewing` | `verified`, `verification_failed`, `draft`, `archived` | Verification runner triggers transition based on test execution. |
| `verified` | `published`, `draft`, `previewing`, `archived` | **Only verified patches can transition to published.** Gated by verification run passing. |
| `verification_failed` | `draft`, `previewing`, `archived` | **Cannot transition directly to published.** Operator must revise draft. |
| `published` | `stale`, `rolled_back`, `archived` | Runtime can detect staleness; rollback deactivates release. |
| `stale` | `draft`, `archived` | **Cannot transition to published.** Must be updated and re-verified. |
| `conflict` | `draft`, `archived` | **Cannot transition to published.** Conflict must be resolved in draft. |
| `rolled_back` | `draft`, `archived` | Can be revived as a new draft revision or archived. |
| `archived` | (Terminal) | Terminal state; no transitions permitted. |

#### Forbidden Direct Transitions
- `draft -> published` (Forbidden: must pass preview & verification first)
- `verification_failed -> published` (Forbidden: cannot publish unverified fixes)
- `stale -> published` (Forbidden: cannot publish broken selector)
- `conflict -> published` (Forbidden: cannot publish colliding operations)

---

### 3. Atomic Rollback Mechanics

When an operator triggers a rollback on website `W`:
1. **Identify Target Release**: Find current `active` release $R_{current}$ for website $W$. If no active release exists, rollback is rejected.
2. **Identify Prior Active Release**: Scan release history for website $W$ in descending chronological order to find the latest previous release $R_{prior}$ whose status was `superseded`.
3. **Atomic State Update**:
   - $R_{current}$ status transitions from `active` to `rolled_back`.
   - Patches belonging uniquely to $R_{current}$ transition to `rolled_back`.
   - If $R_{prior}$ exists:
     - $R_{prior}$ status transitions back to `active`.
     - Patches included in $R_{prior}$ transition back to `published`.
   - If no prior release exists (i.e. rolling back the very first release):
     - The active release pointer is cleared (empty active bundle).
4. **Audit Logging**: Create an `AuditEvent` with action `release.rollback` referencing $R_{current}$ and $R_{prior}$.
5. **Runtime Propagation**: Client browsers polling or requesting the active release immediately receive the restored bundle (or empty bundle).

---

### 4. Audit Trail Event Schema

Every lifecycle state transition generates an immutable `AuditEvent`:

```typescript
interface AuditEvent {
  id: string;
  websiteId: string;
  entityType: 'patch' | 'release' | 'verification';
  entityId: string;
  action: 
    | 'patch.created' 
    | 'patch.updated' 
    | 'patch.status_changed' 
    | 'verification.started' 
    | 'verification.passed' 
    | 'verification.failed' 
    | 'release.published' 
    | 'release.rolled_back';
  actor: {
    id: string;
    name: string;
    role: 'developer' | 'qa' | 'automated-system';
  };
  timestamp: string; // ISO 8601 UTC
  details: {
    fromStatus?: string;
    toStatus?: string;
    version?: number;
    reason?: string;
    metadata?: Record<string, unknown>;
  };
}
```

## Consequences
- Guarantees that defective, stale, or conflicting patches cannot bypass verification gates.
- Guarantees predictable, instantaneous recovery during production incidents via atomic release rollbacks.
- Complete operational auditability across all automated and human interventions.
