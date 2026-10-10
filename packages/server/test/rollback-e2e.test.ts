import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "../src/api.js";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";

const TEST_DB_PATH = path.join(import.meta.dirname, "test-e2e-db.json");
let server: http.Server;
let baseUrl: string;

describe("End-to-End Release & Rollback API Lifecycle", () => {
  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const store = new JsonFileStore(TEST_DB_PATH);
    const service = new PatchService(store);
    server = createServer(service);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === "object" && addr) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it("completes full flow: create -> preview -> verify -> release V1 -> release V2 -> rollback to V1 with audit logs", async () => {
    // 1. Create patch 1
    const p1Res = await fetch(`${baseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: "Patch 1",
        targetFingerprint: { tag: "button", selector: "#btn1" },
        operation: { type: "style.set", property: "display", value: "inline-flex" },
        actor: { id: "dev-1", name: "Dev 1", role: "developer" },
      }),
    });
    const patch1 = await p1Res.json();

    // Verify patch 1
    await fetch(`${baseUrl}/api/patches/${patch1.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStatus: "previewing", actor: { id: "dev-1", name: "Dev 1", role: "developer" } }),
    });
    await fetch(`${baseUrl}/api/patches/${patch1.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStatus: "verified", actor: { id: "dev-1", name: "Dev 1", role: "developer" } }),
    });

    // 2. Publish Release 1
    const r1Res = await fetch(`${baseUrl}/api/websites/demo-store/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patchIds: [patch1.id],
        actor: { id: "dev-1", name: "Dev 1", role: "developer" },
        changeSummary: "Deploy Patch 1",
      }),
    });
    expect(r1Res.status).toBe(201);
    const release1 = await r1Res.json();
    expect(release1.version).toBe(1);
    expect(release1.status).toBe("active");

    // 3. Create and verify patch 2
    const p2Res = await fetch(`${baseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: "Patch 2",
        targetFingerprint: { tag: "div", selector: "#banner" },
        operation: { type: "text.set", value: "Updated Banner" },
        actor: { id: "dev-1", name: "Dev 1", role: "developer" },
      }),
    });
    const patch2 = await p2Res.json();
    await fetch(`${baseUrl}/api/patches/${patch2.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStatus: "previewing", actor: { id: "dev-1", name: "Dev 1", role: "developer" } }),
    });
    await fetch(`${baseUrl}/api/patches/${patch2.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStatus: "verified", actor: { id: "dev-1", name: "Dev 1", role: "developer" } }),
    });

    // 4. Publish Release 2
    const r2Res = await fetch(`${baseUrl}/api/websites/demo-store/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patchIds: [patch1.id, patch2.id],
        actor: { id: "dev-1", name: "Dev 1", role: "developer" },
        changeSummary: "Deploy Patch 2 alongside Patch 1",
      }),
    });
    expect(r2Res.status).toBe(201);
    const release2 = await r2Res.json();
    expect(release2.version).toBe(2);
    expect(release2.status).toBe("active");

    // 5. Trigger Rollback on demo-store
    const rollbackRes = await fetch(`${baseUrl}/api/websites/demo-store/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actor: { id: "operator-1", name: "Operator", role: "developer" },
        reason: "Incident response test rollback",
      }),
    });
    expect(rollbackRes.status).toBe(200);
    const rollbackData = await rollbackRes.json();
    expect(rollbackData.success).toBe(true);

    // 6. Verify Active Release is now Release 1 again!
    const activeRelRes = await fetch(`${baseUrl}/api/websites/demo-store/active-release`);
    const activeData = await activeRelRes.json();
    expect(activeData.release.id).toBe(release1.id);
    expect(activeData.release.status).toBe("active");
    expect(activeData.release.version).toBe(1);

    // 7. Verify Audit Events capture release.rolled_back
    const auditRes = await fetch(`${baseUrl}/api/audit-events?websiteId=demo-store`);
    const auditEvents = await auditRes.json();
    const rollbackEvent = auditEvents.find((e: any) => e.action === "release.rolled_back");
    expect(rollbackEvent).toBeDefined();
    expect(rollbackEvent.actor.name).toBe("Operator");
  });
});
