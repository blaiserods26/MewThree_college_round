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
  detectAllPatchConflicts,
  detectConflictsBetweenPatches,
  type ConflictDetectionResult,
  type PatchConflict,
  validatePatchOperation,
  validatePatchTransition,
  computeBlastRadius,
  computeReadinessDecision,
  type PatchEvidenceRecord,
  type ReleaseHealthCheckResult,
} from "@patchwork/contracts";
import {
  DEFAULT_VERIFICATION_TIMEOUT_MS,
  runPatchVerification,
  type VerifyPatchOptions,
} from "@patchwork/verification";
import { JsonFileStore } from "./store.js";

import {
  type DisambiguateCandidateInput,
  type GeneratedPatchProposal,
  type GeneratePatchRequest,
  type TargetDisambiguationResult,
  type VerificationExplanationResult,
} from "@patchwork/contracts";
import { DefaultAiService } from "./ai.js";

/** Seam for the browser verification worker; replaceable in tests. */
export type PatchVerifier = (options: VerifyPatchOptions) => Promise<VerificationRun>;

export interface PatchServiceOptions {
  verifier?: PatchVerifier;
  /** Maximum time a verification may take before it is recorded as failed. */
  verificationTimeoutMs?: number;
  aiService?: DefaultAiService;
}

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

export interface RebindPatchServiceInput {
  selector: string;
  targetFingerprint?: Partial<TargetFingerprint>;
  changeNote?: string;
  actor: AuditActor;
}

export type ConflictResolutionStrategy = "keep_this" | "revise_value" | "discard";

export interface ResolveConflictInput {
  strategy: ConflictResolutionStrategy;
  supersededPatchId?: string;
  revisedOperation?: PatchOperation;
  reason?: string;
  actor: AuditActor;
}

export class PatchService {
  private verifier: PatchVerifier;
  private verificationTimeoutMs: number;
  private aiService: DefaultAiService;

  constructor(
    private store: JsonFileStore,
    options: PatchServiceOptions = {}
  ) {
    this.verifier = options.verifier ?? runPatchVerification;
    this.verificationTimeoutMs = options.verificationTimeoutMs ?? DEFAULT_VERIFICATION_TIMEOUT_MS;
    this.aiService = options.aiService ?? new DefaultAiService();
  }

  public listWebsites(): Website[] {
    return this.store.getWebsites();
  }

