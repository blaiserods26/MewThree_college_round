# PATCHWORK — 24-Hour Hackathon Implementation Plan

> **Goal:** Build a convincing, working MVP of PATCHWORK: a platform for creating, validating, publishing, tracking, and rolling back independent patches to an existing website—without rebuilding the original application.
>
> **Time limit:** 24 hours  
> **Build strategy:** Core deterministic workflow first. AI features are explicitly deferred until the non-AI product is integrated, tested, and stable.  
> **Working rule:** Treat each checkbox as a reviewable task. During development, adjust scope based on actual progress rather than blindly following the plan.

---

## 0. Product Scope and Definition of Done

### The main demo story

Use a small, controlled storefront as the target website. Demonstrate this sequence:

1. A checkout button or banner has a visible problem.
2. A developer selects the element and creates a patch.
3. PATCHWORK stores the patch independently from the website source.
4. The developer previews the change in isolation.
5. Automated browser checks verify the expected behaviour.
6. A passing patch can be published; a failing patch is blocked.
7. A website update changes the target element's structure or selector.
8. PATCHWORK detects the stale target and proposes a safe recovery or requests human review.
9. A conflicting patch is detected and resolved explicitly.
10. A published patch can be rolled back, and the audit trail shows what happened.

### MVP must-haves

- [ ] A controlled existing website with a few interactive elements.
- [ ] Visual element selection and a small set of supported patch operations.
- [ ] A persistent, versioned patch model.
- [ ] Patch preview that does not alter the published website.
- [ ] Deterministic conflict and stale-target detection.
- [ ] Real browser verification using Playwright.
- [ ] Publish, deactivate/rollback, and release history.
- [ ] An audit trail.
- [ ] A reliable, rehearsed end-to-end demonstration.

### Explicitly out of scope for the initial MVP

- [ ] Arbitrary support for every third-party website.
- [ ] Unrestricted execution of user-supplied JavaScript.
- [ ] Full real-time collaborative editing.
- [ ] Automatic repair of server-side business logic or backend APIs.
- [ ] A production-grade multi-tenant deployment platform.
- [ ] AI-driven patch creation, recovery, or review before the final AI phase.

**Scope rule:** A working, testable end-to-end flow is more valuable than several disconnected feature screens. If time slips, reduce the number of supported patch operations and defer optional UI polish—not verification or rollback.

---

## Phase 1 — Scope, Architecture, and Team Contracts

**Target time:** Hours 0–2  
**Outcome:** The team agrees on one demo scenario, shared data contracts, responsibilities, and repository structure before parallel development begins.

### Step 1.1 — Lock the demo scenario

- [ ] Choose one controlled storefront page as the target website.
- [ ] Include a checkout button, an announcement/banner, a heading, and one simple interaction.
- [ ] Define one valid patch: for example, restore the checkout button's visibility on mobile.
- [ ] Define one failing patch: for example, target a missing element or apply a change that makes a required test fail.
- [ ] Define one stale-target scenario: rename an ID and move the button inside a wrapper.
- [ ] Define one conflict scenario: two patches change the same element property to different values.
- [ ] Define the expected final demo sequence and success criteria.

### Step 1.2 — Choose the simplest viable architecture

Recommended default:

- **Frontend:** React + TypeScript + Tailwind CSS.
- **Backend/data:** Supabase for persistence and authentication if needed.
- **Patch runtime:** TypeScript/JavaScript with a strict allowlist of operations.
- **Browser verification:** Node.js + Playwright.
- **Demo hosting:** Existing familiar hosting, or local development if reliable deployment would consume too much time.

- [ ] Confirm the stack based on what the team can already run.
- [ ] Avoid introducing a new framework solely for this project.
- [ ] Decide how the demo website receives approved patches.
- [ ] Decide how the preview environment differs from the published environment.
- [ ] Define the minimum APIs and data structures before frontend/backend work diverges.

### Step 1.3 — Define the patch lifecycle

