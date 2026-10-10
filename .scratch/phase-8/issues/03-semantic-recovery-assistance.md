# 03: Semantic Recovery Assistance for Ambiguous Target Drift

**What to build:** When DOM drift detection identifies multiple plausible candidate elements for a stale patch (or when candidates fall into the `review_required` confidence tier), the operator can trigger AI-assisted semantic disambiguation. The server passes the candidate element structures, contextual hints, and the patch's intended mutation to the LLM adapter. The model compares candidate semantic roles, surrounding hierarchy, and textual content to rank the candidates and provide an explanatory recommendation. The dashboard Target Rebind panel highlights the recommended candidate with reasoning and confidence explanation, but strictly enforces manual operator confirmation before rebinding. Once rebound, the patch resets to `previewing` and must pass full automated browser verification before publication is permitted.

**Blocked by:** 01: Natural-Language Hotfix Copilot

**Status:** closed

- [x] "Analyze Candidates with AI" affordance in the dashboard Target Rebind panel when ambiguous drift candidates exist.
- [x] Server endpoint `POST /api/ai/disambiguate-target` accepts patch ID and candidate fingerprints.
- [x] LLM evaluates candidate hierarchy and role context, returning ranked recommendations with rationale.
- [x] Dashboard displays AI recommendations with confidence badges and reasoning beside candidate options.
- [x] Model confidence statement is never treated as auto-rebind; human operator must explicitly click to confirm rebind.
- [x] Rebound target resets status to `previewing` and triggers the versioned migration audit event.
- [x] Rebound patch remains gated until Playwright verification passes against the new selector.
- [x] Automated tests cover candidate ranking, manual confirmation enforcement, and offline fallback.
