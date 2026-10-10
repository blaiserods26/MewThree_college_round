import { describe, it, expect } from "bun:test";
import {
  computeRollback,
  createAuditEvent,
  type Release,
  type Patch,
  type AuditActor,
} from "../src/index.js";

describe("Atomic Rollback Mechanics & Audit Trail", () => {
  const actor: AuditActor = {
    id: "dev-1",
    name: "Alex Dev",
    role: "developer",
  };

  it("successfully rolls back to the immediate prior release", () => {
    const r1: Release = {
      id: "REL-001",
      websiteId: "site-1",
      version: 1,
      status: "superseded",
      patchIds: ["P-1"],
      createdAt: "2026-10-10T10:00:00Z",
      createdBy: "dev-1",
      activatedAt: "2026-10-10T10:05:00Z",
    };

    const r2: Release = {
      id: "REL-002",
      websiteId: "site-1",
      version: 2,
      status: "active",
      patchIds: ["P-2"],
      createdAt: "2026-10-10T11:00:00Z",
      createdBy: "dev-1",
      activatedAt: "2026-10-10T11:05:00Z",
    };

    const patch1: Patch = {
      id: "P-1",
      websiteId: "site-1",
      name: "Banner patch",
      status: "published",
      currentVersion: 1,
      versions: [],
      targetFingerprint: { tag: "div", selector: "#banner" },
      operation: { type: "text.set", value: "Hello" },
      createdAt: "2026-10-10T09:00:00Z",
      updatedAt: "2026-10-10T09:00:00Z",
      createdBy: "dev-1",
    };

    const patch2: Patch = {
      id: "P-2",
      websiteId: "site-1",
      name: "Checkout fix",
      status: "published",
      currentVersion: 1,
      versions: [],
      targetFingerprint: { tag: "button", selector: "#btn" },
      operation: { type: "style.set", property: "display", value: "inline-flex" },
      createdAt: "2026-10-10T10:30:00Z",
      updatedAt: "2026-10-10T10:30:00Z",
      createdBy: "dev-1",
    };

    const result = computeRollback({
      websiteId: "site-1",
      releases: [r1, r2],
      patches: [patch1, patch2],
      actor,
      timestamp: "2026-10-10T12:00:00Z",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // R2 is rolled back
    const rolledBackRel = result.updatedReleases.find((r) => r.id === "REL-002");
    expect(rolledBackRel?.status).toBe("rolled_back");
    expect(rolledBackRel?.rolledBackAt).toBe("2026-10-10T12:00:00Z");

    // R1 is restored as active
    const restoredRel = result.updatedReleases.find((r) => r.id === "REL-001");
    expect(restoredRel?.status).toBe("active");
    expect(result.newActiveReleaseId).toBe("REL-001");

    // P-2 is marked rolled_back
    const updatedP2 = result.updatedPatches.find((p) => p.id === "P-2");
    expect(updatedP2?.status).toBe("rolled_back");

    // P-1 remains published
    const updatedP1 = result.updatedPatches.find((p) => p.id === "P-1");
    expect(updatedP1?.status).toBe("published");

    // Audit event is created
    expect(result.auditEvent.action).toBe("release.rolled_back");
    expect(result.auditEvent.actor.id).toBe("dev-1");
    expect(result.auditEvent.details.fromStatus).toBe("active");
    expect(result.auditEvent.details.toStatus).toBe("rolled_back");
  });

  it("rolls back initial release to empty active state if no prior release exists", () => {
    const r1: Release = {
      id: "REL-001",
      websiteId: "site-1",
      version: 1,
      status: "active",
      patchIds: ["P-1"],
      createdAt: "2026-10-10T10:00:00Z",
      createdBy: "dev-1",
      activatedAt: "2026-10-10T10:05:00Z",
    };

    const patch1: Patch = {
      id: "P-1",
      websiteId: "site-1",
      name: "Banner patch",
      status: "published",
      currentVersion: 1,
      versions: [],
      targetFingerprint: { tag: "div", selector: "#banner" },
      operation: { type: "text.set", value: "Hello" },
      createdAt: "2026-10-10T09:00:00Z",
      updatedAt: "2026-10-10T09:00:00Z",
      createdBy: "dev-1",
    };

    const result = computeRollback({
      websiteId: "site-1",
      releases: [r1],
      patches: [patch1],
      actor,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.newActiveReleaseId).toBeUndefined();
    expect(result.updatedReleases[0]?.status).toBe("rolled_back");
    expect(result.updatedPatches[0]?.status).toBe("rolled_back");
  });

  it("fails rollback when no active release exists", () => {
    const result = computeRollback({
      websiteId: "site-1",
      releases: [],
      patches: [],
      actor,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No active release found");
  });

  it("creates well-formed immutable audit events", () => {
    const event = createAuditEvent({
      websiteId: "site-1",
      entityType: "patch",
      entityId: "PATCH-001",
      action: "patch.created",
      actor,
      details: {
        toStatus: "draft",
        version: 1,
      },
    });

    expect(event.id).toMatch(/^audit-/);
    expect(event.websiteId).toBe("site-1");
    expect(event.action).toBe("patch.created");
    expect(event.actor.name).toBe("Alex Dev");
    expect(new Date(event.timestamp).getTime()).not.toBeNaN();
  });
});
