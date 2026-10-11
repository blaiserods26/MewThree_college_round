# Spec: Gemini-3.5-Flash-Lite Natural Language Hotfix Copilot & Extended DOM Mutation Operations

## Problem Statement

Currently, PATCHWORK operators looking to remediate front-end defects or make quick customer-facing adjustments rely either on manual element inspection and CSS property manipulation, or on a simple offline heuristic mock provider. Operators cannot leverage modern large language models like Google's `gemini-3.5-flash-lite` to interpret nuanced natural language requests into production-grade hotfixes.

Furthermore, PATCHWORK's existing Patch Operation allowlist is restricted to basic styling (`style.set`), text replacement (`text.set`), attribute adjustments (`attribute.set`), and visibility toggling (`element.hide` / `element.show`). Operators are unable to fulfill common operational requirements through natural language prompts, such as:
1. **Adding new DOM elements**: Inserting urgent promotional banners, notification badges, accessibility disclaimers, or action buttons.
2. **Deleting DOM elements**: Completely removing obsolete, broken, or offending DOM elements rather than solely hiding them with CSS.
3. **Comprehensive property changes**: Flexibly modifying styles, attributes, and text through conversational multi-intent prompts.

Without native integration with `gemini-3.5-flash-lite` and an extended, strictly guarded DOM mutation vocabulary (`element.insert`, `element.remove`), operators are forced to perform manual code deploys for simple structural page modifications, undermining the core value proposition of zero-downtime hotfixing.

## Solution

This specification introduces:

1. **Gemini 3.5 Flash Lite Provider Integration**:
   - A dedicated `gemini-3.5-flash-lite` provider integration connecting to the Google Gemini API with fallback to the deterministic offline mock provider when no API key is configured.
   - Structured JSON schema generation enforcing deterministic outputs conforming to PATCHWORK's `GeneratedPatchProposal` contracts.
   - Intelligent multi-intent parsing that translates conversational prompts (e.g., *"Insert a high-urgency announcement banner above the navigation bar"*, *"Delete the broken promotional popup"*, *"Make the primary checkout button emerald green with 18px font"*) into atomic, allowlisted patch operations.

2. **Extended DOM Operation Vocabulary (`element.insert` and `element.remove`)**:
   - `element.insert`: Safely injects new child or sibling elements at a specified position relative to a target element (`append`, `prepend`, `before`, `after`) using an allowlisted set of safe semantic tags and sanitized attributes, with zero arbitrary script execution.
   - `element.remove`: Completely detaches the target element from the DOM tree while recording full snapshot metadata (parent node, sibling index, element clone) so that rollback or preview deactivation cleanly restores the element in its exact original position.
   - Expansion of `style.set` and `attribute.set` validation to support modern responsive and typography properties requested by language models.

3. **Conversational Prompting Experience in the Studio Workbench**:
   - Seamless prompting directly within the Visual Hotfix Studio and Operator Dashboard, allowing operators to prompt either globally with page context or scoped to an element selected with the Visual Inspector.
   - Instant live preview inside the sandboxed preview iframe, automated Playwright verification assertion generation, and single-click acceptance into the patch lifecycle pipeline (`draft` -> `previewing` -> `verified` -> `published`).

## User Stories

