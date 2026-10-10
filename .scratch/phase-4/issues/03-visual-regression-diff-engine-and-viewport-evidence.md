# 03: Visual Regression Diff Engine and Viewport Evidence

**What to build:** Dual-capture screenshot and visual diffing pipeline within `@patchwork/verification`. Captures synchronized baseline screenshots (pre-patch) and patched screenshots at identical viewport dimensions, executes a pixel-level comparison with configurable tolerance thresholds, generates visual difference metrics and base64 diff masks, and associates visual evidence with the corresponding `VerificationRun`.

**Blocked by:** 02: Playwright Verification Worker Service and Execution API

**Status:** ready-for-agent

- [x] Capture baseline viewport screenshot before patch application at fixed dimensions (desktop and mobile).
- [x] Capture patched viewport screenshot after patch application at identical viewport coordinates.
- [x] Implement pixel comparison diff generator producing mismatch pixel counts and percentage diff score.
- [x] Set noise-tolerant threshold heuristics to prevent font-rendering micro-flakiness from failing builds.
- [x] Store baseline, patched, and diff screenshot artifacts (or base64 payloads) in the `VerificationRun` record.
- [x] Add automated tests asserting diff generation on contrasting DOM state snapshots.
