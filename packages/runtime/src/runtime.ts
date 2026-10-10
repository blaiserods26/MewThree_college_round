import type { Patch } from "@patchwork/contracts";
import {
  applyPatchToDom,
  revertPatchOnDom,
  type ApplyPatchResult,
  type RevertPatchResult,
} from "./mutation.js";

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
  resetToBaseline?: () => RevertPatchResult | undefined;
  reapplyPreview?: () => ApplyPatchResult | undefined;
}

export async function initPatchworkRuntime(
  options: RuntimeInitOptions = {}
): Promise<RuntimeResult> {
  const doc = options.doc || (typeof document !== "undefined" ? document : ({} as Document));
  const win = options.win || (typeof window !== "undefined" ? window : ({} as Window));
  // 1. Identify Website ID and API Base from script tag or URL params
  const searchParams = new URLSearchParams(win.location?.search || "");
  const scriptTag = doc.querySelector("script[data-website-id]");
  const websiteId = scriptTag?.getAttribute("data-website-id") || "demo-store";
  const apiBase =
    options.apiBase ||
    searchParams.get("patchwork_api") ||
    scriptTag?.getAttribute("data-api-base") ||
    "http://localhost:4000/api";

  // 2. Check for isolated preview mode in URL query
  const previewPatchId = searchParams.get("patchwork_preview");

  if (previewPatchId) {
    // PREVIEW MODE: isolated fetch
    try {
      const res = await fetch(`${apiBase}/patches/${previewPatchId}`);
      if (!res.ok) {
        renderPreviewWatermark(doc);
        console.warn(`[PATCHWORK Runtime] Failed to fetch preview patch '${previewPatchId}'`);
        return { mode: "preview", websiteId, patchId: previewPatchId, results: [] };
      }
      const draftPatch: Patch = await res.json();
      let applyResult = applyPatchToDom(draftPatch, doc);

      let isPatched = applyResult.status === "applied";

      const resetToBaseline = () => {
        if (!isPatched) return undefined;
        const rev = revertPatchOnDom(applyResult, doc);
        if (rev.reverted) {
          isPatched = false;
        }
        return rev;
      };

      const reapplyPreview = () => {
        if (isPatched) return applyResult;
        applyResult = applyPatchToDom(draftPatch, doc);
        if (applyResult.status === "applied") {
          isPatched = true;
        }
        return applyResult;
      };

      renderPreviewBar(doc, draftPatch, {
        isPatched: () => isPatched,
        onToggle: () => {
          if (isPatched) {
            resetToBaseline();
          } else {
            reapplyPreview();
          }
        },
      });

      // Expose to window for headless testing & inspector automation
      if (typeof win !== "undefined") {
        (win as any).__PATCHWORK_PREVIEW__ = {
          patch: draftPatch,
          applyResult,
          resetToBaseline,
          reapplyPreview,
          isBaseline: () => !isPatched,
        };
      }

      return {
        mode: "preview",
        websiteId,
        patchId: previewPatchId,
        results: [applyResult],
        resetToBaseline,
        reapplyPreview,
      };
    } catch (err) {
      renderPreviewWatermark(doc);
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

function renderPreviewBar(
  doc: Document,
  patch: Patch,
  handlers: { isPatched: () => boolean; onToggle: () => void }
) {
  renderPreviewWatermark(doc);

  if (doc.getElementById("patchwork-preview-bar")) return;

  const bar = doc.createElement("div");
  bar.id = "patchwork-preview-bar";
  bar.setAttribute(
    "style",
    "position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 999998; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 12px; padding: 10px 18px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6); display: flex; align-items: center; gap: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #f8fafc; font-size: 13px; max-width: 90vw;"
  );

  const opSummary =
    patch.operation.type === "style.set"
      ? `${patch.operation.type} (${patch.operation.property}: ${patch.operation.value})`
      : patch.operation.type;

  bar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span id="patchwork-preview-status-pill" style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase;">Preview Active</span>
      <strong style="color: #ffffff;">${patch.name}</strong>
      <span style="color: #94a3b8; font-family: monospace; font-size: 11px;">[${patch.targetFingerprint.selector}]</span>
      <span style="color: #cbd5e1; font-size: 12px;">${opSummary}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button id="patchwork-preview-toggle-btn" style="background: #4f46e5; hover: #4338ca; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;">
        Reset to Baseline
      </button>
    </div>
  `;

  doc.body?.appendChild(bar);

  const toggleBtn = bar.querySelector("#patchwork-preview-toggle-btn") as HTMLButtonElement | null;
  const statusPill = bar.querySelector("#patchwork-preview-status-pill") as HTMLElement | null;

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      handlers.onToggle();
      const patched = handlers.isPatched();
      if (patched) {
        toggleBtn.textContent = "Reset to Baseline";
        toggleBtn.style.background = "#4f46e5";
        if (statusPill) {
          statusPill.textContent = "Preview Active";
          statusPill.style.color = "#4ade80";
          statusPill.style.background = "rgba(34, 197, 94, 0.2)";
          statusPill.style.borderColor = "rgba(34, 197, 94, 0.3)";
        }
      } else {
        toggleBtn.textContent = "Re-apply Patch";
        toggleBtn.style.background = "#0284c7";
        if (statusPill) {
          statusPill.textContent = "Baseline (Unpatched)";
          statusPill.style.color = "#38bdf8";
          statusPill.style.background = "rgba(56, 189, 248, 0.15)";
          statusPill.style.borderColor = "rgba(56, 189, 248, 0.3)";
        }
      }
    });
  }
}