1. As an operator, I want to configure `AI_PROVIDER=gemini` and `GEMINI_MODEL=gemini-3.5-flash-lite` via environment configuration, so that PATCHWORK connects to Google's fast and lightweight Gemini model for hotfix synthesis.
2. As an operator, I want the system to fall back gracefully to the deterministic mock provider if `GEMINI_API_KEY` is absent or the Gemini API is unreachable, so that local development and offline environments never crash.
3. As an operator, I want to type natural language prompts such as "Add a flash sale banner above the header" and receive a valid `element.insert` patch proposal, so that I can introduce new UI components without waiting for engineering release cycles.
4. As an operator, I want to prompt "Delete the seasonal holiday badge from the product card" and receive an `element.remove` patch proposal, so that I can eliminate outdated or broken DOM nodes permanently from user view.
5. As an operator, I want to prompt "Change the button background to deep purple and increase font size to 18px" and receive structured property modification proposals, so that I can rapidly fix visual defects.
6. As an operator, I want the Gemini model to receive target element fingerprint context (tag, role, accessible name, classes, text) when an element is active in the Visual Inspector, so that generated proposals accurately target the intended node.
7. As an operator, I want to prompt without selecting an element and have Gemini infer the appropriate target selector from page structure and domain intent, so that I can make page-level changes rapidly.
8. As a security engineer, I want all proposals generated by `gemini-3.5-flash-lite` to pass through strict schema validation and security allowlists, so that untrusted LLM outputs can never inject `<script>` tags, inline `on*` event handlers, or dangerous CSS expressions.
9. As an operator, I want `element.insert` operations to restrict allowed tags to safe HTML elements (such as `div`, `span`, `p`, `a`, `button`, `section`, `header`, `footer`, `aside`, `h1`-`h6`, `img`, `ul`, `ol`, `li`), so that potentially dangerous elements like `script`, `iframe`, `object`, or `embed` are unconditionally rejected.
10. As an operator, I want `element.insert` operations to support insertion positions (`before`, `after`, `prepend`, `append`), so that new components can be placed precisely relative to anchor elements.
11. As a store operator, I want to preview inserted elements in the sandboxed preview iframe immediately after AI generation, so that I can visually inspect typography, spacing, and responsive behavior.
12. As a store operator, I want to preview deleted elements in the sandboxed preview iframe, so that I can verify that removing an element does not cause adjacent layout collapse.
13. As an auditor, I want every AI-generated patch to record the originating prompt, provider (`gemini-3.5-flash-lite`), model version, and confidence score in the immutable audit event log, so that all AI-assisted changes are fully traceable.
14. As a QA engineer, I want automated Playwright verification runs to evaluate newly inserted elements (verifying existence, text content, and visibility) before publication is permitted, so that broken elements are never deployed to production.
15. As a QA engineer, I want automated Playwright verification runs to evaluate deleted elements (verifying absence or hidden state) before publication is permitted, so that element deletion is verified automatically.
16. As an operator, I want atomic rollback of a release containing `element.insert` patches to cleanly remove the inserted elements from the live storefront without leaving orphan nodes.
17. As an operator, I want atomic rollback of a release containing `element.remove` patches to restore the deleted elements to their exact original DOM tree position and hierarchy.
18. As an operator, I want the AI provider to provide clear explanations and assumptions alongside each patch proposal, so that human reviewers understand why specific selectors and operations were chosen.
19. As an operator, I want the AI provider to power verification failure root-cause analysis, explaining why an assertion failed on an inserted or deleted element and suggesting remediation steps.
20. As an operator, I want the AI provider to assist in target disambiguation when host DOM drift occurs, ranking candidate elements with confidence scores and rationale.
21. As an operator, I want the Studio Workbench to display a dedicated Gemini AI Prompt Copilot input with suggested prompt chips (e.g., "Add Announcement Banner", "Delete Element", "Fix Mobile Padding"), so that authoring is fast and intuitive.
22. As a developer, I want the hotfix-to-PR reconciliation bridge to support translating `element.insert` and `element.remove` operations into template or markup diffs, so that structural hotfixes can be permanently backported to the source repository.

## Implementation Decisions

### 1. Unified AI Service Seam & Gemini Provider Module
- A dedicated Gemini AI Provider will implement the existing `AiProvider` interface alongside `MockAiProvider`.
- The provider will query Google's Gemini API utilizing the `gemini-3.5-flash-lite` model identifier.
- Model generation will use structured JSON output enforcement (`responseMimeType: "application/json"` with schema constraints) ensuring generated proposals conform to `GeneratedPatchProposal`.
- The provider will be governed by environment settings: `AI_PROVIDER` (`gemini` or `mock`), `GEMINI_API_KEY`, and `GEMINI_MODEL` (defaulting to `gemini-3.5-flash-lite`).
- If `GEMINI_API_KEY` is not present, the system defaults cleanly to `MockAiProvider` with informational logging, ensuring zero disruptions for developer workflows without external credentials.

### 2. Expanded Patch Operation Schemas
The shared contracts package will expand `PatchOperationType` and allowlisted operations:

```typescript
// Prototype schema definitions
export type PatchOperationType =
  | "style.set"
  | "text.set"
  | "attribute.set"
  | "element.hide"
  | "element.show"
  | "element.insert"
  | "element.remove";

export interface ElementInsertOperation {
  type: "element.insert";
  position: "append" | "prepend" | "before" | "after";
  tag: string;
  htmlContent?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  style?: Record<string, string>;
}

export interface ElementRemoveOperation {
  type: "element.remove";
}
```

- **Validation Rules for `element.insert`**:
  - `tag` must belong to a strict safe tag allowlist (`div`, `span`, `p`, `a`, `button`, `h1`-`h6`, `section`, `article`, `header`, `footer`, `aside`, `img`, `ul`, `ol`, `li`, `label`, `input`, `small`, `strong`, `em`, `badge`).
  - Dangerous tags (`script`, `style`, `iframe`, `object`, `embed`, `form`, `svg`) are forbidden.
  - Attributes must be sanitized against standard allowlists (`class`, `id`, `title`, `alt`, `role`, `aria-*`, `data-*`, `href`, `src`, `placeholder`).
  - All URLs (`href`, `src`) must be strictly sanitized (rejecting `javascript:`, `data:`, `vbscript:` schemes).
  - Inline style objects are validated against `ALLOWED_STYLE_PROPERTIES`.
  - Content is inserted using safe DOM element construction or sanitized fragments.

