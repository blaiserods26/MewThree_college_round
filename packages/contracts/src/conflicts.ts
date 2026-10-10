import type { Patch, TargetFingerprint } from "./types.js";

export type ConflictSeverity = "error" | "warning";

export interface PatchConflict {
  id: string;
  patchAId: string;
  patchBId: string;
  targetSelector: string;
  reason: string;
  severity: ConflictSeverity;
  collidingProperty?: string;
  patchAValue?: string;
  patchBValue?: string;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: PatchConflict[];
}

/**
 * Checks whether two target fingerprints overlap on the same underlying DOM element.
 */
export function isTargetOverlap(
  fpA: TargetFingerprint,
  fpB: TargetFingerprint
): boolean {
  // 1. Selector match
  const selA = fpA.selector.trim().toLowerCase();
  const selB = fpB.selector.trim().toLowerCase();
  if (selA === selB) {
    return true;
  }

  // 2. High semantic fingerprint alignment on same tag and parent context
  if (
    fpA.tag.toLowerCase() === fpB.tag.toLowerCase() &&
    fpA.parentContext &&
    fpB.parentContext &&
    fpA.parentContext.toLowerCase() === fpB.parentContext.toLowerCase()
  ) {
    if (
      fpA.role &&
      fpB.role &&
      fpA.role.toLowerCase() === fpB.role.toLowerCase()
    ) {
      if (
        (fpA.text && fpB.text && fpA.text.trim().toLowerCase() === fpB.text.trim().toLowerCase()) ||
        (fpA.accessibleName && fpB.accessibleName && fpA.accessibleName.trim().toLowerCase() === fpB.accessibleName.trim().toLowerCase())
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Compares two patches and determines if their operations collide on the same target.
 */
export function detectConflictsBetweenPatches(
  patchA: Patch,
  patchB: Patch
): PatchConflict | null {
  if (patchA.id === patchB.id) {
    return null;
  }

  if (!isTargetOverlap(patchA.targetFingerprint, patchB.targetFingerprint)) {
    return null;
  }

  const opA = patchA.operation;
  const opB = patchB.operation;
  const selector = patchA.targetFingerprint.selector;

  // Case 1: Competing visibility (element.hide vs modifications or element.show)
  if (opA.type === "element.hide" || opB.type === "element.hide") {
    if (opA.type !== opB.type) {
      return {
        id: `conflict-${patchA.id}-${patchB.id}`,
        patchAId: patchA.id,
        patchBId: patchB.id,
        targetSelector: selector,
        reason: `Incompatible operations: One patch hides '${selector}' while the other applies active mutations.`,
        severity: "error",
        patchAValue: opA.type,
        patchBValue: opB.type,
      };
    }
  }

  // Case 2: Both style.set on the exact same CSS property
  if (opA.type === "style.set" && opB.type === "style.set") {
    const propA = opA.property.trim().toLowerCase();
    const propB = opB.property.trim().toLowerCase();

    if (propA === propB) {
      const valA = opA.value.trim().toLowerCase();
      const valB = opB.value.trim().toLowerCase();

      if (valA !== valB) {
        return {
          id: `conflict-${patchA.id}-${patchB.id}`,
          patchAId: patchA.id,
          patchBId: patchB.id,
          targetSelector: selector,
          collidingProperty: opA.property,
          reason: `Colliding style values on '${selector}': '${opA.property}' set to '${opA.value}' vs '${opB.value}'.`,
          severity: "error",
          patchAValue: opA.value,
          patchBValue: opB.value,
        };
      }
    }
  }

  // Case 3: Both text.set on the same element
  if (opA.type === "text.set" && opB.type === "text.set") {
    const valA = opA.value.trim();
    const valB = opB.value.trim();
    if (valA !== valB) {
      return {
        id: `conflict-${patchA.id}-${patchB.id}`,
        patchAId: patchA.id,
        patchBId: patchB.id,
        targetSelector: selector,
        reason: `Competing text replacements on '${selector}': '${opA.value}' vs '${opB.value}'.`,
        severity: "error",
        patchAValue: opA.value,
        patchBValue: opB.value,
      };
    }
  }

  // Case 4: Both attribute.set on the same attribute name
  if (opA.type === "attribute.set" && opB.type === "attribute.set") {
    if (opA.name.toLowerCase() === opB.name.toLowerCase()) {
      if (opA.value !== opB.value) {
        return {
          id: `conflict-${patchA.id}-${patchB.id}`,
          patchAId: patchA.id,
          patchBId: patchB.id,
          targetSelector: selector,
          collidingProperty: opA.name,
          reason: `Conflicting attribute assignment on '${selector}': '${opA.name}' set to '${opA.value}' vs '${opB.value}'.`,
          severity: "error",
          patchAValue: opA.value,
          patchBValue: opB.value,
        };
      }
    }
  }

  return null;
}

/**
 * Evaluates a collection of patches pairwise and detects all existing conflicts.
 */
export function detectAllPatchConflicts(
  patches: Patch[]
): ConflictDetectionResult {
  const conflicts: PatchConflict[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < patches.length; i++) {
    for (let j = i + 1; j < patches.length; j++) {
      const pA = patches[i];
      const pB = patches[j];
      const pairKey = [pA.id, pB.id].sort().join("::");

      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const conflict = detectConflictsBetweenPatches(pA, pB);
      if (conflict) {
        conflicts.push(conflict);
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}
