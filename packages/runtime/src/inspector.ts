import type { TargetFingerprint } from "@patchwork/contracts";
import {
  applyPatchToDom,
  revertPatchOnDom,
  type ApplyPatchResult,
} from "./mutation.js";

const AMBIGUOUS_CONTAINER_TAGS = new Set(["HTML", "BODY", "MAIN", "SECTION", "HEADER", "FOOTER"]);
const AMBIGUOUS_CLASSES = new Set(["storefront-app", "store-main", "catalog-grid", "container"]);

/**
 * Checks whether an element is an overly broad or ambiguous container.
 */
export function isAmbiguousContainer(element: Element): boolean {
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

/**
 * Generates a deterministic unique CSS selector for an element.
 */
export function generateElementSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const doc = element.ownerDocument || (typeof document !== "undefined" ? document : null);
  const tag = element.tagName.toLowerCase();

  const isUnique = (sel: string): boolean => {
    if (!doc) return false;
    try {
      return doc.querySelectorAll(sel).length === 1;
    } catch {
      return false;
    }
  };

  const parent = element.parentElement;
  if (parent && parent.id) {
    const candidate = `#${parent.id} > ${tag}`;
    if (isUnique(candidate)) return candidate;
  }

  // 1. Try class combinations
  if (element.className && typeof element.className === "string") {
    const classes = element.className
      .trim()
      .split(/\s+/)
      .filter((c) => c && !c.startsWith("patchwork-"));
    if (classes.length > 0) {
      const classSelector = `${tag}.${classes.join(".")}`;
      if (isUnique(classSelector)) return classSelector;

      const singleClass = `${tag}.${classes[0]}`;
      if (isUnique(singleClass)) return singleClass;
    }
  }

  // 2. Try parent scoping (e.g., "header .brand-logo", "footer .brand-logo", or "main > div.hero-features-bar")
  if (parent) {
    const parentTag = parent.tagName.toLowerCase();
    const parentClasses = parent.className && typeof parent.className === "string"
      ? parent.className.trim().split(/\s+/).filter((c) => c && !c.startsWith("patchwork-"))
      : [];

    let targetPart = tag;
    if (element.className && typeof element.className === "string") {
      const cls = element.className.trim().split(/\s+/).filter((c) => c && !c.startsWith("patchwork-"))[0];
      if (cls) targetPart = `${tag}.${cls}`;
    }

    if (parentClasses.length > 0) {
      const candidate = `.${parentClasses[0]} ${targetPart}`;
      if (isUnique(candidate)) return candidate;
    }

    const candidateTag = `${parentTag} ${targetPart}`;
    if (isUnique(candidateTag)) return candidateTag;

    const candidateChild = `${parentTag} > ${targetPart}`;
    if (isUnique(candidateChild)) return candidateChild;
  }

  // 3. Try unique attributes (data-testid, name, aria-label)
  for (const attr of ["data-testid", "data-action", "name", "aria-label"]) {
    const val = element.getAttribute(attr);
    if (val) {
      const candidate = `${tag}[${attr}="${val}"]`;
      if (isUnique(candidate)) return candidate;
    }
  }

  // 4. Try ancestor path with nth-of-type traversal
  let cur: Element | null = element;
  const pathParts: string[] = [];
  while (cur && cur.nodeType === 1 && cur.tagName.toLowerCase() !== "html" && cur.tagName.toLowerCase() !== "body") {
    let part = cur.tagName.toLowerCase();
    if (cur.id) {
      pathParts.unshift(`#${cur.id}`);
      break;
    }
    const curParent: Element | null = cur.parentElement;
    if (curParent) {
      const sameTagSiblings = Array.from(curParent.children).filter((c) => c.tagName === cur!.tagName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(cur) + 1;
        part += `:nth-of-type(${index})`;
      }
    }
    pathParts.unshift(part);
    const candidatePath = pathParts.join(" > ");
    if (isUnique(candidatePath)) {
      return candidatePath;
    }
    cur = cur.parentElement;
  }

  if (pathParts.length > 0) {
    return pathParts.join(" > ");
  }

  return tag;
}

/**
 * Extracts a TargetFingerprint from a DOM element.
 */
export function extractTargetFingerprint(element: Element): TargetFingerprint {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute("role") || (tag === "button" ? "button" : tag === "a" ? "link" : undefined);
  const accessibleName =
    element.getAttribute("aria-label") ||
    element.getAttribute("aria-labelledby") ||
    element.getAttribute("title") ||
    (element.textContent || "").trim().substring(0, 50) ||
    undefined;

  const text = (element.textContent || "").trim().substring(0, 80) || undefined;
  const parentContext = element.parentElement?.id || element.parentElement?.className || undefined;
  const selector = generateElementSelector(element);

  // Extract nearby sibling context
  let siblingContext: string | undefined = undefined;
  const prevSibling = element.previousElementSibling;
  const nextSibling = element.nextElementSibling;
  const siblingSnippets: string[] = [];
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

  const stableAttributes: Record<string, string> = {};
  if (element.getAttribute("name")) stableAttributes["name"] = element.getAttribute("name")!;
  if (element.getAttribute("type")) stableAttributes["type"] = element.getAttribute("type")!;
  if (element.getAttribute("data-testid")) stableAttributes["data-testid"] = element.getAttribute("data-testid")!;
  if (element.getAttribute("data-action")) stableAttributes["data-action"] = element.getAttribute("data-action")!;
  if (element.getAttribute("aria-label")) stableAttributes["aria-label"] = element.getAttribute("aria-label")!;

  return {
    tag,
    role,
    accessibleName,
    text,
    parentContext,
    siblingContext,
    selector,
    stableAttributes: Object.keys(stableAttributes).length > 0 ? stableAttributes : undefined,
  };
}

