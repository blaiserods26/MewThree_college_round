import { describe, it, expect } from "bun:test";
import {
  validatePatchTransition,
  canPublishPatch,
  validateReleaseTransition,
  PATCH_STATUSES,
  RELEASE_STATUSES,
  type Patch,
} from "../src/index.js";

describe("Patch Lifecycle State Machine", () => {
  it("allows legal patch state transitions", () => {
    // draft -> previewing
    expect(validatePatchTransition("draft", "previewing").valid).toBe(true);
    // previewing -> verified
    expect(validatePatchTransition("previewing", "verified").valid).toBe(true);
    // verified -> published
    expect(validatePatchTransition("verified", "published").valid).toBe(true);
    // published -> stale
    expect(validatePatchTransition("published", "stale").valid).toBe(true);
    // stale -> draft
    expect(validatePatchTransition("stale", "draft").valid).toBe(true);
  });

  it("strictly forbids publishing unverified or defective patches", () => {
    // draft -> published directly (forbidden)
    const draftPub = validatePatchTransition("draft", "published");
    expect(draftPub.valid).toBe(false);
    expect(draftPub.error).toContain("cannot transition directly from 'draft' to 'published'");

    // verification_failed -> published (forbidden)
    const failedPub = validatePatchTransition("verification_failed", "published");
    expect(failedPub.valid).toBe(false);
    expect(failedPub.error).toContain("cannot be published while in status 'verification_failed'");

    // stale -> published (forbidden)
    const stalePub = validatePatchTransition("stale", "published");
    expect(stalePub.valid).toBe(false);
    expect(stalePub.error).toContain("cannot be published while in status 'stale'");

    // conflict -> published (forbidden)
    const conflictPub = validatePatchTransition("conflict", "published");
    expect(conflictPub.valid).toBe(false);
    expect(conflictPub.error).toContain("cannot be published while in status 'conflict'");
  });

  it("canPublishPatch helper returns true only for verified patches", () => {
    const verifiedPatch: Partial<Patch> = {
      id: "P-1",
      status: "verified",
    };
    expect(canPublishPatch(verifiedPatch as Patch)).toBe(true);

    const draftPatch: Partial<Patch> = {
      id: "P-2",
      status: "draft",
    };
    expect(canPublishPatch(draftPatch as Patch)).toBe(false);

    const failedPatch: Partial<Patch> = {
      id: "P-3",
      status: "verification_failed",
    };
    expect(canPublishPatch(failedPatch as Patch)).toBe(false);
  });

  it("validates release transitions", () => {
    expect(validateReleaseTransition("active", "superseded").valid).toBe(true);
    expect(validateReleaseTransition("active", "rolled_back").valid).toBe(true);
    expect(validateReleaseTransition("superseded", "active").valid).toBe(true);
    expect(validateReleaseTransition("rolled_back", "superseded").valid).toBe(false);
  });
});
