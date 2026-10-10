import http from "node:http";
import type { PatchService } from "./service.js";

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store, private",
  });
  res.end(JSON.stringify(body));
}

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer | string) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

export interface ApiServerOptions {
  /** Exposes POST /api/admin/reset to wipe data back to the demo baseline. Off by default. */
  enableDemoReset?: boolean;
}

export function createServer(service: PatchService, options: ApiServerOptions = {}): http.Server {
  return http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = parsedUrl.pathname;
    const method = req.method || "GET";

    try {
      // 0. Health & demo administration
      if (pathname === "/api/health" && method === "GET") {
        return sendJson(res, 200, { status: "ok" });
      }

      if (pathname === "/api/admin/reset" && method === "POST") {
        if (!options.enableDemoReset) {
          return sendJson(res, 403, {
            error: "Demo reset is disabled. Start the server with ENABLE_DEMO_RESET=true.",
          });
        }
        service.resetDemoData();
        return sendJson(res, 200, { status: "reset" });
      }

      // 1. Websites Endpoints
      if (pathname === "/api/websites" && method === "GET") {
        return sendJson(res, 200, service.listWebsites());
      }

      const websiteMatch = pathname.match(/^\/api\/websites\/([^/]+)$/);
      if (websiteMatch && method === "GET") {
        const site = service.getWebsite(websiteMatch[1]);
        if (!site) return sendJson(res, 404, { error: "Website not found" });
        return sendJson(res, 200, site);
      }

      // Website Conflicts endpoint
      const websiteConflictsMatch = pathname.match(/^\/api\/websites\/([^/]+)\/conflicts$/);
      if (websiteConflictsMatch && method === "GET") {
        const websiteId = websiteConflictsMatch[1];
        return sendJson(res, 200, service.getWebsiteConflicts(websiteId));
      }

      // Website Release Health Check endpoint
      const websiteHealthMatch = pathname.match(/^\/api\/websites\/([^/]+)\/check-health$/);
      if (websiteHealthMatch && (method === "POST" || method === "GET")) {
        const websiteId = websiteHealthMatch[1];
        const body = method === "POST" ? await parseJsonBody(req).catch(() => ({})) : {};
        const actor = body.actor || { id: "health-monitor", name: "Patch Health Monitor", role: "automated-system" };
        const health = await service.checkReleaseHealth(websiteId, actor);
        return sendJson(res, 200, health);
      }

      // AI Proposal endpoint
      if (pathname === "/api/ai/proposal" && method === "POST") {
        const body = await parseJsonBody(req);
        const proposal = await service.getAiService().generatePatchProposal({
          websiteId: body.websiteId || "demo-store",
          prompt: body.problemDescription || body.prompt || "Fix mobile layout issue",
          elementContext: {
            tag: body.elementTag || "button",
            selector: body.selectorContext || "#checkout-btn",
          },
        });
        return sendJson(res, 200, { proposal, isMock: true });
      }

      // AI Failure Explanation endpoint
      if (pathname === "/api/ai/explain-failure" && method === "POST") {
        const body = await parseJsonBody(req);
        const patch = service.getPatch(body.patchId);
        if (!patch) return sendJson(res, 404, { error: "Patch not found" });
        const runs = service.listVerificationRuns(patch.id);
        const latestRun = runs[runs.length - 1];
        if (!latestRun) return sendJson(res, 400, { error: "No verification run found for patch" });
        const explanation = await service.getAiService().explainVerificationFailure({
          patch,
          run: latestRun,
        });
        return sendJson(res, 200, { ...explanation, isMock: true });
      }

      // Active Release endpoint for runtime injection
      const activeRelMatch = pathname.match(/^\/api\/websites\/([^/]+)\/active-release$/);
      if (activeRelMatch && method === "GET") {
        const websiteId = activeRelMatch[1];
        const release = service.getActiveRelease(websiteId);
        let patches: unknown[] = [];
        if (release && release.patchIds.length > 0) {
          patches = release.patchIds
            .map((id) => service.getPatch(id))
            .filter((p) => p !== undefined);
        }
        return sendJson(res, 200, { release: release || null, patches });
      }

      // Create Release endpoint
      const createRelMatch = pathname.match(/^\/api\/websites\/([^/]+)\/releases$/);
      if (createRelMatch && method === "POST") {
        const websiteId = createRelMatch[1];
        const body = await parseJsonBody(req);
        const release = service.createRelease({
          websiteId,
          patchIds: body.patchIds || [],
          actor: body.actor || { id: "anonymous", name: "Anonymous", role: "developer" },
          changeSummary: body.changeSummary,
        });
        return sendJson(res, 201, release);
      }

      // Rollback endpoint
      const rollbackMatch = pathname.match(/^\/api\/websites\/([^/]+)\/rollback$/);
      if (rollbackMatch && method === "POST") {
        const websiteId = rollbackMatch[1];
        const body = await parseJsonBody(req);
        const result = service.rollbackRelease(
          websiteId,
          body.actor || { id: "anonymous", name: "Anonymous", role: "developer" },
          body.reason
        );
        return sendJson(res, 200, result);
      }

      // 2. Patches Endpoints
      if (pathname === "/api/patches" && method === "GET") {
        const websiteId = parsedUrl.searchParams.get("websiteId") || undefined;
        const status = (parsedUrl.searchParams.get("status") as any) || undefined;
        return sendJson(res, 200, service.listPatches({ websiteId, status }));
      }

      if (pathname === "/api/patches" && method === "POST") {
        const body = await parseJsonBody(req);
        if (!body.websiteId || !body.name || !body.targetFingerprint || !body.operation) {
          return sendJson(res, 400, {
            error: "websiteId, name, targetFingerprint, and operation are required.",
          });
        }
        const patch = service.createPatch({
          websiteId: body.websiteId,
          name: body.name,
          targetFingerprint: body.targetFingerprint,
          operation: body.operation,
          actor: body.actor || { id: "anonymous", name: "Anonymous", role: "developer" },
        });
        return sendJson(res, 201, patch);
      }

      // Check Conflicts endpoint
      if (pathname === "/api/patches/check-conflicts" && method === "POST") {
        const body = await parseJsonBody(req);
        if (body.patchIds && Array.isArray(body.patchIds)) {
          const patches = body.patchIds
            .map((id: string) => service.getPatch(id))
            .filter((p: any) => p !== undefined);
          return sendJson(res, 200, service.detectPatchConflicts(patches));
        }
        if (body.patchId) {
          return sendJson(
            res,
            200,
            service.checkPatchConflicts(body.patchId, body.candidatePatchIds)
          );
        }
        return sendJson(res, 400, { error: "Either patchIds array or patchId string is required." });
      }

      // Patch Evidence Record endpoint
      const patchEvidenceMatch = pathname.match(/^\/api\/patches\/([^/]+)\/evidence$/);
      if (patchEvidenceMatch && method === "GET") {
        const patchId = patchEvidenceMatch[1];
        try {
          const evidence = service.getPatchEvidence(patchId);
          return sendJson(res, 200, evidence);
        } catch (err: any) {
          return sendJson(res, 404, { error: err.message });
        }
      }

      // Patch Detail
      const patchDetailMatch = pathname.match(/^\/api\/patches\/([^/]+)$/);
      if (patchDetailMatch && method === "GET") {
        const patch = service.getPatch(patchDetailMatch[1]);
        if (!patch) return sendJson(res, 404, { error: "Patch not found" });
        return sendJson(res, 200, patch);
      }

      // Update Patch Draft
      if (patchDetailMatch && method === "PUT") {
        const body = await parseJsonBody(req);
        const updated = service.updatePatchDraft(patchDetailMatch[1], {
          targetFingerprint: body.targetFingerprint,
          operation: body.operation,
          changeNote: body.changeNote,
          actor: body.actor || { id: "anonymous", name: "Anonymous", role: "developer" },
        });
        return sendJson(res, 200, updated);
      }

      // Transition Patch Status
      const transitionMatch = pathname.match(/^\/api\/patches\/([^/]+)\/transition$/);
      if (transitionMatch && method === "POST") {
        const body = await parseJsonBody(req);
        if (!body.targetStatus) {
          return sendJson(res, 400, { error: "targetStatus is required." });
        }
        const updated = service.transitionPatchStatus(
          transitionMatch[1],
          body.targetStatus,
          body.actor || { id: "anonymous", name: "Anonymous", role: "developer" },
          body.reason
        );
        return sendJson(res, 200, updated);
      }

      // Rebind Patch Target (Drift Recovery)
      const rebindMatch = pathname.match(/^\/api\/patches\/([^/]+)\/rebind$/);
      if (rebindMatch && method === "POST") {
        const body = await parseJsonBody(req);
        if (!body.selector) {
          return sendJson(res, 400, { error: "selector is required for rebind." });
        }
        const rebound = service.rebindPatchTarget(rebindMatch[1], {
          selector: body.selector,
          targetFingerprint: body.targetFingerprint,
          changeNote: body.changeNote,
          actor: body.actor || { id: "anonymous", name: "Anonymous", role: "developer" },
        });
        return sendJson(res, 200, rebound);
      }

      // Resolve Conflict
      const resolveConflictMatch = pathname.match(/^\/api\/patches\/([^/]+)\/resolve-conflict$/);
      if (resolveConflictMatch && method === "POST") {
        const patchId = resolveConflictMatch[1];
        const body = await parseJsonBody(req);
        if (!body.strategy) {
          return sendJson(res, 400, {
            error: "strategy is required ('keep_this', 'revise_value', 'discard').",
          });
        }
        const result = service.resolvePatchConflict(patchId, {
          strategy: body.strategy,
          supersededPatchId: body.supersededPatchId,
          revisedOperation: body.revisedOperation,
          reason: body.reason,
          actor: body.actor || { id: "anonymous", name: "Anonymous", role: "developer" },
        });
        return sendJson(res, 200, result);
      }

      // Execute Automated Verification for Patch
      const verifyMatch = pathname.match(/^\/api\/patches\/([^/]+)\/verify$/);
      if (verifyMatch && method === "POST") {
        const body = await parseJsonBody(req);
        const host = req.headers.host || "localhost:4000";
        const run = await service.verifyPatch(verifyMatch[1], {
          actor: body.actor || { id: "anonymous", name: "Anonymous", role: "developer" },
          websiteBaseUrl: body.websiteBaseUrl,
          apiBaseUrl: body.apiBaseUrl || `http://${host}/api`,
        });
        return sendJson(res, 200, run);
      }

      // List Verification Runs for Patch
      const verificationsMatch = pathname.match(/^\/api\/patches\/([^/]+)\/verifications$/);
      if (verificationsMatch && method === "GET") {
        const runs = service.listVerificationRuns(verificationsMatch[1]);
        return sendJson(res, 200, runs);
      }

      // Single Verification Run Detail
      const runDetailMatch = pathname.match(/^\/api\/verifications\/([^/]+)$/);
      if (runDetailMatch && method === "GET") {
        const run = service.getVerificationRun(runDetailMatch[1]);
        if (!run) return sendJson(res, 404, { error: "Verification run not found" });
        return sendJson(res, 200, run);
      }

      // 3. Audit Events Endpoints
      if (pathname === "/api/audit-events" && method === "GET") {
        const websiteId = parsedUrl.searchParams.get("websiteId") || undefined;
        return sendJson(res, 200, service.listAuditEvents(websiteId));
      }

      // 4. Releases Endpoint
      if (pathname === "/api/releases" && method === "GET") {
        const websiteId = parsedUrl.searchParams.get("websiteId") || undefined;
        return sendJson(res, 200, service.listReleases(websiteId));
      }

      // 5. AI Endpoints (Phase 8)
      if (pathname === "/api/ai/generate-patch" && method === "POST") {
        const body = await parseJsonBody(req);
        if (!body.prompt || typeof body.prompt !== "string") {
          return sendJson(res, 400, { error: "'prompt' is required to generate an AI hotfix proposal." });
        }
        const proposal = await service.generatePatchProposal({
          websiteId: body.websiteId || "demo-store",
          prompt: body.prompt,
          elementContext: body.elementContext || body.context,
        });
        return sendJson(res, 200, {
          proposal,
          ...proposal,
          provider: "mock",
        });
      }

      if (pathname === "/api/ai/explain-verification" && method === "POST") {
        const body = await parseJsonBody(req);
        if (!body.runId && !body.verificationRunId && !body.patchId) {
          return sendJson(res, 400, { error: "'runId' or 'patchId' is required." });
        }
        const runId = body.runId || body.verificationRunId;
        const explanation = await service.explainVerification(
          runId ? runId : { patchId: body.patchId, failureLog: body.failureLog }
        );
        return sendJson(res, 200, {
          ...explanation,
          provider: "mock",
        });
      }

      if (pathname === "/api/ai/disambiguate-target" && method === "POST") {
        const body = await parseJsonBody(req);
        if (!body.patchId) {
          return sendJson(res, 400, { error: "'patchId' is required." });
        }
        const result = await service.disambiguateTarget(body.patchId, body.candidates || []);
        return sendJson(res, 200, {
          ...result,
          provider: "mock",
        });
      }

      return sendJson(res, 404, { error: "Endpoint not found" });
    } catch (err: any) {
      const message: string = err?.message || "An error occurred";
      const isNotFound = /^(Patch|Website|Release|Verification run) '.*' not found\.?$/.test(message);
      return sendJson(res, isNotFound ? 404 : 400, { error: message });
    }
  });
}
