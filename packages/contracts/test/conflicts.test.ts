import { describe, it, expect } from "bun:test";
import {
  detectConflictsBetweenPatches,
  detectAllPatchConflicts,
  type PatchConflict,
} from "../src/conflicts.js";
import type { Patch } from "../src/types.js";

describe("Deterministic Patch Conflict Detection Engine", () => {
  const patchGreen: Patch = {
    id: "patch-green",
    websiteId: "demo-store",
    name: "Make checkout button green",
    status: "verified",
    currentVersion: 1,
    versions: [],
    targetFingerprint: {
      tag: "button",
      selector: "#checkout-btn",
      text: "Continue to Checkout",
      parentContext: "checkout-summary",
    },
    operation: {
      type: "style.set",
      property: "background-color",
      value: "#10b981",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "dev-1",
  };

  const patchRed: Patch = {
    id: "patch-red",
    websiteId: "demo-store",
    name: "Make checkout button crimson red",
    status: "verified",
    currentVersion: 1,
    versions: [],
    targetFingerprint: {
      tag: "button",
      selector: "#checkout-btn",
      text: "Continue to Checkout",
      parentContext: "checkout-summary",
    },
    operation: {
      type: "style.set",
      property: "background-color",
      value: "#ef4444",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "dev-2",
  };

  const patchPadding: Patch = {
    id: "patch-padding",
    websiteId: "demo-store",
    name: "Add padding to checkout button",
    status: "verified",
    currentVersion: 1,
    versions: [],
    targetFingerprint: {
      tag: "button",
      selector: "#checkout-btn",
      text: "Continue to Checkout",
      parentContext: "checkout-summary",
    },
    operation: {
      type: "style.set",
      property: "padding",
      value: "16px 32px",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "dev-3",
  };

  const patchHide: Patch = {
    id: "patch-hide",
    websiteId: "demo-store",
    name: "Hide checkout button",
    status: "draft",
    currentVersion: 1,
    versions: [],
    targetFingerprint: {
      tag: "button",
      selector: "#checkout-btn",
      text: "Continue to Checkout",
      parentContext: "checkout-summary",
    },
    operation: {
      type: "element.hide",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "dev-4",
  };

  const patchDifferentTarget: Patch = {
    id: "patch-promo-banner",
    websiteId: "demo-store",
    name: "Highlight promo banner",
    status: "verified",
    currentVersion: 1,
    versions: [],
    targetFingerprint: {
      tag: "div",
      selector: "#promo-banner",
    },
    operation: {
      type: "style.set",
      property: "background-color",
      value: "#6366f1",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "dev-1",
  };

  it("detects property conflict between two style patches targeting the same element", () => {
    const conflict = detectConflictsBetweenPatches(patchGreen, patchRed);
    expect(conflict).not.toBeNull();
    expect(conflict?.targetSelector).toBe("#checkout-btn");
    expect(conflict?.collidingProperty).toBe("background-color");
    expect(conflict?.patchAValue).toBe("#10b981");
    expect(conflict?.patchBValue).toBe("#ef4444");
    expect(conflict?.severity).toBe("error");
  });

  it("allows non-overlapping style properties on the same element to coexist without conflict", () => {
    // Green background + larger padding on same button do NOT collide
    const conflict = detectConflictsBetweenPatches(patchGreen, patchPadding);
    expect(conflict).toBeNull();
  });

  it("allows patches targeting different elements to coexist without conflict", () => {
    const conflict = detectConflictsBetweenPatches(patchGreen, patchDifferentTarget);
    expect(conflict).toBeNull();
  });

  it("detects conflict between element.hide and style/text modifications on the same target", () => {
    const conflict = detectConflictsBetweenPatches(patchGreen, patchHide);
    expect(conflict).not.toBeNull();
    expect(conflict?.targetSelector).toBe("#checkout-btn");
    expect(conflict?.reason).toContain("Incompatible operation");
  });

  it("detects competing text replacements on the same target", () => {
    const patchTextA: Patch = {
      ...patchGreen,
      id: "patch-text-a",
      operation: { type: "text.set", value: "Pay Now" },
    };
    const patchTextB: Patch = {
      ...patchGreen,
      id: "patch-text-b",
      operation: { type: "text.set", value: "Checkout (Express)" },
    };

    const conflict = detectConflictsBetweenPatches(patchTextA, patchTextB);
    expect(conflict).not.toBeNull();
    expect(conflict?.reason).toContain("Competing text replacements");
  });

  it("detectAllPatchConflicts identifies all pairwise conflicts in a patch collection", () => {
    const result = detectAllPatchConflicts([patchGreen, patchRed, patchPadding, patchDifferentTarget]);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].patchAId).toBe("patch-green");
    expect(result.conflicts[0].patchBId).toBe("patch-red");
  });

  it("returns hasConflicts: false when all patches in release bundle are independent", () => {
    const result = detectAllPatchConflicts([patchGreen, patchPadding, patchDifferentTarget]);
    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts.length).toBe(0);
  });
});
