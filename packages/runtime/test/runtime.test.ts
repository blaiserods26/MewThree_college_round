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
});
