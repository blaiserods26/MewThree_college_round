import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Window } from "happy-dom";
import { initPatchworkRuntime } from "../src/runtime.js";

describe("Patchwork Client Runtime & Preview Isolation", () => {
  let window: Window;
  let document: Document;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("in production mode, fetches and applies the active release bundle", async () => {
    document.body.innerHTML = `
      <script src="/patchwork.js" data-website-id="demo-store"></script>
      <div id="checkout-summary">
        <button id="checkout-btn" style="display: none;">Checkout</button>
      </div>
    `;

    // Mock fetch for active release
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/websites/demo-store/active-release")) {
        return new Response(
          JSON.stringify({
            release: { id: "rel-1", version: 1, status: "active", patchIds: ["p-1"] },
            patches: [
              {
                id: "p-1",
                websiteId: "demo-store",
                name: "Restore checkout button",
                status: "published",
                currentVersion: 1,
                targetFingerprint: { tag: "button", selector: "#checkout-btn" },
                operation: { type: "style.set", property: "display", value: "inline-flex" },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    };

    const runtime = await initPatchworkRuntime({
      apiBase: "http://localhost:4000/api",
      doc: document,
      win: window as unknown as Window,
    });

    expect(runtime.mode).toBe("production");
    expect(runtime.releaseId).toBe("rel-1");
    const btn = document.getElementById("checkout-btn") as HTMLElement;
    expect(btn.style.display).toBe("inline-flex");
    expect(document.getElementById("patchwork-preview-badge")).toBeNull();
  });

  it("in preview mode (?patchwork_preview=p-draft), fetches isolated patch and renders preview watermark", async () => {
    // Set preview query in window location
    window.location.search = "?patchwork_preview=p-draft";

    document.body.innerHTML = `
      <script src="/patchwork.js" data-website-id="demo-store"></script>
      <div id="checkout-summary">
        <button id="checkout-btn" style="display: none;">Checkout</button>
      </div>
    `;

    // Mock fetch for preview patch
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/patches/p-draft")) {
        return new Response(
          JSON.stringify({
            id: "p-draft",
            websiteId: "demo-store",
            name: "Draft preview patch",
            status: "previewing",
            currentVersion: 1,
            targetFingerprint: { tag: "button", selector: "#checkout-btn" },
            operation: { type: "style.set", property: "display", value: "block" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    };

    const runtime = await initPatchworkRuntime({
      apiBase: "http://localhost:4000/api",
      doc: document,
      win: window as unknown as Window,
    });

    expect(runtime.mode).toBe("preview");
    expect(runtime.patchId).toBe("p-draft");
    const btn = document.getElementById("checkout-btn") as HTMLElement;
    expect(btn.style.display).toBe("block");

    // Preview mode watermark must be present on page
    const badge = document.getElementById("patchwork-preview-badge");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain("PATCHWORK PREVIEW MODE");
  });

  it("in preview mode, renders interactive preview bar with patch details and allows reset to baseline and reapply", async () => {
    window.location.search = "?patchwork_preview=p-preview-btn";

    document.body.innerHTML = `
      <script src="/patchwork.js" data-website-id="demo-store"></script>
      <div id="checkout-summary">
        <button id="checkout-btn" style="background-color: blue; display: none;">Checkout</button>
      </div>
    `;

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/patches/p-preview-btn")) {
        return new Response(
          JSON.stringify({
            id: "p-preview-btn",
            websiteId: "demo-store",
            name: "Highlight Checkout CTA",
            status: "previewing",
            currentVersion: 2,
            targetFingerprint: { tag: "button", selector: "#checkout-btn" },
            operation: { type: "style.set", property: "background-color", value: "#10b981" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    };

    const runtime = await initPatchworkRuntime({
      apiBase: "http://localhost:4000/api",
      doc: document,
      win: window as unknown as Window,
    });

    const btn = document.getElementById("checkout-btn") as HTMLElement;
    expect(btn.style.backgroundColor).toBe("#10b981");

    // Preview bar should be present
    const bar = document.getElementById("patchwork-preview-bar");
    expect(bar).not.toBeNull();
    expect(bar?.textContent).toContain("Highlight Checkout CTA");
    expect(bar?.textContent).toContain("#checkout-btn");

    // Click Reset to Baseline button
    const resetBtn = document.getElementById("patchwork-preview-toggle-btn") as HTMLButtonElement;
    expect(resetBtn).not.toBeNull();
    expect(resetBtn.textContent).toContain("Reset to Baseline");

    resetBtn.click();

    // After reset, DOM should be reverted to baseline
    expect(btn.style.backgroundColor).toBe("blue");
    expect(resetBtn.textContent).toContain("Re-apply Patch");

    // Click Re-apply
    resetBtn.click();
    expect(btn.style.backgroundColor).toBe("#10b981");
    expect(resetBtn.textContent).toContain("Reset to Baseline");
  });

  it("in preview mode, strictly does not fetch or touch the active production release", async () => {
    window.location.search = "?patchwork_preview=p-preview-isolated";

    document.body.innerHTML = `
      <script src="/patchwork.js" data-website-id="demo-store"></script>
      <div id="checkout-summary">
        <button id="checkout-btn">Checkout</button>
      </div>
    `;

    let activeReleaseFetched = false;
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("active-release")) {
        activeReleaseFetched = true;
      }
      if (urlStr.includes("/api/patches/p-preview-isolated")) {
        return new Response(
          JSON.stringify({
            id: "p-preview-isolated",
            websiteId: "demo-store",
            name: "Isolated Draft",
            status: "draft",
            currentVersion: 1,
            targetFingerprint: { tag: "button", selector: "#checkout-btn" },
            operation: { type: "style.set", property: "color", value: "#ffffff" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    };

    await initPatchworkRuntime({
      apiBase: "http://localhost:4000/api",
      doc: document,
      win: window as unknown as Window,
    });

    expect(activeReleaseFetched).toBe(false);
  });

  it("in preview mode with drifted target, halts mutation safely, renders drift watermark, and sets preview pill to stale", async () => {
    window.location.search = "?patchwork_preview=p-drifted";

    // DOM has drifted: button is now #pay-now-action
    document.body.innerHTML = `
      <script src="/patchwork.js" data-website-id="demo-store"></script>
      <div id="checkout-summary">
        <div class="payment-drawer">
          <button id="pay-now-action" class="btn btn-checkout" type="button" aria-label="Continue to Checkout">
            Continue to Checkout
          </button>
        </div>
      </div>
    `;

    let transitionCalled = false;
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/patches/p-drifted/transition")) {
        transitionCalled = true;
        return new Response(JSON.stringify({ status: "stale" }), { status: 200 });
      }
      if (urlStr.includes("/api/patches/p-drifted")) {
        return new Response(
          JSON.stringify({
            id: "p-drifted",
            websiteId: "demo-store",
            name: "Drifted patch",
            status: "published",
            currentVersion: 1,
            targetFingerprint: {
              tag: "button",
              role: "button",
              text: "Continue to Checkout",
              accessibleName: "Continue to Checkout",
              selector: "#checkout-btn", // Non-existent!
              parentContext: "checkout-summary",
            },
            operation: { type: "style.set", property: "display", value: "inline-flex" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    };

    const runtime = await initPatchworkRuntime({
      apiBase: "http://localhost:4000/api",
      doc: document,
      win: window as unknown as Window,
    });

    expect(runtime.mode).toBe("preview");
    expect(runtime.results[0].status).toBe("stale");
    expect(transitionCalled).toBe(true);

    // Drift warning watermark must be rendered
    const watermark = document.getElementById("patchwork-drift-watermark");
    expect(watermark).not.toBeNull();
    expect(watermark?.textContent).toContain("DOM DRIFT DETECTED");
    expect(watermark?.textContent).toContain("#pay-now-action");

    // Preview bar should indicate stale
    const statusPill = document.getElementById("patchwork-preview-status-pill");
    expect(statusPill?.textContent?.toUpperCase()).toContain("STALE");

    // Window diagnostics exposed
    const winObj = (window as any).__PATCHWORK_PREVIEW__;
    expect(winObj).toBeDefined();
    expect(winObj.drift.isDrifted).toBe(true);
    expect(winObj.drift.candidate.selector).toBe("#pay-now-action");
    expect(winObj.drift.score).toBeGreaterThanOrEqual(0.85);

    // Unintended element must NOT have been mutated
    const driftedBtn = document.getElementById("pay-now-action") as HTMLElement;
    expect(driftedBtn.style.display).not.toBe("inline-flex");
  });
});