  /** Wipe all patches, releases, audit events and runs back to the seeded baseline. */
  public resetDemoData(): void {
    this.store.reset();
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

  public rebindPatchTarget(patchId: string, input: RebindPatchServiceInput): Patch {
    const patch = this.store.getPatch(patchId);
    if (!patch) {
      throw new Error(`Patch '${patchId}' not found.`);
    }

    const fromSelector = patch.targetFingerprint.selector;
    const toSelector = input.selector;
    const fromStatus = patch.status;

    const now = new Date().toISOString();
    const nextVersionNum = patch.currentVersion + 1;

    const newTargetFingerprint: TargetFingerprint = {
      ...patch.targetFingerprint,
      ...(input.targetFingerprint || {}),
      selector: toSelector,
    };

    const note =
      input.changeNote ||
      `Target rebound from '${fromSelector}' to '${toSelector}' after DOM drift.`;

    const newVersion: PatchVersion = {
      version: nextVersionNum,
      targetFingerprint: newTargetFingerprint,
      operation: patch.operation,
      createdAt: now,
      createdBy: input.actor.id,
      changeNote: note,
    };

    const newStatus: PatchStatus = "previewing";

    const updatedPatch: Patch = {
      ...patch,
      status: newStatus,
      currentVersion: nextVersionNum,
      versions: [...patch.versions, newVersion],
      targetFingerprint: newTargetFingerprint,
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
        fromStatus,
        toStatus: newStatus,
        version: nextVersionNum,
        reason: note,
        metadata: {
          migration: "target_rebind",
          fromSelector,
          toSelector,
        },
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
    if (!this.store.getWebsite(input.websiteId)) {
      throw new Error(`Website '${input.websiteId}' not found.`);
    }
    if (input.patchIds.length === 0) {
      throw new Error("Cannot create release: select at least one verified patch.");
    }

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

    // Release Gate: Strict multi-patch conflict check across release bundle
    const conflictResult = detectAllPatchConflicts(patches);
    if (conflictResult.hasConflicts) {
      const first = conflictResult.conflicts[0];
      throw new Error(
        `Cannot create release: Conflicting patches detected between '${first.patchAId}' and '${first.patchBId}'. ${first.reason}`
      );
    }

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

  public listAuditEvents(filter?: string | { websiteId?: string; entityId?: string }): AuditEvent[] {
    let events = this.store.getAuditEvents();
    if (typeof filter === "string") {
      events = events.filter((e) => e.websiteId === filter);
    } else if (filter) {
      if (filter.websiteId) {
        events = events.filter((e) => e.websiteId === filter.websiteId);
      }
      if (filter.entityId) {
        events = events.filter((e) => e.entityId === filter.entityId);
      }
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

    // 3. Execute automated runner. A crashed or hung worker must still end in a
    //    recorded, visible failure rather than a patch stuck in 'previewing'.
    let run: VerificationRun;
    try {
      run = await this.runVerifierWithTimeout({
        patch,
        websiteBaseUrl,
        apiBaseUrl: options.apiBaseUrl,
        timeoutMs: this.verificationTimeoutMs,
      });
    } catch (err: any) {
      run = this.buildWorkerFailureRun(patch, err?.message || String(err));
    }

    // 4. Save verification run
    this.store.saveVerificationRun(run);

    // 5. Update patch status based on verification outcome
    const isDrift = run.error?.includes("DOM Drift Detected");
    const targetStatus: PatchStatus =
      run.status === "passed"
        ? "verified"
        : isDrift
        ? "stale"
        : "verification_failed";
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

  private async runVerifierWithTimeout(options: VerifyPatchOptions): Promise<VerificationRun> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Verification timed out after ${this.verificationTimeoutMs}ms.`)),
        this.verificationTimeoutMs
      );
    });
    try {
      return await Promise.race([this.verifier(options), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private buildWorkerFailureRun(patch: Patch, message: string): VerificationRun {
    const now = new Date().toISOString();
    const error = `Verification worker failed: ${message}`;
    return {
      id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patchId: patch.id,
      websiteId: patch.websiteId,
      status: "failed",
      viewport: { width: 1280, height: 800 },
      startedAt: now,
      completedAt: now,
      durationMs: 0,
      assertions: [
        { assertionId: "verification-worker", passed: false, errorMessage: error },
      ],
      error,
    };
  }

  public listVerificationRuns(patchId?: string): VerificationRun[] {
    return this.store.getVerificationRuns(patchId);
  }

  public getVerificationRun(runId: string): VerificationRun | undefined {
    return this.store.getVerificationRun(runId);
  }

  public detectPatchConflicts(patches: Patch[]): ConflictDetectionResult {
    return detectAllPatchConflicts(patches);
  }

  public getWebsiteConflicts(websiteId: string): ConflictDetectionResult {
    const patches = this.store
      .getPatches(websiteId)
      .filter((p) => p.status !== "archived" && p.status !== "rolled_back");
    return detectAllPatchConflicts(patches);
  }

  public checkPatchConflicts(
    patchId: string,
    candidatePatchIds?: string[]
  ): { patchId: string; conflicts: PatchConflict[] } {
    const patch = this.store.getPatch(patchId);
    if (!patch) {
      throw new Error(`Patch '${patchId}' not found.`);
    }

    let candidates: Patch[];
    if (candidatePatchIds && candidatePatchIds.length > 0) {
      candidates = candidatePatchIds
        .map((id) => this.store.getPatch(id))
        .filter((p): p is Patch => p !== undefined && p.id !== patchId);
    } else {
      candidates = this.store
        .getPatches(patch.websiteId)
        .filter((p) => p.id !== patchId && p.status !== "archived" && p.status !== "rolled_back");
    }

    const conflicts: PatchConflict[] = [];
    for (const other of candidates) {
      const conflict = detectConflictsBetweenPatches(patch, other);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return { patchId, conflicts };
  }

  public resolvePatchConflict(
    patchId: string,
    input: ResolveConflictInput
  ): { patch?: Patch; supersededPatch?: Patch } {
    const patch = this.store.getPatch(patchId);
    if (!patch) {
      throw new Error(`Patch '${patchId}' not found.`);
    }

    const now = new Date().toISOString();
    let updatedPatch: Patch = patch;
    let supersededPatch: Patch | undefined;

    if (input.supersededPatchId) {
      const other = this.store.getPatch(input.supersededPatchId);
      if (other) {
        supersededPatch = {
          ...other,
          status: "archived",
          updatedAt: now,
        };
        this.store.savePatch(supersededPatch);
      }
    }

    if (input.strategy === "discard") {
      updatedPatch = {
        ...patch,
        status: "archived",
        updatedAt: now,
      };
      this.store.savePatch(updatedPatch);

      // If competing patch was marked as conflict, return it to previewing
      if (supersededPatch && supersededPatch.status === "conflict") {
        supersededPatch.status = "previewing";
        supersededPatch.updatedAt = now;
        this.store.savePatch(supersededPatch);
      }
    } else if (input.strategy === "revise_value") {
      if (!input.revisedOperation) {
        throw new Error("revisedOperation is required when strategy is 'revise_value'.");
      }
      const validation = validatePatchOperation(input.revisedOperation);
      if (!validation.valid) {
        throw new Error(`Invalid revised operation: ${validation.error}`);
      }

      const nextVersionNum = patch.currentVersion + 1;
      const note =
        input.reason ||
        `Conflict resolved via inline value revision to ${JSON.stringify(input.revisedOperation)}`;

      const newVersion: PatchVersion = {
        version: nextVersionNum,
        targetFingerprint: patch.targetFingerprint,
        operation: input.revisedOperation,
        createdAt: now,
        createdBy: input.actor.id,
        changeNote: note,
      };

      updatedPatch = {
        ...patch,
        operation: input.revisedOperation,
        currentVersion: nextVersionNum,
        versions: [...patch.versions, newVersion],
        status: "previewing",
        updatedAt: now,
      };
      this.store.savePatch(updatedPatch);
    } else if (input.strategy === "keep_this") {
      updatedPatch = {
        ...patch,
        status: "previewing",
        updatedAt: now,
      };
      this.store.savePatch(updatedPatch);
    }

    const auditEvent = createAuditEvent({
      websiteId: patch.websiteId,
      entityType: "patch",
      entityId: patch.id,
      action: "patch.updated",
      actor: input.actor,
      timestamp: now,
      details: {
        fromStatus: patch.status,
        toStatus: updatedPatch.status,
        reason: input.reason || `Conflict resolved using strategy '${input.strategy}'`,
        metadata: {
          actionType: "conflict_resolution",
          strategy: input.strategy,
          supersededPatchId: input.supersededPatchId,
        },
      },
    });
    this.store.addAuditEvent(auditEvent);

    return { patch: updatedPatch, supersededPatch };
  }

  // ---------------------------------------------------------------------------
  // AI Assistive Enhancements (Phase 8)
  // ---------------------------------------------------------------------------

  public async generatePatchProposal(input: GeneratePatchRequest): Promise<GeneratedPatchProposal> {
    return this.aiService.generatePatchProposal(input);
  }

  public async explainVerification(
    runIdOrInput: string | { patchId: string; failureLog?: string; run?: VerificationRun }
  ): Promise<VerificationExplanationResult> {
    let run: VerificationRun | undefined;
    let patch: Patch | undefined;

    if (typeof runIdOrInput === "string") {
      run = this.store.getVerificationRun(runIdOrInput);
      if (!run) {
        throw new Error(`Verification run '${runIdOrInput}' not found.`);
      }
      patch = this.store.getPatch(run.patchId);
      if (!patch) {
        throw new Error(`Patch '${run.patchId}' not found.`);
      }
    } else {
      patch = this.store.getPatch(runIdOrInput.patchId);
      if (!patch) {
        throw new Error(`Patch '${runIdOrInput.patchId}' not found.`);
      }
      if (runIdOrInput.run) {
        run = runIdOrInput.run;
      } else {
        const runs = this.store.getVerificationRuns(runIdOrInput.patchId);
        run = runs[0] || {
          id: `synthetic-run-${Date.now()}`,
          patchId: patch.id,
          websiteId: patch.websiteId,
          status: "failed",
          viewportsRun: [],
          assertions: [],
          durationMs: 0,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          error: runIdOrInput.failureLog || "Verification run failed.",
        };
      }
    }

    return this.aiService.explainVerificationFailure({ run, patch });
  }

  public async disambiguateTarget(
    patchId: string,
    candidates: DisambiguateCandidateInput[]
  ): Promise<TargetDisambiguationResult> {
    const patch = this.store.getPatch(patchId);
    if (!patch) {
      throw new Error(`Patch '${patchId}' not found.`);
    }
    return this.aiService.disambiguateTarget({ patch, candidates });
  }

  public getPatchEvidence(patchId: string): PatchEvidenceRecord {
    const patch = this.store.getPatch(patchId);
    if (!patch) {
      throw new Error(`Patch '${patchId}' not found.`);
    }

    const runs = this.store.getVerificationRuns(patchId);
    const latestRun = runs[0];
    const rawConflicts = this.checkPatchConflicts(patchId);
    const conflicts: ConflictDetectionResult = {
      hasConflicts: rawConflicts.conflicts.length > 0,
      conflicts: rawConflicts.conflicts,
    };
    const blastRadius = computeBlastRadius(patch, conflicts, latestRun);
    const readiness = computeReadinessDecision(patch, blastRadius, latestRun);

    return {
      patchId: patch.id,
      patchVersion: patch.currentVersion,
      websiteId: patch.websiteId,
      targetFingerprint: patch.targetFingerprint,
      operation: patch.operation,
      status: patch.status,
      readinessDecision: readiness.decision,
      readinessReasons: readiness.reasons,
      blastRadius,
      latestVerification: latestRun,
      verificationRunsCount: runs.length,
      conflicts,
      updatedAt: patch.updatedAt,
    };
  }

  public async checkReleaseHealth(
    websiteId: string,
    actor: AuditActor = { id: "health-monitor", name: "Patch Health Monitor", role: "automated-system" }
  ): Promise<ReleaseHealthCheckResult> {
    const website = this.store.getWebsite(websiteId);
    if (!website) {
      throw new Error(`Website '${websiteId}' not found.`);
    }

    const activeRelease = this.getActiveRelease(websiteId);
    if (!activeRelease || activeRelease.patchIds.length === 0) {
      return {
        status: "baseline",
        websiteId,
        checkedAt: new Date().toISOString(),
        patchesChecked: 0,
        results: [],
        recommendation: "Storefront is running clean baseline with no active patches deployed.",
      };
    }

    const results: ReleaseHealthCheckResult["results"] = [];
    let hasFailure = false;
    let hasDrift = false;

    for (const patchId of activeRelease.patchIds) {
      const patch = this.store.getPatch(patchId);
      if (!patch) {
        results.push({
          patchId,
          patchName: "Unknown Patch",
          targetSelector: "unknown",
          status: "failed",
          details: `Patch '${patchId}' record missing in database.`,
        });
        hasFailure = true;
        continue;
      }

      // Run live verification recheck
      const run = await this.verifyPatch(patchId, { actor });
      if (run.status === "passed") {
        results.push({
          patchId: patch.id,
          patchName: patch.name,
          targetSelector: patch.targetFingerprint.selector,
          status: "healthy",
          runId: run.id,
          details: "Verified live element presence, allowlisted style, and zero console errors.",
        });
      } else if (run.error?.includes("DOM Drift Detected") || run.error?.includes("not found")) {
        results.push({
          patchId: patch.id,
          patchName: patch.name,
          targetSelector: patch.targetFingerprint.selector,
          status: "drifted",
          runId: run.id,
          details: run.error || "Target selector drifted or absent on live storefront.",
        });
        hasDrift = true;
      } else {
        results.push({
          patchId: patch.id,
          patchName: patch.name,
          targetSelector: patch.targetFingerprint.selector,
          status: "failed",
          runId: run.id,
          details: run.error || "Assertion failure during health check.",
        });
        hasFailure = true;
      }
    }

    const overallStatus: ReleaseHealthCheckResult["status"] = hasDrift
      ? "target_missing"
      : hasFailure
      ? "degraded"
      : "healthy";

    let recommendation = "All active production patches are verified healthy on live storefront.";
    if (overallStatus !== "healthy") {
      recommendation = `Regressions detected in active release V${activeRelease.version}. Safe 1-click rollback recommended to restore previously working state.`;
    }

    // Record audit event
    const auditEvent = createAuditEvent({
      websiteId,
      entityType: "release",
      entityId: activeRelease.id,
      action: "health.checked",
      actor,
      timestamp: new Date().toISOString(),
      details: {
        reason: `Automated health check executed on active release V${activeRelease.version}`,
        metadata: {
          overallStatus,
          patchesChecked: activeRelease.patchIds.length,
          recommendation,
        },
      },
    });
    this.store.addAuditEvent(auditEvent);

    return {
      status: overallStatus,
      websiteId,
      releaseId: activeRelease.id,
      checkedAt: new Date().toISOString(),
      patchesChecked: activeRelease.patchIds.length,
      results,
      recommendation,
    };
  }

  public getAiService(): DefaultAiService {
    return this.aiService;
  }
}
