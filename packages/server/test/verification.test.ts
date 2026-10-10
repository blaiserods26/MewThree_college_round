import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "../src/api.js";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";

const TEST_DB_PATH = path.join(import.meta.dirname, "test-verification-db.json");
let apiServer: http.Server;
let apiBaseUrl: string;

let mockStorefrontServer: http.Server;
let storefrontBaseUrl: string;

describe("Playwright Automated Verification Worker & Gate Enforcement", () => {
  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const store = new JsonFileStore(TEST_DB_PATH);
    const service = new PatchService(store);
    apiServer = createServer(service);

    // 1. Start API Server on dynamic port
    await new Promise<void>((resolve) => {
      apiServer.listen(0, () => {
        const addr = apiServer.address();
        if (typeof addr === "object" && addr) {
          apiBaseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });

    // 2. Start Mock Storefront Server with injected runtime script
    const runtimeScript = fs.readFileSync(
      path.join(import.meta.dirname, "../../runtime/dist/patchwork.js"),
      "utf-8"
    );

    mockStorefrontServer = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (url.pathname === "/patchwork.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" });
        res.end(runtimeScript);
        return;
      }

      if (url.pathname.startsWith("/drifted") || url.searchParams.get("drift") === "true") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Mock Storefront - Drifted</title></head>
          <body style="font-family: sans-serif; padding: 24px;">
            <h1>Mock Storefront</h1>
            <div id="checkout-summary">
              <div class="payment-drawer">
                <button id="pay-now-action" class="btn btn-checkout" type="button" aria-label="Complete Order" style="background-color: rgb(0, 0, 255); color: #fff; padding: 12px 24px; border: none; font-size: 16px; cursor: pointer;">
                  Complete Order
                </button>
              </div>
            </div>
            <script type="module" src="/patchwork.js" data-website-id="demo-store" data-api-base="${apiBaseUrl}/api"></script>
          </body>
          </html>
        `);
        return;
      }

      // Serve HTML page with target checkout button
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Mock Storefront</title></head>
        <body style="font-family: sans-serif; padding: 24px;">
          <h1>Mock Storefront</h1>
          <div id="checkout-container">
            <button id="checkout-btn" style="background-color: rgb(0, 0, 255); color: #fff; padding: 12px 24px; border: none; font-size: 16px; cursor: pointer;">
              Complete Order
            </button>
          </div>
          <script type="module" src="/patchwork.js" data-website-id="demo-store" data-api-base="${apiBaseUrl}/api"></script>
        </body>
        </html>
      `);
    });

    await new Promise<void>((resolve) => {
      mockStorefrontServer.listen(0, () => {
        const addr = mockStorefrontServer.address();
        if (typeof addr === "object" && addr) {
          storefrontBaseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => apiServer.close(() => resolve()));
    await new Promise<void>((resolve) => mockStorefrontServer.close(() => resolve()));
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it(
    "verifies a valid patch, captures screenshots, and automatically transitions status to 'verified'",
    async () => {
    // 1. Create a draft patch
    const patchRes = await fetch(`${apiBaseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: "Make checkout button green",
        targetFingerprint: {
          tag: "button",
          selector: "#checkout-btn",
          text: "Complete Order",
        },
        operation: {
          type: "style.set",
          property: "background-color",
          value: "#10b981",
        },
        actor: { id: "dev-1", name: "Dev", role: "developer" },
      }),
    });
    const patch = await patchRes.json();
    expect(patch.status).toBe("draft");

    // 2. Trigger Playwright Automated Verification
    const verifyRes = await fetch(`${apiBaseUrl}/api/patches/${patch.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteBaseUrl: storefrontBaseUrl,
      }),
    });

    expect(verifyRes.status).toBe(200);
    const run = await verifyRes.json();

    expect(run.status).toBe("passed");
    expect(run.assertions.length).toBeGreaterThan(0);
    expect(run.assertions.every((a: any) => a.passed)).toBe(true);
    expect(run.screenshotBase64).toBeDefined();
    expect(run.baselineScreenshotBase64).toBeDefined();
    expect(run.visualDiff).toBeDefined();

    // 3. Verify patch status automatically transitioned to 'verified'
    const updatedPatchRes = await fetch(`${apiBaseUrl}/api/patches/${patch.id}`);
    const updatedPatch = await updatedPatchRes.json();
    expect(updatedPatch.status).toBe("verified");

    // 4. Verify verification history endpoint
    const historyRes = await fetch(`${apiBaseUrl}/api/patches/${patch.id}/verifications`);
    const history = await historyRes.json();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(run.id);

    // 5. Verify audit events recorded verification lifecycle
    const auditRes = await fetch(`${apiBaseUrl}/api/audit-events?websiteId=demo-store`);
    const events = await auditRes.json();
    const passedEvent = events.find((e: any) => e.action === "verification.passed");
    expect(passedEvent).toBeDefined();
    expect(passedEvent.entityId).toBe(patch.id);
  }, 30000);

  it(
    "fails verification for a broken patch, sets status to 'verification_failed', and blocks release publication",
    async () => {
    // 1. Create a broken patch targeting a non-existent element
    const patchRes = await fetch(`${apiBaseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: "Broken button patch",
        targetFingerprint: {
          tag: "article",
          selector: "#non-existent-button-xyz",
        },
        operation: {
          type: "text.set",
          value: "Impossible Text",
        },
        actor: { id: "dev-1", name: "Dev", role: "developer" },
      }),
    });
    const brokenPatch = await patchRes.json();

    // 2. Trigger verification
    const verifyRes = await fetch(`${apiBaseUrl}/api/patches/${brokenPatch.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteBaseUrl: storefrontBaseUrl,
      }),
    });

    expect(verifyRes.status).toBe(200);
    const run = await verifyRes.json();

    expect(run.status).toBe("failed");
    expect(run.error).toContain("not found");

    // 3. Status must be transitioned to verification_failed
    const checkPatchRes = await fetch(`${apiBaseUrl}/api/patches/${brokenPatch.id}`);
    const checkPatch = await checkPatchRes.json();
    expect(checkPatch.status).toBe("verification_failed");

    // 4. State Machine Gate: Publishing this failed patch to a release must be strictly rejected
    const releaseRes = await fetch(`${apiBaseUrl}/api/websites/demo-store/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patchIds: [brokenPatch.id],
        actor: { id: "lead-dev", name: "Lead", role: "developer" },
      }),
    });

    expect(releaseRes.status).toBe(400);
    const releaseErr = await releaseRes.json();
    expect(releaseErr.error).toContain("verification_failed");
    expect(releaseErr.error).toContain("Only 'verified' patches can be released");
  }, 30000);

  it(
    "detects DOM drift in Playwright, flags patch as stale with candidate recovery, executes target rebind, re-verifies, and releases",
    async () => {
    // 1. Create patch targeting #checkout-btn
    const patchRes = await fetch(`${apiBaseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: "Mobile checkout visibility",
        targetFingerprint: {
          tag: "button",
          role: "button",
          selector: "#checkout-btn",
          text: "Complete Order",
          accessibleName: "Complete Order",
          parentContext: "checkout-summary",
        },
        operation: {
          type: "style.set",
          property: "background-color",
          value: "#10b981",
        },
        actor: { id: "dev-1", name: "Dev", role: "developer" },
      }),
    });
    const patch = await patchRes.json();

    // 2. Trigger Playwright verification against the drifted site (/drifted)
    const driftedSiteUrl = `${storefrontBaseUrl}/drifted`;
    const verifyRes = await fetch(`${apiBaseUrl}/api/patches/${patch.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteBaseUrl: driftedSiteUrl,
      }),
    });

    expect(verifyRes.status).toBe(200);
    const run = await verifyRes.json();
    expect(run.status).toBe("failed");
    expect(run.error).toContain("DOM Drift Detected");
    expect(run.error).toContain("#pay-now-action");

    // Patch status must be flagged as stale
    const stalePatchRes = await fetch(`${apiBaseUrl}/api/patches/${patch.id}`);
    const stalePatch = await stalePatchRes.json();
    expect(stalePatch.status).toBe("stale");

    // 3. Execute target rebind to #pay-now-action via API
    const rebindRes = await fetch(`${apiBaseUrl}/api/patches/${patch.id}/rebind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selector: "#pay-now-action",
        changeNote: "Rebound target to #pay-now-action after site migration",
        actor: { id: "lead-dev", name: "Lead", role: "developer" },
      }),
    });
    expect(rebindRes.status).toBe(200);
    const reboundPatch = await rebindRes.json();
    expect(reboundPatch.currentVersion).toBe(2);
    expect(reboundPatch.status).toBe("previewing");
    expect(reboundPatch.targetFingerprint.selector).toBe("#pay-now-action");

    // Gating check: attempt to publish before re-verification must be rejected
    const blockedReleaseRes = await fetch(`${apiBaseUrl}/api/websites/demo-store/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patchIds: [patch.id],
        actor: { id: "lead-dev", name: "Lead", role: "developer" },
      }),
    });
    expect(blockedReleaseRes.status).toBe(400);

    // 4. Run Playwright verification on the rebound patch
    const reVerifyRes = await fetch(`${apiBaseUrl}/api/patches/${patch.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteBaseUrl: driftedSiteUrl,
      }),
    });
    expect(reVerifyRes.status).toBe(200);
    const reRun = await reVerifyRes.json();
    expect(reRun.status).toBe("passed");

    // Patch is now verified
    const verifiedPatchRes = await fetch(`${apiBaseUrl}/api/patches/${patch.id}`);
    const verifiedPatch = await verifiedPatchRes.json();
    expect(verifiedPatch.status).toBe("verified");

    // 5. Publish to production release now succeeds!
    const releaseRes = await fetch(`${apiBaseUrl}/api/websites/demo-store/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patchIds: [patch.id],
        actor: { id: "lead-dev", name: "Lead", role: "developer" },
        changeSummary: "Deploying recovered checkout patch",
      }),
    });
    expect(releaseRes.status).toBe(201);
    const release = await releaseRes.json();
    expect(release.status).toBe("active");
    expect(release.version).toBe(1);
  }, 45000);
});

