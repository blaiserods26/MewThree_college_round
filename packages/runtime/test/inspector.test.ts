import { describe, it, expect, beforeEach } from "bun:test";
import { Window } from "happy-dom";
import {
  generateElementSelector,
  extractTargetFingerprint,
  isAmbiguousContainer,
} from "../src/inspector.js";

describe("Visual Element Inspector & Fingerprint Extraction", () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    document.body.innerHTML = `
      <main id="app-main">
        <section class="checkout-container">
          <div id="checkout-summary">
            <button id="checkout-btn" class="btn btn-checkout" aria-label="Continue to Checkout">
              Continue to Checkout
            </button>
          </div>
        </section>
      </main>
    `;
  });

  it("generates a deterministic unique CSS selector for target element", () => {
    const btn = document.getElementById("checkout-btn") as HTMLElement;
    const selector = generateElementSelector(btn);
    expect(selector).toBe("#checkout-btn");
  });

  it("extracts a complete TargetFingerprint adhering to canonical contract", () => {
    const btn = document.getElementById("checkout-btn") as HTMLElement;
    const fingerprint = extractTargetFingerprint(btn);

    expect(fingerprint.tag).toBe("button");
    expect(fingerprint.role).toBe("button");
    expect(fingerprint.text).toBe("Continue to Checkout");
    expect(fingerprint.accessibleName).toBe("Continue to Checkout");
    expect(fingerprint.selector).toBe("#checkout-btn");
    expect(fingerprint.parentContext).toBe("checkout-summary");
  });

  it("guards against picking ambiguous page containers", () => {
    const body = document.body;
    const main = document.getElementById("app-main") as HTMLElement;
    const btn = document.getElementById("checkout-btn") as HTMLElement;

    expect(isAmbiguousContainer(body)).toBe(true);
    expect(isAmbiguousContainer(main)).toBe(true);
    expect(isAmbiguousContainer(btn)).toBe(false);
  });
});
