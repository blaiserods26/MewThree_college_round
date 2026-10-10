# 02: Architecture Diagrams and Technical Explanation

**What to build:** Comprehensive technical documentation and visual architecture diagrams explaining the complete PATCHWORK design for evaluators. Detail the 4 core architectural pillars: (1) Client-side injection and target fingerprinting engine, (2) Playwright browser verification release gate, (3) Atomic release bundles, collision detection, and instant rollback engine, and (4) AI Hotfix Copilot proposal boundary. Clearly articulate the safety thesis: AI is an untrusted proposal generator, while deterministic verification and release gates enforce 100% production safety.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] High-level system architecture diagram (Mermaid) documenting data flow between Storefront Runtime, API Server, Playwright Worker, Dashboard, and AI Provider.
- [x] Multi-signal Target Fingerprinting diagram detailing DOM drift recovery scoring, confidence tiers, and manual rebind protocol.
- [x] State Machine diagram documenting the formal Patch and Release lifecycle transitions (`draft` -> `previewing` -> `verified` -> `published` / `stale` / `conflict` / `rolled_back`).
- [x] Deterministic Safety & Conflict Detection specification documenting collision rules (`targetSelector` + `operation.property`) and release gate invariants.
- [x] AI Copilot safety boundary documentation explaining schema validation, operation allowlist restrictions, and prohibition of arbitrary script execution.
- [x] Published documentation stored under `docs/architecture/` with cross-links from the root documentation.
