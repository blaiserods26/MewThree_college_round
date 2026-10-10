# PATCHWORK

> **Visual Hotfix Workbench, Proof-Carrying Patches, Multi-Signal Drift Recovery, and Playwright Verification Gate for Production Web Applications.**
> *Safely fix live frontend regressions in seconds without CI/CD redeployments, vendor code rebuilds, or release risk.*

---

## What is PATCHWORK?

Frontend teams face a critical dilemma when revenue-impacting regressions strike (e.g. checkout buttons clipping on mobile, broken banners, or layout shifts): a standard CI/CD deployment pipeline requires 30–60 minutes of code reviews, test suites, and container builds.

**PATCHWORK** solves this with an out-of-band visual hotfix and release governance platform:

1. **Canvas-First Visual Hotfix Studio**: Live embedded website canvas with direct element selection crosshair, instant isolated preview, and responsive viewport switching (**1280px Desktop**, **768px Tablet**, **375px Mobile**, **Auto Fill**).
2. **Proof-Carrying Patches**: Every patch version records an immutable evidence record capturing target fingerprints, verification run IDs, cross-viewport Playwright assertions, visual pixel-diff percentages, and readiness decisions.
3. **Multi-Signal Target Fingerprinting**: Semantic multi-attribute element matcher (`tag`, `text`, `role`, `ariaLabel`, `context`, stable attributes) that survives HTML updates and DOM structural drift.
4. **Allowlisted Mutations**: Strict operation schemas (`style.set`, `text.set`, `attribute.set`, `element.hide`, `class.add`, `class.remove`). Arbitrary script execution is strictly prevented.
5. **Automated Playwright Release Gate**: Headless dual-viewport (Desktop & Mobile) browser verification tests element uniqueness, visibility, computed CSS, console exceptions, and visual regressions before any patch can be released.
6. **Deterministic Multi-Patch Conflict Engine**: Automatically catches property collisions when multiple operators modify the same element and provides guided resolution workflows (*Keep This*, *Keep Competing*, *Revise Value*).
7. **Post-Release Patch Health Monitor**: Continuous diagnostics verifying target presence, active mutation application, and release integrity with automated drift detection and rollback recommendations.
8. **Instant 1-Click Atomic Rollback**: Revert production storefronts to the prior release or unpatched baseline in milliseconds without redeployment.
9. **AI Hotfix Copilot**: Operators describe defects in plain English. The AI synthesizes structured, allowlisted mutations that are strictly treated as untrusted drafts and must pass through the mandatory Playwright verification gate.

---

## System Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │  Visual Hotfix Workbench (React 19 / Vite)    │
                    │  Canvas · Inspector · Evidence · Health · Cmd │
                    └───────────────────────┬───────────────────────┘
                                            │ HTTP REST API (4000)
                                            ▼
┌───────────────────────┐         ┌─────────────────────────┐         ┌─────────────────────────┐
│ AI Patch Reviewer     │◄────────┤ API Server (Node.js)    ├────────►│ Playwright Worker       │
│ Heuristic / LLM       │         │ State Machine & Engine  │         │ Desktop & Mobile Gate   │
└───────────────────────┘         └────────────┬────────────┘         └─────────────────────────┘
                                               │ Active Release Bundle
                                               ▼
                                  ┌─────────────────────────┐
                                  │ Client Runtime Injection│
                                  │ AeroStyle Storefront DOM│
                                  │ (Port 3000)             │
                                  └─────────────────────────┘
```

---

## Monorepo Layout

| Workspace / Package | Description |
|---|---|
| [`@patchwork/dashboard`](packages/dashboard) | Modern React 19 + TypeScript + Vite Visual Hotfix Workbench with canvas editor, contextual inspector, proof drawer, patch explorer, releases, and health monitor |
| [`@patchwork/contracts`](packages/contracts) | Shared TypeScript domain schemas, operation allowlists, lifecycle state machine, blast-radius risk models, and evidence contracts |
| [`@patchwork/runtime`](packages/runtime) | Client-side injection engine, multi-signal DOM matcher, mutation applicator, and two-way iframe postMessage bridge |
| [`@patchwork/server`](packages/server) | Native Node.js HTTP server, atomic JSON persistence, conflict engine, AI copilot provider, and release orchestrator |
| [`@patchwork/verification`](packages/verification) | Headless Playwright worker, dual-viewport harness (Desktop & Mobile), and pixel-diff visual regression comparator |
| [`packages/storefront`](packages/storefront) | Reference e-commerce demo storefront (AeroStyle Collective) with checkout flow and DOM drift simulation dev controls |

---

## Quickstart (Clean Clone)

### Prerequisites
- **Node.js**: v20+ (tested on Node v24.x)
- **npm**: v10+ (tested on npm 11.x)
- **Chromium**: installed automatically via Playwright (`npx playwright install chromium`)
- *No Bun or external database installation required.*

### 1. Installation & Build
```bash
git clone https://github.com/blaiserods26/MewThree_college_round.git
cd MewThree_college_round
git checkout daksh

