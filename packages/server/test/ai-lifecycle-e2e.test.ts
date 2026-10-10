import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { Window } from "happy-dom";
import { initPatchworkRuntime } from "../../runtime/src/runtime.js";
import { createServer } from "../src/api.js";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";
import { MockAiProvider, DefaultAiService } from "../src/ai.js";

/**
 * Phase 8 E2E Test Suite:
 * Validates the complete AI Copilot lifecycle:
 * 1. Prompt Hotfix -> Untrusted Draft Proposal
 * 2. Gate Verification Enforced (Unverified AI patch CANNOT be released)
 * 3. Failing verification diagnosis via AI Root-Cause Explainer
 * 4. Verification Passing -> Publication -> Storefront Applied
 * 5. Target DOM Drift -> Semantic Disambiguation -> Operator Rebind
 * 6. Rollback & Full Audit Log Integrity
 */

const TEST_DB_PATH = path.join(import.meta.dirname, "test-ai-lifecycle-db.json");
const actor = { id: "operator-1", name: "Operator", role: "developer" as const };

type SiteVersion = "baseline" | "drifted";
let siteVersion: SiteVersion = "baseline";

let apiServer: http.Server;
let apiRoot: string;
let storefrontServer: http.Server;
let storefrontUrl: string;

async function api(method: string, route: string, body?: unknown) {
  const res = await fetch(`${apiRoot}/api${route}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

function storefrontHtml(version: SiteVersion): string {
  const script = `<script type="module" src="/patchwork.js" data-website-id="demo-store" data-api-base="${apiRoot}/api"></script>`;
  if (version === "drifted") {
    return `<!DOCTYPE html><html><head><title>Storefront</title></head>
<body style="font-family: sans-serif; padding: 24px;">
  <h1>Storefront</h1>
  <div id="checkout-summary"><div class="payment-drawer">
    <button id="pay-now-action" class="btn btn-checkout" type="button" aria-label="Complete Order" style="background-color: rgb(0, 0, 255); color: #fff; padding: 12px 24px; border: none; font-size: 16px; cursor: pointer;">Complete Order</button>
  </div></div>
  ${script}
</body></html>`;
  }
  return `<!DOCTYPE html><html><head><title>Storefront</title></head>
<body style="font-family: sans-serif; padding: 24px;">
  <h1>Storefront</h1>
  <div id="checkout-summary"><div id="checkout-container">
    <button id="checkout-btn" type="button" aria-label="Complete Order" style="background-color: rgb(0, 0, 255); color: #fff; padding: 12px 24px; border: none; font-size: 16px; cursor: pointer;">Complete Order</button>
  </div></div>
  ${script}
</body></html>`;
}

async function loadStorefront() {
  const html = await (await fetch(`${storefrontUrl}/`)).text();
  const win = new Window({ url: `${storefrontUrl}/` });
  const bodyHtml = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? "").replace(
    /<script[\s\S]*?<\/script>/gi,
    ""
  );
  win.document.body.innerHTML = bodyHtml;
  const doc = win.document as unknown as Document;
  const runtime = await initPatchworkRuntime({
    apiBase: `${apiRoot}/api`,
    doc,
    win: win as unknown as Window,
  });
  return { doc, runtime };
}

function getButton(doc: Document): HTMLElement {
  return (doc.querySelector("#checkout-btn") || doc.querySelector("#pay-now-action")) as HTMLElement;
}

beforeAll(async () => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

  const store = new JsonFileStore(TEST_DB_PATH);
  const aiProvider = new MockAiProvider();
  const aiService = new DefaultAiService(aiProvider);
  const service = new PatchService(store, undefined, aiService);

  apiServer = createServer(service);
  await new Promise<void>((resolve) =>
    apiServer.listen(0, () => {
      apiRoot = `http://localhost:${(apiServer.address() as any).port}`;
      resolve();
    })
  );

  const runtimeScript = fs.existsSync(path.join(import.meta.dirname, "../../runtime/dist/patchwork.js"))
    ? fs.readFileSync(path.join(import.meta.dirname, "../../runtime/dist/patchwork.js"), "utf-8")
    : "export function initPatchworkRuntime() {}";

  storefrontServer = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname === "/patchwork.js") {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end(runtimeScript);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(storefrontHtml(siteVersion));
  });

  await new Promise<void>((resolve) =>
    storefrontServer.listen(0, () => {
      storefrontUrl = `http://localhost:${(storefrontServer.address() as any).port}`;
      resolve();
    })
  );
});

