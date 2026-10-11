export type PatchStatus =
  | 'draft'
  | 'previewing'
  | 'verified'
  | 'verification_failed'
  | 'published'
  | 'superseded'
  | 'archived'
  | 'stale';

export type OperationType =
  | 'style.set'
  | 'text.set'
  | 'attribute.set'
  | 'class.add'
  | 'class.remove'
  | 'element.hide'
  | 'element.show'
  | 'element.insert'
  | 'element.remove';

export interface PatchOperation {
  type: OperationType;
  property?: string;
  value?: string;
  name?: string;
  className?: string;
  display?: string;
  position?: 'append' | 'prepend' | 'before' | 'after';
  tag?: string;
  textContent?: string;
  htmlContent?: string;
  attributes?: Record<string, string>;
  style?: Record<string, string>;
}

export interface TargetFingerprint {
  tag: string;
  selector: string;
  id?: string;
  classes?: string[];
  role?: string;
  ariaLabel?: string;
  textSnippet?: string;
  parentTag?: string;
  childIndex?: number;
}

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
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  releaseId?: string;
}

export interface VerificationCheck {
  id: string;
  name: string;
  passed: boolean;
  viewport?: { width: number; height: number };
  durationMs?: number;
  error?: string;
  screenshotDiffPercent?: number;
  screenshotPath?: string;
}

export interface VerificationRun {
  id: string;
  patchId: string;
  patchVersion: number;
  passed: boolean;
  checks: VerificationCheck[];
  timestamp: string;
  consoleErrors: string[];
}

export interface PatchEvidenceRecord {
  patchId: string;
  version: number;
  targetWebsite: string;
  targetFingerprint: TargetFingerprint;
  operation: PatchOperation;
  targetConfidence: number;
  targetResolutionTier: 'high' | 'review_required' | 'ambiguous' | 'no_match';
  verificationRunId?: string;
  verificationPassed: boolean;
  desktopPassed: boolean;
  mobilePassed: boolean;
  consoleErrors: string[];
  screenshotDiffPercent?: number;
  blockingConflicts: string[];
  readinessDecision: 'ready' | 'needs_verification' | 'blocked_by_conflict' | 'verification_failed';
  blockedReasons: string[];
  assessedAt: string;
}

export interface Release {
  id: string;
  websiteId: string;
  version: number;
  patchIds: string[];
  createdAt: string;
  createdBy: string;
  bundleChecksum?: string;
}

export interface BackportPrResult {
  releaseId: string;
  version: number;
  branchName: string;
  prTitle: string;
  prBody: string;
  patchDiff: string;
  filesModified: string[];
  evidenceSummary: {
    patchCount: number;
    patches: Array<{
      id: string;
      name: string;
      selector: string;
      operationType: string;
      details: string;
    }>;
  };
}

export interface ReleaseHealthCheckResult {
  status: 'healthy' | 'degraded' | 'target_missing' | 'unapplied' | 'baseline' | 'failed';
  overallStatus?: 'healthy' | 'degraded' | 'failed' | 'baseline';
  websiteId: string;
  releaseId?: string;
  activeReleaseId?: string;
  checkedAt: string;
  patchesChecked?: number;
  results?: Array<{
    patchId: string;
    patchName: string;
    targetSelector: string;
    status: 'healthy' | 'drifted' | 'failed';
    details?: string;
    runId?: string;
  }>;
  diagnostics?: Array<{
    category: string;
    patchId?: string;
    passed: boolean;
    details: string;
  }>;
  recommendation?: string;
  rollbackRecommended?: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  entityType: 'patch' | 'release' | 'verification' | 'health_check' | 'rollback';
  entityId: string;
  details: Record<string, unknown>;
}

export interface ConflictRecord {
  patchA: string;
  patchB: string;
  selector: string;
  collisionProperty?: string;
  reason: string;
}

export type ViewportMode = 'desktop' | 'tablet' | 'mobile' | 'auto';
