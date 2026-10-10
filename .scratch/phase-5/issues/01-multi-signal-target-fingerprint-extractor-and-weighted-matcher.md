# 01: Multi-Signal Target Fingerprint Extractor and Weighted Matcher

**What to build:** An enhanced multi-signal fingerprinting engine across `@patchwork/runtime` and `@patchwork/contracts`. Extracts and compares seven distinct signals for DOM elements: HTML tag, accessible role, accessible name, text content, stable attributes (such as `data-testid`), parent container context, and nearby sibling text. Provides a calibrated similarity scoring algorithm producing itemized score breakdowns and classification into confidence buckets: High Confidence (score >= 0.85 with clear margin), Review Required (0.60 to < 0.85), and Stale/Ambiguous (< 0.60).

**Blocked by:** None (can start immediately)

**Status:** closed
Completed: true

- [x] Extend TargetFingerprint model with sibling/nearby text context and stable attributes support.
- [x] Update visual inspector and element extractors to capture all seven fingerprint signals deterministically.
- [x] Implement weighted similarity scoring with calibrated weights (tag: 0.25, text: 0.25, role/accessible name: 0.20, stable attributes: 0.15, parent/sibling context: 0.15).
- [x] Implement candidate ranking returning scored candidate lists with signal match breakdowns.
- [x] Categorize candidates into confidence tiers: High Confidence (>= 0.85), Review Required (0.60-0.85), and Stale (< 0.60).
- [x] Add unit tests verifying fingerprint similarity scoring against simulated DOM element variations.
