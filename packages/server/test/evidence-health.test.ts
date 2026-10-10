import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(import.meta.dirname, "test-evidence-health-db.json");

describe("Server: Patch Evidence & Release Health Monitoring", () => {
  let store: JsonFileStore;
  let service: PatchService;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    store = new JsonFileStore(TEST_DB_PATH);
    service = new PatchService(store, {
      verifier: async (options) => {
        const isDrift = options.patch.targetFingerprint.selector.includes("drift");
        return {
          id: `mock-run-${Date.now()}`,
          patchId: options.patch.id,
          websiteId: options.patch.websiteId,
          status: isDrift ? "failed" : "passed",
          error: isDrift ? "DOM Drift Detected on selector" : undefined,
          viewportsRun: [
            { name: "Desktop", width: 1280, height: 800, passed: !isDrift },
            { name: "Mobile", width: 375, height: 667, passed: !isDrift },
          ],
          assertions: [{ assertionId: "style-applied", passed: !isDrift }],
          durationMs: 450,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        };
      },
    });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it("produces a structured Patch Evidence Record for draft and verified states", async () => {
    const patch = service.createPatch({
      websiteId: "demo-store",
      name: "Update button color",
      targetFingerprint: { tag: "button", selector: "#cta-btn" },
      operation: { type: "style.set", property: "color", value: "white" },
      actor: { id: "dev-1", name: "Dev", role: "developer" },
    });

    // In draft state, evidence shows needs_verification
    const draftEvidence = service.getPatchEvidence(patch.id);
    expect(draftEvidence.patchId).toBe(patch.id);
    expect(draftEvidence.status).toBe("draft");
    expect(draftEvidence.readinessDecision).toBe("needs_verification");
    expect(draftEvidence.blastRadius.riskLevel).toBe("medium");

    // After running verification
    await service.verifyPatch(patch.id);
    const verifiedEvidence = service.getPatchEvidence(patch.id);
    expect(verifiedEvidence.status).toBe("verified");
    expect(verifiedEvidence.readinessDecision).toBe("ready_to_publish");
    expect(verifiedEvidence.blastRadius.riskLevel).toBe("low");
    expect(verifiedEvidence.blastRadius.verificationPassed).toBe(true);
  });

  it("runs checkReleaseHealth and detects healthy vs degraded releases", async () => {
    // 1. With no active release, reports baseline
    const baselineHealth = await service.checkReleaseHealth("demo-store");
    expect(baselineHealth.status).toBe("baseline");
    expect(baselineHealth.patchesChecked).toBe(0);

    // 2. Deploy a verified patch into active release
    const p1 = service.createPatch({
      websiteId: "demo-store",
      name: "Good patch",
      targetFingerprint: { tag: "button", selector: "#ok-btn" },
      operation: { type: "style.set", property: "color", value: "green" },
      actor: { id: "dev-1", name: "Dev", role: "developer" },
    });
    await service.verifyPatch(p1.id);

    service.createRelease({
      websiteId: "demo-store",
      patchIds: [p1.id],
      actor: { id: "dev-1", name: "Dev", role: "developer" },
    });

    const healthyRelease = await service.checkReleaseHealth("demo-store");
    expect(healthyRelease.status).toBe("healthy");
    expect(healthyRelease.patchesChecked).toBe(1);
    expect(healthyRelease.results[0].status).toBe("healthy");

    // 3. Deploy a drifted patch into active release
    const pDrift = service.createPatch({
      websiteId: "demo-store",
      name: "Drifted patch",
      targetFingerprint: { tag: "button", selector: "#drift-btn" },
      operation: { type: "style.set", property: "color", value: "red" },
      actor: { id: "dev-1", name: "Dev", role: "developer" },
    });
    // Force verification status to test release health detection
    pDrift.status = "verified";
    store.savePatch(pDrift);

    service.createRelease({
      websiteId: "demo-store",
      patchIds: [pDrift.id],
      actor: { id: "dev-1", name: "Dev", role: "developer" },
    });

    const degradedHealth = await service.checkReleaseHealth("demo-store");
    expect(degradedHealth.status).toBe("target_missing");
    expect(degradedHealth.recommendation).toContain("Safe 1-click rollback recommended");
  });
});
