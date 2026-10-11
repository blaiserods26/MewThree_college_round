import { describe, it, expect, beforeEach } from "bun:test";
import { Window } from "happy-dom";
import { initVisualInspector } from "../../runtime/src/inspector.js";
import { applyPatchToDom, revertPatchOnDom } from "../../runtime/src/mutation.js";

describe("Visual Inspector & Storefront Preview End-to-End Bug Repro", () => {
  let storefrontWin: Window;
  let storefrontDoc: Document;

  beforeEach(() => {
    storefrontWin = new Window({ url: "http://localhost:3000" });
    storefrontDoc = storefrontWin.document as unknown as Document;
    storefrontDoc.body.innerHTML = `
      <main id="app-main">
        <section class="checkout-container">
          <div id="checkout-summary">
            <button id="checkout-btn" class="btn btn-checkout" style="display: none;" aria-label="Continue to Checkout">
              Continue to Checkout
            </button>
          </div>
        </section>
      </main>
    `;
  });

  it("BUG 1 & 2: Reverting live preview via PATCHWORK_REVERT_PREVIEW must restore original DOM styling", () => {
    const inspector = initVisualInspector({
      doc: storefrontDoc,
      win: storefrontWin as unknown as Window,
    });

    const btn = storefrontDoc.getElementById("checkout-btn") as HTMLElement;
    expect(btn.style.display).toBe("none");

    // Dashboard applies live preview: display: inline-flex
    storefrontWin.dispatchEvent(
      new (storefrontWin as any).MessageEvent("message", {
        data: {
          type: "PATCHWORK_LIVE_PREVIEW",
          patch: {
            id: "p-test",
            targetFingerprint: { selector: "#checkout-btn", tag: "button" },
            operation: { type: "style.set", property: "display", value: "inline-flex" },
          },
        },
      })
    );

    // Patch should be applied
    expect(btn.style.display).toBe("inline-flex");

    // Dashboard sends revert preview (as bridge.revertLivePreview() currently sends without patch payload)
    storefrontWin.dispatchEvent(
      new (storefrontWin as any).MessageEvent("message", {
        data: {
          type: "PATCHWORK_REVERT_PREVIEW",
        },
      })
    );

    // Button MUST revert back to its original baseline state ("none")
    expect(btn.style.display).toBe("none");
  });

  it("BUG 3: Escape cancellation should be handled gracefully when triggered or dispatched", () => {
    const receivedMessages: any[] = [];
    const mockParent = {
      postMessage: (msg: any) => {
        receivedMessages.push(msg);
      },
    };
    (storefrontWin as any).parent = mockParent;

    const inspector = initVisualInspector({
      doc: storefrontDoc,
      win: storefrontWin as unknown as Window,
    });

    // Activate inspector
    storefrontWin.dispatchEvent(
      new (storefrontWin as any).MessageEvent("message", {
        data: { type: "PATCHWORK_TOGGLE_INSPECTOR", enabled: true },
      })
    );
    expect(storefrontDoc.body.classList.contains("patchwork-inspecting")).toBe(true);

    // Press Escape
    storefrontDoc.dispatchEvent(
      new (storefrontWin as any).KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      })
    );

    expect(storefrontDoc.body.classList.contains("patchwork-inspecting")).toBe(false);
    const cancelMsg = receivedMessages.find((m) => m.type === "PATCHWORK_INSPECTOR_CANCELLED");
    expect(cancelMsg).toBeDefined();
  });
});
