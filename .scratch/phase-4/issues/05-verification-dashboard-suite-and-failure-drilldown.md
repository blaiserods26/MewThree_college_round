# 05: Verification Dashboard Suite and Failure Drilldown

**What to build:** An interactive Verification panel and test suite in `@patchwork/dashboard`. Displays historical verification runs for any selected patch, detailed pass/fail status badges, an itemized list of assertions showing expected vs. actual values, captured browser console logs, side-by-side visual comparison (baseline vs. patched vs. diff mask), and a "Run Verification" trigger button. Includes a pre-configured demo test scenario with a deliberately failing patch to visually prove the release-blocking gate in action during presentations.

**Blocked by:** 03: Visual Regression Diff Engine and Viewport Evidence, 04: Automated Verification Gate and State Machine Enforcement

**Status:** ready-for-agent

- [x] Add a "Verification" section/tab in the dashboard patch detail view.
- [x] Display latest verification status badge (`verified` / `verification_failed`) with timestamp and run duration.
- [x] Render assertion list breakdown displaying status icons, selector targets, expected values, and actual values.
- [x] Render side-by-side baseline and patched visual comparison with toggleable diff highlighting.
- [x] Provide an interactive "Run Verification" button with real-time loading spinner and run log output.
- [x] Surface exact failure messages, blocking alerts, and prevent clicking "Add to Release" for unverified patches.
- [x] Add a demo button/scenario for a deliberately failing patch verifying that the gate blocks publishing with visible errors.
