# PATCHWORK

> **Autonomous DOM Patching, Multi-Signal Drift Recovery, and Playwright Verification Gate for Production Web Applications.**  
> *Safely fix live frontend regressions in seconds without CI/CD redeployments, vendor code rebuilds, or release risk.*

---

## What is PATCHWORK?

Frontend teams face a critical dilemma when revenue-impacting regressions strike (e.g. checkout buttons disappearing on mobile, broken promotion banners, or layout shifts): a standard CI/CD deployment pipeline requires 30–60 minutes of code reviews, test suites, and container builds.

**PATCHWORK** solves this by establishing a safe, out-of-band DOM mutation layer:
1. **Target Fingerprinting**: Robust multi-signal matching (tag, text, ARIA role, context, stable attributes) that survives vendor HTML redeployments and DOM structural drift.
2. **Allowlisted Mutations**: Strict operation schemas (`style.set`, `text.set`, `attribute.set`, `element.hide`, `element.show`). Zero arbitrary script execution (`eval` is strictly blocked).
3. **Automated Playwright Release Gate**: Headless dual-viewport (Desktop & Mobile) browser verification tests element uniqueness, visibility, computed CSS, console exceptions, and pixel-diff visual regressions before any patch can be released.
4. **Deterministic Multi-Patch Conflict Engine**: Automatically catches property collisions when multiple operators patch the same element and offers guided resolution workflows.
5. **Instant Atomic Rollback**: Revert production storefronts to the prior release or unpatched baseline in < 20ms without redeploying.
6. **Natural-Language Hotfix Copilot**: Operators describe bugs in plain English. The AI proposes allowlisted mutations that are strictly treated as untrusted drafts and must pass through the mandatory Playwright verification gate.

---

## System Architecture

```
                    ┌─────────────────────────┐
                    │    Mission Control      │
                    │  Dashboard & Inspector  │
                    └────────────┬────────────┘
                                 │ HTTP REST API
                                 ▼
┌──────────────────┐    ┌─────────────────┐    ┌──────────────────────┐
│  AI Subsystem    │◄───┤  API Server     ├───►│ Playwright Worker    │
│  Mock / LLM      │    │  (Port 4000)    │    │ Dual-Viewport Harness│
└──────────────────┘    └────────┬────────┘    └──────────────────────┘
                                 │ Active Bundle
                                 ▼
                        ┌─────────────────┐
                        │ Client Runtime  │
                        │ Storefront DOM  │
                        └─────────────────┘
```

Detailed technical specs and diagrams: [docs/architecture/system-overview.md](docs/architecture/system-overview.md).

---

## Monorepo Layout

| Workspace / Package | Description |
|---|---|
| [`@patchwork/contracts`](packages/contracts) | Shared TypeScript domain schemas, operation allowlists, lifecycle state machine, and AI proposal validators |
| [`@patchwork/runtime`](packages/runtime) | Client-side injection engine, multi-signal DOM matcher, mutation applicator, and preview sandbox bridge |
| [`@patchwork/server`](packages/server) | Fastify REST API, persistence store, conflict engine, AI copilot provider, and release orchestrator |
| [`@patchwork/verification`](packages/verification) | Headless Playwright worker, dual-viewport harness (Desktop & Mobile), and pixel-diff regression comparator |
| [`packages/storefront`](packages/storefront) | Controlled e-commerce demo storefront with checkout flow and DOM drift simulation toggles |
| [`packages/dashboard`](packages/dashboard) | Mission Control web application with visual inspector, verification drilldowns, conflict resolver, and AI copilot |

---

## Quickstart (Clean Clone)

### Prerequisites
- Node.js 20+
- [Bun](https://bun.sh) (runs test runner and dev environments)
- Chromium: `npx playwright install chromium`

### 1. Installation & Build
```bash
git clone <repo-url> && cd MewThree_college_round
npm install
npx playwright install chromium
npm run build        # contracts -> verification -> server -> runtime
npm run typecheck    # verifies TypeScript across all workspaces
npm test             # runs complete test suite (114+ tests passing)
```

### 2. Launch Local Environment
Run the three processes (each in its own terminal):

```bash
# Terminal 1: Backend API Engine (Port 4000)
npm run start --workspace=packages/server

# Terminal 2: AeroStyle Demo Storefront (Port 3000)
npm run start --workspace=packages/storefront

# Terminal 3: Mission Control Dashboard (Port 5173)
npm run start --workspace=packages/dashboard
```

Open your browser to:
- **Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Live Storefront:** [http://localhost:3000](http://localhost:3000)

---

## Live Presentation Demo (3–4 Minutes)

See the full click-by-click script and contingency instructions in [docs/runbook/demo-script.md](docs/runbook/demo-script.md).

### The 10-Step Story
1. **The Bug**: View mobile storefront (375px) where checkout button is missing due to a vendor regression.
2. **Visual Inspection**: Click *Visual Inspector*, select the button, and create a draft patch (`style.set: display: inline-flex`).
3. **Isolated Preview**: Open *Preview Storefront* (`?patchwork_preview=...`). Button is visible in sandbox, but production remains 100% unpatched.
4. **Automated Verification**: Click *Run Verification*. Playwright verifies across Desktop and Mobile, captures screenshots, and passes.
5. **Publish Release**: Click *Publish to Release*. Live storefront immediately updates without code redeployment.
6. **Safety Gate Proof**: Click *Test Failing Gate*. Broken patch fails Playwright assertions; the release gate strictly blocks deployment.
7. **DOM Target Drift**: Click *Simulate Drift*. Selector breaks; multi-signal engine flags `stale` and recommends candidate element.
8. **AI Semantic Disambiguation**: Trigger AI candidate recovery; operator confirms rebind, and re-verification is enforced.
9. **Instant Rollback**: In *Releases*, click *Rollback to Previous Release*. Storefront reverts to baseline in milliseconds.
10. **AI Hotfix Copilot**: Use natural-language prompt (*"Change checkout button to emerald green #10b981"*). AI proposes allowlisted mutation; human reviews and passes it through the verification gate.

### Clean Reset Between Demo Rehearsals
```bash
curl -X POST http://localhost:4000/api/admin/reset
```

---

## Testing & Quality Assurance

PATCHWORK includes end-to-end regression testing across the entire stack:

```bash
# Run all workspace test suites
bun test

# Run individual test suites
bun test packages/server/test/lifecycle-e2e.test.ts     # Complete product lifecycle E2E
bun test packages/server/test/ai-lifecycle-e2e.test.ts  # AI Copilot & Safety Gate E2E
bun test packages/dashboard/test/dashboard.test.ts      # Dashboard resilience & refresh persistence
bun test packages/verification/test/diff.test.ts        # Visual regression pixel diff tests
```

---

## Security & Safety Model

- **No Code Evaluation (`eval`)**: The runtime strictly rejects script injection or executable strings. Only declarative allowlisted operations are parsed and applied.
- **Mandatory Verification Gate**: The API server physically rejects any release deployment containing unverified or failing patches.
- **Zero External API Key Requirement**: All AI capabilities run out-of-the-box with a deterministic, zero-credential mock provider for testing and offline demos.
- **Data Durability**: Corrupt database files are automatically preserved as `<db>.corrupt-<timestamp>` rather than silently overwritten.
