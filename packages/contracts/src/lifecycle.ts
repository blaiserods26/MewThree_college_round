import type { Patch, PatchStatus, ReleaseStatus } from "./types.js";

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
}

const LEGAL_PATCH_TRANSITIONS: Record<PatchStatus, readonly PatchStatus[]> = {
  draft: ["previewing", "archived"],
  previewing: ["verified", "verification_failed", "draft", "archived"],
  verified: ["published", "draft", "previewing", "archived"],
  verification_failed: ["draft", "previewing", "archived"],
  published: ["stale", "rolled_back", "archived"],
  stale: ["draft", "archived"],
  conflict: ["draft", "archived"],
  rolled_back: ["draft", "archived"],
  archived: [],
};

const LEGAL_RELEASE_TRANSITIONS: Record<ReleaseStatus, readonly ReleaseStatus[]> = {
  active: ["superseded", "rolled_back"],
  superseded: ["active"],
  rolled_back: [],
};

/**
 * Validates whether a patch can transition from currentStatus to targetStatus.
 */
export function validatePatchTransition(
  currentStatus: PatchStatus,
  targetStatus: PatchStatus
): TransitionValidationResult {
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  // Explicit safety gates
  if (targetStatus === "published") {
    if (currentStatus === "draft") {
      return {
        valid: false,
        error: "Patch cannot transition directly from 'draft' to 'published'. It must first be previewed and verified.",
      };
    }
    if (currentStatus === "verification_failed") {
      return {
        valid: false,
        error: "Patch cannot be published while in status 'verification_failed'. Fix issues and re-verify first.",
      };
    }
    if (currentStatus === "stale") {
      return {
        valid: false,
        error: "Patch cannot be published while in status 'stale'. Target DOM drift must be resolved first.",
      };
    }
    if (currentStatus === "conflict") {
      return {
        valid: false,
        error: "Patch cannot be published while in status 'conflict'. Conflicting changes must be resolved first.",
      };
    }
  }

  const allowedNext = LEGAL_PATCH_TRANSITIONS[currentStatus];
  if (!allowedNext.includes(targetStatus)) {
    return {
      valid: false,
      error: `Invalid patch transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  return { valid: true };
}

/**
 * Checks whether an entire patch entity meets all gating conditions to be published.
 */
export function canPublishPatch(patch: Patch): boolean {
  return patch.status === "verified" || patch.status === "published";
}

/**
 * Validates whether a release can transition from currentStatus to targetStatus.
 */
export function validateReleaseTransition(
  currentStatus: ReleaseStatus,
  targetStatus: ReleaseStatus
): TransitionValidationResult {
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  const allowedNext = LEGAL_RELEASE_TRANSITIONS[currentStatus];
  if (!allowedNext.includes(targetStatus)) {
    return {
      valid: false,
      error: `Invalid release transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  return { valid: true };
}
