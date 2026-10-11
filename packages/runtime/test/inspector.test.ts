import { describe, it, expect, beforeEach } from "bun:test";
import { Window } from "happy-dom";
import {
  generateElementSelector,
  extractTargetFingerprint,
  isAmbiguousContainer,
  initVisualInspector,
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

  it("activates inspector upon PATCHWORK_TOGGLE_INSPECTOR and selects element on click", () => {
    let selectedFp: any = null;
    const receivedMessages: any[] = [];

    // Mock parent window
    const mockParent = {
      postMessage: (msg: any) => {
        receivedMessages.push(msg);
      },
    };
    (window as any).parent = mockParent;

    const inspector = initVisualInspector({
      doc: document,
      win: window as unknown as Window,
      onSelect: (fp: any) => {
        selectedFp = fp;
      },
    });

    // Send toggle inspector message with enabled: true
    window.dispatchEvent(
      new (window as any).MessageEvent("message", {
        data: { type: "PATCHWORK_TOGGLE_INSPECTOR", enabled: true },
      })
    );

    expect(document.body.classList.contains("patchwork-inspecting")).toBe(true);

    // Click target element
    const btn = document.getElementById("checkout-btn") as HTMLElement;
    btn.dispatchEvent(
      new (window as any).MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      })
    );

    expect(selectedFp).not.toBeNull();
    expect(selectedFp.selector).toBe("#checkout-btn");
    expect(document.body.classList.contains("patchwork-inspecting")).toBe(false);

    const selectMsg = receivedMessages.find(
      (m) => m.type === "PATCHWORK_ELEMENT_SELECTED"
    );
    expect(selectMsg).toBeDefined();
    expect(selectMsg.fingerprint.selector).toBe("#checkout-btn");
  });
});
