# 04: Visual Inspector to Dashboard Bridge and Authoring

**What to build:** Seamless communication between the in-page visual inspector and the PATCHWORK operator dashboard. Clicking an element in the inspector automatically bridges the captured `TargetFingerprint` to the dashboard patch authoring drawer (via `postMessage` protocol or embedded preview). Allows the operator to pick an allowlisted operation (`style.set`, `text.set`, `attribute.set`, `element.hide`, `element.show`), view computed before/after previews, and save as a new patch draft in the backend.

**Blocked by:** 03: Visual Element Inspector and Fingerprint Overlay

**Status:** ready-for-agent

- [x] Implement secure `postMessage` communication bridge between storefront and dashboard.
- [x] Automatically populate the patch creation form in the dashboard when an element is picked in the inspector.
- [x] Provide interactive operation authoring UI for all allowlisted mutation types.
- [x] Display computed before/after values to let operators verify the modification.
- [x] Save the completed draft patch to `POST /api/patches` and refresh the patch explorer.
