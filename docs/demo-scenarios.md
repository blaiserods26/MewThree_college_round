# PATCHWORK Demo Scenarios and Success Criteria

This document defines the 4 core demo scenarios and the end-to-end 10-step hackathon demonstration workflow for PATCHWORK, along with explicit pass/fail acceptance criteria.

---

## 1. Core Scenarios

### Scenario 1: Valid Mobile Checkout Button Visibility Fix (Happy Path)
- **Problem**: On mobile screen viewports (<= 480px width), the main checkout button (`#checkout-btn` within `#checkout-summary`) is hidden due to an erroneous `display: none` CSS rule introduced by a host website regression.
- **Action**:
  1. Operator inspects the storefront page via PATCHWORK visual element picker.
  2. Element `#checkout-btn` is selected; PATCHWORK records the `TargetFingerprint` (`tag: "button"`, `role: "button"`, `text: "Continue to Checkout"`, `parentContext: "checkout-summary"`).
  3. Operator creates a patch with operation:
     ```json
     {
       "type": "style.set",
       "property": "display",
       "value": "inline-flex"
     }
     ```
  4. Patch enters `previewing` state and is previewed in an isolated session (`?patchwork_preview=<patchId>`).
  5. Operator triggers automated verification. Headless Playwright runner verifies button visibility and clickable state at mobile viewport (375x667).
  6. Verification succeeds (`verified` state).
  7. Patch is approved and bundled into an active `Release` (`published` state).
- **Expected Outcome**: Storefront on mobile viewport immediately renders the checkout button without any code rebuild or deployment to the host storefront.
- **Acceptance Criteria**:
  - Storefront displays `#checkout-btn` when loaded without preview query parameters once release is active.
  - Verification run records passing assertions and screenshot evidence.

---

### Scenario 2: Failing Patch Gate (Safety Gate)
- **Problem**: An operator attempts to apply a patch with an invalid selector (e.g. non-existent `#express-checkout-now`) or an invalid CSS property/value that violates assertions (e.g. sets `opacity: 0` causing visibility check failure).
- **Action**:
  1. Operator submits patch draft.
  2. Automated Playwright verification executes test suite checking button visibility and accessibility.
  3. Assertion fails: target element not visible or not interactive within timeout (5000ms).
  4. PATCHWORK transitions patch status to `verification_failed`.
  5. Publication action is disabled in the UI; API rejects publication attempts with HTTP 400 (`PATCH_VERIFICATION_FAILED`).
- **Expected Outcome**: Failing patch cannot be published to production. Storefront remains unchanged.
- **Acceptance Criteria**:
  - Patch status is `verification_failed`.
  - State machine strictly blocks transition to `published`.
  - Error logs and failure screenshot are captured in `VerificationRun`.

---

### Scenario 3: Stale-Target DOM Mutation (Drift Detection)
- **Problem**: Host engineering deploys a scheduled website update:
  - Button ID `#checkout-btn` is renamed to `#pay-now-action`.
  - Button is wrapped inside a newly introduced container (`div.payment-drawer`).
- **Action**:
  1. Storefront update is loaded.
  2. PATCHWORK runtime executes fingerprint matching on startup:
     - Primary selector (`#checkout-btn`) returns null.
     - Secondary heuristic fingerprint matching (`tag: "button"`, `role: "button"`, `text: "Continue to Checkout"`) locates element `#pay-now-action` inside `div.payment-drawer`.
  3. PATCHWORK marks the patch status as `stale` (Selector Drift Detected).
  4. Host storefront falls back safely without executing invalid operations or crashing.
  5. Dashboard notifies operator with proposed selector adjustment and prompts for operator review.
- **Expected Outcome**: PATCHWORK prevents corrupt DOM modifications when the host changes underneath, alerts operators, and provides clear recovery path.
- **Acceptance Criteria**:
  - Patch status flags `stale`.
  - Runtime logs fingerprint deviation warning.
  - Published bundle does not corrupt page layout.

