# 02: Client Drift Detection Engine and Stale Target Watermark

**What to build:** In-browser drift detection runtime in `@patchwork/runtime`. When applying patches (in production or isolated preview), if the primary CSS selector fails to resolve or matches multiple elements ambiguously, the runtime initiates fallback candidate scanning against the live DOM. If no candidate reaches confidence threshold (>= 0.60) or multiple candidates are ambiguous, flags patch status as `stale` and strictly avoids applying mutations to arbitrary elements. Surfaces a persistent Stale Target banner on the host page detailing the detected drift and proposed recovery candidates.

**Blocked by:** 01: Multi-Signal Target Fingerprint Extractor and Weighted Matcher

**Status:** closed
Completed: true

- [x] Detect target selector failure or multi-element selector ambiguity during patch resolution.
- [x] Execute fallback DOM scan using target fingerprint when selector resolution fails.
- [x] Enforce safety threshold: forbid applying mutations to ambiguous elements or candidates with score < 0.85.
- [x] Mark patch execution status as `stale` when target element has drifted or cannot be uniquely verified.
- [x] Render a non-intrusive floating Drift Warning Watermark on the page showing detected drift, confidence score, and best candidate element.
- [x] Expose drift analysis metrics to `window.__PATCHWORK_PREVIEW__` and runtime return objects.
- [x] Add automated tests asserting that shifted DOM IDs trigger stale status without corrupting adjacent elements.
