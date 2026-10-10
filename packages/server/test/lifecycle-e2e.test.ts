import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { Window } from "happy-dom";
import { initPatchworkRuntime } from "../../runtime/src/runtime.js";
import { createServer } from "../src/api.js";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";

/**
 * Phase 7: the complete product lifecycle, driven through the real HTTP API, the real
 * Playwright verification worker, and the real client runtime (in happy-dom).
 *
 * baseline site -> patch -> preview -> verify -> publish -> site reflects patch
 * -> site structure changes -> stale target detected & recovered -> conflicting patch
 * resolved -> failing verification blocks publish -> rollback -> page + audit agree.
 */

const TEST_DB_PATH = path.join(import.meta.dirname, "test-lifecycle-db.json");
const actor = { id: "lead-dev", name: "Lead Developer", role: "developer" as const };

type SiteVersion = "baseline" | "drifted";
let siteVersion: SiteVersion = "baseline";

let apiServer: http.Server;
let apiRoot: string; // http://localhost:PORT
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

/** Loads the *current* storefront markup into a fresh DOM and runs the client runtime on it. */
async function loadStorefront(query = "") {
  const html = await (await fetch(`${storefrontUrl}/`)).text();
  const win = new Window({ url: `${storefrontUrl}/${query}` });
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

function button(doc: Document): HTMLElement {
  return (doc.querySelector("#checkout-btn") || doc.querySelector("#pay-now-action")) as HTMLElement;
}

async function createPatch(name: string, selector: string, value: string, extra: object = {}) {
  const res = await api("POST", "/patches", {
    websiteId: "demo-store",
    name,
    targetFingerprint: {
      tag: "button",
      role: "button",
      selector,
      text: "Complete Order",
      accessibleName: "Complete Order",
      parentContext: "checkout-summary",
      ...extra,
    },
    operation: { type: "style.set", property: "background-color", value },
    actor,
  });
  expect(res.status).toBe(201);
  return res.json;
}

async function verify(patchId: string) {
  const res = await api("POST", `/patches/${patchId}/verify`, { websiteBaseUrl: storefrontUrl });
  expect(res.status).toBe(200);
  return res.json;
}

async function statusOf(patchId: string): Promise<string> {
  return (await api("GET", `/patches/${patchId}`)).json.status;
}

async function runScenario() {
  siteVersion = "baseline";

  // 1. Baseline site: no active release, button is the original blue.
  {
    const { doc, runtime } = await loadStorefront();
    expect(runtime.mode).toBe("production");
    expect(runtime.results.length).toBe(0);
    expect(button(doc).style.backgroundColor).toBe("rgb(0, 0, 255)");
  }

  // 2. Select the checkout button, create and save a patch (draft).
  const p1 = await createPatch("Emerald checkout button", "#checkout-btn", "#10b981");
  expect(p1.status).toBe("draft");

  // 3. Preview: isolated to ?patchwork_preview, production stays unpatched.
  {
    const preview = await loadStorefront(`?patchwork_preview=${p1.id}`);
    expect(preview.runtime.mode).toBe("preview");
    expect(preview.runtime.results[0].status).toBe("applied");
    expect(button(preview.doc).style.backgroundColor).toBe("#10b981");

    const production = await loadStorefront();
    expect(production.runtime.results.length).toBe(0);
    expect(button(production.doc).style.backgroundColor).toBe("rgb(0, 0, 255)");
  }

  // 4. Real Playwright verification passes and the gate opens.
  const run1 = await verify(p1.id);
  expect(run1.status).toBe("passed");
  expect(await statusOf(p1.id)).toBe("verified");

  // 5. Publish release 1 and confirm the live site reflects the patch.
  const rel1 = await api("POST", "/websites/demo-store/releases", {
    patchIds: [p1.id],
    actor,
    changeSummary: "Emerald checkout CTA",
  });
  expect(rel1.status).toBe(201);
  expect(rel1.json.status).toBe("active");
  {
    const live = await loadStorefront();
    expect(live.runtime.releaseId).toBe(rel1.json.id);
    expect(button(live.doc).style.backgroundColor).toBe("#10b981");
  }

  // 6. Structural website update: the button's id and wrapper change.
  siteVersion = "drifted";
  {
    const live = await loadStorefront();
    // The published patch can no longer find its target: it fails safe (no breakage)...
    expect(live.runtime.results[0].status).toBe("stale");
    expect(button(live.doc).style.backgroundColor).toBe("rgb(0, 0, 255)");
    // ...and the operator is shown the drift.
    expect(live.doc.getElementById("patchwork-drift-watermark")).not.toBeNull();
  }

  // 7. New patch written against the old structure is detected as stale with a candidate,
  //    then recovered by rebinding, re-verified and approved.
  const p2 = await createPatch("Violet checkout button", "#checkout-btn", "#8b5cf6");
  const staleRun = await verify(p2.id);
  expect(staleRun.status).toBe("failed");
  expect(staleRun.error).toContain("DOM Drift Detected");
  expect(staleRun.error).toContain("#pay-now-action");
  expect(await statusOf(p2.id)).toBe("stale");

  const rebind = await api("POST", `/patches/${p2.id}/rebind`, {
    selector: "#pay-now-action",
    changeNote: "Rebound after storefront restructure",
    actor,
  });
  expect(rebind.status).toBe(200);
  expect(rebind.json.status).toBe("previewing");
  // Rebinding does not bypass the gate.
  expect(
    (await api("POST", "/websites/demo-store/releases", { patchIds: [p2.id], actor })).status
  ).toBe(400);

  expect((await verify(p2.id)).status).toBe("passed");
  expect(await statusOf(p2.id)).toBe("verified");

  // 8. A conflicting patch (same element + property) is detected, blocks publish, then is resolved.
  const p3 = await createPatch("Crimson checkout button", "#pay-now-action", "#ef4444");
  expect((await verify(p3.id)).status).toBe("passed");

  const conflicts = await api("GET", "/websites/demo-store/conflicts");
  expect(conflicts.json.hasConflicts).toBe(true);

  const blocked = await api("POST", "/websites/demo-store/releases", {
    patchIds: [p2.id, p3.id],
    actor,
  });
  expect(blocked.status).toBe(400);
  expect(blocked.json.error).toContain("Conflicting patches detected");

  const resolved = await api("POST", `/patches/${p2.id}/resolve-conflict`, {
    strategy: "keep_this",
    supersededPatchId: p3.id,
    reason: "Design chose violet",
    actor,
  });
  expect(resolved.status).toBe(200);
  expect(resolved.json.supersededPatch.status).toBe("archived");
  expect((await verify(p2.id)).status).toBe("passed");

  // 9. A failing verification blocks publication.
  const p4 = await api("POST", "/patches", {
    websiteId: "demo-store",
    name: "Broken target",
    targetFingerprint: { tag: "div", selector: "#does-not-exist" },
    operation: { type: "text.set", value: "nope" },
    actor,
  });
  const failedRun = await verify(p4.json.id);
  expect(failedRun.status).toBe("failed");
  expect(["verification_failed", "stale"]).toContain(await statusOf(p4.json.id));
  const failedPublish = await api("POST", "/websites/demo-store/releases", {
    patchIds: [p2.id, p4.json.id],
    actor,
  });
  expect(failedPublish.status).toBe(400);
  expect(failedPublish.json.error).toContain("Only 'verified' patches can be released");
  // Nothing changed live.
  expect((await api("GET", "/websites/demo-store/active-release")).json.release.id).toBe(
    rel1.json.id
  );

  // 10. Publish the recovered patch as release 2; the live (restructured) site shows it.
  const rel2 = await api("POST", "/websites/demo-store/releases", {
    patchIds: [p2.id],
    actor,
    changeSummary: "Violet CTA after restructure",
  });
  expect(rel2.status).toBe(201);
  {
    const live = await loadStorefront();
    expect(live.runtime.releaseId).toBe(rel2.json.id);
    expect(button(live.doc).style.backgroundColor).toBe("#8b5cf6");
  }

  // 11. Roll back to the last known-good release.
  const rollback = await api("POST", "/websites/demo-store/rollback", {
    actor,
    reason: "Rolling back to last known-good release",
  });
  expect(rollback.status).toBe(200);
  expect(rollback.json.restoredBaseline).toBe(false);

  // 12. Page and audit trail match the final state.
  const active = (await api("GET", "/websites/demo-store/active-release")).json;
  expect(active.release.id).toBe(rel1.json.id);
  expect(await statusOf(p2.id)).toBe("rolled_back");
  expect(await statusOf(p1.id)).toBe("published");
  {
    const live = await loadStorefront();
    expect(live.runtime.releaseId).toBe(rel1.json.id);
    // Release 2's violet is gone from the page.
    expect(button(live.doc).style.backgroundColor).not.toBe("#8b5cf6");
    // Release 1 targets the pre-restructure layout, so the runtime flags it for review again.
    expect(live.runtime.results[0].status).toBe("stale");
  }
  expect((await api("GET", "/websites/demo-store")).json.activeReleaseId).toBe(rel1.json.id);

  const audit: any[] = (await api("GET", "/audit-events?websiteId=demo-store")).json;
  const actions = audit.map((e) => e.action);
  for (const expected of [
    "patch.created",
    "verification.started",
    "verification.passed",
    "verification.failed",
    "release.published",
    "release.rolled_back",
  ]) {
    expect(actions).toContain(expected);
  }
  expect(audit.filter((e) => e.action === "release.published").length).toBe(2);
  expect(audit.some((e) => e.details?.metadata?.actionType === "conflict_resolution")).toBe(true);
  expect(audit.some((e) => e.details?.metadata?.migration === "target_rebind")).toBe(true);
  // The latest release event is the rollback, and it names the release that was restored.
  const newestReleaseEvent = audit.find((e) => e.entityType === "release");
  expect(newestReleaseEvent.action).toBe("release.rolled_back");
  expect(newestReleaseEvent.details.metadata.restoredReleaseId).toBe(rel1.json.id);
}

describe("Phase 7: complete lifecycle scenario", () => {
  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const service = new PatchService(new JsonFileStore(TEST_DB_PATH));
    apiServer = createServer(service, { enableDemoReset: true });
    await new Promise<void>((resolve) =>
      apiServer.listen(0, () => {
        apiRoot = `http://localhost:${(apiServer.address() as any).port}`;
        resolve();
      })
    );

    const runtimeScript = fs.readFileSync(
      path.join(import.meta.dirname, "../../runtime/dist/patchwork.js"),
      "utf-8"
    );
    storefrontServer = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      if (url.pathname === "/patchwork.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" });
        res.end(runtimeScript);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
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
    await new Promise<void>((r) => apiServer.close(() => r()));
    await new Promise<void>((r) => storefrontServer.close(() => r()));
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it(
    "succeeds twice in a row, with a demo reset in between",
    async () => {
      await runScenario();

      const reset = await api("POST", "/admin/reset");
      expect(reset.status).toBe(200);
      expect((await api("GET", "/patches")).json.length).toBe(0);
      expect((await api("GET", "/releases")).json.length).toBe(0);

      await runScenario();
    },
    240000
  );
});
