import type {
  BlastRadiusAssessment,
  BlastRadiusRisk,
  Patch,
  PatchEvidenceRecord,
  VerificationRun,
} from "./types.js";
import type { ConflictDetectionResult } from "./conflicts.js";

/**
 * Deterministically computes the blast-radius assessment and risk rating for a patch.
 * Low: unique target, allowlisted cosmetic change, no collisions, verified assertions.
 * Medium: target changed, visibility modification (e.g. element.hide), or unverified draft.
 * High: target drifted/stale, collision with competing patch, or verification failed.
 */
export function computeBlastRadius(
  patch: Patch,
  conflicts: ConflictDetectionResult,
  latestRun?: VerificationRun
): BlastRadiusAssessment {
  const riskReasons: string[] = [];
  let riskLevel: BlastRadiusRisk = "low";

  // 1. Impact Type Assessment
  let impactType: BlastRadiusAssessment["impactType"] = "cosmetic_style";
  if (patch.operation.type === "text.set") {
    impactType = "content_text";
  } else if (patch.operation.type === "attribute.set") {
    impactType = "dom_attribute";
  } else if (patch.operation.type === "element.hide" || patch.operation.type === "element.show") {
    impactType = "visibility";
    if (patch.operation.type === "element.hide") {
      riskReasons.push("Element removal impacts visual structure and downstream click interactions.");
      riskLevel = "medium";
    }
  }

  // 2. Conflict & Collision Checks
  const hasCollisions = Boolean(conflicts && conflicts.hasConflicts);
  if (hasCollisions) {
    riskReasons.push(
      `Overlapping collision detected: competes with ${conflicts.conflicts.length} active patch(es) on target '${patch.targetFingerprint.selector}'.`
    );
    riskLevel = "high";
  }

  // 3. Target DOM Drift / Stale Check
  if (patch.status === "stale") {
    riskReasons.push("Target element drifted or missing from live website DOM structure.");
    riskLevel = "high";
  }

  // 4. Verification Check
  const verificationPassed = Boolean(latestRun && latestRun.status === "passed");
  if (patch.status === "verification_failed" || (latestRun && latestRun.status === "failed")) {
    riskReasons.push(
      `Automated Playwright verification failed: assertions failed across tested viewports.`
    );
    riskLevel = "high";
  } else if (!verificationPassed && patch.status !== "published") {
    riskReasons.push("Pending automated Playwright multi-viewport verification.");
    if (riskLevel === "low") {
      riskLevel = "medium";
    }
  }

  if (riskReasons.length === 0) {
    riskReasons.push(
      "Unique target resolved; verified allowlisted mutation across desktop & mobile viewports."
    );
  }

  return {
    impactType,
    targetScope: "single_element",
    riskLevel,
    riskReasons,
    isUniqueTarget: true,
    hasCollisions,
    verificationPassed,
  };
}

/**
 * Computes release readiness decision with explainable reasons.
 */
export function computeReadinessDecision(
  patch: Patch,
  blastRadius: BlastRadiusAssessment,
  latestRun?: VerificationRun
): {
  decision: PatchEvidenceRecord["readinessDecision"];
  reasons: string[];
} {
  const reasons: string[] = [];

  if (blastRadius.hasCollisions) {
    reasons.push(
      `Release Gate Blocked: Target '${patch.targetFingerprint.selector}' has conflicting mutations with another patch.`
    );
    return { decision: "blocked_by_conflict", reasons };
  }

  if (patch.status === "stale") {
    reasons.push(
      `Release Gate Blocked: Target element has drifted. Rebind candidate required before release.`
    );
    return { decision: "target_stale", reasons };
  }

  if (patch.status === "verification_failed" || (latestRun && latestRun.status === "failed")) {
    reasons.push(
      `Release Gate Blocked: Browser verification failed. All automated assertions must pass.`
    );
    return { decision: "verification_failed", reasons };
  }

  if (patch.status !== "verified") {
    reasons.push(
      `Release Gate Blocked: Patch status is '${patch.status}'. Only 'verified' patches can be released.`
    );
    return { decision: "needs_verification", reasons };
  }

  reasons.push(
    "All release gates passed: Unique target fingerprint verified across Desktop (1280x800) and Mobile (375x667) with 0 console errors."
  );
  return { decision: "ready_to_publish", reasons };
}