export interface InspectorOptions {
  doc?: Document;
  win?: Window;
  onSelect?: (fingerprint: TargetFingerprint) => void;
}

export function initVisualInspector(options: InspectorOptions = {}) {
  const doc = options.doc || document;
  const win = options.win || window;

  let activeHighlight: HTMLElement | null = null;
  let activeTooltip: HTMLElement | null = null;
  let isEnabled = false;
  let activePreviewResult: ApplyPatchResult | null = null;

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
      activeHighlight.style.cssText =
        "position: absolute; pointer-events: none; border: 2px solid #6366f1; background: rgba(99, 102, 241, 0.15); z-index: 999998; border-radius: 4px; display: none; transition: all 0.05s ease;";
      doc.body.appendChild(activeHighlight);
    }
    if (!activeTooltip) {
      activeTooltip = doc.createElement("div");
      activeTooltip.id = "patchwork-inspector-tooltip";
      activeTooltip.style.cssText =
        "position: absolute; pointer-events: none; background: #0f1523; color: #f8fafc; font-family: monospace; font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); z-index: 999999; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.4);";
      doc.body.appendChild(activeTooltip);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isEnabled) return;
    const target = e.target as HTMLElement | null;
    if (!target || isAmbiguousContainer(target) || target.id?.startsWith("patchwork-")) {
      if (activeHighlight) activeHighlight.style.display = "none";
      if (activeTooltip) activeTooltip.style.display = "none";
      return;
    }

    const rect = target.getBoundingClientRect();
    const scrollX = win.scrollX !== undefined ? win.scrollX : (win.pageXOffset || doc.documentElement?.scrollLeft || 0);
    const scrollY = win.scrollY !== undefined ? win.scrollY : (win.pageYOffset || doc.documentElement?.scrollTop || 0);

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

  function handleClick(e: MouseEvent) {
    if (!isEnabled) return;
    const target = e.target as HTMLElement | null;
    if (!target || isAmbiguousContainer(target) || target.id?.startsWith("patchwork-")) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const fingerprint = extractTargetFingerprint(target);

    // Call callback if provided
    if (options.onSelect) {
      options.onSelect(fingerprint);
    }

    // Broadcast via postMessage to parent and opener dashboards
    const targets = [win.opener, win.parent !== win ? win.parent : null].filter(Boolean);
    for (const tw of targets) {
      tw.postMessage(
        {
          type: "PATCHWORK_ELEMENT_SELECTED",
          fingerprint,
        },
        "*"
      );
    }

    // Deactivate inspector on selection
    toggleInspector(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && isEnabled) {
      toggleInspector(false);
      const targets = [win.opener, win.parent !== win ? win.parent : null].filter(Boolean);
      for (const tw of targets) {
        tw.postMessage({ type: "PATCHWORK_INSPECTOR_CANCELLED" }, "*");
      }
    }
  }

  function toggleInspector(enable?: boolean) {
    isEnabled = enable !== undefined ? enable : !isEnabled;
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

  // Listen for activation and live preview messages from dashboard
  win.addEventListener("message", (msg) => {
    if (!msg.data) return;
    if (msg.data.type === "PATCHWORK_TOGGLE_INSPECTOR") {
      const nextState =
        msg.data.enabled !== undefined ? Boolean(msg.data.enabled) : !isEnabled;
      toggleInspector(nextState);
    } else if (msg.data.type === "PATCHWORK_PING_INSPECTOR") {
      const targets = [win.opener, win.parent !== win ? win.parent : null].filter(Boolean);
      for (const tw of targets) {
        tw.postMessage({ type: "PATCHWORK_INSPECTOR_READY", isEnabled }, "*");
      }
    } else if (msg.data.type === "PATCHWORK_LIVE_PREVIEW") {
      const { patch } = msg.data;
      if (patch && patch.operation) {
        if (activePreviewResult) {
          revertPatchOnDom(activePreviewResult, doc);
          activePreviewResult = null;
        }
        activePreviewResult = applyPatchToDom(patch, doc);
      }
    } else if (msg.data.type === "PATCHWORK_REVERT_PREVIEW") {
      if (activePreviewResult) {
        revertPatchOnDom(activePreviewResult, doc);
        activePreviewResult = null;
      }
    }
  });

  // Signal ready handshake to dashboard
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
