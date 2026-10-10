import type {
  Patch,
  TargetFingerprint,
  SignalScoreBreakdown,
  ConfidenceTier,
  FingerprintCandidateMatch,
} from "@patchwork/contracts";
import { generateElementSelector } from "./inspector.js";

export interface DriftCandidate {
  element: Element;
  score: number;
  tier?: ConfidenceTier;
  selector?: string;
  breakdown?: SignalScoreBreakdown;
}

/**
 * Calculates a multi-factor similarity breakdown and score between an element
 * and an expected TargetFingerprint using calibrated weights.
 *
 * Calibrated weights:
 * - tag: 0.25
 * - text: 0.25
 * - role & accessible name: 0.20
 * - stable attributes: 0.15
 * - parent & sibling context: 0.15
 * Total: 1.00
 */
export function calculateDetailedFingerprintSimilarity(
  element: Element,
  fingerprint: TargetFingerprint
): { score: number; breakdown: SignalScoreBreakdown } {
  const breakdown: SignalScoreBreakdown = {
    tag: 0,
    text: 0,
    roleAndAria: 0,
    stableAttributes: 0,
    context: 0,
    total: 0,
  };

  const elTag = element.tagName.toLowerCase();
  const fpTag = fingerprint.tag.toLowerCase();

  // 1. Tag match (weight: 0.25)
  if (elTag === fpTag) {
    breakdown.tag = 0.25;
  } else if (
    (fpTag === "button" && (element.getAttribute("role") === "button" || elTag === "a")) ||
    (fpTag === "a" && (element.getAttribute("role") === "link" || elTag === "button"))
  ) {
    breakdown.tag = 0.10;
  }

  // 2. Text content similarity (weight: 0.25)
  const elText = (element.textContent || "").trim().toLowerCase();
  const fpText = (fingerprint.text || "").trim().toLowerCase();
  if (fpText && elText) {
    if (elText === fpText) {
      breakdown.text = 0.25;
    } else if (elText.includes(fpText) || fpText.includes(elText)) {
      breakdown.text = 0.18;
    } else {
      // Partial token overlap
      const fpTokens = fpText.split(/\s+/).filter((t) => t.length > 1);
      if (fpTokens.length > 0) {
        const matches = fpTokens.filter((t) => elText.includes(t));
        if (matches.length > 0) {
          breakdown.text = Math.round((matches.length / fpTokens.length) * 0.15 * 100) / 100;
        }
      }
    }
  } else if (!fpText && !elText) {
    breakdown.text = 0.15;
  }

  // 3. Accessible Role & Name match (weight: 0.20)
  let roleScore = 0;
  const elRole =
    element.getAttribute("role") ||
    (elTag === "button" ? "button" : elTag === "a" ? "link" : undefined);
  if (fingerprint.role && elRole) {
    if (elRole.toLowerCase() === fingerprint.role.toLowerCase()) {
      roleScore = 0.10;
    }
  } else if (!fingerprint.role) {
    roleScore = 0.05;
  }

  let ariaScore = 0;
  const elAria = (
    element.getAttribute("aria-label") ||
    element.getAttribute("aria-labelledby") ||
    element.getAttribute("title") ||
    ""
  ).trim().toLowerCase();
  const fpAria = (fingerprint.accessibleName || "").trim().toLowerCase();
  if (fpAria && elAria) {
    if (elAria === fpAria) {
      ariaScore = 0.10;
    } else if (elAria.includes(fpAria) || fpAria.includes(elAria)) {
      ariaScore = 0.07;
    }
  } else if (!fpAria) {
    ariaScore = 0.05;
  }
  breakdown.roleAndAria = Math.min(0.20, Math.round((roleScore + ariaScore) * 100) / 100);

  // 4. Stable attributes (weight: 0.15)
  if (fingerprint.stableAttributes && Object.keys(fingerprint.stableAttributes).length > 0) {
    const keys = Object.keys(fingerprint.stableAttributes);
    let matchedCount = 0;
    for (const key of keys) {
      const expectedVal = fingerprint.stableAttributes[key];
      const actualVal = element.getAttribute(key);
      if (actualVal === expectedVal) {
        matchedCount += 1.0;
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
      Math.round((matchedCount / keys.length) * 0.15 * 100) / 100
    );
  } else {
    // If no stable attributes were declared in fingerprint, check for sane element presence
    breakdown.stableAttributes = 0.10;
  }

  // 5. Parent container & nearby sibling context (weight: 0.15)
  let parentScore = 0;
  if (fingerprint.parentContext) {
    const parentContainer =
      element.closest(`#${fingerprint.parentContext}`) ||
      element.closest(`.${fingerprint.parentContext}`) ||
      element.closest(fingerprint.parentContext);
    if (parentContainer) {
      parentScore = 0.08;
    }
  } else {
    parentScore = 0.04;
  }

  let siblingScore = 0;
  if (fingerprint.siblingContext) {
    const container =
      (fingerprint.parentContext &&
        (element.closest(`#${fingerprint.parentContext}`) ||
          element.closest(`.${fingerprint.parentContext}`))) ||
      element.closest("section, form, div, main") ||
      element.parentElement;
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

  const rawTotal =
    breakdown.tag +
    breakdown.text +
    breakdown.roleAndAria +
    breakdown.stableAttributes +
    breakdown.context;

  breakdown.total = Math.min(1.0, Math.round(rawTotal * 100) / 100);

  return { score: breakdown.total, breakdown };
}

/**
 * Calculates overall similarity score between element and fingerprint.
 */
export function calculateFingerprintSimilarity(
  element: Element,
  fingerprint: TargetFingerprint
): number {
  return calculateDetailedFingerprintSimilarity(element, fingerprint).score;
}

/**
 * Searches the DOM and ranks candidate elements matching the fingerprint.
 * Categorizes candidates into confidence tiers:
 * - High Confidence: score >= 0.85 and (single candidate or margin >= 0.10)
 * - Review Required: score >= 0.60
 * - Stale: score < 0.60
 */
export function rankDriftCandidates(
  fingerprint: TargetFingerprint,
  doc: Document = document
): FingerprintCandidateMatch[] {
  const elementsSet = new Set<Element>();

  // 1. Collect tag matches
  if (fingerprint.tag) {
    const byTag = doc.getElementsByTagName(fingerprint.tag);
    for (let i = 0; i < byTag.length; i++) {
      elementsSet.add(byTag[i]);
    }
  }

  // 2. Interactive roles if tag is button or link
  if (fingerprint.tag === "button" || fingerprint.role === "button") {
    const roleBtns = doc.querySelectorAll('[role="button"]');
    roleBtns.forEach((el) => elementsSet.add(el));
  }
  if (fingerprint.tag === "a" || fingerprint.role === "link") {
    const roleLinks = doc.querySelectorAll('[role="link"]');
    roleLinks.forEach((el) => elementsSet.add(el));
  }

  // 3. Parent container elements
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
      // Ignore invalid query
    }
  }

  // Ignore internal Patchwork overlay elements
  const candidates: Element[] = [];
  elementsSet.forEach((el) => {
    if (el.id?.startsWith("patchwork-") || el.className?.toString().includes("patchwork-")) {
      return;
    }
    candidates.push(el);
  });

  const scored: Array<{
    element: Element;
    selector: string;
    score: number;
    breakdown: SignalScoreBreakdown;
  }> = [];

  for (const el of candidates) {
    const { score, breakdown } = calculateDetailedFingerprintSimilarity(el, fingerprint);
    const selector = generateElementSelector(el);
    scored.push({ element: el, selector, score, breakdown });
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((item, index) => {
    const bestScore = item.score;
    const secondScore = scored[index === 0 ? 1 : 0]?.score ?? 0;
    const margin = index === 0 ? bestScore - secondScore : 0;

    let tier: ConfidenceTier = "stale";
    if (bestScore >= 0.85 && (scored.length === 1 || margin >= 0.08)) {
      tier = "high";
    } else if (bestScore >= 0.60) {
      tier = "review_required";
    } else {
      tier = "stale";
    }

    return {
      element: item.element,
      selector: item.selector,
      score: item.score,
      tier,
      breakdown: item.breakdown,
    };
  });
}

/**
 * Searches the DOM for candidate elements when the primary selector fails.
 */
export function findDriftCandidate(
  fingerprint: TargetFingerprint,
  doc: Document = document
): DriftCandidate | null {
  const ranked = rankDriftCandidates(fingerprint, doc);
  if (ranked.length > 0 && ranked[0].score >= 0.50) {
    return {
      element: ranked[0].element,
      score: ranked[0].score,
      tier: ranked[0].tier,
      selector: ranked[0].selector,
      breakdown: ranked[0].breakdown,
    };
  }
  return null;
}

export interface DriftDetectionResult {
  status: "found" | "stale";
  element?: Element;
  candidateElementId?: string;
  candidateSelector?: string;
  score?: number;
  tier?: ConfidenceTier;
  candidate?: FingerprintCandidateMatch;
  breakdown?: SignalScoreBreakdown;
}

/**
 * Evaluates whether a patch target has drifted, reports status to the API,
 * and halts execution safely without throwing exceptions or corrupting DOM.
 */
export async function detectDomDriftAndHandleStale(
  patch: Patch,
  doc: Document = document,
  apiBase: string = "http://localhost:4000/api",
  fetchFn: typeof fetch = fetch
): Promise<DriftDetectionResult> {
  // Check if primary selector still resolves uniquely
  try {
    const matches = doc.querySelectorAll(patch.targetFingerprint.selector);
    if (matches.length === 1) {
      return { status: "found", element: matches[0] };
    }
  } catch (err) {
    // Malformed selector treated as failed
  }

  // Primary selector failed or returned ambiguous multiple elements -> DOM drift detected!
  const ranked = rankDriftCandidates(patch.targetFingerprint, doc);
  const bestCandidate = ranked[0] || null;

  console.warn(
    `[PATCHWORK Drift] Selector '${patch.targetFingerprint.selector}' failed for patch '${patch.id}'.`,
    bestCandidate
      ? `Identified candidate <${bestCandidate.element.tagName.toLowerCase()} id="${bestCandidate.element.id}"> with score ${bestCandidate.score.toFixed(2)} [tier: ${bestCandidate.tier}].`
      : "No viable candidate found."
  );

  // Transition patch to stale on backend to alert operators
  try {
    await fetchFn(`${apiBase}/patches/${patch.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetStatus: "stale",
        actor: { id: "runtime-monitor", name: "Runtime Drift Monitor", role: "automated-system" },
        reason: `Primary selector '${patch.targetFingerprint.selector}' failed. Candidate: ${
          bestCandidate ? bestCandidate.selector : "none"
        } (score: ${bestCandidate ? bestCandidate.score.toFixed(2) : "0"}, tier: ${
          bestCandidate ? bestCandidate.tier : "stale"
        })`,
      }),
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
    candidate: bestCandidate || undefined,
    breakdown: bestCandidate?.breakdown,
  };
}
