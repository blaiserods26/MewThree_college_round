import { describe, it, expect } from "bun:test";
import {
  computeBlastRadius,
  computeReadinessDecision,
  type Patch,
  type VerificationRun,
  type ConflictDetectionResult,
} from "../src/index.js";

describe("Proof-Carrying Patches: Evidence & Blast-Radius Assessment", () => {
  const dummyPatch: Patch = {
    id: "patch-checkout-btn",
    websiteId: "demo-store",
    name: "Style checkout CTA",
    status: "verified",
    currentVersion: 1,
    versions: [],
    targetFingerprint: {
      tag: "button",
      selector: "#checkout-btn",
      role: "button",
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

  const cleanConflicts: ConflictDetectionResult = {
    hasConflicts: false,
    conflicts: [],
  };

  const passingRun: VerificationRun = {
    id: "run-1",
    patchId: "patch-checkout-btn",
    websiteId: "demo-store",
    status: "passed",
    viewportsRun: [
      { name: "Desktop", width: 1280, height: 800, passed: true },
      { name: "Mobile", width: 375, height: 667, passed: true },
    ],
    assertions: [
      { assertionId: "desktop-style-applied", passed: true },
      { assertionId: "mobile-style-applied", passed: true },
    ],
    durationMs: 1200,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  it("calculates low risk and ready_to_publish for a verified patch without conflicts", () => {
    const blast = computeBlastRadius(dummyPatch, cleanConflicts, passingRun);
    expect(blast.riskLevel).toBe("low");
    expect(blast.impactType).toBe("cosmetic_style");
    expect(blast.hasCollisions).toBe(false);
    expect(blast.verificationPassed).toBe(true);

    const readiness = computeReadinessDecision(dummyPatch, blast, passingRun);
    expect(readiness.decision).toBe("ready_to_publish");
    expect(readiness.reasons[0]).toContain("All release gates passed");
  });

  it("elevates risk to high and blocks release if competing patches conflict", () => {
    const collidingConflicts: ConflictDetectionResult = {
      hasConflicts: true,
      conflicts: [
        {
          patchIdA: "patch-checkout-btn",
          patchIdB: "patch-other",
          targetSelector: "#checkout-btn",
          conflictType: "property_collision",
          property: "background-color",
          reason: "Competing patches touch background-color",
        },
      ],
    };

    const blast = computeBlastRadius(dummyPatch, collidingConflicts, passingRun);
    expect(blast.riskLevel).toBe("high");
    expect(blast.hasCollisions).toBe(true);

    const readiness = computeReadinessDecision(dummyPatch, blast, passingRun);
    expect(readiness.decision).toBe("blocked_by_conflict");
    expect(readiness.reasons[0]).toContain("Release Gate Blocked");
  });

  it("elevates risk to high and blocks release if target is stale/drifted", () => {
    const stalePatch: Patch = { ...dummyPatch, status: "stale" };
    const blast = computeBlastRadius(stalePatch, cleanConflicts, passingRun);
    expect(blast.riskLevel).toBe("high");

    const readiness = computeReadinessDecision(stalePatch, blast, passingRun);
    expect(readiness.decision).toBe("target_stale");
    expect(readiness.reasons[0]).toContain("Target element has drifted");
  });

  it("elevates risk to high and blocks release if verification failed", () => {
    const failedRun: VerificationRun = {
      ...passingRun,
      status: "failed",
      error: "Assertion desktop-style-applied failed",
    };
    const failedPatch: Patch = { ...dummyPatch, status: "verification_failed" };

    const blast = computeBlastRadius(failedPatch, cleanConflicts, failedRun);
    expect(blast.riskLevel).toBe("high");

    const readiness = computeReadinessDecision(failedPatch, blast, failedRun);
    expect(readiness.decision).toBe("verification_failed");
    expect(readiness.reasons[0]).toContain("Browser verification failed");
  });

  it("classifies element.hide as medium risk because of structural impact", () => {
    const hidePatch: Patch = {
      ...dummyPatch,
      status: "previewing",
      operation: { type: "element.hide" },
    };
    const blast = computeBlastRadius(hidePatch, cleanConflicts, undefined);
    expect(blast.riskLevel).toBe("medium");
    expect(blast.impactType).toBe("visibility");
  });
});
