# 02: Playwright Verification Worker Service and Execution API

**What to build:** An automated headless browser verification engine package (`@patchwork/verification`) driven by Playwright, integrated with the backend API (`@patchwork/server`). Adds an endpoint `POST /api/patches/:id/verify` that launches an isolated browser context, loads the storefront with the target patch in preview mode across standard viewports (desktop 1280x800 and mobile 375x667), evaluates assertions (element uniqueness, computed style values, text content, accessibility role, and clickability), captures browser console errors/exceptions, and records execution metrics.

**Blocked by:** 01: Preview Mode Isolation and Visual Comparison Bar

**Status:** ready-for-agent

- [x] Create `@patchwork/verification` worker package wrapping Playwright headless runner.
- [x] Implement multi-viewport execution support for Desktop (1280x800) and Mobile (375x667).
- [x] Implement core verification assertions: target existence, uniqueness (no multi-match ambiguity), applied computed style/text/attribute, element visibility, and interaction/clickability.
- [x] Capture browser console errors, unhandled exceptions, network errors, and test execution duration in milliseconds.
- [x] Expose `POST /api/patches/:id/verify` and `GET /api/patches/:id/verifications` on `@patchwork/server`.
- [x] Persist `VerificationRun` records with assertion results, status, timestamp, and duration in the memory store.
- [x] Write integration tests verifying headless execution against the demo storefront.