Use a small, explicit status model. Suggested statuses:

`draft → previewing → verified → published`

Additional statuses:

`verification_failed`, `stale`, `conflict`, `rolled_back`, `archived`

- [ ] Agree on exact status names and legal transitions.
- [ ] Decide which transitions require a passing test or human approval.
- [ ] Ensure a failed verification cannot silently become a published release.
- [ ] Define what rollback means: deactivate the active patch/release and restore the prior active patch set.

### Step 1.4 — Define the patch data contract

Suggested minimum fields:

```json
{
  "id": "PATCH-001",
  "websiteId": "demo-store",
  "name": "Restore checkout button visibility",
  "targetFingerprint": {
    "tag": "button",
    "role": "button",
    "text": "Continue to Checkout",
    "stableAttributes": {},
    "parentContext": "checkout-summary"
  },
  "operation": {
    "type": "style.set",
    "property": "display",
    "value": "inline-flex"
  },
  "status": "draft",
  "version": 1,
  "createdBy": "demo-user",
  "createdAt": "ISO-8601 timestamp"
}
```

This is an illustrative contract; adapt it to the chosen implementation.

- [ ] Agree on required and optional fields.
- [ ] Keep patch metadata separate from website source code.
- [ ] Define how versions are represented.
- [ ] Define release and audit event records.
- [ ] Document the contract in one source-of-truth file.

### Step 1.5 — Assign work and protect integration time

For a four-person team, suggested ownership:

- [ ] Person A: dashboard, visual editor, preview UI.
- [ ] Person B: patch runtime, target fingerprints, operation validation.
- [ ] Person C: backend, persistence, versioning, conflict rules, audit log.
- [ ] Person D: Playwright verification, demo site, integration tests, deployment/demo reliability.

For smaller teams, combine backend and runtime responsibilities first.

- [ ] Agree on API contracts before parallel coding.
- [ ] Create a shared task board or checklist.
- [ ] Reserve at least the final 4 hours for integration, reliability, and demo preparation.
- [ ] Establish one shared branch/merge policy and one person responsible for integration.

**Phase exit check**

- [ ] Everyone can explain the demo story.
- [ ] The patch schema and status transitions are agreed.
- [ ] The repository layout and ownership are clear.
- [ ] The team can start implementing without guessing API contracts.

---

## Phase 2 — Build the Controlled Demo Website and Patch Foundation

**Target time:** Hours 2–5  
**Outcome:** There is a real page to patch and a working data model to store patches.

### Step 2.1 — Build the target website

- [ ] Create a compact storefront page.
- [ ] Add a checkout summary and checkout button.
- [ ] Add a banner and heading that can be edited.
- [ ] Add a simple interaction that Playwright can test.
- [ ] Add a predictable mobile layout.
- [ ] Create a way to simulate a site update that changes the button ID or parent structure.
- [ ] Make the baseline page stable and easy to reset.

### Step 2.2 — Build the PATCHWORK dashboard shell

- [ ] Create the main dashboard with a website/project selector.
- [ ] Add a patch list with status, name, version, and last updated time.
- [ ] Add a patch detail view.
- [ ] Add a verification results panel.
- [ ] Add release history and audit history sections.
- [ ] Use real data where available; label any temporary mock data clearly.
- [ ] Keep UI polish modest until the workflow works.

### Step 2.3 — Implement persistence

- [ ] Create tables/collections for websites, patches, patch versions, releases, verification runs, and audit events as appropriate.
- [ ] Store timestamps and actor identifiers for important changes.
- [ ] Persist patch status transitions.
- [ ] Store verification results separately from the patch definition.
- [ ] Store release records independently from draft patch edits.
- [ ] Add minimum access controls if using a shared backend.
- [ ] Verify that a page refresh does not erase the patch history.

### Step 2.4 — Create a patch API/service layer

