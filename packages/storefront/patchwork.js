// ../contracts/dist/operations.js
var ALLOWED_STYLE_PROPERTIES = new Set([
  "display",
  "visibility",
  "opacity",
  "color",
  "background",
  "background-color",
  "border",
  "border-color",
  "border-width",
  "border-radius",
  "margin",
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "padding",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
  "font-size",
  "font-weight",
  "line-height",
  "text-align",
  "z-index",
  "position",
  "top",
  "bottom",
  "left",
  "right",
  "flex-direction",
  "align-items",
  "justify-content",
  "gap"
]);
var ALLOWED_ATTRIBUTES = new Set([
  "title",
  "alt",
  "disabled",
  "placeholder",
  "target",
  "rel",
  "role",
  "aria-hidden",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-disabled",
  "aria-expanded",
  "aria-selected",
  "href"
]);
var DANGEROUS_CSS_PATTERNS = [
  /expression\s*\(/i,
  /url\s*\(\s*['"]?javascript:/i,
  /-moz-binding/i,
  /behavior\s*:/i
];
var DANGEROUS_ATTR_PATTERNS = [
  /^javascript:/i,
  /^data:text\/html/i,
  /^vbscript:/i
];
function validatePatchOperation(op) {
  if (!op || typeof op !== "object") {
    return { valid: false, error: "Operation must be an object." };
  }
  switch (op.type) {
    case "style.set": {
      if (!op.property || typeof op.property !== "string") {
        return { valid: false, error: "Style property name is required." };
      }
      const propLower = op.property.toLowerCase().trim();
      if (!ALLOWED_STYLE_PROPERTIES.has(propLower)) {
        return { valid: false, error: `Disallowed CSS property: '${op.property}'.` };
      }
      if (typeof op.value !== "string") {
        return { valid: false, error: "Style value must be a string." };
      }
      for (const pattern of DANGEROUS_CSS_PATTERNS) {
        if (pattern.test(op.value)) {
          return { valid: false, error: "Dangerous CSS expression detected in style value." };
        }
      }
      return { valid: true };
    }
    case "text.set": {
      if (typeof op.value !== "string") {
        return { valid: false, error: "Text value must be a string." };
      }
      return { valid: true };
    }
    case "attribute.set": {
      if (!op.name || typeof op.name !== "string") {
        return { valid: false, error: "Attribute name is required." };
      }
      const attrLower = op.name.toLowerCase().trim();
      if (attrLower.startsWith("on")) {
        return { valid: false, error: `Disallowed attribute: inline event handlers ('${op.name}') are forbidden.` };
      }
      const isAria = attrLower.startsWith("aria-");
      const isData = attrLower.startsWith("data-");
      if (!ALLOWED_ATTRIBUTES.has(attrLower) && !isAria && !isData) {
        return { valid: false, error: `Disallowed attribute: '${op.name}'.` };
      }
      if (typeof op.value !== "string") {
        return { valid: false, error: "Attribute value must be a string." };
      }
      for (const pattern of DANGEROUS_ATTR_PATTERNS) {
        if (pattern.test(op.value.trim())) {
          return { valid: false, error: `Disallowed attribute value for '${op.name}'.` };
        }
      }
      return { valid: true };
    }
    case "element.hide": {
      return { valid: true };
    }
    case "element.show": {
      if (op.display !== undefined && typeof op.display !== "string") {
        return { valid: false, error: "Display value must be a string." };
      }
      return { valid: true };
    }
    default: {
      return {
        valid: false,
        error: `Unsupported operation type: '${op.type}'. Arbitrary script execution is forbidden.`
      };
    }
  }
}
// src/mutation.ts
function resolveTargetElement(fingerprint, doc = document) {
  try {
    const matches = doc.querySelectorAll(fingerprint.selector);
    if (matches.length === 1) {
      return { element: matches[0] };
    }
    if (matches.length > 1) {
      return {
        error: `Target selector matched ${matches.length} elements (expected exactly 1). Ambiguous target.`
      };
    }
    return {};
  } catch (err) {
    return { error: `Invalid CSS selector '${fingerprint.selector}': ${err.message}` };
  }
}
function applyPatchToDom(patch, doc = document) {
  const validation = validatePatchOperation(patch.operation);
  if (!validation.valid) {
    return {
      patchId: patch.id,
      status: "failed",
      error: validation.error || "Disallowed patch operation"
    };
  }
  const resolution = resolveTargetElement(patch.targetFingerprint, doc);
  if (resolution.error) {
    return {
      patchId: patch.id,
      status: "failed",
      error: resolution.error
    };
  }
  const element = resolution.element;
  if (!element) {
    return {
      patchId: patch.id,
      status: "stale",
      error: `Element matching selector '${patch.targetFingerprint.selector}' not found in DOM.`
    };
  }
  const originalState = {};
  const op = patch.operation;
  try {
    switch (op.type) {
      case "style.set": {
        originalState.styleProperty = {
          property: op.property,
          value: element.style.getPropertyValue(op.property) || ""
        };
        element.style.setProperty(op.property, op.value);
        break;
      }
      case "text.set": {
        originalState.textContent = element.textContent || "";
        element.textContent = op.value;
        break;
      }
      case "attribute.set": {
        originalState.attribute = {
          name: op.name,
          value: element.getAttribute(op.name)
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
      originalState
    };
  } catch (err) {
    return {
      patchId: patch.id,
      status: "failed",
      error: `Failed to execute DOM mutation: ${err.message}`
    };
  }
}
function revertPatchFromDom(applyResult, doc = document) {
  const element = applyResult.element;
  const state = applyResult.originalState;
  if (!element || !state) {
    return {
      patchId: applyResult.patchId,
      reverted: false,
      error: "Original state or element reference unavailable for reversion."
    };
  }
  try {
    if (state.styleProperty) {
      if (state.styleProperty.value) {
        element.style.setProperty(state.styleProperty.property, state.styleProperty.value);
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
  } catch (err) {
    return {
      patchId: applyResult.patchId,
      reverted: false,
      error: `Reversion error: ${err.message}`
    };
  }
}
var revertPatchOnDom = revertPatchFromDom;

// src/runtime.ts
async function initPatchworkRuntime(options = {}) {
  const doc = options.doc || (typeof document !== "undefined" ? document : {});
  const win = options.win || (typeof window !== "undefined" ? window : {});
  const searchParams = new URLSearchParams(win.location?.search || "");
  const scriptTag = doc.querySelector("script[data-website-id]");
  const websiteId = scriptTag?.getAttribute("data-website-id") || "demo-store";
  const apiBase = options.apiBase || searchParams.get("patchwork_api") || scriptTag?.getAttribute("data-api-base") || "http://localhost:4000/api";
  const previewPatchId = searchParams.get("patchwork_preview");
  if (previewPatchId) {
    try {
      const res = await fetch(`${apiBase}/patches/${previewPatchId}`);
      if (!res.ok) {
        renderPreviewWatermark(doc);
        console.warn(`[PATCHWORK Runtime] Failed to fetch preview patch '${previewPatchId}'`);
        return { mode: "preview", websiteId, patchId: previewPatchId, results: [] };
      }
      const draftPatch = await res.json();
      let applyResult = applyPatchToDom(draftPatch, doc);
      let isPatched = applyResult.status === "applied";
      const resetToBaseline = () => {
        if (!isPatched)
          return;
        const rev = revertPatchOnDom(applyResult, doc);
        if (rev.reverted) {
          isPatched = false;
        }
        return rev;
      };
      const reapplyPreview = () => {
        if (isPatched)
          return applyResult;
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
        }
      });
      if (typeof win !== "undefined") {
        win.__PATCHWORK_PREVIEW__ = {
          patch: draftPatch,
          applyResult,
          resetToBaseline,
          reapplyPreview,
          isBaseline: () => !isPatched
        };
      }
      return {
        mode: "preview",
        websiteId,
        patchId: previewPatchId,
        results: [applyResult],
        resetToBaseline,
        reapplyPreview
      };
    } catch (err) {
      renderPreviewWatermark(doc);
      console.error("[PATCHWORK Runtime] Error loading preview patch:", err);
      return { mode: "preview", websiteId, patchId: previewPatchId, results: [] };
    }
  }
  try {
    const res = await fetch(`${apiBase}/websites/${websiteId}/active-release`);
    if (!res.ok) {
      return { mode: "production", websiteId, results: [] };
    }
    const data = await res.json();
    const release = data.release;
    const patches = data.patches || [];
    const results = [];
    for (const patch of patches) {
      const r = applyPatchToDom(patch, doc);
      results.push(r);
    }
    return {
      mode: "production",
      websiteId,
      releaseId: release?.id,
      results
    };
  } catch (err) {
    console.error("[PATCHWORK Runtime] Error loading active release:", err);
    return { mode: "production", websiteId, results: [] };
  }
}
function renderPreviewWatermark(doc) {
  if (doc.getElementById("patchwork-preview-badge"))
    return;
  const badge = doc.createElement("div");
  badge.id = "patchwork-preview-badge";
  badge.setAttribute("style", "position: fixed; top: 12px; right: 12px; z-index: 999999; background: rgba(99, 102, 241, 0.9); backdrop-filter: blur(8px); color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.25); display: flex; align-items: center; gap: 6px;");
  badge.innerHTML = `<span style="width: 8px; height: 8px; background: #22d3ee; border-radius: 50%;"></span> PATCHWORK PREVIEW MODE`;
  doc.body?.appendChild(badge);
}
function renderPreviewBar(doc, patch, handlers) {
  renderPreviewWatermark(doc);
  if (doc.getElementById("patchwork-preview-bar"))
    return;
  const bar = doc.createElement("div");
  bar.id = "patchwork-preview-bar";
  bar.setAttribute("style", "position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 999998; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 12px; padding: 10px 18px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6); display: flex; align-items: center; gap: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #f8fafc; font-size: 13px; max-width: 90vw;");
  const opSummary = patch.operation.type === "style.set" ? `${patch.operation.type} (${patch.operation.property}: ${patch.operation.value})` : patch.operation.type;
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
  const toggleBtn = bar.querySelector("#patchwork-preview-toggle-btn");
  const statusPill = bar.querySelector("#patchwork-preview-status-pill");
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

// src/inspector.ts
var AMBIGUOUS_CONTAINER_TAGS = new Set(["HTML", "BODY", "MAIN", "SECTION", "HEADER", "FOOTER"]);
var AMBIGUOUS_CLASSES = new Set(["storefront-app", "store-main", "catalog-grid", "container"]);
function isAmbiguousContainer(element) {
  if (AMBIGUOUS_CONTAINER_TAGS.has(element.tagName.toUpperCase())) {
    return true;
  }
  for (const cls of AMBIGUOUS_CLASSES) {
    if (element.classList && element.classList.contains(cls)) {
      return true;
    }
  }
  return false;
}
function generateElementSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }
  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;
  if (parent && parent.id) {
    return `#${parent.id} > ${tag}`;
  }
  if (element.className && typeof element.className === "string") {
    const classes = element.className.trim().split(/\s+/).filter((c) => c && !c.startsWith("patchwork-"));
    if (classes.length > 0) {
      return `${tag}.${classes[0]}`;
    }
  }
  return tag;
}
function extractTargetFingerprint(element) {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute("role") || (tag === "button" ? "button" : tag === "a" ? "link" : undefined);
  const accessibleName = element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.getAttribute("title") || (element.textContent || "").trim().substring(0, 50) || undefined;
  const text = (element.textContent || "").trim().substring(0, 80) || undefined;
  const parentContext = element.parentElement?.id || element.parentElement?.className || undefined;
  const selector = generateElementSelector(element);
  const stableAttributes = {};
  if (element.getAttribute("name"))
    stableAttributes["name"] = element.getAttribute("name");
  if (element.getAttribute("type"))
    stableAttributes["type"] = element.getAttribute("type");
  if (element.getAttribute("data-testid"))
    stableAttributes["data-testid"] = element.getAttribute("data-testid");
  return {
    tag,
    role,
    accessibleName,
    text,
    parentContext,
    selector,
    stableAttributes: Object.keys(stableAttributes).length > 0 ? stableAttributes : undefined
  };
}
function initVisualInspector(options = {}) {
  const doc = options.doc || document;
  const win = options.win || window;
  let activeHighlight = null;
  let activeTooltip = null;
  let isEnabled = false;
  function createOverlayElements() {
    if (!activeHighlight) {
      activeHighlight = doc.createElement("div");
      activeHighlight.id = "patchwork-inspector-outline";
      activeHighlight.style.cssText = "position: absolute; pointer-events: none; border: 2px solid #6366f1; background: rgba(99, 102, 241, 0.15); z-index: 999998; border-radius: 4px; display: none; transition: all 0.05s ease;";
      doc.body.appendChild(activeHighlight);
    }
    if (!activeTooltip) {
      activeTooltip = doc.createElement("div");
      activeTooltip.id = "patchwork-inspector-tooltip";
      activeTooltip.style.cssText = "position: absolute; pointer-events: none; background: #0f1523; color: #f8fafc; font-family: monospace; font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); z-index: 999999; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.4);";
      doc.body.appendChild(activeTooltip);
    }
  }
  function handleMouseMove(e) {
    if (!isEnabled)
      return;
    const target = e.target;
    if (!target || isAmbiguousContainer(target) || target.id?.startsWith("patchwork-")) {
      if (activeHighlight)
        activeHighlight.style.display = "none";
      if (activeTooltip)
        activeTooltip.style.display = "none";
      return;
    }
    const rect = target.getBoundingClientRect();
    const scrollX = win.scrollX || 0;
    const scrollY = win.scrollY || 0;
    if (activeHighlight) {
      activeHighlight.style.display = "block";
      activeHighlight.style.top = `${rect.top + scrollY}px`;
      activeHighlight.style.left = `${rect.left + scrollX}px`;
      activeHighlight.style.width = `${rect.width}px`;
      activeHighlight.style.height = `${rect.height}px`;
    }
    if (activeTooltip) {
      activeTooltip.style.display = "block";
      activeTooltip.style.top = `${Math.max(0, rect.top + scrollY - 26)}px`;
      activeTooltip.style.left = `${rect.left + scrollX}px`;
      const selector = generateElementSelector(target);
      activeTooltip.textContent = `<${target.tagName.toLowerCase()}> ${selector}`;
    }
  }
  function handleClick(e) {
    if (!isEnabled)
      return;
    const target = e.target;
    if (!target || isAmbiguousContainer(target) || target.id?.startsWith("patchwork-")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const fingerprint = extractTargetFingerprint(target);
    if (options.onSelect) {
      options.onSelect(fingerprint);
    }
    const targetWindow = win.opener || (win.parent !== win ? win.parent : null);
    if (targetWindow) {
      targetWindow.postMessage({
        type: "PATCHWORK_ELEMENT_SELECTED",
        fingerprint
      }, "*");
    }
    toggleInspector(false);
  }
  function toggleInspector(enable) {
    isEnabled = enable !== undefined ? enable : !isEnabled;
    createOverlayElements();
    if (isEnabled) {
      doc.addEventListener("mousemove", handleMouseMove, true);
      doc.addEventListener("click", handleClick, true);
    } else {
      doc.removeEventListener("mousemove", handleMouseMove, true);
      doc.removeEventListener("click", handleClick, true);
      if (activeHighlight)
        activeHighlight.style.display = "none";
      if (activeTooltip)
        activeTooltip.style.display = "none";
    }
    return isEnabled;
  }
  win.addEventListener("message", (msg) => {
    if (msg.data && msg.data.type === "PATCHWORK_TOGGLE_INSPECTOR") {
      toggleInspector(Boolean(msg.data.enabled));
    }
  });
  return { toggleInspector };
}
// src/fingerprint.ts
function calculateFingerprintSimilarity(element, fingerprint) {
  let score = 0;
  if (element.tagName.toLowerCase() === fingerprint.tag.toLowerCase()) {
    score += 0.3;
  }
  const elRole = element.getAttribute("role") || (element.tagName.toLowerCase() === "button" ? "button" : undefined);
  if (fingerprint.role && elRole === fingerprint.role) {
    score += 0.2;
  } else if (!fingerprint.role) {
    score += 0.1;
  }
  const elText = (element.textContent || "").trim().toLowerCase();
  const fpText = (fingerprint.text || "").trim().toLowerCase();
  if (fpText && elText) {
    if (elText === fpText) {
      score += 0.3;
    } else if (elText.includes(fpText) || fpText.includes(elText)) {
      score += 0.2;
    }
  }
  const elAria = element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.getAttribute("title");
  if (fingerprint.accessibleName && elAria && elAria.toLowerCase() === fingerprint.accessibleName.toLowerCase()) {
    score += 0.1;
  }
  if (fingerprint.parentContext) {
    const parentContainer = element.closest(`#${fingerprint.parentContext}`) || element.closest(`.${fingerprint.parentContext}`);
    if (parentContainer) {
      score += 0.1;
    }
  }
  return Math.min(1, score);
}
function findDriftCandidate(fingerprint, doc = document) {
  const candidates = [];
  const byTag = doc.getElementsByTagName(fingerprint.tag);
  for (let i = 0;i < byTag.length; i++) {
    candidates.push(byTag[i]);
  }
  if (fingerprint.role === "button" && fingerprint.tag !== "button") {
    const roleBtns = doc.querySelectorAll('[role="button"]');
    roleBtns.forEach((el) => candidates.push(el));
  }
  let bestMatch = null;
  let bestScore = 0;
  for (const el of candidates) {
    const score = calculateFingerprintSimilarity(el, fingerprint);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = el;
    }
  }
  if (bestMatch && bestScore >= 0.5) {
    return { element: bestMatch, score: bestScore };
  }
  return null;
}
async function detectDomDriftAndHandleStale(patch, doc = document, apiBase = "http://localhost:4000/api", fetchFn = fetch) {
  try {
    const primaryEl = doc.querySelector(patch.targetFingerprint.selector);
    if (primaryEl) {
      return { status: "found", element: primaryEl };
    }
  } catch (err) {
  }
  const candidate = findDriftCandidate(patch.targetFingerprint, doc);
  console.warn(`[PATCHWORK Drift] Selector '${patch.targetFingerprint.selector}' failed for patch '${patch.id}'.`, candidate ? `Identified candidate <${candidate.element.tagName.toLowerCase()} id="${candidate.element.id}"> with similarity ${candidate.score.toFixed(2)}.` : "No viable candidate found.");
  try {
    await fetchFn(`${apiBase}/patches/${patch.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetStatus: "stale",
        actor: { id: "runtime-monitor", name: "Runtime Drift Monitor", role: "automated-system" },
        reason: `Primary selector '${patch.targetFingerprint.selector}' missing. Candidate match score: ${candidate ? candidate.score.toFixed(2) : "0"}`
      })
    });
  } catch (err) {
    console.error("[PATCHWORK Drift] Failed to notify API of stale status:", err);
  }
  return {
    status: "stale",
    candidateElementId: candidate?.element.id,
    score: candidate?.score
  };
}

// src/index.ts
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initPatchworkRuntime();
      initVisualInspector();
    });
  } else {
    initPatchworkRuntime();
    initVisualInspector();
  }
}
export {
  revertPatchOnDom,
  revertPatchFromDom,
  resolveTargetElement,
  isAmbiguousContainer,
  initVisualInspector,
  initPatchworkRuntime,
  generateElementSelector,
  findDriftCandidate,
  extractTargetFingerprint,
  detectDomDriftAndHandleStale,
  calculateFingerprintSimilarity,
  applyPatchToDom
};
