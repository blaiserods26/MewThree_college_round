import type { Patch } from "@patchwork/contracts";
import { applyPatchToDom, type ApplyPatchResult } from "./mutation.js";

export interface RuntimeInitOptions {
  apiBase?: string;
  doc?: Document;
  win?: Window;
}

export interface RuntimeResult {
  mode: "preview" | "production";
  websiteId: string;
  releaseId?: string;
  patchId?: string;
  results: ApplyPatchResult[];
}

export async function initPatchworkRuntime(
  options: RuntimeInitOptions = {}
): Promise<RuntimeResult> {
  const doc = options.doc || (typeof document !== "undefined" ? document : ({} as Document));
  const win = options.win || (typeof window !== "undefined" ? window : ({} as Window));
  const apiBase = options.apiBase || "http://localhost:4000/api";

  // 1. Identify Website ID from script tag attribute
  const scriptTag = doc.querySelector("script[data-website-id]");
  const websiteId = scriptTag?.getAttribute("data-website-id") || "demo-store";

  // 2. Check for isolated preview mode in URL query
  const searchParams = new URLSearchParams(win.location?.search || "");
  const previewPatchId = searchParams.get("patchwork_preview");

  if (previewPatchId) {
    // PREVIEW MODE: isolated fetch
    renderPreviewWatermark(doc);
    try {
      const res = await fetch(`${apiBase}/patches/${previewPatchId}`);
      if (!res.ok) {
        console.warn(`[PATCHWORK Runtime] Failed to fetch preview patch '${previewPatchId}'`);
        return { mode: "preview", websiteId, patchId: previewPatchId, results: [] };
      }
      const draftPatch: Patch = await res.json();
      const applyResult = applyPatchToDom(draftPatch, doc);
      return {
        mode: "preview",
        websiteId,
        patchId: previewPatchId,
        results: [applyResult],
      };
    } catch (err) {
      console.error("[PATCHWORK Runtime] Error loading preview patch:", err);
      return { mode: "preview", websiteId, patchId: previewPatchId, results: [] };
    }
  }

  // PRODUCTION MODE: fetch active release bundle
  try {
    const res = await fetch(`${apiBase}/websites/${websiteId}/active-release`);
    if (!res.ok) {
      return { mode: "production", websiteId, results: [] };
    }
    const data = await res.json();
    const release = data.release;
    const patches: Patch[] = data.patches || [];

    const results: ApplyPatchResult[] = [];
    for (const patch of patches) {
      const r = applyPatchToDom(patch, doc);
      results.push(r);
    }

    return {
      mode: "production",
      websiteId,
      releaseId: release?.id,
      results,
    };
  } catch (err) {
    console.error("[PATCHWORK Runtime] Error loading active release:", err);
    return { mode: "production", websiteId, results: [] };
  }
}

function renderPreviewWatermark(doc: Document) {
  if (doc.getElementById("patchwork-preview-badge")) return;
  const badge = doc.createElement("div");
  badge.id = "patchwork-preview-badge";
  badge.setAttribute(
    "style",
    "position: fixed; top: 12px; right: 12px; z-index: 999999; background: rgba(99, 102, 241, 0.9); backdrop-filter: blur(8px); color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.25); display: flex; align-items: center; gap: 6px;"
  );
  badge.innerHTML = `<span style="width: 8px; height: 8px; background: #22d3ee; border-radius: 50%;"></span> PATCHWORK PREVIEW MODE`;
  doc.body?.appendChild(badge);
}
