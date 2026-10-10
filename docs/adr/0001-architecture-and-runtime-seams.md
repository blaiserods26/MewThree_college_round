# ADR 0001: Architecture, Runtime Seams, and Preview Isolation

## Status
Accepted

## Context
PATCHWORK needs to allow operators to inspect an existing web application (the demo storefront), create DOM patches, preview them without affecting visitors, verify them via automated tests, and publish or roll them back safely. The system must operate without requiring code changes to the underlying host repository beyond adding a lightweight runtime injection tag. Crucially, the platform must prevent malicious or accidental code execution (no arbitrary user scripts).

## Decision

### 1. Technology Stack
- **Dashboard & Inspector**: React, TypeScript, Vite. Provides the element inspector, patch editor, release manager, and audit log.
- **Demo Storefront**: React, TypeScript, Vite (or lightweight static HTML/TS). Represents the host website with an e-commerce checkout flow, promo banner, and toggleable layout drift.
- **Patch Runtime**: Pure TypeScript, zero-dependency browser script (`@patchwork/runtime`) injected into the storefront via `<script src="/patchwork.js" data-website-id="storefront-1"></script>`.
- **Browser Verification Runner**: Node.js + Headless Playwright (`@patchwork/verification`). Executes automated assertion runs against the storefront in preview mode.
- **Shared Contracts & State Machine**: TypeScript package (`@patchwork/contracts`). Defines all data interfaces, schemas, operation allowlists, transition validators, and rollback logic.

### 2. Patch Injection Seam
The host application includes a single injection tag:
```html
<script 
  src="http://localhost:5173/patchwork.js" 
  data-website-id="demo-store"
  async
></script>
```
On initialization:
1. The runtime reads `data-website-id` and checks the query string for `patchwork_preview`.
2. In production mode (no preview token):
   - Runtime fetches the currently active release bundle via `GET /api/websites/{id}/active-release`.
   - Patches within the active release are applied sequentially based on their defined ordering.
3. In preview mode (`?patchwork_preview=<patchId>` or `?patchwork_preview_bundle=<json>`):
   - Runtime fetches the specific draft patch or preview bundle.
   - Production patches are suspended or overlaid according to preview config.
   - An overlay watermark/badge ("PATCHWORK PREVIEW MODE") is rendered on the viewport.

### 3. Preview Isolation Mechanics
To guarantee draft changes never leak into the published production view:
- **No Shared Mutation**: The backend serves draft patches strictly through authenticated preview endpoints (`GET /api/patches/{id}/preview`).
- **Scoped Query Param / PostMessage**: The preview environment is activated exclusively via URL query parameter (`?patchwork_preview=<id>`) or parent-to-iframe `postMessage` protocol when embedded in the dashboard.
- **Cache-Control**: Preview endpoints return `Cache-Control: no-store, private` preventing browser or CDN caching.
- **Stateless Application**: Previews do not alter database release pointers; release tables are strictly updated only during an explicit `publish` event.

### 4. Strict Operation Allowlist (No Arbitrary Scripts)
To guarantee security and stability, PATCHWORK explicitly disallows arbitrary user JavaScript (`eval`, Function constructors, `<script>` tags, inline `on*` event handlers). Only the following allowlisted operations are supported:

| Operation Type | Permitted Parameters | Description |
|---|---|---|
| `style.set` | `property` (allowlisted CSS property), `value` (sanitized CSS value) | Applies a style declaration to the target element's style property. |
| `text.set` | `value` (plain string) | Updates the element's `textContent` (never `innerHTML`). |
| `attribute.set` | `name` (allowlisted attribute), `value` (string) | Sets a safe attribute (`aria-*`, `title`, `alt`, `disabled`, `placeholder`, `data-*`). |
| `element.hide` | none | Equivalent to setting `display: none` and `aria-hidden: true`. |
| `element.show` | `display` (optional CSS display value, default `inline-flex` or `block`) | Restores element visibility and removes `aria-hidden`. |

Disallowed CSS properties: `behavior`, `-moz-binding`, CSS expressions (`expression(...)`).
Disallowed attributes: `onclick`, `onload`, `onerror`, `srcdoc`, `javascript:*` URLs.

### 5. Playwright Verification Runner Interface
The verification worker exposes a deterministic execution interface:
```typescript
interface VerificationRequest {
  patchId: string;
  websiteUrl: string;
  viewport: { width: number; height: number };
  assertions: VerificationAssertion[];
  timeoutMs?: number;
}

interface VerificationAssertion {
  id: string;
  description: string;
  selector: string;
  expectedState: 'visible' | 'hidden' | 'text-matches' | 'interactive';
  expectedValue?: string;
}

interface VerificationResult {
  runId: string;
  patchId: string;
  status: 'passed' | 'failed';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  assertionResults: Array<{
    assertionId: string;
    passed: boolean;
    actualValue?: string;
    errorMessage?: string;
  }>;
  screenshotBase64?: string;
}
```

The runner:
1. Launches headless Chromium with the specified viewport.
2. Navigates to `${websiteUrl}?patchwork_preview=${patchId}`.
3. Waits for network idle and the runtime injection confirmation.
4. Evaluates each assertion in sequence.
5. Captures a full-page or element screenshot.
6. Returns the structured `VerificationResult`.
7. Persists the result to the verification records table.

## Consequences
- **Positive**: Strict allowlists prevent arbitrary script attacks and ensure deterministic reversibility.
- **Positive**: Isolated preview parameters ensure high-fidelity testing without production side effects.
- **Trade-off**: Complex behavior changes requiring custom logic cannot be performed via patches without adding structured operation types.