- [ ] Implement create patch.
- [ ] Implement list/get patch.
- [ ] Implement update draft patch.
- [ ] Implement create new patch version rather than overwriting release history.
- [ ] Implement status transition validation.
- [ ] Implement audit-event creation for patch creation and updates.
- [ ] Return clear errors for invalid operations or status transitions.

**Phase exit check**

- [ ] The demo website runs reliably.
- [ ] A patch can be created and retrieved after refresh.
- [ ] Patch versions and status are visible.
- [ ] Invalid status transitions are rejected.

---

## Phase 3 — Visual Patching and Safe Patch Runtime

**Target time:** Hours 5–8  
**Outcome:** A developer can select an element, create a patch, and see the patch applied to a controlled page.

### Step 3.1 — Visual element selection

- [ ] Add a selection mode for the controlled website.
- [ ] Highlight the element under the pointer.
- [ ] Show the selected element's tag, accessible role/name if available, text, and relevant attributes.
- [ ] Allow the developer to confirm the selection before editing.
- [ ] Avoid selecting ambiguous or overly broad page containers by accident.
- [ ] Store the selected element's target fingerprint.

### Step 3.2 — Support only a few safe operations

Start with:

- [ ] `text.set`
- [ ] `style.set` for an allowlist of properties
- [ ] `attribute.set` for explicitly allowed attributes
- [ ] `element.hide`
- [ ] `element.show`

Optional only if the above work:

- [ ] A simple class toggle or one constrained behaviour operation.

Do **not** implement arbitrary code execution as the default patch mechanism.

### Step 3.3 — Implement runtime application

- [ ] Validate every operation against an allowlist.
- [ ] Confirm the target is unique before applying the patch.
- [ ] Record the original value/state needed to reverse the patch.
- [ ] Apply patches in a deterministic order.
- [ ] Surface runtime errors instead of silently ignoring them.
- [ ] Record whether each patch was applied, skipped, stale, or failed.
- [ ] Ensure disabled/rolled-back patches are not applied.

### Step 3.4 — Connect editor to patch storage

- [ ] Save a new draft from a selected element.
- [ ] Edit the patch operation and value.
- [ ] Save a new version when a patch definition changes.
- [ ] Display the patch status and version in the dashboard.
- [ ] Add a simple before/after view for supported changes.

**Phase exit check**

- [ ] A developer can select a button and create a style patch.
- [ ] The patch is saved and survives a refresh.
- [ ] The runtime applies the patch to the controlled site.
- [ ] Unsupported operations are rejected safely.

---

## Phase 4 — Isolated Preview and Automated Verification

**Target time:** Hours 8–12  
**Outcome:** A proposed patch can be tested without changing the published page, and actual browser results determine whether it can be released.

### Step 4.1 — Separate preview from published state

- [x] Define a preview mode or isolated browser context.
- [x] Apply draft patches only in preview.
- [x] Ensure preview actions do not update the active production release.
- [x] Provide a clear label showing whether the user is viewing Preview or Published.
- [x] Capture a screenshot of the patched state.
- [x] Provide a way to reset preview to the baseline.

### Step 4.2 — Implement the Playwright verification worker

- [x] Launch the controlled demo website in a test browser.
- [x] Apply the proposed patch in the test environment.
- [x] Verify the target exists and is unique.
- [x] Verify the expected text/style/attribute after the patch.
- [x] Verify the relevant element is visible and enabled when expected.
- [x] Exercise the key interaction for the selected scenario.
- [x] Capture console errors and test failures.
- [x] Capture a screenshot for review.
- [x] Store the test run status, output, timestamp, and relevant screenshots/paths.

### Step 4.3 — Add visual regression checks

- [x] Capture a baseline screenshot at a fixed viewport.
- [x] Capture a patched screenshot at the same viewport.
- [x] Use a basic screenshot comparison if time permits.
- [x] Set a practical threshold and explain that visual comparisons can be noisy.
- [x] Add a mobile viewport check for the checkout-button scenario.
- [x] Ensure a desktop regression check also runs.

