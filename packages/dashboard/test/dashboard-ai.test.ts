import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { Window } from "happy-dom";

const DASHBOARD_DIR = path.join(import.meta.dirname, "..");
const appJs = fs.readFileSync(path.join(DASHBOARD_DIR, "app.js"), "utf-8");
const indexHtml = fs.readFileSync(path.join(DASHBOARD_DIR, "index.html"), "utf-8");

const now = new Date().toISOString();
function patchFixture(id: string, name: string, status = "draft") {
  const fingerprint = { tag: "button", selector: `#${id}` };
  const operation = { type: "style.set", property: "color", value: "red" };
  return {
    id,
    websiteId: "demo-store",
    name,
    status,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        targetFingerprint: fingerprint,
        operation,
        createdAt: now,
        createdBy: "dev-1",
        changeNote: "Initial draft creation",
      },
    ],
    targetFingerprint: fingerprint,
    operation,
    createdAt: now,
    updatedAt: now,
    createdBy: "dev-1",
  };
}

type Route = (url: string, init?: RequestInit) => Response | Promise<Response>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function settle(ms = 50) {
  await new Promise((r) => setTimeout(r, ms));
}

async function openDashboard(route: Route) {
  const win = new Window({
    url: "http://localhost:5173/",
    settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
  });

  const calls: { url: string; init?: RequestInit }[] = [];
  (win as any).fetch = async (input: any, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.url;
    calls.push({ url, init });
    return route(url, init);
  };
  win.document.documentElement.innerHTML = indexHtml.replace(/<script[\s\S]*?<\/script>/gi, "");
  (win as any).PATCHWORK_CONFIG = { apiBase: "http://localhost:4000/api", storefrontUrl: "http://store" };
  new Function("window", "document", appJs)(win, win.document);
  await settle();
  return { win, doc: win.document, calls };
}