- **Validation Rules for `element.remove`**:
  - Target selector cannot be `body`, `html`, or `head`.
  - Target element must be a uniquely resolvable node within the document body.

### 3. DOM Runtime Mutation and Reversible State Capture
- In `@patchwork/runtime`, `applyPatchToDom` will support:
  - `element.insert`: Constructs the new element, applies sanitized styles and attributes, injects it relative to the target element based on `position`, marks it with a internal runtime attribute (`data-patchwork-inserted="<patchId>"`), and records the inserted node reference for reversal.
  - `element.remove`: Records the target's parent node, next sibling reference, and an exact detached element clone in `OriginalElementState`, then removes the element from its parent.
- In `@patchwork/runtime`, `revertPatchFromDom` will support:
  - Reverting `element.insert`: Removes the inserted DOM node cleanly from the document.
  - Reverting `element.remove`: Re-inserts the saved element clone at its exact original parent and sibling index.

### 4. Playwright Verification Gate Enhancements
- Verification assertions will support verifying that inserted elements exist and match expected tag and text values (`expectedState: 'visible'`).
- Verification assertions will support verifying that deleted elements no longer exist or are absent (`expectedState: 'hidden'`).
- Screenshot diffing and console error detection will automatically run on both inserted and removed element patches.

### 5. Operator Dashboard Natural Language Interface
- The `AiHotfixModal` and Studio Workbench header will feature an enhanced natural language prompt bar with model indicator badge (`Gemini 3.5 Flash Lite`).
- Quick prompt templates will include:
  - "Insert Banner": Creates an `element.insert` patch above/below a target container.
  - "Delete Element": Creates an `element.remove` patch for the selected element.
  - "Update Styles": Modifies colors, typography, or spacing via `style.set`.
  - "Fix Mobile Layout": Restores display or adjusts widths for mobile screens.
- Generated proposals will display operation type, target selector, security validation status, and one-click preview and save actions.

## Testing Decisions

### What Makes a Good Test
- Tests must verify external behavior at the highest possible architectural seams: HTTP API boundaries and DOM runtime boundaries.
- Tests will not assert on private LLM prompt string concatenations or internal SDK request payloads; instead, they will verify that sending natural language requests produces valid, allowlisted, reversible patch proposals and that applying those proposals alters the DOM correctly and reversibly.

### Modules Tested
1. **Contracts Package (`@patchwork/contracts`)**:
   - Validation tests for `element.insert` and `element.remove`.
   - Security gate tests ensuring disallowed tags (e.g., `<script>`), inline handlers, and dangerous attributes are rejected.
2. **Runtime Package (`@patchwork/runtime`)**:
   - Execution tests verifying that `applyPatchToDom` correctly inserts new elements into the DOM at `append`, `prepend`, `before`, and `after` positions.
   - Execution tests verifying that `applyPatchToDom` removes elements on `element.remove`.
   - Reversion tests verifying that `revertPatchFromDom` completely removes inserted elements and perfectly restores removed elements to their original hierarchy.
3. **Server AI & API Seam (`@patchwork/server`)**:
   - API test for `POST /api/ai/generate-patch` asserting structured proposal generation.
   - Provider test for `GeminiAiProvider` with mocked Google API responses asserting transformation into validated proposals.
   - Fallback test verifying that when Gemini API is unavailable or unconfigured, the system falls back safely without HTTP 500 errors.
4. **Lifecycle & Verification Seam (`@patchwork/verification`)**:
   - Verification runs asserting that inserted and removed elements pass Playwright test gates before publication.

### Prior Art
- Existing test suites:
  - `packages/contracts/test/operations.test.ts`
  - `packages/runtime/test/mutation.test.ts`
  - `packages/server/test/ai-service.test.ts`
  - `packages/server/test/ai-guardrails.test.ts`
  - `packages/server/test/ai-lifecycle-e2e.test.ts`

## Out of Scope

- Arbitrary client-side JavaScript execution, execution of third-party script bundles, or unconstrained HTML templates containing executable scripts.
- Replacement of Playwright automated verification gates with probabilistic AI-only judgment; all AI proposals must continue to pass deterministic browser assertion gates before publication.
- Complex multi-step database transactions outside the existing PATCHWORK patch and release lifecycle model.
- Dynamic fine-tuning of Gemini models on proprietary storefront data.

## Further Notes

- In environments where Google Gemini API access is restricted by network firewalls or lacking credentials, the platform transparently operates in heuristic mode using `MockAiProvider`, maintaining 100% test suite and local workbench functionality.
- The `element.insert` and `element.remove` operations preserve PATCHWORK's core invariant: every mutation is strictly reversible, atomic, and auditable.
