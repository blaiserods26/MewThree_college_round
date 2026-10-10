# PATCHWORK — Live Demo Presentation Runbook

> **Target Duration:** 3 minutes 30 seconds — 4 minutes  
> **Pitch Goal:** Demonstrate how PATCHWORK safely creates, tests, deploys, and rolls back DOM patches to an existing website—without redeploying vendor code—while maintaining strict verification gates and AI safety boundaries.

---

## Pre-Flight Checklist (Run 5 minutes before presentation)

1. Start all 3 local servers:
   ```bash
   # Terminal 1: Backend API Engine (Port 4000)
   npm run start --workspace=packages/server

   # Terminal 2: Storefront Demo Website (Port 3000)
   npm run dev --workspace=packages/storefront

   # Terminal 3: Mission Control Dashboard (Port 5173)
   npm run dev --workspace=packages/dashboard
   ```
2. Reset to clean demo state:
   ```bash
   curl -X POST http://localhost:4000/api/admin/reset
   ```
3. Open browser windows side-by-side:
   - **Left Window (50% screen):** Mission Control Dashboard at `http://localhost:5173`
   - **Right Window (50% screen, DevTools Mobile 375px width):** AeroStyle Storefront at `http://localhost:3000`

---

## 3–4 Minute Click-by-Click Script

### Step 1: The Problem (0:00 – 0:30)
- **Action:** Point to the storefront window on the right.
- **Talking Point:**
  > *"Every e-commerce engineering team dreads this: a minor frontend deploy accidentally introduced a CSS regression (`display: none`), completely hiding the checkout button on mobile viewports. Revenue is leaking right now, but a full CI/CD deployment takes 45 minutes of pipeline wait time and code reviews. Enter PATCHWORK."*

### Step 2: Inspection & Patch Drafting (0:30 – 0:50)
- **Action:** On the dashboard, click **"🔍 Visual Inspector"** (or click **"+ New Patch Draft"**).
- **Values:**
  - Name: `Restore Mobile Checkout CTA`
  - Target Selector: `#checkout-btn`
  - Operation: `style.set` -> Property: `display` -> Value: `inline-flex`
- **Action:** Click **"Create Draft Patch"**.
- **Talking Point:**
  > *"Instead of touching application code, we capture a resilient multi-signal target fingerprint and draft a declarative, allowlisted mutation."*

### Step 3: Isolated Sandbox Preview (0:50 – 1:15)
- **Action:** In the patch detail panel, click **"👁️ Preview Storefront"**.
- **Observation:** Notice the URL query `?patchwork_preview=patch-...`. The button is visible in this preview tab, while the production storefront tab remains completely unpatched.
- **Talking Point:**
  > *"Notice the isolation: our preview sandbox immediately reflects the hotfix, but regular production traffic is 100% untouched. There is zero risk of unverified changes leaking to customers."*

### Step 4: Automated Playwright Browser Verification (1:15 – 1:45)
- **Action:** Click **"⚡ Run Verification"** in the dashboard.
- **Observation:** Watch the Playwright worker test Desktop (1280x800) and Mobile (375x667), run pixel diffs, and transition the patch to `Verified` with a green shield.
- **Talking Point:**
  > *"We don't trust hope—we trust automated browser verification. Playwright spins up headless viewports, executes accessibility checks, and runs visual regression pixel diffs. Only when every assertion passes is the patch unlocked for release."*

### Step 5: Production Deployment & Verification Gate Enforcement (1:45 – 2:15)
- **Action:** Click **"🚀 Publish to Release"** (or create a release bundle under Releases & Rollback).
- **Observation:** The state banner turns emerald green: `🟢 Active in Production Release`. Refresh the standard storefront window—the checkout button is now live!
- **Talking Point:**
  > *"With one click, our verified patch is active across production without redeploying the app."*

### Step 6: Safety Gate Rejection Demonstration (2:15 – 2:40)
- **Action:** In the verification panel, click **"🧪 Test Failing Gate"**.
- **Observation:** A deliberately broken patch with a missing selector is verified. The runner fails, flags `verification_failed`, and the Release Gate blocks publication with a red barrier.
- **Talking Point:**
  > *"What happens if an engineer makes a mistake? Our Release Gate strictly refuses to publish broken patches. Safety is mathematically guaranteed by the state machine."*

### Step 7: DOM Drift Recovery & AI Semantic Disambiguation (2:40 – 3:10)
- **Action:** On a patch, click **"⚡ Simulate Drift"**.
- **Observation:** The target DOM drifts; the status flags `Stale`. Click **"✨ Disambiguate Drift with AI"**. The AI ranks candidates (`#pay-now-action` at 89%), and prompts for human confirmation before rebinding.
- **Talking Point:**
  > *"Websites evolve. When host classes or IDs change, PATCHWORK's multi-signal matching detects drift and recommends the best candidate element. But notice: AI never auto-applies mutations—the human operator must confirm the rebind, and full Playwright verification is re-enforced."*

### Step 8: Instant One-Click Rollback (3:10 – 3:30)
- **Action:** Switch to the **"Releases & Rollback"** tab. Click **"⚡ Rollback to Previous Release"**.
- **Observation:** The release is rolled back atomically in < 20ms. Refresh storefront—it instantly reverts to the unpatched baseline.
- **Talking Point:**
  > *"If anything ever goes wrong, rollback is instantaneous and atomic. We don't wait for git reverts or redeploys; the storefront is back on baseline in milliseconds."*

### Step 9: Natural-Language Hotfix Copilot (3:30 – 3:50)
- **Action:** Click **"✨ AI Hotfix Copilot"**.
- **Prompt:** `"Change checkout button background to emerald green #10b981"`
- **Action:** Click **"Generate Patch Proposal"** -> Review diff -> Click **"Save as Draft Patch"**.
- **Talking Point:**
  > *"Finally, our AI Copilot allows non-developers to describe fixes in plain English. The AI proposes structured JSON adhering strictly to our operation allowlist—no arbitrary eval, no direct publishing. It enters the same rigorous verification gate as any human patch."*

---

## Resetting Between Rehearsals

To wipe all patches and return to the baseline state between runs:
```bash
curl -X POST http://localhost:4000/api/admin/reset
```
Or refresh the browser after issuing the reset command. The dashboard will automatically clear its cached state and reload clean fixtures.

---

## Contingency & Fallback Checklist

| Situation | Instant Recovery Action |
|---|---|
| **Port Conflict** | Terminate background nodes: `kill -9 $(lsof -t -i:4000 -i:3000 -i:5173)` |
| **Playwright Timeout** | Playwright runs headless in local Chrome. If sluggish, check system CPU or run single viewport |
| **Accidental Bad Patch** | Click `⚡ Rollback to Previous Release` in the Releases tab or hit `/admin/reset` |
| **Offline / No Internet** | All AI features run on the built-in deterministic `MockAiProvider`; zero API keys or external networks are required |
