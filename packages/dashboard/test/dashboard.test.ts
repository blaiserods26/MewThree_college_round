import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { Window } from "happy-dom";

/**
 * Phase 7 dashboard resilience: a page refresh restores the operator's place, and backend
 * failures render a useful, retryable error instead of an empty or stuck panel.
 */

const DASHBOARD_DIR = path.join(import.meta.dirname, "..");
const appJs = fs.readFileSync(path.join(DASHBOARD_DIR, "app.js"), "utf-8");
const indexHtml = fs.readFileSync(path.join(DASHBOARD_DIR, "index.html"), "utf-8");

const now = new Date().toISOString();
function patchFixture(id: string, name: string, status = "draft") {
  const fingerprint = { tag: "button", selector: `#${id}` };
  const operation = { type: "style.set", property: "color", value: "red" };
  return {
    id,
    websiteId: "demo-store",
    name,
    status,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        targetFingerprint: fingerprint,
        operation,
        createdAt: now,
        createdBy: "dev-1",
        changeNote: "Initial draft creation",
      },
    ],
    targetFingerprint: fingerprint,
    operation,
    createdAt: now,
    updatedAt: now,
    createdBy: "dev-1",
  };
}

const PATCHES = [patchFixture("alpha", "Alpha patch"), patchFixture("beta", "Beta patch")];

type Route = (url: string, init?: RequestInit) => Response | Promise<Response>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function healthyApi(): Route {
  return (url) => {
    const { pathname } = new URL(url);
    if (pathname === "/api/patches") return json(PATCHES);
    if (pathname === "/api/patches/check-conflicts") return json({ conflicts: [] });
    if (pathname.endsWith("/verifications")) return json([]);
    if (pathname === "/api/releases") return json([]);
    if (pathname === "/api/audit-events") return json([]);
    return json({ error: "not found" }, 404);
  };
}

async function settle(ms = 40) {
  await new Promise((r) => setTimeout(r, ms));
}

async function openDashboard(route: Route, storage: Record<string, string> = {}) {
  const win = new Window({
    url: "http://localhost:5173/",
    settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
  });
  for (const [k, v] of Object.entries(storage)) win.localStorage.setItem(k, v);

  const calls: string[] = [];
  (win as any).fetch = async (input: any, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.url;
    calls.push(url);
    return route(url, init);
  };
  // happy-dom would otherwise try to resolve <script src> tags.
  win.document.documentElement.innerHTML = indexHtml.replace(/<script[\s\S]*?<\/script>/gi, "");
  (win as any).PATCHWORK_CONFIG = { apiBase: "http://localhost:4000/api", storefrontUrl: "http://store" };
  new Function("window", "document", appJs)(win, win.document);
  await settle();
  return { win, doc: win.document, calls };
}

describe("Dashboard backend failure handling", () => {
  it("shows an actionable offline message with Retry, and recovers when the API returns", async () => {
    let apiUp = false;
    const route: Route = (url, init) => {
      if (!apiUp) throw new TypeError("fetch failed");
      return healthyApi()(url, init);
    };
    const { doc } = await openDashboard(route);

    const list = doc.getElementById("patch-list-container")!;
    expect(list.textContent).toContain("Cannot reach the PATCHWORK API");
    expect(doc.getElementById("connection-status-text")!.textContent).toContain("Offline");
    // Releases and audit panels must not be left blank either.
    expect(doc.getElementById("releases-history-list")!.textContent).toContain("Cannot reach");
    expect(doc.getElementById("audit-timeline-list")!.textContent).toContain("Cannot reach");

    apiUp = true;
    (list.querySelector(".retry-btn") as HTMLButtonElement).click();
    await settle();

    expect(list.textContent).toContain("Alpha patch");
    expect(list.querySelector(".retry-btn")).toBeNull();
    expect(doc.getElementById("connection-status-text")!.textContent).toContain("Online");
  });

  it("shows the HTTP status when the API answers with an error", async () => {
    const route: Route = (url, init) => {
      if (new URL(url).pathname === "/api/releases") return json({ error: "boom" }, 500);
      return healthyApi()(url, init);
    };
    const { doc } = await openDashboard(route);

    const releases = doc.getElementById("releases-history-list")!;
    expect(releases.textContent).toContain("Failed to load releases (HTTP 500)");
    expect(releases.querySelector(".retry-btn")).not.toBeNull();
    // The patch list still works: one failing panel does not take down the rest.
    expect(doc.getElementById("patch-list-container")!.textContent).toContain("Alpha patch");
  });
});

describe("Dashboard refresh persistence", () => {
  it("restores the selected patch, tab and filters after a reload", async () => {
    const first = await openDashboard(healthyApi());

    // Operator picks the second patch, filters, and moves to the audit tab.
    (first.doc.querySelector('[data-patch-id="beta"]') as HTMLElement).click();
    const search = first.doc.getElementById("patch-search-input") as HTMLInputElement;
    search.value = "beta";
    search.dispatchEvent(new first.win.Event("input"));
    (first.doc.querySelector('.tab-btn[data-tab="audit"]') as HTMLElement).click();
    await settle();

    const saved = first.win.localStorage.getItem("patchwork.dashboard.state.v1")!;
    expect(saved).toBeTruthy();

    // "Refresh": brand-new page, same browser storage.
    const second = await openDashboard(healthyApi(), { "patchwork.dashboard.state.v1": saved });

    expect(second.doc.querySelector(".tab-btn.active")!.getAttribute("data-tab")).toBe("audit");
    expect(second.doc.getElementById("view-audit")!.classList.contains("active")).toBe(true);
    expect((second.doc.getElementById("patch-search-input") as HTMLInputElement).value).toBe("beta");
    const active = second.doc.querySelector(".patch-card.active");
    expect(active?.getAttribute("data-patch-id")).toBe("beta");
  });

  it("drops a saved selection whose patch no longer exists (e.g. after a demo reset)", async () => {
    const stale = JSON.stringify({ tab: "patches", selectedPatchId: "gone", search: "", status: "" });
    const { doc } = await openDashboard(healthyApi(), { "patchwork.dashboard.state.v1": stale });

    // Falls back to the first available patch instead of an empty detail pane.
    expect(doc.querySelector(".patch-card.active")?.getAttribute("data-patch-id")).toBe("alpha");
  });

  it("ignores corrupt saved state instead of crashing", async () => {
    const { doc } = await openDashboard(healthyApi(), {
      "patchwork.dashboard.state.v1": "{not json",
    });
    expect(doc.getElementById("patch-list-container")!.textContent).toContain("Alpha patch");
  });
});

describe("Dashboard Phase 9 Visual Polish", () => {
  it("renders an isolated sandbox banner for draft/previewing patches", async () => {
    const { doc } = await openDashboard(healthyApi());
    const banner = doc.querySelector(".state-banner.preview-banner");
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain("Isolated Sandbox Preview State");
  });

  it("renders an active production banner for published patches", async () => {
    const publishedPatch = patchFixture("pub-1", "Published Patch", "published");
    const route: Route = (url) => {
      const { pathname } = new URL(url);
      if (pathname === "/api/patches") return json([publishedPatch]);
      if (pathname === "/api/patches/check-conflicts") return json({ conflicts: [] });
      if (pathname.endsWith("/verifications")) return json([]);
      if (pathname === "/api/releases") return json([]);
      if (pathname === "/api/audit-events") return json([]);
      return json({ error: "not found" }, 404);
    };
    const { doc } = await openDashboard(route);
    const banner = doc.querySelector(".state-banner.published-banner");
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain("Active in Production Release");
    expect(banner!.textContent).toContain("Open Live Storefront");
  });
});
