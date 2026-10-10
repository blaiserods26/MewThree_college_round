import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Window } from "happy-dom";
import { initPatchworkRuntime } from "../src/runtime.js";
import type { Patch } from "@patchwork/contracts";

describe("Multi-Patch Release Bundling & Deterministic Runtime Application", () => {
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

  it("applies a multi-patch release bundle in deterministic sequence and can cleanly revert to baseline", async () => {
    document.body.innerHTML = `
      <div id="hero-banner">
        <h1 class="headline">Old Headline</h1>
        <button id="cta-btn" style="background-color: rgb(0, 0, 0); padding: 8px;">Order Now</button>
        <span class="badge" style="display: none;">Sale!</span>
      </div>
    `;

    const patches: Patch[] = [
      {
        id: "patch-1",
        websiteId: "demo-store",
        name: "Update Headline Text",
        status: "published",
        currentVersion: 1,
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetFingerprint: { tag: "h1", selector: ".headline" },
        operation: { type: "text.set", value: "Summer Flash Sale — 50% Off!" },
      },
      {
        id: "patch-2",
        websiteId: "demo-store",
        name: "CTA Emerald Green",
        status: "published",
        currentVersion: 1,
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetFingerprint: { tag: "button", selector: "#cta-btn" },
        operation: { type: "style.set", property: "background-color", value: "#10b981" },
      },
      {
        id: "patch-3",
        websiteId: "demo-store",
        name: "Show Sale Badge",
        status: "published",
        currentVersion: 1,
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetFingerprint: { tag: "span", selector: ".badge" },
        operation: { type: "element.show" },
      },
    ];

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/websites/demo-store/active-release")) {
        return new Response(
          JSON.stringify({
            release: {
              id: "rel-bundle-1",
              websiteId: "demo-store",
              version: 1,
              status: "active",
              patchIds: ["patch-1", "patch-2", "patch-3"],
            },
            patches,
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
    expect(runtime.releaseId).toBe("rel-bundle-1");
    expect(runtime.results.length).toBe(3);
    expect(runtime.results.every((r) => r.status === "applied")).toBe(true);

    // Verify DOM updates
    const h1 = document.querySelector(".headline") as HTMLElement;
    const btn = document.querySelector("#cta-btn") as HTMLElement;
    const badge = document.querySelector(".badge") as HTMLElement;

    expect(h1.textContent).toBe("Summer Flash Sale — 50% Off!");
    expect(btn.style.backgroundColor).toBe("#10b981");
    expect(badge.style.display).not.toBe("none");

    // Verify rollback / baseline reversion
    expect(runtime.resetToBaseline).toBeDefined();
    const revertResults = runtime.resetToBaseline!();
    expect(Array.isArray(revertResults)).toBe(true);

    // Verify DOM restored to baseline
    expect(h1.textContent).toBe("Old Headline");
    expect(btn.style.backgroundColor).toBe("rgb(0, 0, 0)");
    expect(badge.style.display).toBe("none");
  });
});
