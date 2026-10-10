import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "../src/api.js";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";
import { DefaultAiService } from "../src/ai.js";

const TEST_DB_PATH = path.join(import.meta.dirname, "test-ai-guardrails-db.json");
let server: http.Server;
let baseUrl: string;

describe("AI Safety Guardrails & Gate Enforcement", () => {
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

  it("strictly enforces release gate: AI-generated draft patch cannot be published without passing verification", async () => {
    // 1. Generate patch proposal via AI
    const genRes = await fetch(`${baseUrl}/api/ai/generate-patch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        prompt: "Make the checkout button emerald green",
        elementContext: { tag: "button", selector: "#checkout-btn" },
      }),
    });
    expect(genRes.status).toBe(200);
    const proposal: any = await genRes.json();

    // 2. Save proposal as standard draft patch
    const patchRes = await fetch(`${baseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: proposal.name,
        targetFingerprint: proposal.targetFingerprint,
        operation: proposal.operation,
        actor: { id: "dev-1", name: "Developer (AI Copilot)", role: "developer" },
      }),
    });
    expect(patchRes.status).toBe(201);
    const patch: any = await patchRes.json();
    expect(patch.status).toBe("draft");

    // 3. Attempt direct publication without verification -> MUST BE REJECTED BY RELEASE GATE
    const blockedReleaseRes = await fetch(`${baseUrl}/api/websites/demo-store/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patchIds: [patch.id],
        actor: { id: "dev-1", name: "Developer", role: "developer" },
      }),
    });
    expect(blockedReleaseRes.status).toBe(400);
    const releaseErr: any = await blockedReleaseRes.json();
    expect(releaseErr.error).toContain("Only 'verified' patches can be released");

    // 4. Verify patch is still in draft state and no releases created
    const checkPatch = await (await fetch(`${baseUrl}/api/patches/${patch.id}`)).json();
    expect(checkPatch.status).toBe("draft");
  });

  it("strictly enforces multi-patch conflict detection on AI-generated patches", async () => {
    // 1. Create first AI patch for button color
    const p1Res = await fetch(`${baseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: "AI Emerald Button",
        targetFingerprint: { tag: "button", selector: "#checkout-btn" },
        operation: { type: "style.set", property: "background-color", value: "#10b981" },
        actor: { id: "dev-1", name: "AI Agent", role: "developer" },
      }),
    });
    const patch1: any = await p1Res.json();

    // 2. Create second AI patch targeting SAME element and SAME property
    const p2Res = await fetch(`${baseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: "AI Crimson Button",
        targetFingerprint: { tag: "button", selector: "#checkout-btn" },
        operation: { type: "style.set", property: "background-color", value: "#ef4444" },
        actor: { id: "dev-1", name: "AI Agent", role: "developer" },
      }),
    });
    const patch2: any = await p2Res.json();

    // Transition both to verified
    await fetch(`${baseUrl}/api/patches/${patch1.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStatus: "previewing" }),
    });
    await fetch(`${baseUrl}/api/patches/${patch1.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStatus: "verified" }),
    });
    await fetch(`${baseUrl}/api/patches/${patch2.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStatus: "previewing" }),
    });
    await fetch(`${baseUrl}/api/patches/${patch2.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStatus: "verified" }),
    });

    // 3. Automated conflict check must identify the conflict
    const conflictRes = await fetch(`${baseUrl}/api/websites/demo-store/conflicts`);
    const conflictData: any = await conflictRes.json();
    expect(conflictData.hasConflicts).toBe(true);

    // 4. Release bundling must be strictly blocked
    const releaseRes = await fetch(`${baseUrl}/api/websites/demo-store/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patchIds: [patch1.id, patch2.id],
        actor: { id: "lead-dev", name: "Lead", role: "developer" },
      }),
    });
    expect(releaseRes.status).toBe(400);
    const releaseErr: any = await releaseRes.json();
    expect(releaseErr.error).toContain("Conflicting patches detected");
  });

  it("prohibits execution of arbitrary scripts or eval from rogue AI output", async () => {
    // Attempt to directly post rogue operation disguised as AI proposal
    const rogueRes = await fetch(`${baseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: "Malicious AI Payload",
        targetFingerprint: { tag: "body", selector: "body" },
        operation: { type: "eval.script", code: "process.exit(1)" },
        actor: { id: "attacker", name: "Attacker", role: "developer" },
      }),
    });
    expect(rogueRes.status).toBe(400);
    const err: any = await rogueRes.json();
    expect(err.error).toContain("Unsupported operation type");
  });
});