### Step 4.4 — Make verification control the workflow

- [x] A successful verification marks the patch as verified.
- [x] A failed mandatory test marks the patch as verification_failed.
- [x] A failed patch cannot be published through the normal UI/API.
- [x] Display the exact failed assertion in the dashboard.
- [x] Do not invent or hardcode passing results in the UI.
- [x] Test one deliberately broken patch to prove that the gate works.

**Phase exit check**

- [x] Draft changes appear in preview but not in the published view.
- [x] Playwright actually runs and returns results.
- [x] A passing patch can become verified.
- [x] A failing patch is blocked from publication.
- [x] Screenshots and failure messages are visible to the developer.

**Critical milestone:** By the end of this phase, you should already have a meaningful demo. If the schedule is slipping, prioritize this working vertical slice before adding advanced features.

---

## Phase 5 — Smart Element Tracking and Stale-Patch Detection

**Target time:** Hours 12–15  
**Outcome:** PATCHWORK detects when a website update invalidates a patch and can recover obvious cases without silently changing the wrong element.

### Step 5.1 — Record a target fingerprint

Capture a combination of:

- [x] Tag name.
- [x] Accessible role and accessible name when available.
- [x] Relevant text content.
- [x] Stable attributes such as `data-testid`, if present.
- [x] Parent/container context.
- [x] Nearby text or sibling context.
- [x] Original selector as one signal, not the only signal.

### Step 5.2 — Detect stale targets

- [x] Mark a patch stale if its original target no longer resolves.
- [x] Detect when a selector matches multiple elements.
- [x] Search the current page for candidates matching the fingerprint.
- [x] Rank candidates with a deterministic weighted similarity score.
- [x] Show the best candidate and the signals supporting the match.
- [x] Require review when confidence is low or multiple candidates are close.
- [x] Do not automatically apply high-impact changes to an ambiguous target.

Suggested prototype thresholds (tune during testing):

- High confidence: score at least 0.85 and a clear margin over the next candidate.
- Review required: score from 0.60 to below 0.85, or candidates have similar scores.
- Stale/ambiguous: score below 0.60 or no plausible unique candidate.

These thresholds are heuristics, not proof of semantic correctness.

### Step 5.3 — Demonstrate recovery

- [x] Start with a working patch.
- [x] Change the target element's ID and move it into a wrapper using the site's simulated update.
- [x] Run target resolution again.
- [x] Show the patch becoming stale.
- [x] Show the candidate and matching evidence.
- [x] Allow the developer to confirm/rebind the target.
- [x] Re-run verification before the recovered patch can be published.

**Phase exit check**

- [x] A changed ID is not automatically treated as a lost patch if other signals match.
- [x] Ambiguous candidates require human review.
- [x] A rebound patch must pass verification again.

---

## Phase 6 — Conflict Detection, Releases, Rollback, and Audit Trail

**Target time:** Hours 15–18  
**Outcome:** PATCHWORK manages independent patches and releases rather than acting as a one-off visual editor.

### Step 6.1 — Implement deterministic conflict detection

- [x] Compare target fingerprints across active and proposed patches.
- [x] Detect two patches that modify the same property on the same target.
- [x] Detect overlapping operations that may be incompatible.
- [x] Allow non-overlapping patches to coexist.
- [x] Display the conflicting patches and their proposed values.
- [x] Allow a developer to choose one value, revise a patch, or discard a patch.
- [x] Record the resolution in the audit trail.
- [x] Re-run verification after a conflict is resolved.

Example conflict: one patch sets the checkout button background to green while another sets it to red.

### Step 6.2 — Implement release versioning

- [x] Group verified patches into a release or active patch set.
- [x] Give each release a unique ID/version.
- [x] Store which patch versions are included in the release.
- [x] Store who published the release and when.
- [x] Record the verification run associated with the release.
- [x] Keep prior release records immutable.
- [x] Display active release and previous releases.

