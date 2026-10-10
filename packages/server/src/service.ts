import {
  type AuditActor,
  type AuditEvent,
  type Patch,
  type PatchOperation,
  type PatchStatus,
  type PatchVersion,
  type Release,
  type TargetFingerprint,
  type VerificationRun,
  type Website,
  canPublishPatch,
  computeRollback,
  createAuditEvent,
  validatePatchOperation,
  validatePatchTransition,
} from "@patchwork/contracts";
import { runPatchVerification } from "@patchwork/verification";
import { JsonFileStore } from "./store.js";

export interface CreatePatchInput {
  websiteId: string;
  name: string;
  targetFingerprint: TargetFingerprint;
  operation: PatchOperation;
  actor: AuditActor;
}

export interface UpdatePatchDraftInput {
  targetFingerprint?: TargetFingerprint;
  operation?: PatchOperation;
  changeNote?: string;
  actor: AuditActor;
}

export interface CreateReleaseInput {
  websiteId: string;
  patchIds: string[];
  actor: AuditActor;
  changeSummary?: string;
}

export class PatchService {
  constructor(private store: JsonFileStore) {}

  public listWebsites(): Website[] {
    return this.store.getWebsites();
  }

  public getWebsite(id: string): Website | undefined {
    return this.store.getWebsite(id);
  }

  public listPatches(filter?: { websiteId?: string; status?: PatchStatus }): Patch[] {
    let patches = this.store.getPatches();
    if (filter?.websiteId) {
      patches = patches.filter((p) => p.websiteId === filter.websiteId);
    }
    if (filter?.status) {
      patches = patches.filter((p) => p.status === filter.status);
    }
    return patches;
  }

  public getPatch(id: string): Patch | undefined {
    return this.store.getPatch(id);
  }

