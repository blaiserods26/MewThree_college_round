# 02: AI-Assisted Root-Cause Explanation for Verification Failures

**What to build:** When automated Playwright verification fails for a patch (due to assertion failure, visual regression diff exceeding threshold, target selector missing, or browser console exceptions), the dashboard verification drilldown panel offers an "Explain Failure with AI" action. The server aggregates the verified patch details, actual failed assertions, duration, and error output, sanitizes any sensitive context, and prompts the LLM provider for a root-cause explanation. The dashboard renders a structured failure explanation card that explicitly separates observed facts from hypotheses and provides recommended next debugging actions alongside the failing test output. The feature gracefully degrades with helpful messaging when offline or when the LLM service is unreachable.

**Blocked by:** 01: Natural-Language Hotfix Copilot

**Status:** closed

- [x] "Explain Failure with AI" trigger available in dashboard verification drilldown for failed runs.
- [x] Server endpoint `POST /api/ai/explain-verification` accepts verification run ID and patch context.
- [x] Sanitization ensures no credentials, tokens, or extraneous data are transmitted to the model.
- [x] LLM provider produces structured diagnosis separating observed facts from speculative hypotheses.
- [x] Dashboard displays an explanation panel alongside the actual failed assertion with actionable next steps.
- [x] Graceful fallback and user-friendly error surfacing if the AI service fails or is offline.
- [x] Automated tests validate diagnostic prompt generation, response parsing, and UI rendering.
