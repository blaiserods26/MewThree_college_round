import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "../src/api.js";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";

const TEST_DB_PATH = path.join(import.meta.dirname, "test-ai-api-db.json");
let server: http.Server;
let baseUrl: string;

describe("AI Endpoints HTTP API Suite", () => {
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

  describe("POST /api/ai/generate-patch", () => {
    it("generates a structured, allowlisted patch proposal from natural language prompt", async () => {
      const res = await fetch(`${baseUrl}/api/ai/generate-patch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId: "demo-store",
          prompt: "The checkout button is invisible on mobile. Restore it without changing the desktop layout.",
          elementContext: {
            tag: "button",
            selector: "#checkout-btn",
          },
        }),
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.name).toContain("checkout button");
      expect(data.targetFingerprint.selector).toBe("#checkout-btn");
      expect(data.operation.type).toBe("style.set");
      expect(data.operation.property).toBe("display");
      expect(data.operation.value).toBe("inline-block");
      expect(data.explanation).toBeTruthy();
      expect(data.confidence).toBeGreaterThan(0.7);

      // Now save this AI proposal as a standard draft patch via POST /api/patches
      const createRes = await fetch(`${baseUrl}/api/patches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId: "demo-store",
          name: data.name,
          targetFingerprint: data.targetFingerprint,
          operation: data.operation,
          actor: {
            id: "lead-dev",
            name: "Lead Developer (AI Copilot)",
            role: "developer",
          },
        }),
      });

      expect(createRes.status).toBe(201);
      const createdPatch: any = await createRes.json();
      expect(createdPatch.status).toBe("draft");
      expect(createdPatch.currentVersion).toBe(1);
    });

    it("returns 400 when prompt is omitted or empty", async () => {
      const res = await fetch(`${baseUrl}/api/ai/generate-patch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: "demo-store" }),
      });

      expect(res.status).toBe(400);
      const err: any = await res.json();
      expect(err.error).toContain("prompt");
    });
  });

  describe("POST /api/ai/explain-verification", () => {
    it("returns 400 when runId is missing", async () => {
      const res = await fetch(`${baseUrl}/api/ai/explain-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("runId");
    });

    it("returns 404 when verification run does not exist", async () => {
      const res = await fetch(`${baseUrl}/api/ai/explain-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: "non-existent-run-xyz" }),
      });
      expect(res.status).toBe(404);
      expect((await res.json()).error).toContain("not found");
    });
  });

  describe("POST /api/ai/disambiguate-target", () => {
    it("returns 400 when patchId is missing", async () => {
      const res = await fetch(`${baseUrl}/api/ai/disambiguate-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: [] }),
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("patchId");
    });

    it("returns 404 when patch does not exist", async () => {
      const res = await fetch(`${baseUrl}/api/ai/disambiguate-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patchId: "non-existent-patch", candidates: [] }),
      });
      expect(res.status).toBe(404);
      expect((await res.json()).error).toContain("not found");
    });

    it("disambiguates candidates for an existing patch", async () => {
      // 1. Create a patch
      const pRes = await fetch(`${baseUrl}/api/patches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId: "demo-store",
          name: "Checkout Button",
          targetFingerprint: { tag: "button", selector: "#checkout-btn", text: "Complete Order" },
          operation: { type: "style.set", property: "color", value: "white" },
          actor: { id: "dev", name: "Dev", role: "developer" },
        }),
      });
      const patch: any = await pRes.json();

      // 2. Request disambiguation
      const disambiguateRes = await fetch(`${baseUrl}/api/ai/disambiguate-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patchId: patch.id,
          candidates: [
            {
              selector: "#pay-now-action",
              tag: "button",
              score: 0.92,
              tier: "high",
              text: "Complete Order",
            },
            {
              selector: ".cancel-link",
              tag: "a",
              score: 0.35,
              tier: "low",
              text: "Cancel",
            },
          ],
        }),
      });

      expect(disambiguateRes.status).toBe(200);
      const data: any = await disambiguateRes.json();
      expect(data.recommendedSelector).toBe("#pay-now-action");
      expect(data.candidateRankings.length).toBe(2);
      expect(data.candidateRankings[0].rank).toBe(1);
      expect(data.reasoning).toBeTruthy();
    });
  });
});
