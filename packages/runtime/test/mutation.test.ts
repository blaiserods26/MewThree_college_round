import { describe, it, expect, beforeEach } from "bun:test";
import { Window } from "happy-dom";
import {
  applyPatchToDom,
  revertPatchFromDom,
  resolveTargetElement,
} from "../src/mutation.js";
import type { Patch, PatchOperation } from "@patchwork/contracts";

describe("Patch Runtime Safe DOM Mutation Engine", () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    document.body.innerHTML = `
      <div id="checkout-summary">
        <button id="checkout-btn" style="display: none;" aria-label="Continue to Checkout">
          Continue to Checkout
        </button>
      </div>
      <div id="duplicate-container">
        <span class="ambiguous-item">Item 1</span>
        <span class="ambiguous-item">Item 2</span>
      </div>
    `;
  });

  it("applies a style.set patch and enables clean, deterministic reversal", () => {
    const patch: Patch = {
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
        selector: "#checkout-btn",
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

    const targetEl = document.getElementById("checkout-btn") as HTMLElement;
    expect(targetEl.style.display).toBe("none");

    const result = applyPatchToDom(patch, document);
    expect(result.status).toBe("applied");
    expect(targetEl.style.display).toBe("inline-flex");
    expect(result.originalState).toBeDefined();

    // Revert patch
    const revertResult = revertPatchFromDom(result, document);
    expect(revertResult.reverted).toBe(true);
    expect(targetEl.style.display).toBe("none");
  });

  it("applies text.set safely without innerHTML interpretation", () => {
    const patch: Patch = {
      id: "P-TEXT",
      websiteId: "demo-store",
      name: "Update button label",
      status: "published",
      currentVersion: 1,
      versions: [],
      targetFingerprint: {
        tag: "button",
        selector: "#checkout-btn",
      },
      operation: {
        type: "text.set",
        value: "<b>Pay Securely</b>",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "dev-1",
    };

    const targetEl = document.getElementById("checkout-btn") as HTMLElement;
    const result = applyPatchToDom(patch, document);
    expect(result.status).toBe("applied");
    // Text must be assigned to textContent, not parsed as HTML markup!
    expect(targetEl.textContent?.trim()).toBe("<b>Pay Securely</b>");
    expect(targetEl.getElementsByTagName("b").length).toBe(0);

    revertPatchFromDom(result, document);
    expect(targetEl.textContent?.trim()).toBe("Continue to Checkout");
  });

  it("rejects ambiguous multi-element matches to prevent unintended mutations", () => {
    const ambiguousPatch: Patch = {
      id: "P-AMBIGUOUS",
      websiteId: "demo-store",
      name: "Ambiguous patch",
      status: "published",
      currentVersion: 1,
      versions: [],
      targetFingerprint: {
        tag: "span",
        selector: ".ambiguous-item",
      },
      operation: {
        type: "style.set",
        property: "color",
        value: "red",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "dev-1",
    };

    const result = applyPatchToDom(ambiguousPatch, document);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Target selector matched 2 elements (expected exactly 1)");
  });

  it("rejects disallowed operations or properties", () => {
    const badPatch: Patch = {
      id: "P-BAD",
      websiteId: "demo-store",
      name: "Malicious patch attempt",
      status: "published",
      currentVersion: 1,
      versions: [],
      targetFingerprint: {
        tag: "button",
        selector: "#checkout-btn",
      },
      operation: {
        type: "attribute.set",
        name: "onclick",
        value: "alert(1)",
      } as PatchOperation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "dev-1",
    };

    const result = applyPatchToDom(badPatch, document);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Disallowed attribute");
  });

  it("applies element.insert and cleanly reverts it", () => {
    const insertPatch: Patch = {
      id: "P-INSERT-BANNER",
      websiteId: "demo-store",
      name: "Insert promotional banner",
      status: "published",
      currentVersion: 1,
      versions: [],
      targetFingerprint: {
        tag: "div",
        selector: "#checkout-summary",
      },
      operation: {
        type: "element.insert",
        position: "before",
        tag: "div",
        textContent: "Limited Time Free Shipping!",
        attributes: {
          class: "promo-alert",
          role: "alert",
        },
        style: {
          color: "red",
          background: "yellow",
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "dev-1",
    };

    const result = applyPatchToDom(insertPatch, document);
    expect(result.status).toBe("applied");

    const inserted = document.querySelector(".promo-alert") as HTMLElement;
    expect(inserted).not.toBeNull();
    expect(inserted.textContent).toBe("Limited Time Free Shipping!");
    expect(inserted.getAttribute("data-patchwork-inserted")).toBe("P-INSERT-BANNER");
    expect(inserted.style.color).toBe("red");

    // Revert patch
    const revertResult = revertPatchFromDom(result, document);
    expect(revertResult.reverted).toBe(true);
    expect(document.querySelector(".promo-alert")).toBeNull();
  });

  it("applies element.remove and cleanly restores the element on revert", () => {
    const removePatch: Patch = {
      id: "P-REMOVE-BTN",
      websiteId: "demo-store",
      name: "Remove checkout button",
      status: "published",
      currentVersion: 1,
      versions: [],
      targetFingerprint: {
        tag: "button",
        selector: "#checkout-btn",
      },
      operation: {
        type: "element.remove",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "dev-1",
    };

    expect(document.getElementById("checkout-btn")).not.toBeNull();

    const result = applyPatchToDom(removePatch, document);
    expect(result.status).toBe("applied");
    expect(document.getElementById("checkout-btn")).toBeNull();

    // Revert patch
    const revertResult = revertPatchFromDom(result, document);
    expect(revertResult.reverted).toBe(true);
    const restored = document.getElementById("checkout-btn");
    expect(restored).not.toBeNull();
    expect(restored?.parentElement?.id).toBe("checkout-summary");
  });
});
