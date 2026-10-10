import type { Patch } from "@patchwork/contracts";
import {
  applyPatchToDom,
  revertPatchOnDom,
  type ApplyPatchResult,
  type RevertPatchResult,
} from "./mutation.js";
import {
  detectDomDriftAndHandleStale,
  type DriftDetectionResult,
} from "./fingerprint.js";

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
  drift?: DriftDetectionResult;
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

      let driftResult: DriftDetectionResult | undefined = undefined;
      if (applyResult.status === "stale") {
        driftResult = await detectDomDriftAndHandleStale(draftPatch, doc, apiBase);
        renderDriftWatermark(doc, draftPatch, driftResult);
      }

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
        isStale: applyResult.status === "stale",
        drift: driftResult,
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
          drift: {
            isDrifted: applyResult.status === "stale",
            candidate: driftResult?.candidate,
            candidateElementId: driftResult?.candidateElementId,
            score: driftResult?.score,
            tier: driftResult?.tier,
            breakdown: driftResult?.breakdown,
          },
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
        drift: driftResult,
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
    let primaryDriftResult: DriftDetectionResult | undefined = undefined;

    for (const patch of patches) {
      const r = applyPatchToDom(patch, doc);
      results.push(r);
      if (r.status === "stale") {
        const drift = await detectDomDriftAndHandleStale(patch, doc, apiBase);
        if (!primaryDriftResult) primaryDriftResult = drift;
        renderDriftWatermark(doc, patch, drift);
      }
    }

    return {
      mode: "production",
      websiteId,
      releaseId: release?.id,
      results,
      drift: primaryDriftResult,
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

export function renderDriftWatermark(
  doc: Document,
  patch: Patch,
  drift: DriftDetectionResult
) {
  if (doc.getElementById("patchwork-drift-watermark")) return;
  const banner = doc.createElement("div");
  banner.id = "patchwork-drift-watermark";
  banner.setAttribute(
    "style",
    "position: fixed; top: 56px; right: 12px; z-index: 999997; background: rgba(30, 27, 75, 0.95); backdrop-filter: blur(12px); color: #f8fafc; border: 1px solid rgba(245, 158, 11, 0.6); box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 10px; padding: 12px 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; max-width: 380px;"
  );

  const tierColor =
    drift.tier === "high"
      ? "#22c55e"
      : drift.tier === "review_required"
      ? "#f59e0b"
      : "#ef4444";
  const tierLabel =
    drift.tier === "high"
      ? "High Confidence Match"
      : drift.tier === "review_required"
      ? "Review Required"
      : "Stale / Ambiguous";

  const candidateHtml = drift.candidate
    ? `
      <div style="margin-top: 8px; padding: 6px 10px; background: rgba(15, 23, 42, 0.6); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="color: #94a3b8; font-size: 11px;">Candidate: <strong style="color: #ffffff; font-family: monospace;">${drift.candidate.selector}</strong></span>
          <span style="background: ${tierColor}22; color: ${tierColor}; border: 1px solid ${tierColor}55; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
            ${((drift.score || 0) * 100).toFixed(0)}% • ${tierLabel}
          </span>
        </div>
        <div style="color: #cbd5e1; font-size: 11px;">
          Tag: ${(drift.candidate.breakdown.tag * 100).toFixed(0)}% | Text: ${(drift.candidate.breakdown.text * 100).toFixed(0)}% | Aria: ${(drift.candidate.breakdown.roleAndAria * 100).toFixed(0)}%
        </div>
      </div>
    `
    : `<div style="color: #ef4444; font-size: 11px; margin-top: 6px;">No candidate met confidence threshold.</div>`;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="display: inline-block; width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;"></span>
        <strong style="color: #fbbf24; font-size: 12px; letter-spacing: 0.02em;">DOM DRIFT DETECTED</strong>
      </div>
      <span style="color: #94a3b8; font-size: 11px;">${patch.id}</span>
    </div>
    <div style="color: #e2e8f0; font-size: 11px; line-height: 1.4;">
      Target selector <code style="color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 1px 4px; border-radius: 3px;">${patch.targetFingerprint.selector}</code> failed to resolve.
    </div>
    ${candidateHtml}
    <div style="margin-top: 8px; font-size: 10px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
      Safety gate enforced: patch mutations paused to prevent element corruption. Rebind target in PATCHWORK Dashboard.
    </div>
  `;

  doc.body?.appendChild(banner);
}

function renderPreviewBar(
  doc: Document,
  patch: Patch,
  handlers: {
    isPatched: () => boolean;
    isStale?: boolean;
    drift?: DriftDetectionResult;
    onToggle: () => void;
  }
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

  const initialPillText = handlers.isStale ? "Stale (Drift Detected)" : "Preview Active";
  const initialPillColor = handlers.isStale ? "#fbbf24" : "#4ade80";
  const initialPillBg = handlers.isStale ? "rgba(245, 158, 11, 0.2)" : "rgba(34, 197, 94, 0.2)";
  const initialPillBorder = handlers.isStale ? "rgba(245, 158, 11, 0.4)" : "rgba(34, 197, 94, 0.3)";

  bar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span id="patchwork-preview-status-pill" style="background: ${initialPillBg}; color: ${initialPillColor}; border: 1px solid ${initialPillBorder}; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${initialPillText}</span>
      <strong style="color: #ffffff;">${patch.name}</strong>
      <span style="color: #94a3b8; font-family: monospace; font-size: 11px;">[${patch.targetFingerprint.selector}]</span>
      <span style="color: #cbd5e1; font-size: 12px;">${opSummary}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button id="patchwork-preview-toggle-btn" style="background: ${handlers.isStale ? "#475569" : "#4f46e5"}; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: ${handlers.isStale ? "not-allowed" : "pointer"}; transition: background 0.15s ease;" ${handlers.isStale ? "disabled" : ""}>
        ${handlers.isStale ? "Target Drifted (Rebind Required)" : "Reset to Baseline"}
      </button>
    </div>
  `;

  doc.body?.appendChild(bar);

  const toggleBtn = bar.querySelector("#patchwork-preview-toggle-btn") as HTMLButtonElement | null;
  const statusPill = bar.querySelector("#patchwork-preview-status-pill") as HTMLElement | null;

  if (toggleBtn && !handlers.isStale) {
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
