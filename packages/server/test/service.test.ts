import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PatchService } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";
import type { AuditActor, PatchOperation, TargetFingerprint } from "@patchwork/contracts";

const TEST_DB_PATH = path.join(import.meta.dirname, "test-data.json");

describe("PatchService Domain & Persistence Engine", () => {
  const actor: AuditActor = {
    id: "dev-alex",
    name: "Alex Dev",
    role: "developer",
  };

  const defaultFingerprint: TargetFingerprint = {
    tag: "button",
    role: "button",
    text: "Continue to Checkout",
    selector: "#checkout-btn",
    parentContext: "checkout-summary",
  };

  const defaultOperation: PatchOperation = {
    type: "style.set",
    property: "display",
    value: "inline-flex",
  };

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it("creates a draft patch at version 1 with audit event", () => {
    const store = new JsonFileStore(TEST_DB_PATH);
    const service = new PatchService(store);

    const patch = service.createPatch({
      websiteId: "demo-store",
      name: "Restore mobile checkout button",
      targetFingerprint: defaultFingerprint,
      operation: defaultOperation,
      actor,
    });

    expect(patch.id).toMatch(/^patch-/);
    expect(patch.status).toBe("draft");
    expect(patch.currentVersion).toBe(1);
    expect(patch.versions.length).toBe(1);
    expect(patch.versions[0].version).toBe(1);
    expect(patch.versions[0].operation).toEqual(defaultOperation);

    const events = service.listAuditEvents();
    expect(events.length).toBe(1);
    expect(events[0].action).toBe("patch.created");
    expect(events[0].entityId).toBe(patch.id);
  });

  it("creates immutable versions when updating a draft patch", () => {
    const store = new JsonFileStore(TEST_DB_PATH);
    const service = new PatchService(store);

    const patch = service.createPatch({
      websiteId: "demo-store",
      name: "Restore checkout button",
      targetFingerprint: defaultFingerprint,
      operation: defaultOperation,
      actor,
    });

    const updatedOperation: PatchOperation = {
      type: "style.set",
      property: "background-color",
      value: "#10b981",
    };

    const updated = service.updatePatchDraft(patch.id, {
      operation: updatedOperation,
      changeNote: "Switched to emerald green background",
      actor,
    });

    expect(updated.currentVersion).toBe(2);
    expect(updated.versions.length).toBe(2);
    expect(updated.versions[0].version).toBe(1);
    expect(updated.versions[1].version).toBe(2);
    expect(updated.versions[1].changeNote).toBe("Switched to emerald green background");
    expect(updated.operation).toEqual(updatedOperation);
  });

  it("enforces legal transitions and rejects illegal transitions", () => {
    const store = new JsonFileStore(TEST_DB_PATH);
    const service = new PatchService(store);

    const patch = service.createPatch({
      websiteId: "demo-store",
      name: "Restore checkout button",
      targetFingerprint: defaultFingerprint,
      operation: defaultOperation,
      actor,
    });

    // Attempt direct transition draft -> published (ILLEGAL)
    expect(() => {
      service.transitionPatchStatus(patch.id, "published", actor);
    }).toThrow(/cannot transition directly from 'draft' to 'published'/);

    // draft -> previewing (LEGAL)
    const previewing = service.transitionPatchStatus(patch.id, "previewing", actor);
    expect(previewing.status).toBe("previewing");

    // previewing -> verified (LEGAL)
    const verified = service.transitionPatchStatus(patch.id, "verified", actor);
    expect(verified.status).toBe("verified");
  });

  it("creates a release with verified patches and executes atomic rollback", () => {
    const store = new JsonFileStore(TEST_DB_PATH);
    const service = new PatchService(store);

    // Create and verify patch
    const patch = service.createPatch({
      websiteId: "demo-store",
      name: "Restore checkout button",
      targetFingerprint: defaultFingerprint,
      operation: defaultOperation,
      actor,
    });
    service.transitionPatchStatus(patch.id, "previewing", actor);
    service.transitionPatchStatus(patch.id, "verified", actor);

    // Create Release 1
    const release1 = service.createRelease({
      websiteId: "demo-store",
      patchIds: [patch.id],
      actor,
    });

    expect(release1.version).toBe(1);
    expect(release1.status).toBe("active");
    expect(service.getPatch(patch.id)?.status).toBe("published");
    expect(service.getActiveRelease("demo-store")?.id).toBe(release1.id);

    // Rollback Release 1
    const rollbackResult = service.rollbackRelease("demo-store", actor);
    expect(rollbackResult.success).toBe(true);
    expect(service.getActiveRelease("demo-store")).toBeUndefined();
    expect(service.getPatch(patch.id)?.status).toBe("rolled_back");
  });

  it("persists and restores state across service restarts", () => {
    const store1 = new JsonFileStore(TEST_DB_PATH);
    const service1 = new PatchService(store1);

    const patch = service1.createPatch({
      websiteId: "demo-store",
      name: "Persistence test",
      targetFingerprint: defaultFingerprint,
      operation: defaultOperation,
      actor,
    });

    // Instantiate a new service on the same file path
    const store2 = new JsonFileStore(TEST_DB_PATH);
    const service2 = new PatchService(store2);

    const retrieved = service2.getPatch(patch.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Persistence test");
    expect(retrieved?.currentVersion).toBe(1);
  });

  it("rebinds patch target, creates immutable version, emits audit event, and resets status for re-verification", () => {
    const store = new JsonFileStore(TEST_DB_PATH);
    const service = new PatchService(store);

    const patch = service.createPatch({
      websiteId: "demo-store",
      name: "Checkout Button Visibility",
      targetFingerprint: defaultFingerprint,
      operation: defaultOperation,
      actor,
    });

    // Mark as stale due to DOM drift
    service.transitionPatchStatus(patch.id, "previewing", actor);
    service.transitionPatchStatus(patch.id, "stale", actor, "Target missing");
    expect(service.getPatch(patch.id)?.status).toBe("stale");

    // Rebind target to #pay-now-action
    const rebound = service.rebindPatchTarget(patch.id, {
      selector: "#pay-now-action",
      targetFingerprint: {
        accessibleName: "Continue to Checkout",
      },
      actor,
      changeNote: "Target migrated from #checkout-btn to #pay-now-action",
    });

    expect(rebound.currentVersion).toBe(2);
    expect(rebound.status).toBe("previewing");
    expect(rebound.targetFingerprint.selector).toBe("#pay-now-action");
    expect(rebound.versions.length).toBe(2);
    expect(rebound.versions[0].targetFingerprint.selector).toBe("#checkout-btn");
    expect(rebound.versions[1].targetFingerprint.selector).toBe("#pay-now-action");

    // Audit trail should log the migration
    const events = service.listAuditEvents({ entityId: patch.id });
    const rebindEvent = events.find(
      (e) => e.details?.metadata?.migration === "target_rebind"
    );
    expect(rebindEvent).toBeDefined();
    expect(rebindEvent?.details.metadata?.fromSelector).toBe("#checkout-btn");
    expect(rebindEvent?.details.metadata?.toSelector).toBe("#pay-now-action");

    // Release publication must be blocked until verified
    expect(() => {
      service.createRelease({
        websiteId: "demo-store",
        patchIds: [patch.id],
        actor,
      });
    }).toThrow(/cannot be published/i);
  });
});