npm install
npx playwright install chromium
npm run build        # builds contracts -> verification -> server -> runtime -> dashboard
npm run typecheck    # verifies TypeScript across all 5 workspaces
npm test             # executes complete test suite (123 tests passing)
```

### 2. Launch Local Environment

#### Option A: One-Click Windows Launcher (Recommended)
Double-click `start_all.bat` or run in terminal:
```cmd
start_all.bat
```
This launcher:
1. Verifies Node.js v20+ and npm in your PATH.
2. Checks configuration and installs dependencies if needed.
3. Automatically runs `npm run build` if compiled artifacts are missing.
4. Clears any stale port collisions on 4000, 3000, or 5173.
5. Resets demo data to a clean baseline (`npm run demo:reset`).
6. Starts all 3 services in separate terminal windows.
7. Actively polls `http://localhost:4000/api/health`, `http://localhost:3000`, and `http://localhost:5173` until all services are ready.
8. Automatically opens the Visual Hotfix Workbench in your browser.

To cleanly terminate all running services, run:
```cmd
stop_all.bat
```
*(Stops only project-specific port listeners on 4000, 3000, and 5173 without terminating unrelated Node processes).*

#### Option B: Multi-Terminal Manual Startup
```bash
# Terminal 1: API Server Engine (Port 4000)
node packages/server/dist/index.js

# Terminal 2: AeroStyle Demo Storefront (Port 3000)
node packages/storefront/server.js

# Terminal 3: Visual Hotfix Workbench (Port 5173)
node packages/dashboard/server.js
```

Open your browser to:
- **Visual Hotfix Workbench:** [http://localhost:5173](http://localhost:5173)
- **Host Storefront:** [http://localhost:3000](http://localhost:3000)
- **Core API Health:** [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## Core Demonstration Walkthrough

1. **Inspect Defect**:
   - Open **`http://localhost:5173`** (Studio Canvas).
   - Toggle viewport to **375px Mobile** to observe mobile layout.
2. **Select & Inspect**:
   - Click **"Select Element"** in the canvas toolbar.
   - Click on the storefront button (`#checkout-btn`). The Contextual Inspector populates with tag `<button>`, selector `#checkout-btn`, and confidence rating.
3. **Configure & Preview**:
   - Change the mutation value to `display: inline-block`.
   - Click **"Live Preview"** to watch the button reformat live on canvas without reloading.
   - Click **"Save Draft"** to persist the patch.
4. **Proof-Carrying Verification**:
   - Click **"Verify Patch"**.
   - Headless Playwright executes desktop and mobile checks, captures screenshots, and checks console logs.
   - Expand the bottom **Proof Drawer** to review check assertions, screenshot pixel diffs, and release-gate status.
5. **Publish Release**:
   - Click **"Publish Release"** in the top bar. Release v1 is deployed live.
6. **Detect Drift & Health Monitoring**:
   - Navigate to **Health Monitor** tab.
   - In Storefront, click **"⚡ Simulate Site Update (Drift)"** (renames `#checkout-btn` to `#pay-now-action`).
   - Click **"Run Live Health Check"**. The engine flags `DRIFT DETECTED`, logs the diagnostic, and recommends a rollback or rebind.
7. **1-Click Atomic Rollback**:
   - Click **"1-Click Rollback"** in the Health Monitor or Releases tab.
   - Production storefront immediately restores the prior unpatched baseline.
8. **AI Patch Reviewer**:
   - Click **"AI Hotfix"** in the header.
   - Prompt: *"The Add to Cart button is overflowing on mobile"*.
   - Review the structured proposal, confidence score, and assumptions.
   - Click **"Accept & Save as Draft"** to send the proposal through the standard verification and release workflow.

---

## Testing & Quality Assurance

```bash
# Run complete automated test suite (123 tests)
npm test

# Run TypeScript compilation and typecheck across all workspaces
npm run typecheck

# Build all monorepo packages (contracts, verification, server, runtime, dashboard)
npm run build
```

---

## Security & Safety Boundaries

- **Strict Allowlisted DOM Mutations**: Arbitrary code execution (`eval`, inline `<script>` tags, javascript: URIs) is completely blocked.
- **Backend-Enforced Release Gates**: The API server rejects any release deployment containing unverified or conflicting patches. Client-side state cannot bypass the gate.
- **Atomic Persistence**: Database files are updated with atomic patterns; corrupt files are backed up rather than overwritten.
- **Honest AI Architecture**: Out-of-the-box heuristic/mock mode is clearly labeled (`HEURISTIC ADAPTER`); AI proposals are treated as untrusted drafts requiring human review and Playwright verification.
