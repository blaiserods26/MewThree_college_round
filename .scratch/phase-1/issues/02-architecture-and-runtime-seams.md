# 02: Architecture and Runtime Seams Specification

**What to build:** Architecture decision defining the core system boundaries and technology choices. Specifies how the target website loads active patches, how Preview mode isolates draft patches without affecting the published website, the strict allowlist of permitted patch operations (`style.set`, `text.set`, `attribute.set`, `element.hide`, `element.show`), and the verification execution model using headless Playwright.

**Blocked by:** 01: Lock Demo Scenarios and Success Criteria

**Status:** ready-for-agent

- [x] Specify tech stack selections for the dashboard, patch runtime, demo storefront, and test runner.
- [x] Define the patch injection seam (how the target website loads and applies patches from the PATCHWORK runtime).
- [x] Define preview isolation mechanics so draft changes never leak into the published production view.
- [x] Document the strict allowlist of operations and explicitly forbid arbitrary script execution.
- [x] Outline the Playwright verification runner interface and reporting format.
