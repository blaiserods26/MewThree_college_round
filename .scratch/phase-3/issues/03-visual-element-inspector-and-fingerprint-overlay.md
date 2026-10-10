# 03: Visual Element Inspector and Fingerprint Overlay

**What to build:** An in-page visual element inspector overlay tool for the host demo storefront. When inspector mode is enabled, mouse movement highlights elements with an interactive outline box and displays a hover tooltip showing tag name, accessibility role, accessible name, text snippet, and computed unique selector. Clicking an element confirms the selection and generates a structured `TargetFingerprint` while guarding against selecting ambiguous top-level containers (`<body>`, large wrappers).

**Blocked by:** None (can start immediately in parallel)

**Status:** ready-for-agent

- [ ] Implement toggleable inspector overlay mode on the storefront page.
- [ ] Render element highlight box following the pointer across interactive DOM elements.
- [ ] Display an informative floating badge with `<tag>`, role, text, and computed selector.
- [ ] Guard against accidental selection of ambiguous container elements (`body`, `main`, `.catalog-grid`).
- [ ] Compute and export a canonical `TargetFingerprint` object on element selection.
- [ ] Add unit tests verifying fingerprint extraction and selector generation.
