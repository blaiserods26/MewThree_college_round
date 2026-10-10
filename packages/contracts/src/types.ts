/**
 * PATCHWORK Canonical Data Contracts and TypeScript Definitions
 */

export const PATCH_STATUSES = [
  "draft",
  "previewing",
  "verified",
  "published",
  "verification_failed",
  "stale",
  "conflict",
  "rolled_back",
  "archived",
] as const;

export type PatchStatus = (typeof PATCH_STATUSES)[number];

export const RELEASE_STATUSES = ["active", "superseded", "rolled_back"] as const;

export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export interface Website {
  id: string;
  name: string;
  baseUrl: string;
  activeReleaseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TargetFingerprint {
  tag: string;
  role?: string;
  accessibleName?: string;
  text?: string;
  stableAttributes?: Record<string, string>;
  parentContext?: string;
  selector: string;
}

export type PatchOperationType =
  | "style.set"
  | "text.set"
  | "attribute.set"
  | "element.hide"
  | "element.show";

export interface StyleSetOperation {
  type: "style.set";
  property: string;
  value: string;
}

export interface TextSetOperation {
  type: "text.set";
  value: string;
}

export interface AttributeSetOperation {
  type: "attribute.set";
  name: string;
  value: string;
}

export interface ElementHideOperation {
  type: "element.hide";
}

export interface ElementShowOperation {
  type: "element.show";
  display?: string;
}

export type PatchOperation =
  | StyleSetOperation
  | TextSetOperation
  | AttributeSetOperation
  | ElementHideOperation
  | ElementShowOperation;

export interface PatchVersion {
  version: number;
  targetFingerprint: TargetFingerprint;
  operation: PatchOperation;
  createdAt: string;
  createdBy: string;
  changeNote?: string;
}

export interface Patch {
  id: string;
  websiteId: string;
  name: string;
  status: PatchStatus;
  currentVersion: number;
  versions: PatchVersion[];
  targetFingerprint: TargetFingerprint;
  operation: PatchOperation;
  activeReleaseId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Release {
  id: string;
  websiteId: string;
  version: number;
  status: ReleaseStatus;
  patchIds: string[];
  createdAt: string;
  createdBy: string;
  activatedAt?: string;
  rolledBackAt?: string;
  changeSummary?: string;
}

export interface VerificationAssertion {
  id: string;
  description: string;
  selector: string;
  expectedState: "visible" | "hidden" | "text-matches" | "interactive";
  expectedValue?: string;
}

export interface VerificationAssertionResult {
  assertionId: string;
  passed: boolean;
  actualValue?: string;
  errorMessage?: string;
}

export interface VerificationRun {
  id: string;
  patchId: string;
  websiteId: string;
  status: "passed" | "failed";
  viewport: {
    width: number;
    height: number;
  };
  startedAt: string;
  completedAt: string;
  durationMs: number;
  assertions: VerificationAssertionResult[];
  screenshotBase64?: string;
  error?: string;
}

export type AuditAction =
  | "patch.created"
  | "patch.updated"
  | "patch.status_changed"
  | "verification.started"
  | "verification.passed"
  | "verification.failed"
  | "release.published"
  | "release.rolled_back";

export interface AuditActor {
  id: string;
  name: string;
  role: "developer" | "qa" | "automated-system";
}

export interface AuditEvent {
  id: string;
  websiteId: string;
  entityType: "patch" | "release" | "verification";
  entityId: string;
  action: AuditAction;
  actor: AuditActor;
  timestamp: string;
  details: {
    fromStatus?: string;
    toStatus?: string;
    version?: number;
    reason?: string;
    metadata?: Record<string, unknown>;
  };
}
