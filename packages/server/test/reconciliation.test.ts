import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(import.meta.dirname, "test-reconciliation-db.json");

describe("Server: Hotfix-to-PR Reconciliation & Backport Engine", () => {
  let store: JsonFileStore;
  let service: PatchService;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    store = new JsonFileStore(TEST_DB_PATH);
    service = new PatchService(store, {
      verifier: async (options) => ({
        id: `mock-run-${Date.now()}`,
        patchId: options.patch.id,
        websiteId: options.patch.websiteId,
        status: "passed",
        viewportsRun: [
          { name: "Desktop", width: 1280, height: 800, passed: true },
          { name: "Mobile", width: 375, height: 667, passed: true },
        ],
        assertions: [{ assertionId: "style-applied", passed: true }],
        durationMs: 200,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }),
    });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it("translates active release patches into a valid git unified diff and PR body", async () => {
    // 1. Create and verify two patches: one style.set and one element.hide
    const patch1 = service.createPatch({
      websiteId: "demo-store",
      name: "Fix banner contrast",
      targetFingerprint: { tag: "div", selector: ".promo-banner" },
      operation: { type: "style.set", property: "background-color", value: "#1e1b4b" },
      actor: { id: "dev-1", name: "Alice", role: "developer" },
    });

    const patch2 = service.createPatch({
      websiteId: "demo-store",
      name: "Hide broken badge",
      targetFingerprint: { tag: "span", selector: ".outdated-badge" },
      operation: { type: "element.hide" },
      actor: { id: "dev-1", name: "Alice", role: "developer" },
    });

    await service.verifyPatch(patch1.id, { actor: { id: "dev-1", name: "Alice", role: "developer" } });
    await service.verifyPatch(patch2.id, { actor: { id: "dev-1", name: "Alice", role: "developer" } });

    // 2. Publish release bundle
    const release = service.createRelease({
      websiteId: "demo-store",
      patchIds: [patch1.id, patch2.id],
      actor: { id: "dev-1", name: "Alice", role: "developer" },
      changeSummary: "Emergency promo banner styling and badge cleanup",
    });

    expect(release.version).toBe(1);

    // 3. Reconcile release to PR
    const result = service.exportReleaseToPr(release.id, {
      actor: { id: "dev-1", name: "Alice", role: "developer" },
    });

    expect(result.releaseId).toBe(release.id);
    expect(result.version).toBe(1);
    expect(result.branchName).toBe("hotfix/patchwork-v1-backport");
    expect(result.filesModified).toContain("packages/storefront/styles.css");

    // Unified diff structure checks
    expect(result.patchDiff).toContain("--- a/packages/storefront/styles.css");
    expect(result.patchDiff).toContain("+++ b/packages/storefront/styles.css");
    expect(result.patchDiff).toContain(".promo-banner {");
    expect(result.patchDiff).toContain("background-color: #1e1b4b !important;");
    expect(result.patchDiff).toContain(".outdated-badge {");
    expect(result.patchDiff).toContain("display: none !important;");

    // PR body checks
    expect(result.prTitle).toContain("reconcile PATCHWORK Release v1 into codebase");
    expect(result.prBody).toContain("## 🩹 PATCHWORK Emergency Hotfix Reconciliation: Release v1");
    expect(result.prBody).toContain("Fix banner contrast");
    expect(result.prBody).toContain("Hide broken badge");

    // Audit event check
    const events = service.listAuditEvents("demo-store");
    const backportEvent = events.find((e) => e.action === "release.reconciled");
    expect(backportEvent).toBeDefined();
    expect(backportEvent?.entityId).toBe(release.id);
  });

  it("throws when release is not found or has no patches", () => {
    expect(() => service.exportReleaseToPr("invalid-release-id")).toThrow("Release 'invalid-release-id' not found.");
  });
});
