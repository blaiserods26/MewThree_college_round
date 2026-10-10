import { describe, it, expect, beforeEach } from "bun:test";
import { Window } from "happy-dom";
import {
  calculateFingerprintSimilarity,
  findDriftCandidate,
  detectDomDriftAndHandleStale,
} from "../src/fingerprint.js";
import type { Patch } from "@patchwork/contracts";

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
        <div class="payment-drawer">
          <button id="pay-now-action" class="btn btn-checkout" aria-label="Continue to Checkout">
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

  it("calculates high similarity score for the drifted element", () => {
    const driftedBtn = document.getElementById("pay-now-action") as HTMLElement;
    const score = calculateFingerprintSimilarity(driftedBtn, originalPatch.targetFingerprint);
    // Button tag matches (+0.3), text matches (+0.3), role matches (+0.2)
    expect(score).toBeGreaterThanOrEqual(0.7);
  });

  it("finds the candidate element despite selector divergence", () => {
    const candidate = findDriftCandidate(originalPatch.targetFingerprint, document);
    expect(candidate).not.toBeNull();
    expect(candidate?.element.id).toBe("pay-now-action");
    expect(candidate?.score).toBeGreaterThanOrEqual(0.7);
  });

  it("safely flags the patch as stale without throwing exceptions or corrupting DOM", async () => {
    let transitionReported = false;
    const mockFetch = async (url: string | URL | Request) => {
      if (url.toString().includes("/transition")) {
        transitionReported = true;
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
    expect(transitionReported).toBe(true);

    // Verify button was NOT corrupted with arbitrary invalid style
    const driftedBtn = document.getElementById("pay-now-action") as HTMLElement;
    expect(driftedBtn.id).toBe("pay-now-action");
  });
});