  public createPatch(input: CreatePatchInput): Patch {
    const opValidation = validatePatchOperation(input.operation);
    if (!opValidation.valid) {
      throw new Error(`Invalid patch operation: ${opValidation.error}`);
    }

    const now = new Date().toISOString();
    const id = `patch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const initialVersion: PatchVersion = {
      version: 1,
      targetFingerprint: input.targetFingerprint,
      operation: input.operation,
      createdAt: now,
      createdBy: input.actor.id,
      changeNote: "Initial draft creation",
    };

    const patch: Patch = {
      id,
      websiteId: input.websiteId,
      name: input.name,
      status: "draft",
      currentVersion: 1,
      versions: [initialVersion],
      targetFingerprint: input.targetFingerprint,
      operation: input.operation,
      createdAt: now,
      updatedAt: now,
      createdBy: input.actor.id,
    };

    this.store.savePatch(patch);

    const auditEvent = createAuditEvent({
      websiteId: input.websiteId,
      entityType: "patch",
      entityId: id,
      action: "patch.created",
      actor: input.actor,
      timestamp: now,
      details: {
        toStatus: "draft",
        version: 1,
      },
    });
    this.store.addAuditEvent(auditEvent);

    return patch;
  }

  public updatePatchDraft(patchId: string, input: UpdatePatchDraftInput): Patch {
    const patch = this.store.getPatch(patchId);
    if (!patch) {
      throw new Error(`Patch '${patchId}' not found.`);
    }

    if (input.operation) {
      const opValidation = validatePatchOperation(input.operation);
      if (!opValidation.valid) {
        throw new Error(`Invalid patch operation: ${opValidation.error}`);
      }
    }

    const now = new Date().toISOString();
    const nextVersionNum = patch.currentVersion + 1;

    const newTargetFingerprint = input.targetFingerprint || patch.targetFingerprint;
    const newOperation = input.operation || patch.operation;

    const newVersion: PatchVersion = {
      version: nextVersionNum,
      targetFingerprint: newTargetFingerprint,
      operation: newOperation,
      createdAt: now,
      createdBy: input.actor.id,
      changeNote: input.changeNote || `Updated to version ${nextVersionNum}`,
    };

    const updatedPatch: Patch = {
      ...patch,
      currentVersion: nextVersionNum,
      versions: [...patch.versions, newVersion],
      targetFingerprint: newTargetFingerprint,
      operation: newOperation,
      updatedAt: now,
    };

    this.store.savePatch(updatedPatch);

    const auditEvent = createAuditEvent({
      websiteId: patch.websiteId,
      entityType: "patch",
      entityId: patch.id,
      action: "patch.updated",
      actor: input.actor,
      timestamp: now,
      details: {
        version: nextVersionNum,
        reason: input.changeNote,
      },
    });
    this.store.addAuditEvent(auditEvent);

    return updatedPatch;
  }

  public transitionPatchStatus(
    patchId: string,
    targetStatus: PatchStatus,
    actor: AuditActor,
    reason?: string
  ): Patch {
    const patch = this.store.getPatch(patchId);
    if (!patch) {
      throw new Error(`Patch '${patchId}' not found.`);
    }

    const validation = validatePatchTransition(patch.status, targetStatus);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const now = new Date().toISOString();
    const updatedPatch: Patch = {
      ...patch,
      status: targetStatus,
      updatedAt: now,
    };

    this.store.savePatch(updatedPatch);

    const auditEvent = createAuditEvent({
      websiteId: patch.websiteId,
      entityType: "patch",
      entityId: patch.id,
      action: "patch.status_changed",
      actor,
      timestamp: now,
      details: {
        fromStatus: patch.status,
        toStatus: targetStatus,
        reason,
      },
    });
    this.store.addAuditEvent(auditEvent);

    return updatedPatch;
  }

  public createRelease(input: CreateReleaseInput): Release {
    const patches = input.patchIds.map((id) => {
      const p = this.store.getPatch(id);
      if (!p) throw new Error(`Patch '${id}' not found.`);
      if (!canPublishPatch(p)) {
        throw new Error(
          `Patch '${p.id}' cannot be published because its status is '${p.status}'. Only 'verified' patches can be released.`
        );
      }
      return p;
    });

    const now = new Date().toISOString();
    const existingReleases = this.store
      .getReleases()
      .filter((r) => r.websiteId === input.websiteId);

    const nextVersion = existingReleases.length + 1;
    const releaseId = `rel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Supersede current active release if one exists
    const currentActive = existingReleases.find((r) => r.status === "active");
    if (currentActive) {
      this.store.saveRelease({
        ...currentActive,
        status: "superseded",
      });
    }

    const newRelease: Release = {
      id: releaseId,
      websiteId: input.websiteId,
      version: nextVersion,
      status: "active",
      patchIds: input.patchIds,
      createdAt: now,
      createdBy: input.actor.id,
      activatedAt: now,
      changeSummary: input.changeSummary,
    };
    this.store.saveRelease(newRelease);

    // Update patches to published and link to activeReleaseId
    for (const p of patches) {
      this.store.savePatch({
        ...p,
        status: "published",
        activeReleaseId: releaseId,
        updatedAt: now,
      });
    }

    // Update website activeReleaseId
    const website = this.store.getWebsite(input.websiteId);
    if (website) {
      this.store.saveWebsite({
        ...website,
        activeReleaseId: releaseId,
        updatedAt: now,
      });
    }

    const auditEvent = createAuditEvent({
      websiteId: input.websiteId,
      entityType: "release",
      entityId: releaseId,
      action: "release.published",
      actor: input.actor,
      timestamp: now,
      details: {
        version: nextVersion,
        metadata: {
          patchCount: input.patchIds.length,
          supersededReleaseId: currentActive?.id,
        },
      },
    });
    this.store.addAuditEvent(auditEvent);

    return newRelease;
  }

  public getActiveRelease(websiteId: string): Release | undefined {
    return this.store.getReleases().find((r) => r.websiteId === websiteId && r.status === "active");
  }

  public listReleases(websiteId?: string): Release[] {
    let releases = this.store.getReleases();
    if (websiteId) {
      releases = releases.filter((r) => r.websiteId === websiteId);
    }
    return releases.sort((a, b) => b.version - a.version);
  }