describe("Dashboard AI Features", () => {
  it("Feature A: Hotfix Copilot modal generates proposal and creates draft patch", async () => {
    let patches = [patchFixture("p1", "Existing Patch")];
    let createdPayload: any = null;

    const route: Route = async (url, init) => {
      const { pathname } = new URL(url);
      if (pathname === "/api/patches" && init?.method === "POST") {
        createdPayload = JSON.parse(init.body as string);
        const newPatch = patchFixture("p-ai-new", createdPayload.name);
        newPatch.targetFingerprint = createdPayload.targetFingerprint;
        newPatch.operation = createdPayload.operation;
        patches.push(newPatch);
        return json(newPatch, 201);
      }
      if (pathname === "/api/patches") return json(patches);
      if (pathname === "/api/patches/check-conflicts") return json({ conflicts: [] });
      if (pathname.endsWith("/verifications")) return json([]);
      if (pathname === "/api/releases") return json([]);
      if (pathname === "/api/audit-events") return json([]);

      if (pathname === "/api/ai/generate-patch") {
        return json({
          proposal: {
            patchName: "AI Hotfix: Unhide Checkout",
            targetFingerprint: { selector: "#checkout-btn", tag: "button" },
            operation: { type: "style.set", property: "display", value: "inline-block" },
            confidence: 0.94,
            explanation: "Makes the checkout button visible on mobile viewports.",
            assumptions: ["Selector #checkout-btn exists in DOM"],
            riskAssessment: "low",
          },
          provider: "mock",
        });
      }

      return json({ error: "not found" }, 404);
    };

    const { doc } = await openDashboard(route);

    // Open Copilot Modal
    const openBtn = doc.getElementById("open-ai-copilot-btn") as HTMLElement;
    const modal = doc.getElementById("ai-copilot-modal") as HTMLElement;
    openBtn.click();
    expect(modal.classList.contains("hidden")).toBe(false);

    // Enter prompt and click Generate
    const promptInput = doc.getElementById("ai-prompt-input") as HTMLTextAreaElement;
    promptInput.value = "Unhide checkout button on mobile";
    const genBtn = doc.getElementById("ai-generate-btn") as HTMLElement;
    genBtn.click();
    await settle();

    // Verify Review Panel is visible and populated
    const reviewCard = doc.getElementById("ai-proposal-review-card") as HTMLElement;
    expect(reviewCard.classList.contains("hidden")).toBe(false);

    const nameInput = doc.getElementById("ai-review-name") as HTMLInputElement;
    expect(nameInput.value).toBe("AI Hotfix: Unhide Checkout");

    const confidenceSpan = doc.getElementById("ai-proposal-confidence") as HTMLElement;
    expect(confidenceSpan.textContent).toContain("94% Match");

    // Click Save Draft
    const acceptBtn = doc.getElementById("accept-ai-proposal-btn") as HTMLButtonElement;
    expect(acceptBtn.disabled).toBe(false);
    acceptBtn.click();
    await settle();

    expect(createdPayload).not.toBeNull();
    expect(createdPayload.name).toBe("AI Hotfix: Unhide Checkout");
    expect(createdPayload.targetFingerprint.selector).toBe("#checkout-btn");
    expect(createdPayload.actor.name).toContain("AI-Assisted");
    expect(modal.classList.contains("hidden")).toBe(true);
  });

  it("Feature B: Verification Failure Explanation displays root-cause hypothesis and facts", async () => {
    const failedPatch = patchFixture("p-fail", "Failing Patch", "verification_failed");
    const failedRun = {
      id: "run-failed-1",
      patchId: "p-fail",
      websiteId: "demo-store",
      status: "failed",
      viewportsRun: [{ name: "Desktop", width: 1280, height: 800 }],
      assertions: [
        { assertionId: "target-exists", passed: false, errorMessage: "Target element '#p-fail' not found in DOM" },
      ],
      durationMs: 450,
      createdAt: now,
      completedAt: now,
      error: "Element '#p-fail' timed out after 3000ms",
    };

    const route: Route = async (url) => {
      const { pathname } = new URL(url);
      if (pathname === "/api/patches") return json([failedPatch]);
      if (pathname === "/api/patches/check-conflicts") return json({ conflicts: [] });
      if (pathname === `/api/patches/${failedPatch.id}/verifications`) return json([failedRun]);
      if (pathname === "/api/releases") return json([]);
      if (pathname === "/api/audit-events") return json([]);

      if (pathname === "/api/ai/explain-verification") {
        return json({
          summary: "Selector timed out before element became visible",
          rootCauseHypothesis: "Target element '#p-fail' does not exist in the DOM at runtime",
          observedFacts: ["Target '#p-fail' timed out after 3000ms", "Zero matching elements found"],
          recommendedActions: ["Verify selector matches live markup", "Check parent element visibility"],
          confidence: 0.92,
          provider: "mock",
        });
      }

      return json({ error: "not found" }, 404);
    };

    const { doc } = await openDashboard(route);

    const explainBtn = doc.getElementById("btn-ai-explain-verify") as HTMLElement;
    expect(explainBtn).not.toBeNull();

    explainBtn.click();
    await settle();

    const explContainer = doc.getElementById("ai-verification-explanation-container") as HTMLElement;
    expect(explContainer.innerHTML).toContain("AI Root Cause Analysis");
    expect(explContainer.innerHTML).toContain("Selector timed out before element became visible");
    expect(explContainer.innerHTML).toContain("Target element '#p-fail' does not exist");
    expect(explContainer.innerHTML).toContain("92% Confidence");
  });

  it("Feature C: Semantic Drift Disambiguation assists operator and fills rebind selector", async () => {
    const stalePatch = patchFixture("p-stale", "Stale Drifted Patch", "stale");

    const route: Route = async (url) => {
      const { pathname } = new URL(url);
      if (pathname === "/api/patches") return json([stalePatch]);
      if (pathname === "/api/patches/check-conflicts") return json({ conflicts: [] });
      if (pathname.endsWith("/verifications")) return json([]);
      if (pathname === "/api/releases") return json([]);
      if (pathname === "/api/audit-events") return json([]);

      if (pathname === "/api/ai/disambiguate-target") {
        return json({
          recommendedSelector: "#pay-now-action",
          confidence: 0.89,
          rationale: "Matches button tag and checkout action intent with 89% confidence.",
          tradeoffs: "Selector changed from #p-stale to #pay-now-action.",
          provider: "mock",
        });
      }

      return json({ error: "not found" }, 404);
    };

    const { doc } = await openDashboard(route);

    const disambiguateBtn = doc.getElementById("btn-ai-disambiguate") as HTMLElement;
    expect(disambiguateBtn).not.toBeNull();

    disambiguateBtn.click();
    await settle();

    const container = doc.getElementById("ai-disambiguation-container") as HTMLElement;
    expect(container.innerHTML).toContain("Semantic Recovery Proposal");
    expect(container.innerHTML).toContain("#pay-now-action");
    expect(container.innerHTML).toContain("89% Confidence");

    const applyBtn = container.querySelector("#btn-apply-ai-selector") as HTMLElement;
    expect(applyBtn).not.toBeNull();
    applyBtn.click();

    const rebindInput = doc.getElementById("input-rebind-selector") as HTMLInputElement;
    expect(rebindInput.value).toBe("#pay-now-action");
  });
});
