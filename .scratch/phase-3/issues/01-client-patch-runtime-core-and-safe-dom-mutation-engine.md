# 01: Client Patch Runtime Core and Safe DOM Mutation Engine

**What to build:** The core zero-dependency DOM runtime script (`@patchwork/runtime`) injected into host web pages. Locates target elements by selector and fingerprint heuristics, validates operations against the `@patchwork/contracts` allowlist, confirms element uniqueness, captures original DOM states for safe reversal, applies patches deterministically in sequence, and outputs structured execution statuses (`applied`, `skipped`, `stale`, `failed`).

**Blocked by:** None (can start immediately, builds on `@patchwork/contracts`)

**Status:** ready-for-agent

- [ ] Implement DOM element resolution using primary selector and fallback fingerprint attributes.
- [ ] Implement strict operation validation against allowlist (`style.set`, `text.set`, `attribute.set`, `element.hide`, `element.show`).
- [ ] Implement uniqueness verification to prevent applying patches to ambiguous multi-element matches.
- [ ] Record original element state prior to mutation to enable clean, deterministic reversals.
- [ ] Apply patches in deterministic order and emit structured event logs (`applied`, `skipped`, `stale`, `failed`).
- [ ] Add automated unit tests verifying safe mutation application, reversibility, and forbidden operation rejection.
