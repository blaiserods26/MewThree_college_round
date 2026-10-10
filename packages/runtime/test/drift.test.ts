import { describe, it, expect, beforeEach } from "bun:test";
import { Window } from "happy-dom";
import {
  calculateFingerprintSimilarity,
  calculateDetailedFingerprintSimilarity,
  rankDriftCandidates,
  findDriftCandidate,
  detectDomDriftAndHandleStale,
} from "../src/fingerprint.js";
import { extractTargetFingerprint } from "../src/inspector.js";
import type { Patch, TargetFingerprint } from "@patchwork/contracts";

describe("Runtime DOM Drift & Stale Target Detection", () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    // Simulate storefront update:
    // Original button was #checkout-btn with text "Continue to Checkout"
    // Drifted DOM renames it to #pay-now-action wrapped in div.payment-drawer
    document.body.innerHTML = `
      <div id="checkout-summary">
        <div class="summary-breakdown">
          <span>Subtotal: $360.00</span>
        </div>
        <div class="payment-drawer">
          <button id="pay-now-action" class="btn btn-checkout" type="button" aria-label="Continue to Checkout">
            Continue to Checkout
          </button>
        </div>
      </div>
    `;
  });

  const originalPatch: Patch = {
    id: "P-CHECKOUT",
    websiteId: "demo-store",
    name: "Restore mobile checkout button visibility",
    status: "published",
    currentVersion: 1,
    versions: [],
    targetFingerprint: {
      tag: "button",
      role: "button",
      text: "Continue to Checkout",
      accessibleName: "Continue to Checkout",
      selector: "#checkout-btn", // Primary selector now fails!
      parentContext: "checkout-summary",
      siblingContext: "Subtotal: $360.00",
      stableAttributes: {
        type: "button",
      },
    },
    operation: {
      type: "style.set",
      property: "display",
      value: "inline-flex",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "dev-1",
  };

  it("calculates calibrated multi-signal similarity score with full breakdown", () => {
    const driftedBtn = document.getElementById("pay-now-action") as HTMLElement;
    const { score, breakdown } = calculateDetailedFingerprintSimilarity(
      driftedBtn,
      originalPatch.targetFingerprint
    );

    // Tag match: 0.25
    expect(breakdown.tag).toBe(0.25);
    // Text match: 0.25
    expect(breakdown.text).toBe(0.25);
    // Role & aria-label match: 0.20
    expect(breakdown.roleAndAria).toBe(0.20);
    // Stable attributes match: 0.15
    expect(breakdown.stableAttributes).toBe(0.15);
    // Context (parent + sibling): 0.15
    expect(breakdown.context).toBeGreaterThanOrEqual(0.12);

    expect(score).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies candidate as High Confidence (>= 0.85) when signals strongly align", () => {
    const candidates = rankDriftCandidates(originalPatch.targetFingerprint, document);
    expect(candidates.length).toBeGreaterThan(0);
    const top = candidates[0];
    expect(top.selector).toBe("#pay-now-action");
    expect(top.score).toBeGreaterThanOrEqual(0.85);
    expect(top.tier).toBe("high");
  });

  it("classifies candidate as Review Required (0.60-0.85) for partial or ambiguous matches", () => {
    // Add two competing button options with partial text matches
    document.body.innerHTML = `
      <div id="checkout-summary">
        <button id="action-a" class="btn">Proceed to Step 2</button>
        <button id="action-b" class="btn">Proceed to Review</button>
      </div>
    `;

    const fp: TargetFingerprint = {
      tag: "button",
      role: "button",
      text: "Proceed to Checkout",
      selector: "#checkout-btn",
      parentContext: "checkout-summary",
    };

    const candidates = rankDriftCandidates(fp, document);
    expect(candidates.length).toBe(2);
    // Both have similar scores and partial text match
    expect(candidates[0].tier).toBe("review_required");
  });

  it("classifies element as Stale (< 0.60) when signals do not match target", () => {
    document.body.innerHTML = `
      <div>
        <p id="disclaimer">Terms and conditions apply</p>
      </div>
    `;
    const candidates = rankDriftCandidates(originalPatch.targetFingerprint, document);
    expect(candidates.length).toBe(0);
  });

  it("extracts siblingContext and stableAttributes during element inspection", () => {
    const driftedBtn = document.getElementById("pay-now-action") as HTMLElement;
    const fp = extractTargetFingerprint(driftedBtn);
    expect(fp.tag).toBe("button");
    expect(fp.stableAttributes?.["type"]).toBe("button");
    expect(fp.stableAttributes?.["aria-label"]).toBe("Continue to Checkout");
    expect(fp.parentContext).toBe("payment-drawer");
  });

  it("safely flags the patch as stale without throwing exceptions or corrupting DOM", async () => {
    let transitionReported = false;
    let reportedReason = "";
    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      if (url.toString().includes("/transition")) {
        transitionReported = true;
        const body = JSON.parse(init?.body as string);
        reportedReason = body.reason;
        return new Response(JSON.stringify({ status: "stale" }), { status: 200 });
      }
      return new Response("ok", { status: 200 });
    };

    const result = await detectDomDriftAndHandleStale(
      originalPatch,
      document,
      "http://localhost:4000/api",
      mockFetch as unknown as typeof fetch
    );

    expect(result.status).toBe("stale");
    expect(result.candidateElementId).toBe("pay-now-action");
    expect(result.tier).toBe("high");
    expect(transitionReported).toBe(true);
    expect(reportedReason).toContain("pay-now-action");

    // Verify button was NOT corrupted with arbitrary invalid style
    const driftedBtn = document.getElementById("pay-now-action") as HTMLElement;
    expect(driftedBtn.id).toBe("pay-now-action");
    expect(driftedBtn.style.display).not.toBe("inline-flex");
  });
});
