import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { AuditActor, Patch, VerificationRun } from "@patchwork/contracts";
import { createServer } from "../src/api.js";
import { PatchService, type PatchVerifier } from "../src/service.js";
import { JsonFileStore } from "../src/store.js";

const DB_PATH = path.join(import.meta.dirname, "test-edge-db.json");
const actor: AuditActor = { id: "dev-1", name: "Dev", role: "developer" };

function cleanup() {
  for (const f of fs.readdirSync(import.meta.dirname)) {
    if (f.startsWith("test-edge-db")) fs.unlinkSync(path.join(import.meta.dirname, f));
  }
}

function newService(options?: ConstructorParameters<typeof PatchService>[1]) {
  const store = new JsonFileStore(DB_PATH);
  return { store, service: new PatchService(store, options) };
}

function draft(service: PatchService, selector = "#btn") {
  return service.createPatch({
    websiteId: "demo-store",
    name: "Edge patch",
    targetFingerprint: { tag: "button", selector },
    operation: { type: "style.set", property: "color", value: "red" },
    actor,
  });
}

function failedRun(patch: Patch, error: string): VerificationRun {
  const now = new Date().toISOString();
  return {
    id: "ver-stub",
    patchId: patch.id,
    websiteId: patch.websiteId,
    status: "failed",
    viewport: { width: 1280, height: 800 },
    startedAt: now,
    completedAt: now,
    durationMs: 1,
    assertions: [{ assertionId: "desktop-target-unique", passed: false, errorMessage: error }],
    error,
  };
}

beforeEach(cleanup);
afterEach(cleanup);

describe("Verification worker failures", () => {
  it("records a failed run and blocks publication when the worker throws", async () => {
    const verifier: PatchVerifier = async () => {
      throw new Error("browser crashed");
    };
    const { service } = newService({ verifier });
    const patch = draft(service);

    const run = await service.verifyPatch(patch.id);

    expect(run.status).toBe("failed");
    expect(run.error).toContain("browser crashed");
    expect(service.getPatch(patch.id)!.status).toBe("verification_failed");
    expect(service.listVerificationRuns(patch.id).length).toBe(1);

    const events = service.listAuditEvents({ entityId: patch.id });
    expect(events.some((e) => e.action === "verification.failed")).toBe(true);

    expect(() =>
      service.createRelease({ websiteId: "demo-store", patchIds: [patch.id], actor })
    ).toThrow("Only 'verified' patches can be released");
  });

  it("times out a hung worker instead of leaving the patch stuck in previewing", async () => {
    const verifier: PatchVerifier = () => new Promise<VerificationRun>(() => {});
    const { service } = newService({ verifier, verificationTimeoutMs: 40 });
    const patch = draft(service);

    const run = await service.verifyPatch(patch.id);

    expect(run.status).toBe("failed");
    expect(run.error).toContain("timed out");
    expect(service.getPatch(patch.id)!.status).toBe("verification_failed");
  });

  it("marks a patch whose selector is ambiguous as verification_failed", async () => {
    const verifier: PatchVerifier = async ({ patch }) =>
      failedRun(patch, "Target selector '.btn' matched 3 elements (ambiguous).");
    const { service } = newService({ verifier });
    const patch = draft(service, ".btn");

    const run = await service.verifyPatch(patch.id);

    expect(run.error).toContain("ambiguous");
    expect(service.getPatch(patch.id)!.status).toBe("verification_failed");
  });

  it("allows re-verification after a worker failure", async () => {
    let calls = 0;
    const verifier: PatchVerifier = async ({ patch }) => {
      calls++;
      if (calls === 1) throw new Error("flaky worker");
      return { ...failedRun(patch, ""), status: "passed", error: undefined, assertions: [] };
    };
    const { service } = newService({ verifier });
    const patch = draft(service);

    await service.verifyPatch(patch.id);
    expect(service.getPatch(patch.id)!.status).toBe("verification_failed");

    const second = await service.verifyPatch(patch.id);
    expect(second.status).toBe("passed");
    expect(service.getPatch(patch.id)!.status).toBe("verified");
  });
});

describe("Operation allowlist", () => {
  it("rejects disallowed operations on create, update and conflict revision", () => {
    const { service } = newService();
    const bad = { type: "script.inject", value: "alert(1)" } as any;

    expect(() =>
      service.createPatch({
        websiteId: "demo-store",
        name: "Bad",
        targetFingerprint: { tag: "button", selector: "#x" },
        operation: bad,
        actor,
      })
    ).toThrow("Invalid patch operation");

    const patch = draft(service);
    expect(() => service.updatePatchDraft(patch.id, { operation: bad, actor })).toThrow(
      "Invalid patch operation"
    );
    expect(() =>
      service.resolvePatchConflict(patch.id, {
        strategy: "revise_value",
        revisedOperation: bad,
        actor,
      })
    ).toThrow("Invalid revised operation");
  });
});

