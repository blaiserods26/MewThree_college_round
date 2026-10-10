import type { Patch, TargetFingerprint } from "@patchwork/contracts";

export interface DriftCandidate {
  element: Element;
  score: number;
}

/**
 * Calculates a multi-factor similarity score (0.0 to 1.0) between an element
 * and an expected TargetFingerprint.
 */
export function calculateFingerprintSimilarity(
  element: Element,
  fingerprint: TargetFingerprint
): number {
  let score = 0;

  // 1. Tag match (30%)
  if (element.tagName.toLowerCase() === fingerprint.tag.toLowerCase()) {
    score += 0.3;
  }

  // 2. Role match (20%)
  const elRole =
    element.getAttribute("role") ||
    (element.tagName.toLowerCase() === "button" ? "button" : undefined);
  if (fingerprint.role && elRole === fingerprint.role) {
    score += 0.2;
  } else if (!fingerprint.role) {
    score += 0.1;
  }

  // 3. Text content similarity (30%)
  const elText = (element.textContent || "").trim().toLowerCase();
  const fpText = (fingerprint.text || "").trim().toLowerCase();
  if (fpText && elText) {
    if (elText === fpText) {
      score += 0.3;
    } else if (elText.includes(fpText) || fpText.includes(elText)) {
      score += 0.2;
    }
  }

  // 4. Accessible name match (10%)
  const elAria =
    element.getAttribute("aria-label") ||
    element.getAttribute("aria-labelledby") ||
    element.getAttribute("title");
  if (
    fingerprint.accessibleName &&
    elAria &&
    elAria.toLowerCase() === fingerprint.accessibleName.toLowerCase()
  ) {
    score += 0.1;
  }

  // 5. Parent context presence (10%)
  if (fingerprint.parentContext) {
    const parentContainer = element.closest(`#${fingerprint.parentContext}`) ||
      element.closest(`.${fingerprint.parentContext}`);
    if (parentContainer) {
      score += 0.1;
    }
  }

  return Math.min(1.0, score);
}

/**
 * Searches the DOM for candidate elements when the primary selector fails.
 */
export function findDriftCandidate(
  fingerprint: TargetFingerprint,
  doc: Document = document
): DriftCandidate | null {
  const candidates: Element[] = [];

  // Look for elements with matching tag
  const byTag = doc.getElementsByTagName(fingerprint.tag);
  for (let i = 0; i < byTag.length; i++) {
    candidates.push(byTag[i]);
  }

  // Also consider buttons or interactive roles
  if (fingerprint.role === "button" && fingerprint.tag !== "button") {
    const roleBtns = doc.querySelectorAll('[role="button"]');
    roleBtns.forEach((el) => candidates.push(el));
  }

  let bestMatch: Element | null = null;
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

export interface DriftDetectionResult {
  status: "found" | "stale";
  element?: Element;
  candidateElementId?: string;
  score?: number;
}

/**
 * Evaluates whether a patch target has drifted, reports status to the API,
 * and halts execution safely without throwing exceptions.
 */
export async function detectDomDriftAndHandleStale(
  patch: Patch,
  doc: Document = document,
  apiBase: string = "http://localhost:4000/api",
  fetchFn: typeof fetch = fetch
): Promise<DriftDetectionResult> {
  // Check if primary selector still resolves
  try {
    const primaryEl = doc.querySelector(patch.targetFingerprint.selector);
    if (primaryEl) {
      return { status: "found", element: primaryEl };
    }
  } catch (err) {
    // Malformed selector treated as failed
  }

  // Primary selector returned null -> DOM drift detected!
  const candidate = findDriftCandidate(patch.targetFingerprint, doc);

  console.warn(
    `[PATCHWORK Drift] Selector '${patch.targetFingerprint.selector}' failed for patch '${patch.id}'.`,
    candidate
      ? `Identified candidate <${candidate.element.tagName.toLowerCase()} id="${candidate.element.id}"> with similarity ${candidate.score.toFixed(2)}.`
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
        reason: `Primary selector '${patch.targetFingerprint.selector}' missing. Candidate match score: ${
          candidate ? candidate.score.toFixed(2) : "0"
        }`,
      }),
    });
  } catch (err) {
    console.error("[PATCHWORK Drift] Failed to notify API of stale status:", err);
  }

  return {
    status: "stale",
    candidateElementId: candidate?.element.id,
    score: candidate?.score,
  };
}