### Step 6.3 — Implement safe publish and rollback

- [x] Reject releases that contain failed or unresolved patches.
- [x] Prepare the new patch set before activating it.
- [x] Switch the active release only after the release is approved.
- [x] Preserve the last known-good release.
- [x] Implement rollback to the previous active patch set.
- [x] Verify the page after rollback.
- [x] Record rollback reason, actor, timestamp, and target release.
- [x] Demonstrate a failed release being blocked or rolled back.

For the prototype, atomic activation can be represented by switching an active release pointer. Ensure the runtime actually respects that pointer; changing only the dashboard label is not a real rollback.

### Step 6.4 — Complete the audit trail

Record events such as:

- [x] Patch created.
- [x] Patch edited/versioned.
- [x] Verification started/completed/failed.
- [x] Patch marked stale.
- [x] Conflict detected/resolved.
- [x] Release published.
- [x] Release rolled back.
- [x] Target rebound after review.

- [x] Display events in chronological order.
- [x] Include actor, timestamp, event type, and relevant patch/release ID.
- [x] Make the audit log reflect real operations rather than demo-only entries.

**Phase exit check**

- [x] Overlapping patches are detected.
- [x] Conflict resolution is recorded.
- [x] A verified release can be published.
- [x] Rollback restores the previous active patch set.
- [x] The audit trail reflects the actual lifecycle.

---

## Phase 7 — Integration, Reliability, and Demo Hardening

**Target time:** Hours 18–20  
**Outcome:** The whole system works as one product, including failure cases.

### Step 7.1 — Run the complete end-to-end scenario

- [ ] Start from the baseline website.
- [ ] Select the checkout button.
- [ ] Create and save a patch.
- [ ] Preview the patch.
- [ ] Run Playwright verification.
- [ ] Publish the verified release.
- [ ] Confirm the published website reflects the patch.
- [ ] Simulate a website structural update.
- [ ] Detect and recover/review the stale target.
- [ ] Create a conflicting patch and resolve it.
- [ ] Run a failing test and confirm publication is blocked.
- [ ] Roll back to the last known-good release.
- [ ] Confirm the page and audit trail match the final state.

### Step 7.2 — Test edge cases

- [ ] Target element is missing.
- [ ] Selector matches multiple elements.
- [ ] Operation is not allowed.
- [ ] Verification worker fails or times out.
- [ ] Two patches conflict.
- [ ] Rollback is requested when no previous release exists.
- [ ] Page refresh occurs during normal dashboard use.
- [ ] Backend request fails and the UI shows a useful error.

### Step 7.3 — Stabilize the environment

- [ ] Confirm all required environment variables are documented.
- [ ] Remove hardcoded secrets.
- [ ] Ensure the database schema/migrations are reproducible.
- [ ] Confirm the demo works from a clean start.
- [ ] Check browser console and server logs for critical errors.
- [ ] Prepare a reset script or documented reset procedure for the demo data.
- [ ] Keep a short backup recording in case live deployment or network access fails.

**Phase exit check**

- [ ] The end-to-end scenario succeeds twice in a row.
- [ ] Failure cases produce meaningful, visible results.
- [ ] The team knows how to reset and recover the demo.

---

## Phase 8 — AI Enhancements (Only After the Core Product Works)

**Target time:** Hours 20–22, only if all core phases are stable  
**Outcome:** AI improves the patch lifecycle without becoming a required dependency for safe deployment.

**Entry gate:** Do not begin this phase until the complete non-AI workflow—visual patching, persistence, preview, real browser verification, stale-target handling, conflict detection, publish, rollback, and audit—is working. If any critical part is broken, use this time to fix it instead.

### AI Feature A — Natural-Language Hotfix Copilot

Example request:

> “The checkout button is invisible on mobile. Restore it without changing the desktop layout.”