describe("Release and rollback boundaries", () => {
  it("rejects releases with no patches or for unknown websites", () => {
    const { service } = newService();
    expect(() => service.createRelease({ websiteId: "demo-store", patchIds: [], actor })).toThrow(
      "at least one"
    );
    const patch = draft(service);
    expect(() =>
      service.createRelease({ websiteId: "ghost-site", patchIds: [patch.id], actor })
    ).toThrow("Website 'ghost-site' not found");
  });

  it("returns a meaningful error when rolling back with no release at all", () => {
    const { service } = newService();
    expect(() => service.rollbackRelease("demo-store", actor)).toThrow("No active release");
  });

  it("restores the unpatched baseline when the first release is rolled back", () => {
    const { service } = newService();
    const patch = draft(service);
    service.transitionPatchStatus(patch.id, "previewing", actor);
    service.transitionPatchStatus(patch.id, "verified", actor);
    service.createRelease({ websiteId: "demo-store", patchIds: [patch.id], actor });

    const result = service.rollbackRelease("demo-store", actor, "no known-good release");

    expect(result.success).toBe(true);
    expect((result as any).restoredBaseline).toBe(true);
    expect(service.getActiveRelease("demo-store")).toBeUndefined();
    expect(service.getWebsite("demo-store")!.activeReleaseId).toBeUndefined();
    expect(service.getPatch(patch.id)!.status).toBe("rolled_back");

    // A second rollback has nothing left to roll back and must say so.
    expect(() => service.rollbackRelease("demo-store", actor)).toThrow("No active release");
  });
});

describe("Conflicting patches", () => {
  it("surfaces conflicts and blocks the release until they are resolved", () => {
    const { service } = newService();
    const make = (value: string) => {
      const p = draft(service, "#checkout");
      service.updatePatchDraft(p.id, {
        operation: { type: "style.set", property: "background-color", value },
        actor,
      });
      service.transitionPatchStatus(p.id, "previewing", actor);
      service.transitionPatchStatus(p.id, "verified", actor);
      return p;
    };
    const a = make("#111111");
    const b = make("#222222");

    expect(service.getWebsiteConflicts("demo-store").hasConflicts).toBe(true);
    expect(() =>
      service.createRelease({ websiteId: "demo-store", patchIds: [a.id, b.id], actor })
    ).toThrow("Conflicting patches detected");
  });
});

describe("HTTP error handling", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    const { service } = newService();
    server = createServer(service);
    await new Promise<void>((resolve) =>
      server.listen(0, () => {
        baseUrl = `http://localhost:${(server.address() as any).port}`;
        resolve();
      })
    );
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns 404 for unknown patches and 400 for malformed JSON", async () => {
    const missing = await fetch(`${baseUrl}/api/patches/nope/verifications`);
    expect(missing.status).toBe(200); // list endpoint: empty history, not an error

    const notFound = await fetch(`${baseUrl}/api/patches/nope`);
    expect(notFound.status).toBe(404);

    const transition = await fetch(`${baseUrl}/api/patches/nope/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStatus: "verified" }),
    });
    expect(transition.status).toBe(404);
    expect((await transition.json()).error).toContain("not found");

    const badJson = await fetch(`${baseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(badJson.status).toBe(400);
    expect((await badJson.json()).error).toContain("Invalid JSON");
  });

  it("rejects a disallowed operation with a clear 400", async () => {
    const res = await fetch(`${baseUrl}/api/patches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: "demo-store",
        name: "Bad op",
        targetFingerprint: { tag: "button", selector: "#x" },
        operation: { type: "script.inject", value: "x" },
        actor,
      }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid patch operation");
  });

  it("reports rollback with no release as a client error with a reason", async () => {
    const res = await fetch(`${baseUrl}/api/websites/demo-store/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("No active release");
  });
});

describe("Store durability", () => {
  it("preserves a corrupt database file instead of silently overwriting it", () => {
    fs.writeFileSync(DB_PATH, "{ this is not json", "utf-8");
    const store = new JsonFileStore(DB_PATH);

    expect(store.getWebsite("demo-store")).toBeDefined();
    const backups = fs.readdirSync(import.meta.dirname).filter((f) => f.includes("corrupt"));
    expect(backups.length).toBe(1);
    expect(fs.readFileSync(path.join(import.meta.dirname, backups[0]), "utf-8")).toBe(
      "{ this is not json"
    );
  });
});

describe("Demo reset", () => {
  function listen(server: http.Server) {
    return new Promise<string>((resolve) =>
      server.listen(0, () => resolve(`http://localhost:${(server.address() as any).port}`))
    );
  }

  it("is refused unless explicitly enabled", async () => {
    const { service } = newService();
    const server = createServer(service);
    const url = await listen(server);
    try {
      const res = await fetch(`${url}/api/admin/reset`, { method: "POST" });
      expect(res.status).toBe(403);
      expect((await res.json()).error).toContain("ENABLE_DEMO_RESET");
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("wipes patches, releases and audit history back to the baseline when enabled", async () => {
    const { service } = newService();
    const patch = draft(service);
    service.transitionPatchStatus(patch.id, "previewing", actor);
    service.transitionPatchStatus(patch.id, "verified", actor);
    service.createRelease({ websiteId: "demo-store", patchIds: [patch.id], actor });

    const server = createServer(service, { enableDemoReset: true });
    const url = await listen(server);
    try {
      const res = await fetch(`${url}/api/admin/reset`, { method: "POST" });
      expect(res.status).toBe(200);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }

    expect(service.listPatches().length).toBe(0);
    expect(service.listReleases().length).toBe(0);
    expect(service.listAuditEvents().length).toBe(0);
    expect(service.getWebsite("demo-store")).toBeDefined();

    // Reset must be durable, not just in memory.
    const reopened = new PatchService(new JsonFileStore(DB_PATH));
    expect(reopened.listPatches().length).toBe(0);
  });
});
