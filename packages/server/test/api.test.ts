import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "../src/api.js";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";

const TEST_DB_PATH = path.join(import.meta.dirname, "test-api-db.json");
let server: http.Server;
let baseUrl: string;

describe("PATCHWORK HTTP REST API Endpoints", () => {
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

  it("POST /api/patches creates a new draft patch with 201 status", async () => {
    const payload = {
      websiteId: "demo-store",
      name: "Fix mobile checkout button",
      targetFingerprint: {
        tag: "button",
        role: "button",
        text: "Continue to Checkout",
        selector: "#checkout-btn",
      },
      operation: {
        type: "style.set",
        property: "display",
        value: "inline-flex",
      },
      actor: {
        id: "dev-1",
        name: "Dev One",
        role: "developer",
      },
    };

    const res = await fetch(`${baseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toMatch(/^patch-/);
    expect(data.status).toBe("draft");
    expect(data.currentVersion).toBe(1);
  });

  it("GET /api/patches lists created patches", async () => {
    const res = await fetch(`${baseUrl}/api/patches?websiteId=demo-store`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/patches/:id/transition validates transitions and blocks illegal ones with 400", async () => {
    // 1. Create a patch
    const createRes = await fetch(`${baseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: "Test transition gating",
        targetFingerprint: { tag: "button", selector: "#btn" },
        operation: { type: "style.set", property: "display", value: "block" },
        actor: { id: "dev-1", name: "Dev", role: "developer" },
      }),
    });
    const patch = await createRes.json();

    // 2. Attempt illegal transition draft -> published
    const illegalRes = await fetch(`${baseUrl}/api/patches/${patch.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetStatus: "published",
        actor: { id: "dev-1", name: "Dev", role: "developer" },
      }),
    });

    expect(illegalRes.status).toBe(400);
    const errData = await illegalRes.json();
    expect(errData.error).toContain("cannot transition directly from 'draft' to 'published'");

    // 3. Legal transition draft -> previewing
    const legalRes = await fetch(`${baseUrl}/api/patches/${patch.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetStatus: "previewing",
        actor: { id: "dev-1", name: "Dev", role: "developer" },
      }),
    });

    expect(legalRes.status).toBe(200);
    const updated = await legalRes.json();
    expect(updated.status).toBe("previewing");
  });

  it("GET /api/websites/:id/active-release serves release and bundle", async () => {
    const res = await fetch(`${baseUrl}/api/websites/demo-store/active-release`);
    expect(res.status).toBe(200);
    const data = await res.json();
    // initially null or empty release
    expect(data).toHaveProperty("release");
    expect(data).toHaveProperty("patches");
  });

  it("GET /api/audit-events returns audit trail", async () => {
    const res = await fetch(`${baseUrl}/api/audit-events`);
    expect(res.status).toBe(200);
    const events = await res.json();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});
