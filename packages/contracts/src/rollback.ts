import type { AuditActor, AuditEvent, Patch, Release } from "./types.js";
import { createAuditEvent } from "./audit.js";

export interface RollbackInput {
  websiteId: string;
  releases: Release[];
  patches: Patch[];
  actor: AuditActor;
  timestamp?: string;
  reason?: string;
}

export type RollbackResult =
  | {
      success: true;
      newActiveReleaseId?: string;
      /** True when no prior release existed and the site reverted to its unpatched baseline. */
      restoredBaseline: boolean;
      updatedReleases: Release[];
      updatedPatches: Patch[];
      auditEvent: AuditEvent;
    }
  | {
      success: false;
      error: string;
    };

export function computeRollback(input: RollbackInput): RollbackResult {
  const ts = input.timestamp || new Date().toISOString();

  // Find active release for the target website
  const currentActive = input.releases.find(
    (r) => r.websiteId === input.websiteId && r.status === "active"
  );

  if (!currentActive) {
    return {
      success: false,
      error: `No active release found for website '${input.websiteId}' to roll back.`,
    };
  }

  // Find the most recent superseded release for the website
  const priorReleases = input.releases
    .filter((r) => r.websiteId === input.websiteId && r.status === "superseded")
    .sort((a, b) => b.version - a.version);

  const priorRelease = priorReleases[0];

  // Mark current active as rolled_back
  const updatedCurrentActive: Release = {
    ...currentActive,
    status: "rolled_back",
    rolledBackAt: ts,
  };

  const updatedReleases: Release[] = input.releases.map((r) => {
    if (r.id === currentActive.id) {
      return updatedCurrentActive;
    }
    if (priorRelease && r.id === priorRelease.id) {
      return {
        ...r,
        status: "active",
        activatedAt: ts,
      };
    }
    return r;
  });

  // Calculate updated patches
  const priorPatchIds = new Set(priorRelease ? priorRelease.patchIds : []);
  const currentPatchIds = new Set(currentActive.patchIds);

  const updatedPatches: Patch[] = input.patches.map((p) => {
    if (p.websiteId !== input.websiteId) {
      return p;
    }
    // If patch was in current active and not in prior release, it becomes rolled_back
    if (currentPatchIds.has(p.id) && !priorPatchIds.has(p.id)) {
      return {
        ...p,
        status: "rolled_back",
        activeReleaseId: undefined,
        updatedAt: ts,
      };
    }
    // If patch is in prior release, restore to published
    if (priorPatchIds.has(p.id)) {
      return {
        ...p,
        status: "published",
        activeReleaseId: priorRelease?.id,
        updatedAt: ts,
      };
    }
    return p;
  });

  const auditEvent = createAuditEvent({
    websiteId: input.websiteId,
    entityType: "release",
    entityId: currentActive.id,
    action: "release.rolled_back",
    actor: input.actor,
    timestamp: ts,
    details: {
      fromStatus: "active",
      toStatus: "rolled_back",
      version: currentActive.version,
      reason: input.reason || "Manual rollback initiated",
      metadata: {
        restoredReleaseId: priorRelease?.id,
        restoredVersion: priorRelease?.version,
      },
    },
  });

  return {
    success: true,
    newActiveReleaseId: priorRelease?.id,
    restoredBaseline: !priorRelease,
    updatedReleases,
    updatedPatches,
    auditEvent,
  };
}