- [ ] Send the bug description and limited, relevant page/element context to an LLM API.
- [ ] Request structured JSON matching the existing patch schema.
- [ ] Ask the model to explain its proposed target, operation, assumptions, and intended result.
- [ ] Validate the output against the operation allowlist and schema.
- [ ] Show the proposed patch for developer review.
- [ ] Save it as a draft; do not let the model publish directly.
- [ ] Run the existing preview and verification pipeline before publication.
- [ ] Provide a deterministic manual-edit path if the AI service fails or is unavailable.

### AI Feature B — AI-Assisted Root-Cause Explanation

- [ ] Collect real verification output, relevant console errors, and limited DOM/patch context.
- [ ] Ask the model for likely causes and recommended next debugging steps.
- [ ] Clearly distinguish observed facts from hypotheses.
- [ ] Display the actual failing assertion alongside the AI explanation.
- [ ] Avoid sending credentials, secrets, or unnecessary user data to the model.

### AI Feature C — Semantic Recovery Assistance (only if time remains)

- [ ] Use deterministic fingerprint matching first.
- [ ] If several plausible candidates remain, ask the model to compare a small set of candidate descriptions.
- [ ] Require a confidence explanation and a human confirmation when ambiguity remains.
- [ ] Re-run all verification after the target is rebound.
- [ ] Do not treat an LLM's confidence statement as proof that a match is correct.

### AI safety rules

- [ ] AI output is always an untrusted proposal.
- [ ] The server validates every generated operation.
- [ ] AI cannot bypass tests, conflict checks, approvals, or rollback rules.
- [ ] Never pass unrestricted code from the model directly to `eval` or equivalent execution.
- [ ] If the API is unavailable, the core product remains usable.
- [ ] Do not claim an AI-generated fix works until the browser tests actually run and pass.

**Phase exit check**

- [ ] At least one AI feature works end to end.
- [ ] AI-generated proposals use the existing patch system.
- [ ] The existing verification gate remains mandatory.
- [ ] The core demo still works when AI is disabled.

**Priority:** Build Feature A first. Add Feature B only if Feature A is stable. Treat Feature C as optional.

---

## Phase 9 — Final Polish, Pitch, and Submission

**Target time:** Hours 22–24  
**Outcome:** A reliable, clearly explained demo and submission package.

### Step 9.1 — UI and product polish

- [ ] Make patch statuses visually clear.
- [ ] Make Preview versus Published state unmistakable.
- [ ] Show before/after changes where practical.
- [ ] Make failure reasons and conflict details easy to understand.
- [ ] Remove dead buttons, placeholder controls, and misleading mock states.
- [ ] Check responsive layout and obvious overflow.
- [ ] Ensure the main demo screen is immediately understandable.

### Step 9.2 — Prepare the technical explanation

- [ ] Create a simple architecture diagram.
- [ ] Explain the patch schema and lifecycle.
- [ ] Explain how target fingerprints help recover from DOM changes.
- [ ] Explain how conflicts are detected.
- [ ] Explain how Playwright verification gates releases.
- [ ] Explain how rollback works without rebuilding the original application.
- [ ] Clearly distinguish implemented features from future work or simulations.
- [ ] If AI is included, explain that it proposes changes while deterministic controls enforce safety.

### Step 9.3 — Rehearse the demo

Suggested 3–4 minute sequence:

1. **Problem:** A website update breaks the checkout button.
2. **Create:** Select the element and create a patch.
3. **Preview:** Show the proposed change in isolation.
4. **Verify:** Run real browser tests.
5. **Recover:** Change the site's DOM structure and show stale-target detection.
6. **Conflict:** Show two patches that disagree on one property.
7. **Release:** Publish a passing patch.
8. **Failure:** Demonstrate a failing patch being blocked.
9. **Rollback:** Restore the last known-good release.
10. **AI, if completed:** Generate a patch from a natural-language bug report, then pass it through the same verification gate.

