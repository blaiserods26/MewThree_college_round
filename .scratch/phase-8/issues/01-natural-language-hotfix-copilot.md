# 01: Natural-Language Hotfix Copilot

**What to build:** An operator describes a visual bug or desired hotfix in plain English (e.g., "The checkout button is invisible on mobile. Restore it without changing desktop layout") inside the dashboard, optionally with an element captured via the visual inspector. A server-side LLM provider adapter (with offline mock fallback so the demo and test suite require zero API keys) analyzes the request and generates a structured patch proposal adhering to the schema and operation allowlist. The server strictly validates the proposed target fingerprint and operation, rejecting any disallowed operations. The dashboard presents an AI Proposal review modal displaying the model's rationale, assumptions, and proposed diff, allows the operator to edit any fields manually, and saves the proposal as a standard draft patch. The patch enters the regular lifecycle and must pass isolated preview and automated browser verification before publication.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Natural-language prompt input and "Generate AI Hotfix" action integrated into the dashboard.
- [x] Server endpoint `POST /api/ai/generate-patch` accepts user description, optional element context, and website ID.
- [x] Pluggable LLM provider adapter supports mock/deterministic responses and live API integration via environment configuration.
- [x] Server validates the proposed operation against the existing allowlist (`style.set`, `text.set`, `attribute.set`, `element.hide`, `element.show`) and schema, rejecting unallowed actions.
- [x] Dashboard displays an interactive proposal modal showing explanation, assumptions, and diff preview, with manual-edit affordances.
- [x] Accepting the proposal creates a standard `draft` patch with `audit` trail recording AI generation metadata.
- [x] Generated patches seamlessly flow into the existing isolated preview and Playwright verification pipeline.
- [x] Automated tests cover valid generation, operation allowlist rejection, manual edit override, and offline fallback.