afterAll(async () => {
  if (apiServer) await new Promise<void>((resolve) => apiServer.close(() => resolve()));
  if (storefrontServer) await new Promise<void>((resolve) => storefrontServer.close(() => resolve()));
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

describe("AI Copilot Lifecycle End-to-End", () => {
  it("Step 1: Baseline storefront renders default state without active patches", async () => {
    siteVersion = "baseline";
    const { doc } = await loadStorefront();
    const btn = getButton(doc);
    expect(btn.style.backgroundColor).toBe("rgb(0, 0, 255)");
  });

  it("Step 2: Generate Hotfix Proposal from Natural-Language Prompt", async () => {
    const res = await api("POST", "/ai/generate-patch", {
      prompt: "Change checkout button background to emerald green #10b981",
      websiteId: "demo-store",
      context: { selector: "#checkout-btn", tag: "button" },
    });

    expect(res.status).toBe(200);
    const { proposal, provider } = res.json;
    expect(provider).toBe("mock");
    expect(proposal.confidence).toBeGreaterThanOrEqual(0.85);
    expect(proposal.targetFingerprint.selector).toBe("#checkout-btn");
    expect(proposal.operation.type).toBe("style.set");
    expect(proposal.operation.property).toBe("background-color");
    expect(proposal.operation.value).toBe("#10b981");
    expect(proposal.riskAssessment).toBe("low");
  });

  it("Step 3: Save AI Proposal as Draft Patch and Verify Gate Independence", async () => {
    // Generate proposal
    const genRes = await api("POST", "/ai/generate-patch", {
      prompt: "Make checkout button emerald green #10b981",
      websiteId: "demo-store",
    });
    const { proposal } = genRes.json;

    // Save as draft
    const patchRes = await api("POST", "/patches", {
      websiteId: "demo-store",
      name: proposal.patchName,
      targetFingerprint: {
        ...proposal.targetFingerprint,
        role: "button",
        text: "Complete Order",
      },
      operation: proposal.operation,
      actor: { id: "operator-ai", name: "Operator (AI-Assisted)", role: "developer" },
    });

    expect(patchRes.status).toBe(201);
    const patch = patchRes.json;
    expect(patch.status).toBe("draft");

    // Attempting to publish unverified draft MUST be rejected by the Release Gate
    const releaseAttempt = await api("POST", "/websites/demo-store/releases", {
      patchIds: [patch.id],
      actor,
      changeSummary: "Deploy unverified AI proposal",
    });
    expect(releaseAttempt.status).toBe(400);
    expect(releaseAttempt.json.error).toContain("cannot be published");
  });

  it("Step 4: Verification Failure Diagnosis via AI Root-Cause Explainer", async () => {
    // Create a broken patch with an invalid selector
    const brokenRes = await api("POST", "/patches", {
      websiteId: "demo-store",
      name: "Broken Selector Patch",
      targetFingerprint: {
        tag: "button",
        selector: "#non-existent-button-404",
      },
      operation: { type: "style.set", property: "display", value: "none" },
      actor,
    });
    const brokenPatch = brokenRes.json;

    // Transition to previewing then verification_failed
    await api("POST", `/patches/${brokenPatch.id}/transition`, {
      targetStatus: "previewing",
      actor,
    });
    await api("POST", `/patches/${brokenPatch.id}/transition`, {
      targetStatus: "verification_failed",
      actor,
      reason: "Automated assertion timed out",
    });

    // Query AI Failure Explainer
    const explainRes = await api("POST", "/ai/explain-verification", {
      patchId: brokenPatch.id,
      failureLog: "Error: Selector '#non-existent-button-404' did not match any DOM elements within 5000ms",
    });

    expect(explainRes.status).toBe(200);
    const explanation = explainRes.json;
    expect(explanation.confidence).toBeGreaterThan(0.7);
    expect(explanation.summary).toBeDefined();
    expect(explanation.rootCauseHypothesis).toBeDefined();
    expect(explanation.observedFacts.length).toBeGreaterThan(0);
    expect(explanation.recommendedActions.length).toBeGreaterThan(0);
  });

  it("Step 5: Verify AI Patch, Publish Release, and Verify Storefront Application", async () => {
    // Create a valid AI patch
    const patchRes = await api("POST", "/patches", {
      websiteId: "demo-store",
      name: "Emerald Checkout CTA",
      targetFingerprint: {
        tag: "button",
        selector: "#checkout-btn",
        role: "button",
        text: "Complete Order",
      },
      operation: { type: "style.set", property: "background-color", value: "#10b981" },
      actor,
    });
    const patch = patchRes.json;

    // Transition draft -> previewing -> verified
    await api("POST", `/patches/${patch.id}/transition`, {
      targetStatus: "previewing",
      actor,
    });
    const verifyRes = await api("POST", `/patches/${patch.id}/transition`, {
      targetStatus: "verified",
      actor,
      reason: "Simulated Playwright cross-viewport check passed",
    });
    expect(verifyRes.status).toBe(200);

    // Publish release containing the verified patch
    const releaseRes = await api("POST", "/websites/demo-store/releases", {
      patchIds: [patch.id],
      actor,
      changeSummary: "Deploy verified emerald checkout CTA",
    });
    expect(releaseRes.status).toBe(201);
    expect(releaseRes.json.status).toBe("active");

    // Load storefront and verify mutation is applied
    const { doc } = await loadStorefront();
    const btn = getButton(doc);
    expect(["#10b981", "rgb(16, 185, 129)"]).toContain(btn.style.backgroundColor);
  });

  it("Step 6: Handle DOM Target Drift with Semantic Disambiguation and Operator Rebind", async () => {
    // Switch storefront to drifted markup (button is now #pay-now-action)
    siteVersion = "drifted";

    // Create a patch that was targeted at old #checkout-btn
    const patchRes = await api("POST", "/patches", {
      websiteId: "demo-store",
      name: "Drifted Checkout Patch",
      targetFingerprint: {
        tag: "button",
        selector: "#checkout-btn",
      },
      operation: { type: "style.set", property: "background-color", value: "rgb(234, 88, 12)" },
      actor,
    });
    const patch = patchRes.json;

    // Transition draft -> previewing -> stale
    await api("POST", `/patches/${patch.id}/transition`, {
      targetStatus: "previewing",
      actor,
    });
    await api("POST", `/patches/${patch.id}/transition`, {
      targetStatus: "stale",
      actor,
      reason: "DOM target missing on live page",
    });

    // Query Semantic Disambiguation
    const disambiguateRes = await api("POST", "/ai/disambiguate-target", {
      patchId: patch.id,
      candidates: [
        { selector: "#pay-now-action", text: "Complete Order", tag: "button" },
        { selector: "#search-action", text: "Search Store", tag: "button" },
      ],
    });

    expect(disambiguateRes.status).toBe(200);
    const disambiguation = disambiguateRes.json;
    expect(disambiguation.recommendedSelector).toBe("#pay-now-action");
    expect(disambiguation.confidence).toBeGreaterThanOrEqual(0.8);

    // Operator confirms rebind
    const rebindRes = await api("POST", `/patches/${patch.id}/rebind`, {
      selector: disambiguation.recommendedSelector,
      changeNote: "Rebound following semantic AI recommendation",
      actor,
    });
    expect(rebindRes.status).toBe(200);
    expect(rebindRes.json.targetFingerprint.selector).toBe("#pay-now-action");
    expect(rebindRes.json.currentVersion).toBe(2);

    // Rebind puts patch in 'previewing'. Verify and release rebound patch
    const verifiedRebound = await api("POST", `/patches/${patch.id}/transition`, {
      targetStatus: "verified",
      actor,
    });
    expect(verifiedRebound.status).toBe(200);

    const relRes = await api("POST", "/websites/demo-store/releases", {
      patchIds: [patch.id],
      actor,
      changeSummary: "Deploy rebound patch to drifted storefront",
    });
    expect(relRes.status).toBe(201);

    // Verify storefront now reflects rebound patch
    const { doc } = await loadStorefront();
    const btn = getButton(doc);
    expect(btn.id).toBe("pay-now-action");
    expect(btn.style.backgroundColor).toBe("rgb(234, 88, 12)");
  });

  it("Step 7: Rollback Restores Unpatched Baseline and Audit Log Tracks Full History", async () => {
    // Rollback
    const rollbackRes = await api("POST", "/websites/demo-store/rollback", {
      actor,
      reason: "Emergency rollback to baseline",
    });
    expect(rollbackRes.status).toBe(200);

    // Storefront reflects baseline (blue background)
    const { doc } = await loadStorefront();
    const btn = getButton(doc);
    expect(btn.style.backgroundColor).toBe("rgb(0, 0, 255)");

    // Audit events verify all recorded actions
    const auditRes = await api("GET", "/audit-events?websiteId=demo-store");
    expect(auditRes.status).toBe(200);
    const events = auditRes.json;
    expect(events.length).toBeGreaterThan(5);

    const actions = events.map((e: any) => e.action);
    expect(actions).toContain("release.published");
    expect(actions).toContain("release.rolled_back");
  });
});
