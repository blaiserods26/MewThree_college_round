# PATCHWORK — Context & Domain Model

## System Overview

PATCHWORK is a platform for creating, validating, publishing, tracking, and rolling back targeted DOM patches on existing web applications without rebuilding or redeploying the underlying host application.

## Domain Glossary

- **Website**: The host target web application that integrates the PATCHWORK runtime via an injection script seam. Identified by a unique `websiteId`.
- **Target Fingerprint**: A deterministic multi-attribute locator for a DOM element (including tag name, accessibility role, accessible name, text content, stable attributes, parent context, and selector) that enables reliable identification and stale-target detection when host DOM structure shifts.
- **Patch**: A discrete, declared modification to a target element consisting of a fingerprint, an allowlisted operation, and lifecycle metadata.
- **Patch Version**: An immutable revision of a patch definition. Any edit to a patch creates a new version rather than mutating existing history.
- **Patch Operation**: A strictly constrained DOM manipulation instruction belonging to an allowlist (`style.set`, `text.set`, `attribute.set`, `element.hide`, `element.show`). Arbitrary JavaScript execution is forbidden.
- **Patch Status**: The lifecycle state of an individual patch (`draft`, `previewing`, `verified`, `published`, `verification_failed`, `stale`, `conflict`, `rolled_back`, `archived`).
- **Release**: An immutable, atomic snapshot bundle of active published patches deployed to a target website.
- **Release Status**: State of a release deployment (`active`, `superseded`, `rolled_back`).
- **Verification Run**: An automated browser execution (Playwright) evaluating a patch in preview against defined assertion criteria, capturing logs and visual screenshots before publication is permitted.
- **Stale Target**: A condition where a host website DOM change has broken a patch's selector or altered its fingerprint beyond confidence thresholds, preventing silent erroneous patching.
- **Patch Conflict**: A condition where two concurrent patches target the same element and modify the same attribute or property with divergent values.
- **Rollback**: An atomic deactivation of the active release that restores the immediately prior active release bundle.
- **Audit Event**: An immutable log record capturing every lifecycle change, actor, timestamp, and target entity IDs.