- [ ] Rehearse the full sequence at least twice.
- [ ] Prepare known-good demo data and a reset process.
- [ ] Record a backup demo video.
- [ ] Ensure the presentation does not promise unimplemented capabilities.

### Step 9.4 — Repository and handoff hygiene

- [ ] Reuse the existing repository structure and naming conventions.
- [ ] Keep source files, tests, migrations, documentation, and reports in their established locations.
- [ ] Avoid duplicate components, redundant documentation, and abandoned experiments.
- [ ] Update the source-of-truth README/project-state documentation with what actually works.
- [ ] Document setup commands and required environment variables.
- [ ] Remove temporary files and unused code.
- [ ] Confirm that another team member can start the project using the documented instructions.

---

## Suggested API Surface

Keep the API small enough to finish.

| Endpoint | Purpose |
|---|---|
| `POST /patches` | Create a patch draft |
| `GET /patches` | List patches and statuses |
| `GET /patches/:id` | Retrieve a patch and versions |
| `PATCH /patches/:id` | Update a draft |
| `POST /patches/:id/preview` | Request isolated preview |
| `POST /patches/:id/verify` | Start browser verification |
| `POST /patches/:id/rebind` | Confirm a recovered target |
| `POST /releases` | Prepare/publish a verified patch set |
| `GET /releases` | List release history |
| `POST /releases/:id/rollback` | Restore a previous release |
| `GET /audit-events` | Retrieve the audit trail |

These are suggested routes, not mandatory names. If using Supabase directly for simple CRUD, avoid building a separate backend layer unless it adds real value. Keep privileged operations and verification orchestration in trusted server-side code.

---

## Suggested Data Model

A practical minimum:

- **websites:** target site metadata and runtime configuration.
- **patches:** stable patch identity and current status.
- **patch_versions:** immutable versions of patch definitions.
- **releases:** versioned sets of patch versions and their release status.
- **verification_runs:** test status, assertions, output, screenshots, and timestamps.
- **audit_events:** actor, action, timestamp, and related patch/release IDs.

Add users/team membership only to the extent required by the demo. For collaborative editing, a simple author/reviewer field and explicit approval workflow is enough for this MVP.

---

## Feature Acceptance Checklist

Use this near the end to decide whether the submission is ready.

### Core

- [ ] I can select an element on the existing website.
- [ ] I can create and save a patch independently of the original source.
- [ ] I can preview a draft without affecting the published website.
- [ ] I can run real browser tests.
- [ ] A failed required test prevents normal publication.
- [ ] The system detects an invalid/stale target.
- [ ] The system detects a conflicting patch.
- [ ] I can publish a verified release.
- [ ] I can roll back and see the previous active patch set restored.
- [ ] The audit trail records real changes and releases.

### AI — optional final layer

- [ ] AI turns a bug description into a schema-valid draft patch.
- [ ] AI output is reviewed and validated before use.
- [ ] The generated patch uses the same preview and test pipeline.
- [ ] AI does not publish or execute arbitrary code by itself.
- [ ] The application remains usable if the AI service is unavailable.

### Demo and submission

- [ ] The demo works from a clean start.
- [ ] The complete story has been rehearsed twice.
- [ ] The architecture and limitations can be explained clearly.
- [ ] Implemented features are distinguished from simulations.
- [ ] Setup instructions and project documentation are up to date.

---

## Final Priority Rule

If the 24-hour clock becomes tight, use this order:

1. **Must protect:** working patch creation, isolated preview, actual verification, publish/rollback.
2. **Must demonstrate if feasible:** stale-target detection, conflict handling, audit trail.
3. **Add after the core works:** AI Hotfix Copilot.
4. **Only if time remains:** AI root-cause explanation, semantic recovery, advanced collaboration, and visual polish.

The desired result is not the largest feature list. It is one reliable, convincing story: **PATCHWORK safely changes an existing website, detects when a patch stops being valid, proves whether a proposed fix works, and restores a known-good state when it does not.**
