import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";
import { createServer } from "../src/api.js";

const TEST_DB_PATH = path.join(process.cwd(), ".scratch", "test-conflicts-db.json");

describe("Deterministic Conflict Detection & Resolution Workflow", () => {
  let store: JsonFileStore;
  let service: PatchService;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    store = new JsonFileStore(TEST_DB_PATH);
    service = new PatchService(store);
    server = createServer(service);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(() => {
    server.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it("detects property collisions between competing patches on the same element", () => {
    const actor = { id: "dev-1", name: "Dev One", role: "developer" as const };

    const p1 = service.createPatch({
      websiteId: "demo-store",
      name: "Green Banner",
      targetFingerprint: {
        tag: "button",
        selector: "#checkout-btn",
        role: "button",
      },
      operation: {
        type: "style.set",
        property: "background-color",
        value: "#10b981",
      },
      actor,
    });

    const p2 = service.createPatch({
      websiteId: "demo-store",
      name: "Red Banner",
      targetFingerprint: {
        tag: "button",
        selector: "#checkout-btn",
        role: "button",
      },
      operation: {
        type: "style.set",
        property: "background-color",
        value: "#ef4444",
      },
      actor,
    });

    const conflicts = service.getWebsiteConflicts("demo-store");
    expect(conflicts.hasConflicts).toBe(true);
    expect(conflicts.conflicts.length).toBe(1);
    expect(conflicts.conflicts[0].patchAId).toBe(p1.id);
    expect(conflicts.conflicts[0].patchBId).toBe(p2.id);
    expect(conflicts.conflicts[0].collidingProperty).toBe("background-color");

    const checkDirect = service.checkPatchConflicts(p1.id);
    expect(checkDirect.conflicts.length).toBe(1);
    expect(checkDirect.conflicts[0].patchBId).toBe(p2.id);
  });

  it("allows non-overlapping style properties and distinct elements to coexist without conflict", () => {
    const actor = { id: "dev-1", name: "Dev One", role: "developer" as const };

    // Patch 1: button background color
    service.createPatch({
      websiteId: "demo-store",
      name: "Green Button",
      targetFingerprint: {
        tag: "button",
        selector: "#checkout-btn",
      },
      operation: {
        type: "style.set",
        property: "background-color",
        value: "#10b981",
      },
      actor,
    });

    // Patch 2: button padding (same button, different CSS property -> NO conflict)
    service.createPatch({
      websiteId: "demo-store",
      name: "Button Padding",
      targetFingerprint: {
        tag: "button",
        selector: "#checkout-btn",
      },
      operation: {
        type: "style.set",
        property: "padding",
        value: "16px 24px",
      },
      actor,
    });

    // Patch 3: header text (different target -> NO conflict)
    service.createPatch({
      websiteId: "demo-store",
      name: "Header Banner",
      targetFingerprint: {
        tag: "h1",
        selector: ".promo-header",
      },
      operation: {
        type: "text.set",
        value: "Winter Special Sale",
      },
      actor,
    });

    const conflicts = service.getWebsiteConflicts("demo-store");
    expect(conflicts.hasConflicts).toBe(false);
    expect(conflicts.conflicts.length).toBe(0);
  });

  it("exposes GET /api/websites/:id/conflicts and POST /api/patches/check-conflicts", async () => {
    const actor = { id: "dev-1", name: "Dev One", role: "developer" as const };

    const p1 = service.createPatch({
      websiteId: "demo-store",
      name: "Hide Buy Button",
      targetFingerprint: { tag: "button", selector: "#buy-now" },
      operation: { type: "element.hide" },
      actor,
    });

    const p2 = service.createPatch({
      websiteId: "demo-store",
      name: "Change Buy Button Text",
      targetFingerprint: { tag: "button", selector: "#buy-now" },
      operation: { type: "text.set", value: "Purchase Immediately" },
      actor,
    });

    // 1. GET /api/websites/:id/conflicts
    const siteRes = await fetch(`${baseUrl}/api/websites/demo-store/conflicts`);
    expect(siteRes.status).toBe(200);
    const siteJson: any = await siteRes.json();
    expect(siteJson.hasConflicts).toBe(true);
    expect(siteJson.conflicts.length).toBe(1);

    // 2. POST /api/patches/check-conflicts with patchIds array
    const checkRes = await fetch(`${baseUrl}/api/patches/check-conflicts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patchIds: [p1.id, p2.id] }),
    });
    expect(checkRes.status).toBe(200);
    const checkJson: any = await checkRes.json();
    expect(checkJson.hasConflicts).toBe(true);

    // 3. POST /api/patches/check-conflicts with single patchId
    const singleRes = await fetch(`${baseUrl}/api/patches/check-conflicts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patchId: p1.id }),
    });
    expect(singleRes.status).toBe(200);
    const singleJson: any = await singleRes.json();
    expect(singleJson.conflicts.length).toBe(1);
    expect(singleJson.conflicts[0].patchBId).toBe(p2.id);
  });

  it("resolves conflict via strategy 'keep_this' and archives superseded patch", async () => {
    const actor = { id: "dev-1", name: "Dev One", role: "developer" as const };

    const p1 = service.createPatch({
      websiteId: "demo-store",
      name: "Green Button",
      targetFingerprint: { tag: "button", selector: "#checkout-btn" },
      operation: { type: "style.set", property: "background-color", value: "#10b981" },
      actor,
    });

    const p2 = service.createPatch({
      websiteId: "demo-store",
      name: "Red Button",
      targetFingerprint: { tag: "button", selector: "#checkout-btn" },
      operation: { type: "style.set", property: "background-color", value: "#ef4444" },
      actor,
    });

    const res = await fetch(`${baseUrl}/api/patches/${p1.id}/resolve-conflict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        strategy: "keep_this",
        supersededPatchId: p2.id,
        reason: "Marketing team chose Emerald Green for checkout conversion",
        actor,
      }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.patch.id).toBe(p1.id);
    expect(json.patch.status).toBe("previewing"); // Ready for mandatory re-verification
    expect(json.supersededPatch.id).toBe(p2.id);
    expect(json.supersededPatch.status).toBe("archived");

    // Conflicts should now be cleared
    const conflicts = service.getWebsiteConflicts("demo-store");
    expect(conflicts.hasConflicts).toBe(false);

    // Verify audit event
    const events = service.listAuditEvents("demo-store");
    const resolveEvent = events.find(
      (e) => e.details?.metadata?.actionType === "conflict_resolution"
    );
    expect(resolveEvent).toBeDefined();
    expect(resolveEvent?.details?.metadata?.strategy).toBe("keep_this");
    expect(resolveEvent?.details?.metadata?.supersededPatchId).toBe(p2.id);
  });

  it("resolves conflict via strategy 'revise_value' creating new version", async () => {
    const actor = { id: "dev-1", name: "Dev One", role: "developer" as const };

    const p1 = service.createPatch({
      websiteId: "demo-store",
      name: "CTA Color",
      targetFingerprint: { tag: "button", selector: "#checkout-btn" },
      operation: { type: "style.set", property: "background-color", value: "#10b981" },
      actor,
    });

    const p2 = service.createPatch({
      websiteId: "demo-store",
      name: "CTA Alert Color",
      targetFingerprint: { tag: "button", selector: "#checkout-btn" },
      operation: { type: "style.set", property: "background-color", value: "#ef4444" },
      actor,
    });

    const res = await fetch(`${baseUrl}/api/patches/${p1.id}/resolve-conflict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        strategy: "revise_value",
        supersededPatchId: p2.id,
        revisedOperation: {
          type: "style.set",
          property: "background-color",
          value: "#6366f1", // Indigo compromise
        },
        reason: "Compromised on Indigo Indigo-500",
        actor,
      }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.patch.currentVersion).toBe(2);
    expect(json.patch.operation.value).toBe("#6366f1");
    expect(json.patch.status).toBe("previewing");
    expect(json.supersededPatch.status).toBe("archived");
  });

  it("strictly enforces release gating: blocks release when patches collide", () => {
    const actor = { id: "dev-1", name: "Dev One", role: "developer" as const };

    const p1 = service.createPatch({
      websiteId: "demo-store",
      name: "CTA Green",
      targetFingerprint: { tag: "button", selector: "#checkout-btn" },
      operation: { type: "style.set", property: "background-color", value: "#10b981" },
      actor,
    });

    const p2 = service.createPatch({
      websiteId: "demo-store",
      name: "CTA Red",
      targetFingerprint: { tag: "button", selector: "#checkout-btn" },
      operation: { type: "style.set", property: "background-color", value: "#ef4444" },
      actor,
    });

    // Manually transition to verified to test gate enforcement
    service.transitionPatchStatus(p1.id, "previewing", actor);
    service.transitionPatchStatus(p1.id, "verified", actor);
    service.transitionPatchStatus(p2.id, "previewing", actor);
    service.transitionPatchStatus(p2.id, "verified", actor);

    // Attempting to bundle p1 and p2 into the same release must throw error
    expect(() => {
      service.createRelease({
        websiteId: "demo-store",
        patchIds: [p1.id, p2.id],
        actor,
      });
    }).toThrow("Conflicting patches detected");
  });
});
