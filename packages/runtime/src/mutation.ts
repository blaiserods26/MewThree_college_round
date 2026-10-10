import {
  type Patch,
  type PatchOperation,
  type TargetFingerprint,
  validatePatchOperation,
} from "@patchwork/contracts";

export interface OriginalElementState {
  styleProperty?: { property: string; value: string };
  textContent?: string;
  attribute?: { name: string; value: string | null };
  display?: string;
  ariaHidden?: string | null;
}

export type MutationStatus = "applied" | "skipped" | "stale" | "failed";

export interface ApplyPatchResult {
  patchId: string;
  status: MutationStatus;
  element?: Element;
  originalState?: OriginalElementState;
  error?: string;
}

export interface RevertPatchResult {
  patchId: string;
  reverted: boolean;
  error?: string;
}

/**
 * Resolves a target element in the document given its fingerprint.
 * Enforces element uniqueness to avoid corrupting ambiguous matches.
 */
export function resolveTargetElement(
  fingerprint: TargetFingerprint,
  doc: Document = document
): { element?: Element; error?: string } {
  try {
    const matches = doc.querySelectorAll(fingerprint.selector);
    if (matches.length === 1) {
      return { element: matches[0] };
    }
    if (matches.length > 1) {
      return {
        error: `Target selector matched ${matches.length} elements (expected exactly 1). Ambiguous target.`,
      };
    }
    return {};
  } catch (err: any) {
    return { error: `Invalid CSS selector '${fingerprint.selector}': ${err.message}` };
  }
}

/**
 * Safely applies a patch operation to the live DOM with validation,
 * state capture for reversal, and strict allowlist enforcement.
 */
export function applyPatchToDom(
  patch: Patch,
  doc: Document = document
): ApplyPatchResult {
  // 1. Validate operation against strict allowlist
  const validation = validatePatchOperation(patch.operation);
  if (!validation.valid) {
    return {
      patchId: patch.id,
      status: "failed",
      error: validation.error || "Disallowed patch operation",
    };
  }

  // 2. Resolve target element
  const resolution = resolveTargetElement(patch.targetFingerprint, doc);
  if (resolution.error) {
    return {
      patchId: patch.id,
      status: "failed",
      error: resolution.error,
    };
  }

  const element = resolution.element as HTMLElement | undefined;
  if (!element) {
    return {
      patchId: patch.id,
      status: "stale",
      error: `Element matching selector '${patch.targetFingerprint.selector}' not found in DOM.`,
    };
  }

  // 3. Capture original state & apply mutation
  const originalState: OriginalElementState = {};
  const op = patch.operation;

  try {
    switch (op.type) {
      case "style.set": {
        originalState.styleProperty = {
          property: op.property,
          value: element.style.getPropertyValue(op.property) || "",
        };
        element.style.setProperty(op.property, op.value);
        break;
      }

      case "text.set": {
        originalState.textContent = element.textContent || "";
        // Plain text assignment guarantees no HTML tag interpretation
        element.textContent = op.value;
        break;
      }

      case "attribute.set": {
        originalState.attribute = {
          name: op.name,
          value: element.getAttribute(op.name),
        };
        element.setAttribute(op.name, op.value);
        break;
      }

      case "element.hide": {
        originalState.display = element.style.display || "";
        originalState.ariaHidden = element.getAttribute("aria-hidden");
        element.style.display = "none";
        element.setAttribute("aria-hidden", "true");
        break;
      }

      case "element.show": {
        originalState.display = element.style.display || "";
        originalState.ariaHidden = element.getAttribute("aria-hidden");
        element.style.display = op.display || "inline-flex";
        element.removeAttribute("aria-hidden");
        break;
      }
    }

    return {
      patchId: patch.id,
      status: "applied",
      element,
      originalState,
    };
  } catch (err: any) {
    return {
      patchId: patch.id,
      status: "failed",
      error: `Failed to execute DOM mutation: ${err.message}`,
    };
  }
}

/**
 * Cleanly reverses an applied patch, restoring original DOM styles and content.
 */
export function revertPatchFromDom(
  applyResult: ApplyPatchResult,
  doc: Document = document
): RevertPatchResult {
  const element = applyResult.element as HTMLElement | undefined;
  const state = applyResult.originalState;

  if (!element || !state) {
    return {
      patchId: applyResult.patchId,
      reverted: false,
      error: "Original state or element reference unavailable for reversion.",
    };
  }

  try {
    if (state.styleProperty) {
      if (state.styleProperty.value) {
        element.style.setProperty(
          state.styleProperty.property,
          state.styleProperty.value
        );
      } else {
        element.style.removeProperty(state.styleProperty.property);
      }
    }

    if (state.textContent !== undefined) {
      element.textContent = state.textContent;
    }

    if (state.attribute) {
      if (state.attribute.value !== null) {
        element.setAttribute(state.attribute.name, state.attribute.value);
      } else {
        element.removeAttribute(state.attribute.name);
      }
    }

    if (state.display !== undefined) {
      if (state.display) {
        element.style.display = state.display;
      } else {
        element.style.removeProperty("display");
      }
    }

    if (state.ariaHidden !== undefined) {
      if (state.ariaHidden !== null) {
        element.setAttribute("aria-hidden", state.ariaHidden);
      } else {
        element.removeAttribute("aria-hidden");
      }
    }

    return { patchId: applyResult.patchId, reverted: true };
  } catch (err: any) {
    return {
      patchId: applyResult.patchId,
      reverted: false,
      error: `Reversion error: ${err.message}`,
    };
  }
}

export const revertPatchOnDom = revertPatchFromDom;