---

### Scenario 4: Concurrent Conflicting Patches (Conflict Resolution)
- **Problem**: Two operators simultaneously create drafts targeting the same promotional banner (`#promo-banner`):
  - Operator A drafts Patch Alpha: `style.set` `background-color: #2563eb` (Royal Blue).
  - Operator B drafts Patch Beta: `style.set` `background-color: #dc2626` (Crimson Red).
- **Action**:
  1. Patch Alpha is verified and published in Release V1.
  2. Operator B attempts to verify/publish Patch Beta.
  3. Conflict detection engine analyzes target fingerprints and operation keys:
     - Target: `#promo-banner`
     - Operation Key: `style.set:background-color`
  4. Engine identifies conflicting target property between active release and proposed patch.
  5. Patch Beta is transitioned to `conflict` status.
  6. Dashboard displays a visual diff showing the competing values and requires explicit override or resolution.
- **Expected Outcome**: Clashing patches cannot silently overwrite each other; conflicts are deterministically caught before release.
- **Acceptance Criteria**:
  - Conflict status assigned to colliding patch.
  - Direct publication blocked until conflict is resolved.

---

## 2. The 10-Step Hackathon Demo Walk-Through

| Step | Action | Actor / Component | Expected Behavior & Success Criteria |
|---|---|---|---|
| **1. Baseline State** | Open demo storefront in mobile view (375px width). | Presenter | Checkout button is missing from viewport due to CSS regression. Cart is blocked. |
| **2. Target Selection** | Launch PATCHWORK visual inspector over the storefront. | Presenter / Dashboard | Hovering over checkout container highlights target; clicking captures `TargetFingerprint`. |
| **3. Draft Creation** | Create Patch `PATCH-001` with `style.set:display:inline-flex`. | Presenter / Dashboard | Patch created in `draft` state (Version 1). Host storefront remains unchanged. |
| **4. Preview Isolation** | Open Storefront with `?patchwork_preview=PATCH-001`. | Browser | Checkout button displays in preview tab; standard production tab remains unchanged (no leak). |
| **5. Automated Verification** | Trigger verification check. | Playwright Runner | Headless test loads preview, checks button visibility & clickability; captures screenshot; marks `verified`. |
| **6. Gated Publication** | Publish `PATCH-001` as Release `REL-001`. | Presenter / Dashboard | Patch enters `published` state; Release `REL-001` becomes `active`; standard production tab shows restored button upon reload. |
| **7. Safety Gate Proof** | Submit invalid patch `PATCH-ERR` (`opacity: 0`). Run verification. | Presenter / Runner | Verification fails; patch marked `verification_failed`; Publish button disabled. |
| **8. Stale Target Drift** | Click "Simulate Site Update" on storefront (renames ID, wraps button). | Presenter / Storefront | Runtime detects selector mismatch; marks patch `stale`; alerts dashboard; no runtime exception thrown. |
| **9. Conflict Detection** | Attempt to apply competing patch on same element property. | Presenter / Engine | Conflict detected and flagged as `conflict`; prompt for resolution displayed. |
| **10. Atomic Rollback** | Click "Rollback to Previous Release" in Release History. | Presenter / Dashboard | `REL-001` marked `rolled_back`; previous baseline restored; storefront reverts; complete audit trail displayed. |

---

## 3. Explicit Pass/Fail Criteria

1. **Isolation Pass**: An unverified draft patch must NEVER appear on the production storefront URL without the explicit preview token/parameter.
2. **Gating Pass**: An API call to publish a patch with status other than `verified` MUST return an error and reject the release creation.
3. **Audit Trail Pass**: Every state change (create, preview, verify, publish, rollback) must produce a chronological, immutable `AuditEvent` with actor, timestamp, and entity ID.
4. **Rollback Pass**: Rolling back a release must instantly deactivate all patches belonging to that release and restore the storefront to the exact prior active release state.
