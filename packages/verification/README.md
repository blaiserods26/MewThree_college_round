# @patchwork/verification

Automated browser verification runner powered by Playwright.

## Responsibilities (Phase 4)
- Launches headless browser at configured viewport (e.g. mobile 375x667, desktop 1280x800).
- Loads target page in preview mode (`?patchwork_preview=<patchId>`).
- Asserts visibility, computed style, text content, and interactive clickability.
- Captures assertion results and screenshot evidence.
- Transitions patch to `verified` on pass or `verification_failed` on failure.