  public rollbackRelease(websiteId: string, actor: AuditActor, reason?: string) {
    const releases = this.store.getReleases();
    const patches = this.store.getPatches();

    const rollbackResult = computeRollback({
      websiteId,
      releases,
      patches,
      actor,
      reason,
    });

    if (!rollbackResult.success) {
      throw new Error(rollbackResult.error);
    }

    this.store.saveReleases(rollbackResult.updatedReleases);
    for (const p of rollbackResult.updatedPatches) {
      this.store.savePatch(p);
    }

    const website = this.store.getWebsite(websiteId);
    if (website) {
      this.store.saveWebsite({
        ...website,
        activeReleaseId: rollbackResult.newActiveReleaseId,
        updatedAt: new Date().toISOString(),
      });
    }

    this.store.addAuditEvent(rollbackResult.auditEvent);

    return rollbackResult;
  }

  public listAuditEvents(websiteId?: string): AuditEvent[] {
    let events = this.store.getAuditEvents();
    if (websiteId) {
      events = events.filter((e) => e.websiteId === websiteId);
    }
    return events;
  }

  public async verifyPatch(
    patchId: string,
    options: { actor?: AuditActor; websiteBaseUrl?: string; apiBaseUrl?: string } = {}
  ): Promise<VerificationRun> {
    const patch = this.store.getPatch(patchId);
    if (!patch) {
      throw new Error(`Patch '${patchId}' not found.`);
    }

    const actor: AuditActor = options.actor || {
      id: "automated-verifier",
      name: "Playwright Verification Worker",
      role: "automated-system",
    };

    const website = this.store.getWebsite(patch.websiteId);
    const websiteBaseUrl =
      options.websiteBaseUrl || website?.baseUrl || "http://localhost:3000";

    // 1. Transition to previewing if currently draft or verification_failed
    const fromStatus = patch.status;
    if (patch.status === "draft" || patch.status === "verification_failed") {
      patch.status = "previewing";
      patch.updatedAt = new Date().toISOString();
      this.store.savePatch(patch);
    }

    // 2. Emit verification.started audit event
    const startEvent = createAuditEvent({
      websiteId: patch.websiteId,
      entityType: "verification",
      entityId: patch.id,
      action: "verification.started",
      actor,
      details: {
        fromStatus,
        toStatus: "previewing",
        metadata: { websiteBaseUrl },
      },
    });
    this.store.addAuditEvent(startEvent);

    // 3. Execute automated runner
    const run = await runPatchVerification({
      patch,
      websiteBaseUrl,
      apiBaseUrl: options.apiBaseUrl,
    });

    // 4. Save verification run
    this.store.saveVerificationRun(run);

    // 5. Update patch status based on verification outcome
    const targetStatus: PatchStatus =
      run.status === "passed" ? "verified" : "verification_failed";
    const priorStatus = patch.status;
    patch.status = targetStatus;
    patch.updatedAt = new Date().toISOString();
    this.store.savePatch(patch);

    // 6. Emit verification completion audit event
    const completionEvent = createAuditEvent({
      websiteId: patch.websiteId,
      entityType: "verification",
      entityId: patch.id,
      action: run.status === "passed" ? "verification.passed" : "verification.failed",
      actor,
      details: {
        fromStatus: priorStatus,
        toStatus: targetStatus,
        reason: run.error,
        metadata: {
          runId: run.id,
          durationMs: run.durationMs,
          passedAssertions: run.assertions.filter((a) => a.passed).length,
          totalAssertions: run.assertions.length,
          diffPercentage: run.visualDiff?.diffPercentage,
        },
      },
    });
    this.store.addAuditEvent(completionEvent);

    return run;
  }

  public listVerificationRuns(patchId?: string): VerificationRun[] {
    return this.store.getVerificationRuns(patchId);
  }

  public getVerificationRun(runId: string): VerificationRun | undefined {
    return this.store.getVerificationRun(runId);
  }
}
