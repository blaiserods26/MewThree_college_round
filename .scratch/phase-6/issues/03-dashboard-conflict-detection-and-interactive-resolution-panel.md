# 03: Dashboard Conflict Detection and Interactive Resolution Panel

**What to build:** An interactive conflict detection and resolution interface in `@patchwork/dashboard`. Displays a prominent warning card when a selected patch has conflicts with existing or proposed patches. Visualizes the conflict side-by-side (showing target selector, conflicting operation types, and colliding values such as Emerald Green `#10b981` vs Crimson Red `#ef4444`). Provides one-click resolution actions to choose the winning patch, revise values inline, or discard the conflicting patch. Strictly blocks adding patches with unresolved `conflict` status to production releases.

**Blocked by:** 01: Deterministic Multi-Patch Conflict Detection Engine, 02: Conflict Resolution Workflow and Audit Logging API

**Status:** closed

- [x] Render a dedicated Conflict Detected warning panel in patch detail view when the patch has overlapping conflicts.
- [x] Display side-by-side comparison table showing original patch vs conflicting patch operations, properties, and values.
- [x] Render interactive resolution controls: "Keep This Patch", "Keep Competing Patch", "Revise Value", and "Discard".
- [x] Invoke `POST /api/patches/:id/resolve-conflict` upon developer confirmation and refresh patch state seamlessly.
- [x] Render a success confirmation banner prompting the developer to re-run automated verification on the resolved patch.
- [x] Disable release publication actions and show a blocked warning if any patch in the release selection has status `conflict`.
