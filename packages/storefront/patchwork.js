// ../contracts/dist/operations.js
var ALLOWED_STYLE_PROPERTIES = /* @__PURE__ */ new Set([
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
var ALLOWED_ATTRIBUTES = /* @__PURE__ */ new Set([
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
      if (op.display !== void 0 && typeof op.display !== "string") {
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
        element.style.setProperty(
          state.styleProperty.property,
          state.styleProperty.value
        );
      } else {
        element.style.removeProperty(state.styleProperty.property);
      }
    }
    if (state.textContent !== void 0) {
      element.textContent = state.textContent;
    }
    if (state.attribute) {
      if (state.attribute.value !== null) {
        element.setAttribute(state.attribute.name, state.attribute.value);
      } else {
        element.removeAttribute(state.attribute.name);
      }
    }
    if (state.display !== void 0) {
      if (state.display) {
        element.style.display = state.display;
      } else {
        element.style.removeProperty("display");
      }
    }
    if (state.ariaHidden !== void 0) {
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

// src/inspector.ts
var AMBIGUOUS_CONTAINER_TAGS = /* @__PURE__ */ new Set(["HTML", "BODY", "MAIN", "SECTION", "HEADER", "FOOTER"]);
var AMBIGUOUS_CLASSES = /* @__PURE__ */ new Set(["storefront-app", "store-main", "catalog-grid", "container"]);
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
  const role = element.getAttribute("role") || (tag === "button" ? "button" : tag === "a" ? "link" : void 0);
  const accessibleName = element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.getAttribute("title") || (element.textContent || "").trim().substring(0, 50) || void 0;
  const text = (element.textContent || "").trim().substring(0, 80) || void 0;
  const parentContext = element.parentElement?.id || element.parentElement?.className || void 0;
  const selector = generateElementSelector(element);
  let siblingContext = void 0;
  const prevSibling = element.previousElementSibling;
  const nextSibling = element.nextElementSibling;
  const siblingSnippets = [];
  if (prevSibling) {
    const prevText = (prevSibling.textContent || "").trim().substring(0, 40);
    if (prevText) siblingSnippets.push(prevText);
    else if (prevSibling.id) siblingSnippets.push(`#${prevSibling.id}`);
  }
  if (nextSibling) {
    const nextText = (nextSibling.textContent || "").trim().substring(0, 40);
    if (nextText) siblingSnippets.push(nextText);
    else if (nextSibling.id) siblingSnippets.push(`#${nextSibling.id}`);
  }
  if (siblingSnippets.length > 0) {
    siblingContext = siblingSnippets.join(" | ");
  }
  const stableAttributes = {};
  if (element.getAttribute("name")) stableAttributes["name"] = element.getAttribute("name");
  if (element.getAttribute("type")) stableAttributes["type"] = element.getAttribute("type");
  if (element.getAttribute("data-testid")) stableAttributes["data-testid"] = element.getAttribute("data-testid");
  if (element.getAttribute("data-action")) stableAttributes["data-action"] = element.getAttribute("data-action");
  if (element.getAttribute("aria-label")) stableAttributes["aria-label"] = element.getAttribute("aria-label");
  return {
    tag,
    role,
    accessibleName,
    text,
    parentContext,
    siblingContext,
    selector,
    stableAttributes: Object.keys(stableAttributes).length > 0 ? stableAttributes : void 0
  };
}
function initVisualInspector(options = {}) {
  const doc = options.doc || document;
  const win = options.win || window;
  let activeHighlight = null;
  let activeTooltip = null;
  let isEnabled = false;
  function createOverlayElements() {
    if (!doc.getElementById("patchwork-inspector-styles") && doc.head) {
      const style = doc.createElement("style");
      style.id = "patchwork-inspector-styles";
      style.textContent = `
        .patchwork-inspecting, .patchwork-inspecting * {
          cursor: crosshair !important;
        }
      `;
      doc.head.appendChild(style);
    }
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
    if (!isEnabled) return;
    const target = e.target;
    if (!target || isAmbiguousContainer(target) || target.id?.startsWith("patchwork-")) {
      if (activeHighlight) activeHighlight.style.display = "none";
      if (activeTooltip) activeTooltip.style.display = "none";
      return;
    }
    const rect = target.getBoundingClientRect();
    const scrollX = win.scrollX !== void 0 ? win.scrollX : win.pageXOffset || doc.documentElement?.scrollLeft || 0;
    const scrollY = win.scrollY !== void 0 ? win.scrollY : win.pageYOffset || doc.documentElement?.scrollTop || 0;
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
    if (!isEnabled) return;
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
    const targets = [win.opener, win.parent !== win ? win.parent : null].filter(Boolean);
    for (const tw of targets) {
      tw.postMessage(
        {
          type: "PATCHWORK_ELEMENT_SELECTED",
          fingerprint
        },
        "*"
      );
    }
    toggleInspector(false);
  }
  function handleKeyDown(e) {
    if (e.key === "Escape" && isEnabled) {
      toggleInspector(false);
      const targets = [win.opener, win.parent !== win ? win.parent : null].filter(Boolean);
      for (const tw of targets) {
        tw.postMessage({ type: "PATCHWORK_INSPECTOR_CANCELLED" }, "*");
      }
    }
  }
  function toggleInspector(enable) {
    isEnabled = enable !== void 0 ? enable : !isEnabled;
    createOverlayElements();
    if (isEnabled) {
      doc.addEventListener("mousemove", handleMouseMove, true);
      doc.addEventListener("click", handleClick, true);
      doc.addEventListener("keydown", handleKeyDown, true);
      if (doc.body) {
        doc.body.classList.add("patchwork-inspecting");
      }
    } else {
      doc.removeEventListener("mousemove", handleMouseMove, true);
      doc.removeEventListener("click", handleClick, true);
      doc.removeEventListener("keydown", handleKeyDown, true);
      if (doc.body) {
        doc.body.classList.remove("patchwork-inspecting");
      }
      if (activeHighlight) activeHighlight.style.display = "none";
      if (activeTooltip) activeTooltip.style.display = "none";
    }
    return isEnabled;
  }
  win.addEventListener("message", (msg) => {
    if (!msg.data) return;
    if (msg.data.type === "PATCHWORK_TOGGLE_INSPECTOR") {
      const nextState = msg.data.enabled !== void 0 ? Boolean(msg.data.enabled) : !isEnabled;
      toggleInspector(nextState);
    } else if (msg.data.type === "PATCHWORK_PING_INSPECTOR") {
      const targets = [win.opener, win.parent !== win ? win.parent : null].filter(Boolean);
      for (const tw of targets) {
        tw.postMessage({ type: "PATCHWORK_INSPECTOR_READY", isEnabled }, "*");
      }
    } else if (msg.data.type === "PATCHWORK_LIVE_PREVIEW") {
      const { patch } = msg.data;
      if (patch && patch.operation) {
        applyPatchToDom(patch, doc);
      }
    } else if (msg.data.type === "PATCHWORK_REVERT_PREVIEW") {
      const { patch } = msg.data;
      if (patch && patch.operation) {
        revertPatchOnDom(patch, doc);
      }
    }
  });
  const notifyReady = () => {
    const targets = [win.opener, win.parent !== win ? win.parent : null].filter(Boolean);
    for (const tw of targets) {
      tw.postMessage({ type: "PATCHWORK_INSPECTOR_READY", isEnabled }, "*");
    }
  };
  notifyReady();
  win.setTimeout(notifyReady, 500);
  return { toggleInspector };
}

// src/fingerprint.ts
function calculateDetailedFingerprintSimilarity(element, fingerprint) {
  const breakdown = {
    tag: 0,
    text: 0,
    roleAndAria: 0,
    stableAttributes: 0,
    context: 0,
    total: 0
  };
  const elTag = element.tagName.toLowerCase();
  const fpTag = fingerprint.tag.toLowerCase();
  if (elTag === fpTag) {
    breakdown.tag = 0.25;
  } else if (fpTag === "button" && (element.getAttribute("role") === "button" || elTag === "a") || fpTag === "a" && (element.getAttribute("role") === "link" || elTag === "button")) {
    breakdown.tag = 0.1;
  }
  const elText = (element.textContent || "").trim().toLowerCase();
  const fpText = (fingerprint.text || "").trim().toLowerCase();
  if (fpText && elText) {
    if (elText === fpText) {
      breakdown.text = 0.25;
    } else if (elText.includes(fpText) || fpText.includes(elText)) {
      breakdown.text = 0.18;
    } else {
      const fpTokens = fpText.split(/\s+/).filter((t) => t.length > 1);
      if (fpTokens.length > 0) {
        const matches = fpTokens.filter((t) => elText.includes(t));
        if (matches.length > 0) {
          breakdown.text = Math.round(matches.length / fpTokens.length * 0.15 * 100) / 100;
        }
      }
    }
  } else if (!fpText && !elText) {
    breakdown.text = 0.15;
  }
  let roleScore = 0;
  const elRole = element.getAttribute("role") || (elTag === "button" ? "button" : elTag === "a" ? "link" : void 0);
  if (fingerprint.role && elRole) {
    if (elRole.toLowerCase() === fingerprint.role.toLowerCase()) {
      roleScore = 0.1;
    }
  } else if (!fingerprint.role) {
    roleScore = 0.05;
  }
  let ariaScore = 0;
  const elAria = (element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.getAttribute("title") || "").trim().toLowerCase();
  const fpAria = (fingerprint.accessibleName || "").trim().toLowerCase();
  if (fpAria && elAria) {
    if (elAria === fpAria) {
      ariaScore = 0.1;
    } else if (elAria.includes(fpAria) || fpAria.includes(elAria)) {
      ariaScore = 0.07;
    }
  } else if (!fpAria) {
    ariaScore = 0.05;
  }
  breakdown.roleAndAria = Math.min(0.2, Math.round((roleScore + ariaScore) * 100) / 100);
  if (fingerprint.stableAttributes && Object.keys(fingerprint.stableAttributes).length > 0) {
    const keys = Object.keys(fingerprint.stableAttributes);
    let matchedCount = 0;
    for (const key of keys) {
      const expectedVal = fingerprint.stableAttributes[key];
      const actualVal = element.getAttribute(key);
      if (actualVal === expectedVal) {
        matchedCount += 1;
      } else if (actualVal && expectedVal && actualVal.toLowerCase() === expectedVal.toLowerCase()) {
        matchedCount += 0.8;
      } else if (key === "class" && actualVal && expectedVal) {
        const expectedTokens = expectedVal.split(/\s+/).filter(Boolean);
        const actualTokens = actualVal.split(/\s+/).filter(Boolean);
        const common = expectedTokens.filter((c) => actualTokens.includes(c));
        if (common.length > 0) {
          matchedCount += common.length / expectedTokens.length;
        }
      }
    }
    breakdown.stableAttributes = Math.min(
      0.15,
      Math.round(matchedCount / keys.length * 0.15 * 100) / 100
    );
  } else {
    breakdown.stableAttributes = 0.1;
  }
  let parentScore = 0;
  if (fingerprint.parentContext) {
    const parentContainer = element.closest(`#${fingerprint.parentContext}`) || element.closest(`.${fingerprint.parentContext}`) || element.closest(fingerprint.parentContext);
    if (parentContainer) {
      parentScore = 0.08;
    }
  } else {
    parentScore = 0.04;
  }
  let siblingScore = 0;
  if (fingerprint.siblingContext) {
    const container = fingerprint.parentContext && (element.closest(`#${fingerprint.parentContext}`) || element.closest(`.${fingerprint.parentContext}`)) || element.closest("section, form, div, main") || element.parentElement;
    const containerText = (container?.textContent || "").toLowerCase();
    const fpSibling = fingerprint.siblingContext.toLowerCase();
    if (containerText.includes(fpSibling)) {
      siblingScore = 0.07;
    } else {
      const tokens = fpSibling.split(/[\s|]+/).filter((t) => t.length > 2);
      if (tokens.some((t) => containerText.includes(t))) {
        siblingScore = 0.05;
      }
    }
  } else {
    siblingScore = 0.04;
  }
  breakdown.context = Math.min(0.15, Math.round((parentScore + siblingScore) * 100) / 100);
  const rawTotal = breakdown.tag + breakdown.text + breakdown.roleAndAria + breakdown.stableAttributes + breakdown.context;
  breakdown.total = Math.min(1, Math.round(rawTotal * 100) / 100);
  return { score: breakdown.total, breakdown };
}
function calculateFingerprintSimilarity(element, fingerprint) {
  return calculateDetailedFingerprintSimilarity(element, fingerprint).score;
}
function rankDriftCandidates(fingerprint, doc = document) {
  const elementsSet = /* @__PURE__ */ new Set();
  if (fingerprint.tag) {
    const byTag = doc.getElementsByTagName(fingerprint.tag);
    for (let i = 0; i < byTag.length; i++) {
      elementsSet.add(byTag[i]);
    }
  }
  if (fingerprint.tag === "button" || fingerprint.role === "button") {
    const roleBtns = doc.querySelectorAll('[role="button"]');
    roleBtns.forEach((el) => elementsSet.add(el));
  }
  if (fingerprint.tag === "a" || fingerprint.role === "link") {
    const roleLinks = doc.querySelectorAll('[role="link"]');
    roleLinks.forEach((el) => elementsSet.add(el));
  }
  if (fingerprint.parentContext) {
    try {
      const containers = doc.querySelectorAll(
        `#${fingerprint.parentContext}, .${fingerprint.parentContext}`
      );
      containers.forEach((container) => {
        const interactive = container.querySelectorAll("button, a, input, [role='button']");
        interactive.forEach((el) => elementsSet.add(el));
      });
    } catch {
    }
  }
  const candidates = [];
  elementsSet.forEach((el) => {
    if (el.id?.startsWith("patchwork-") || el.className?.toString().includes("patchwork-")) {
      return;
    }
    candidates.push(el);
  });
  const scored = [];
  for (const el of candidates) {
    const { score, breakdown } = calculateDetailedFingerprintSimilarity(el, fingerprint);
    const selector = generateElementSelector(el);
    scored.push({ element: el, selector, score, breakdown });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((item, index) => {
    const bestScore = item.score;
    const secondScore = scored[index === 0 ? 1 : 0]?.score ?? 0;
    const margin = index === 0 ? bestScore - secondScore : 0;
    let tier = "stale";
    if (bestScore >= 0.85 && (scored.length === 1 || margin >= 0.08)) {
      tier = "high";
    } else if (bestScore >= 0.6) {
      tier = "review_required";
    } else {
      tier = "stale";
    }
    return {
      element: item.element,
      selector: item.selector,
      score: item.score,
      tier,
      breakdown: item.breakdown
    };
  });
}
function findDriftCandidate(fingerprint, doc = document) {
  const ranked = rankDriftCandidates(fingerprint, doc);
  if (ranked.length > 0 && ranked[0].score >= 0.5) {
    return {
      element: ranked[0].element,
      score: ranked[0].score,
      tier: ranked[0].tier,
      selector: ranked[0].selector,
      breakdown: ranked[0].breakdown
    };
  }
  return null;
}
async function detectDomDriftAndHandleStale(patch, doc = document, apiBase = "http://localhost:4000/api", fetchFn = fetch) {
  try {
    const matches = doc.querySelectorAll(patch.targetFingerprint.selector);
    if (matches.length === 1) {
      return { status: "found", element: matches[0] };
    }
  } catch (err) {
  }
  const ranked = rankDriftCandidates(patch.targetFingerprint, doc);
  const bestCandidate = ranked[0] || null;
  console.warn(
    `[PATCHWORK Drift] Selector '${patch.targetFingerprint.selector}' failed for patch '${patch.id}'.`,
    bestCandidate ? `Identified candidate <${bestCandidate.element.tagName.toLowerCase()} id="${bestCandidate.element.id}"> with score ${bestCandidate.score.toFixed(2)} [tier: ${bestCandidate.tier}].` : "No viable candidate found."
  );
  try {
    await fetchFn(`${apiBase}/patches/${patch.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetStatus: "stale",
        actor: { id: "runtime-monitor", name: "Runtime Drift Monitor", role: "automated-system" },
        reason: `Primary selector '${patch.targetFingerprint.selector}' failed. Candidate: ${bestCandidate ? bestCandidate.selector : "none"} (score: ${bestCandidate ? bestCandidate.score.toFixed(2) : "0"}, tier: ${bestCandidate ? bestCandidate.tier : "stale"})`
      })
    });
  } catch (err) {
    console.error("[PATCHWORK Drift] Failed to notify API of stale status:", err);
  }
  return {
    status: "stale",
    candidateElementId: bestCandidate?.element.id,
    candidateSelector: bestCandidate?.selector,
    score: bestCandidate?.score,
    tier: bestCandidate?.tier,
    candidate: bestCandidate || void 0,
    breakdown: bestCandidate?.breakdown
  };
}

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
      let driftResult = void 0;
      if (applyResult.status === "stale") {
        driftResult = await detectDomDriftAndHandleStale(draftPatch, doc, apiBase);
        renderDriftWatermark(doc, draftPatch, driftResult);
      }
      let isPatched = applyResult.status === "applied";
      const resetToBaseline = () => {
        if (!isPatched) return void 0;
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
        }
      });
      if (typeof win !== "undefined") {
        win.__PATCHWORK_PREVIEW__ = {
          patch: draftPatch,
          applyResult,
          drift: {
            isDrifted: applyResult.status === "stale",
            candidate: driftResult?.candidate,
            candidateElementId: driftResult?.candidateElementId,
            score: driftResult?.score,
            tier: driftResult?.tier,
            breakdown: driftResult?.breakdown
          },
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
        drift: driftResult,
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
    let primaryDriftResult = void 0;
    for (const patch of patches) {
      const r = applyPatchToDom(patch, doc);
      results.push(r);
      if (r.status === "stale") {
        const drift = await detectDomDriftAndHandleStale(patch, doc, apiBase);
        if (!primaryDriftResult) primaryDriftResult = drift;
        renderDriftWatermark(doc, patch, drift);
      }
    }
    const resetToBaseline = () => {
      return results.map((r) => revertPatchOnDom(r, doc));
    };
    if (typeof win !== "undefined") {
      win.__PATCHWORK_RELEASE__ = {
        release,
        patches,
        results,
        resetToBaseline
      };
    }
    return {
      mode: "production",
      websiteId,
      releaseId: release?.id,
      results,
      drift: primaryDriftResult,
      resetToBaseline
    };
  } catch (err) {
    console.error("[PATCHWORK Runtime] Error loading active release:", err);
    return { mode: "production", websiteId, results: [] };
  }
}
function renderPreviewWatermark(doc) {
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
function renderDriftWatermark(doc, patch, drift) {
  if (doc.getElementById("patchwork-drift-watermark")) return;
  const banner = doc.createElement("div");
  banner.id = "patchwork-drift-watermark";
  banner.setAttribute(
    "style",
    "position: fixed; top: 56px; right: 12px; z-index: 999997; background: rgba(30, 27, 75, 0.95); backdrop-filter: blur(12px); color: #f8fafc; border: 1px solid rgba(245, 158, 11, 0.6); box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 10px; padding: 12px 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; max-width: 380px;"
  );
  const tierColor = drift.tier === "high" ? "#22c55e" : drift.tier === "review_required" ? "#f59e0b" : "#ef4444";
  const tierLabel = drift.tier === "high" ? "High Confidence Match" : drift.tier === "review_required" ? "Review Required" : "Stale / Ambiguous";
  const candidateHtml = drift.candidate ? `
      <div style="margin-top: 8px; padding: 6px 10px; background: rgba(15, 23, 42, 0.6); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="color: #94a3b8; font-size: 11px;">Candidate: <strong style="color: #ffffff; font-family: monospace;">${drift.candidate.selector}</strong></span>
          <span style="background: ${tierColor}22; color: ${tierColor}; border: 1px solid ${tierColor}55; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
            ${((drift.score || 0) * 100).toFixed(0)}% \u2022 ${tierLabel}
          </span>
        </div>
        <div style="color: #cbd5e1; font-size: 11px;">
          Tag: ${(drift.candidate.breakdown.tag * 100).toFixed(0)}% | Text: ${(drift.candidate.breakdown.text * 100).toFixed(0)}% | Aria: ${(drift.candidate.breakdown.roleAndAria * 100).toFixed(0)}%
        </div>
      </div>
    ` : `<div style="color: #ef4444; font-size: 11px; margin-top: 6px;">No candidate met confidence threshold.</div>`;
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
function renderPreviewBar(doc, patch, handlers) {
  renderPreviewWatermark(doc);
  if (doc.getElementById("patchwork-preview-bar")) return;
  const bar = doc.createElement("div");
  bar.id = "patchwork-preview-bar";
  bar.setAttribute(
    "style",
    "position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 999998; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 12px; padding: 10px 18px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6); display: flex; align-items: center; gap: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #f8fafc; font-size: 13px; max-width: 90vw;"
  );
  const opSummary = patch.operation.type === "style.set" ? `${patch.operation.type} (${patch.operation.property}: ${patch.operation.value})` : patch.operation.type;
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
  const toggleBtn = bar.querySelector("#patchwork-preview-toggle-btn");
  const statusPill = bar.querySelector("#patchwork-preview-status-pill");
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
  applyPatchToDom,
  calculateDetailedFingerprintSimilarity,
  calculateFingerprintSimilarity,
  detectDomDriftAndHandleStale,
  extractTargetFingerprint,
  findDriftCandidate,
  generateElementSelector,
  initPatchworkRuntime,
  initVisualInspector,
  isAmbiguousContainer,
  rankDriftCandidates,
  renderDriftWatermark,
  resolveTargetElement,
  revertPatchFromDom,
  revertPatchOnDom
};
