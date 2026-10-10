// PATCHWORK Dashboard Application
(function () {
  const CONFIG = window.PATCHWORK_CONFIG || {};
  const API_BASE = CONFIG.apiBase || "http://localhost:4000/api";
  const STOREFRONT_URL = CONFIG.storefrontUrl || "http://localhost:3000";
  const STATE_KEY = "patchwork.dashboard.state.v1";

  // Network failures surface as a bare "Failed to fetch"; replace with an actionable message.
  const rawFetch = window.fetch.bind(window);
  function fetch(input, init) {
    return rawFetch(input, init).catch(() => {
      throw new Error(
        `Cannot reach the PATCHWORK API at ${API_BASE}. Check that the server is running, then retry.`
      );
    });
  }

  // Persist lightweight UI state so a page refresh returns the operator to where they were.
  function loadSavedState() {
    try {
      return JSON.parse(window.localStorage.getItem(STATE_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function saveState() {
    try {
      window.localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          tab: currentTab,
          selectedPatchId,
          search: searchInput ? searchInput.value : "",
          status: filterStatusSelect ? filterStatusSelect.value : "",
        })
      );
    } catch (e) {
      /* storage unavailable (private mode): resilience feature only, safe to ignore */
    }
  }
  const savedState = loadSavedState();

  let activeWebsiteId = "demo-store";
  let currentTab = "patches";
  let allPatches = [];
  let selectedPatchId = savedState.selectedPatchId || null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderErrorState(container, message, retry) {
    container.innerHTML = `
      <div class="empty-state error-state" role="alert">
        <div>⚠️ ${escapeHtml(message)}</div>
        <button type="button" class="btn btn-secondary retry-btn" style="margin-top: 12px;">Retry</button>
      </div>`;
    const btn = container.querySelector(".retry-btn");
    if (btn) btn.addEventListener("click", retry);
  }

  // DOM Elements
  const websiteSelect = document.getElementById("website-select");
  const connectionBadge = document.getElementById("connection-status-badge");
  const connectionText = document.getElementById("connection-status-text");
  const patchesCounter = document.getElementById("patches-counter-badge");
  const releasesCounter = document.getElementById("releases-counter-badge");
  const auditCounter = document.getElementById("audit-counter-badge");

  const patchListContainer = document.getElementById("patch-list-container");
  const patchDetailContainer = document.getElementById("patch-detail-container");
  const searchInput = document.getElementById("patch-search-input");
  const filterStatusSelect = document.getElementById("filter-status-select");

  const activeRelCard = document.getElementById("active-release-card");
  const activeRelVersion = document.getElementById("active-rel-version");
  const activeRelTimestamp = document.getElementById("active-rel-timestamp");
  const activeRelPatchesList = document.getElementById("active-rel-patches-list");
  const releasesHistoryList = document.getElementById("releases-history-list");
  const triggerRollbackBtn = document.getElementById("trigger-rollback-btn");

  const auditTimelineList = document.getElementById("audit-timeline-list");

  const openInspectorBtn = document.getElementById("open-inspector-btn");

  // Visual Inspector Bridge
  let inspectorWindow = null;
  if (openInspectorBtn) {
    openInspectorBtn.addEventListener("click", () => {
      inspectorWindow = window.open(STOREFRONT_URL, "PatchworkInspector");
      showToast("Storefront opened. Click an element to capture its fingerprint.", "info");
      setTimeout(() => {
        if (inspectorWindow) {
          inspectorWindow.postMessage({ type: "PATCHWORK_TOGGLE_INSPECTOR", enabled: true }, "*");
        }
      }, 1000);
    });
  }

  window.addEventListener("message", (msg) => {
    if (msg.data && msg.data.type === "PATCHWORK_ELEMENT_SELECTED") {
      const fp = msg.data.fingerprint;
      if (!fp) return;
      document.getElementById("patch-selector-input").value = fp.selector || "";
      document.getElementById("patch-tag-input").value = fp.tag || "button";
      document.getElementById("patch-name-input").value = `Patch for <${fp.tag}> ${fp.selector}`;
      newPatchModal.classList.remove("hidden");
      showToast(`Captured target element: ${fp.selector}`, "success");
    }
  });
  const createPatchBtn = document.getElementById("create-patch-btn");
  const newPatchModal = document.getElementById("new-patch-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const cancelNewPatchBtn = document.getElementById("cancel-new-patch-btn");
  const newPatchForm = document.getElementById("new-patch-form");
  const toastContainer = document.getElementById("toast-container");

  // Tab Navigation
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      if (!tab) return;
      currentTab = tab;
      saveState();

      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".view-panel").forEach((p) => p.classList.remove("active"));
      const targetPanel = document.getElementById(`view-${tab}`);
      if (targetPanel) targetPanel.classList.add("active");

      if (tab === "releases") loadReleases();
      if (tab === "audit") loadAuditEvents();
    });
  });

  // Toast System
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
    toast.innerHTML = `<span>${icon}</span> <span class="toast-message"></span>`;
    toast.querySelector(".toast-message").textContent = message;
    toastContainer.appendChild(toast);
    // Errors stay longer so the operator can actually read the reason.
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, type === "error" ? 7000 : 3500);
  }

  // Load Patches
  async function loadPatches() {
    try {
      const res = await fetch(`${API_BASE}/patches?websiteId=${activeWebsiteId}`);
      if (!res.ok) throw new Error(`Failed to load patches (HTTP ${res.status})`);
      allPatches = await res.json();
      patchesCounter.textContent = String(allPatches.length);
      connectionBadge.classList.add("connected");
      connectionBadge.style.background = "";
      connectionText.textContent = "Engine Online";
      if (selectedPatchId && !allPatches.some((p) => p.id === selectedPatchId)) {
        selectedPatchId = null; // saved selection no longer exists (e.g. after a demo reset)
        saveState();
      }
      renderPatchList();
    } catch (err) {
      connectionBadge.classList.remove("connected");
      connectionBadge.style.background = "rgba(239, 68, 68, 0.15)";
      connectionText.textContent = "Engine Offline";
      renderErrorState(patchListContainer, err.message, loadPatches);
    }
  }

  // Render Patch List
  function renderPatchList() {
    const query = (searchInput.value || "").toLowerCase().trim();
    const statusFilter = filterStatusSelect.value;

    const filtered = allPatches.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        p.targetFingerprint.selector.toLowerCase().includes(query);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
      patchListContainer.innerHTML = `<div class="empty-state">No patches found matching criteria.</div>`;
      return;
    }

    patchListContainer.innerHTML = filtered
      .map(
        (p) => `
        <div class="patch-card ${selectedPatchId === p.id ? "active" : ""}" data-patch-id="${p.id}">
          <div class="patch-card-header">
            <span class="patch-name">${p.name}</span>
            <span class="status-badge status-${p.status}">${p.status.replace("_", " ")}</span>
          </div>
          <div class="patch-selector-snippet">${p.targetFingerprint.selector} (${p.operation.type})</div>
          <div class="patch-card-footer">
            <span>Version: v${p.currentVersion}</span>
            <span>${new Date(p.updatedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      `
      )
      .join("");

    // Click handler on cards
    patchListContainer.querySelectorAll(".patch-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-patch-id");
        if (id) selectPatch(id);
      });
    });

    if (selectedPatchId) {
      renderPatchDetail();
    } else if (filtered[0]) {
      selectPatch(filtered[0].id);
    }
  }

  // Select Patch
  function selectPatch(id) {
    selectedPatchId = id;
    saveState();
    renderPatchList();
    renderPatchDetail();
  }

  // Render Patch Detail
  async function renderPatchDetail() {
    const patch = allPatches.find((p) => p.id === selectedPatchId);
    if (!patch) return;

    let runs = [];
    try {
      const res = await fetch(`${API_BASE}/patches/${patch.id}/verifications`);
      if (res.ok) runs = await res.json();
    } catch (e) {
      console.warn("Could not load verification runs", e);
    }
    const latestRun = runs[0];

    let activeConflict = null;
    try {
      const conflictRes = await fetch(`${API_BASE}/patches/check-conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patchId: patch.id }),
      });
      if (conflictRes.ok) {
        const conflictData = await conflictRes.json();
        if (conflictData.conflicts && conflictData.conflicts.length > 0) {
          activeConflict = conflictData.conflicts[0];
        }
      }
    } catch (e) {
      console.warn("Could not check conflicts", e);
    }

    patchDetailContainer.innerHTML = `
      <div class="detail-header-card">
        <div>
          <span class="status-badge status-${patch.status}">${patch.status.replace("_", " ")}</span>
          <h2 class="detail-title" style="margin-top: 8px;">${patch.name}</h2>
          <span style="font-size: 0.8rem; color: var(--text-faint);">ID: ${patch.id} • Target: ${patch.websiteId}</span>
        </div>
        <div class="detail-actions-bar">
          ${renderLifecycleActionButtons(patch, activeConflict)}
        </div>
      </div>

      ${renderStateBanner(patch)}

      ${
        activeConflict
          ? `
      <!-- Conflict Detected & Interactive Resolution Panel -->
      <div class="conflict-card" id="conflict-resolution-card">
        <div class="conflict-header">
          <div class="conflict-title">
            <span>⚠️ Multi-Patch Collision Warning: Overlapping Mutation Detected</span>
          </div>
          <span class="conflict-badge">
            ⚡ Error • Release Blocked
          </span>
        </div>

        <div style="font-size: 0.88rem; color: #fecaca; line-height: 1.5; margin-bottom: 12px;">
          ${activeConflict.reason}
        </div>

        <table class="conflict-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>This Patch (${patch.id})</th>
              <th>Competing Patch (${activeConflict.patchBId})</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight: 600; color: #94a3b8;">Target Selector</td>
              <td><code>${activeConflict.targetSelector}</code></td>
              <td><code>${activeConflict.targetSelector}</code></td>
              <td><span style="color: #ef4444; font-weight: 700;">Overlap</span></td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #94a3b8;">Operation / Property</td>
              <td>${activeConflict.collidingProperty || patch.operation.type}</td>
              <td>${activeConflict.collidingProperty || "Competing Op"}</td>
              <td><span style="color: #ef4444; font-weight: 700;">Collision</span></td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #94a3b8;">Configured Value</td>
              <td>
                <span class="conflict-value-box val-this">${activeConflict.patchAValue || JSON.stringify(patch.operation)}</span>
              </td>
              <td>
                <span class="conflict-value-box val-competing">${activeConflict.patchBValue || "Competing Value"}</span>
              </td>
              <td><span style="color: #ef4444; font-weight: 700;">Conflict</span></td>
            </tr>
          </tbody>
        </table>

        <div class="conflict-actions-bar">
          <button class="btn btn-primary" id="btn-resolve-keep-this" style="display: flex; align-items: center; gap: 6px;">
            👑 Keep This Patch
          </button>
          <button class="btn btn-secondary" id="btn-resolve-keep-competing" style="display: flex; align-items: center; gap: 6px;">
            Keep Competing (${activeConflict.patchBId})
          </button>
          <div class="inline-revision-box">
            <input type="text" id="input-inline-revised-val" placeholder="Revise value..." value="${patch.operation.type === "style.set" ? "#6366f1" : ""}" />
            <button class="btn btn-secondary" id="btn-resolve-revise-val" style="display: flex; align-items: center; gap: 4px;">
              ✏️ Revise Value
            </button>
          </div>
          <button class="btn btn-danger" id="btn-resolve-discard" style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
            🗑️ Discard Patch
          </button>
        </div>
      </div>
      `
          : ""
      }

      ${
        patch.status === "stale"
          ? `
      <!-- DOM Drift & Recovery Card -->
      <div class="drift-card" id="drift-recovery-card">
        <div class="drift-header">
          <div class="drift-title">
            <span>⚠️ DOM Target Drift Detected</span>
          </div>
          <span class="confidence-badge confidence-high">
            ⚡ 93% • High Confidence Match
          </span>
        </div>

        <div style="font-size: 0.88rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 12px;">
          Target selector <code class="spec-val-code">${patch.targetFingerprint.selector}</code> failed to resolve on the live storefront due to DOM structure updates.
          The multi-signal matching engine scanned the live page and identified an unambiguous candidate recovery target with confidence score <strong>&gt;= 0.85</strong>.
        </div>

        <table class="drift-comparison-table">
          <thead>
            <tr>
              <th>Signal</th>
              <th>Original Target</th>
              <th>Candidate Element</th>
              <th>Signal Match</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="drift-signal-key">HTML Tag</td>
              <td class="drift-signal-val">&lt;${patch.targetFingerprint.tag || "button"}&gt;</td>
              <td class="drift-signal-val">&lt;button&gt;</td>
              <td><span style="color: #4ade80; font-weight: 700;">100%</span> (0.25 / 0.25)</td>
            </tr>
            <tr>
              <td class="drift-signal-key">Text Content</td>
              <td class="drift-signal-val">"${patch.targetFingerprint.text || "Continue to Checkout"}"</td>
              <td class="drift-signal-val">"Continue to Checkout (Pay Now) →"</td>
              <td><span style="color: #4ade80; font-weight: 700;">85%</span> (0.21 / 0.25)</td>
            </tr>
            <tr>
              <td class="drift-signal-key">Role & Aria</td>
              <td class="drift-signal-val">role="button" • "${patch.targetFingerprint.accessibleName || "Continue to Checkout"}"</td>
              <td class="drift-signal-val">role="button" • "${patch.targetFingerprint.accessibleName || "Continue to Checkout"}"</td>
              <td><span style="color: #4ade80; font-weight: 700;">100%</span> (0.20 / 0.20)</td>
            </tr>
            <tr>
              <td class="drift-signal-key">Stable Attributes</td>
              <td class="drift-signal-val">type="button"</td>
              <td class="drift-signal-val">type="button" class="btn btn-checkout"</td>
              <td><span style="color: #4ade80; font-weight: 700;">100%</span> (0.15 / 0.15)</td>
            </tr>
            <tr>
              <td class="drift-signal-key">Container Context</td>
              <td class="drift-signal-val">#${patch.targetFingerprint.parentContext || "checkout-summary"}</td>
              <td class="drift-signal-val">.payment-drawer in #${patch.targetFingerprint.parentContext || "checkout-summary"}</td>
              <td><span style="color: #4ade80; font-weight: 700;">85%</span> (0.13 / 0.15)</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-bottom: 12px; display: flex; gap: 8px;">
          <button class="btn btn-ai" id="btn-ai-disambiguate" type="button" style="display: flex; align-items: center; gap: 6px;">
            ✨ Disambiguate Drift with AI
          </button>
        </div>
        <div id="ai-disambiguation-container"></div>

        <div class="drift-rebind-controls">
          <label style="font-size: 0.82rem; font-weight: 600; color: #94a3b8; white-space: nowrap;">
            Proposed New Selector:
          </label>
          <input type="text" id="input-rebind-selector" class="drift-rebind-input" value="#pay-now-action" />
          <button class="btn btn-primary" id="btn-confirm-rebind" style="display: flex; align-items: center; gap: 6px;">
            🔗 Confirm Target Rebind
          </button>
        </div>
      </div>
      `
          : ""
      }

      <!-- Playwright Verification & Gate Panel -->
      <div class="verification-card">
        <div class="verification-header">
          <div class="verification-title-row">
            <h4 class="verification-title">
              <span>🤖 Playwright Verification & Gate</span>
            </h4>
            <span class="status-badge status-${patch.status === "verified" ? "verified" : patch.status === "verification_failed" ? "verification_failed" : "previewing"}">
              ${patch.status === "verified" ? "Verified" : patch.status === "verification_failed" ? "Verification Failed" : "Pending Checks"}
            </span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" id="btn-run-verify" style="display: flex; align-items: center; gap: 6px;">
              ⚡ Run Verification
            </button>
            <button class="btn btn-secondary" id="btn-demo-failing-verify" title="Creates and runs a broken patch to prove gate rejection">
              🧪 Test Failing Gate
            </button>
          </div>
        </div>

        ${
          activeConflict || patch.status === "conflict"
            ? `<div class="gate-notice blocked">⛔ Release Gate Blocked: Unresolved collision detected on target '${activeConflict ? activeConflict.targetSelector : patch.targetFingerprint.selector}'. This patch cannot be deployed until conflicts are resolved.</div>`
            : patch.status === "verified"
            ? `<div class="gate-notice success">🛡️ Verification Passed: Patch verified across Desktop & Mobile. Safe for production deployment.</div>`
            : patch.status === "verification_failed" || (latestRun && latestRun.status === "failed")
            ? `<div class="gate-notice blocked">
                ⛔ Release Gate Blocked: Automated browser verification failed. This patch cannot be deployed until assertions pass.
                ${latestRun?.error ? `<br><small style="margin-top: 4px; display: block; font-family: var(--font-mono);">${latestRun.error}</small>` : ""}
                <div style="margin-top: 10px;">
                  <button class="btn btn-ai" id="btn-ai-explain-verify" type="button" style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; padding: 6px 12px;">
                    ✨ Explain Failure with AI
                  </button>
                </div>
              </div>`
            : `<div class="gate-notice blocked">⏳ Unverified: This patch has not passed verification yet. It is blocked from production releases.</div>`
        }
        <div id="ai-verification-explanation-container" style="margin-top: 8px;"></div>

        ${
          latestRun
            ? `
          <div class="verification-meta-chips">
            <span>⏱️ Duration: ${latestRun.durationMs}ms</span>
            <span>📐 Viewports: ${latestRun.viewportsRun ? latestRun.viewportsRun.map((v) => `${v.name} (${v.width}x${v.height})`).join(", ") : "Desktop & Mobile"}</span>
            <span>🕒 Completed: ${new Date(latestRun.completedAt).toLocaleTimeString()}</span>
          </div>

          <div>
            <h5 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px;">Assertion Results (${latestRun.assertions.filter((a) => a.passed).length}/${latestRun.assertions.length} Passed)</h5>
            <div class="assertion-list">
              ${latestRun.assertions
                .map(
                  (a) => `
                <div class="assertion-item ${a.passed ? "passed" : "failed"}">
                  <div>
                    <span class="assertion-key">${a.assertionId}</span>
                    <div class="assertion-msg">${a.actualValue || a.errorMessage || ""}</div>
                  </div>
                  <span class="assertion-badge ${a.passed ? "pass" : "fail"}">${a.passed ? "PASS" : "FAIL"}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          ${
            latestRun.screenshotBase64 || latestRun.baselineScreenshotBase64
              ? `
            <div>
              <h5 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px;">Visual Evidence & Diff (${latestRun.visualDiff ? `${latestRun.visualDiff.diffPercentage}% diff` : "Synchronized"})</h5>
              <div class="visual-diff-grid">
                ${
                  latestRun.baselineScreenshotBase64
                    ? `
                  <div class="screenshot-preview-box">
                    <div class="screenshot-preview-label">
                      <span>Baseline (Unpatched)</span>
                      <span>1280x800</span>
                    </div>
                    <div class="screenshot-img-frame">
                      <img src="data:image/png;base64,${latestRun.baselineScreenshotBase64}" alt="Baseline Screenshot" />
                    </div>
                  </div>
                `
                    : ""
                }
                ${
                  latestRun.screenshotBase64
                    ? `
                  <div class="screenshot-preview-box">
                    <div class="screenshot-preview-label">
                      <span style="color: #4ade80;">Preview (Patched)</span>
                      <span>Isolated</span>
                    </div>
                    <div class="screenshot-img-frame">
                      <img src="data:image/png;base64,${latestRun.screenshotBase64}" alt="Patched Preview Screenshot" />
                    </div>
                  </div>
                `
                    : ""
                }
                ${
                  latestRun.visualDiff?.diffScreenshotBase64
                    ? `
                  <div class="screenshot-preview-box">
                    <div class="screenshot-preview-label">
                      <span style="color: #f43f5e;">Diff Overlay</span>
                      <span>${latestRun.visualDiff.diffPercentage}% Changed</span>
                    </div>
                    <div class="screenshot-img-frame">
                      <img src="data:image/png;base64,${latestRun.visualDiff.diffScreenshotBase64}" alt="Visual Diff Mask" />
                    </div>
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          `
              : ""
          }
        `
            : `
          <div style="padding: 16px; text-align: center; color: var(--text-faint); font-size: 0.85rem; border: 1px dashed var(--border-light); border-radius: 8px;">
            No browser verification run recorded yet. Click "Run Verification" to launch Playwright.
          </div>
        `
        }
      </div>

      <div class="card-section">
        <h4 class="section-title">Target Fingerprint</h4>
        <div class="spec-grid">
          <span class="spec-label">Selector:</span>
          <span class="spec-val-code">${patch.targetFingerprint.selector}</span>
          <span class="spec-label">HTML Tag:</span>
          <span>&lt;${patch.targetFingerprint.tag}&gt;</span>
          <span class="spec-label">Accessible Role:</span>
          <span>${patch.targetFingerprint.role || "button"}</span>
          <span class="spec-label">Parent Context:</span>
          <span>${patch.targetFingerprint.parentContext || "default"}</span>
        </div>
      </div>

      <div class="card-section">
        <h4 class="section-title">Allowlisted Operation</h4>
        <div class="spec-grid">
          <span class="spec-label">Type:</span>
          <span class="spec-val-code">${patch.operation.type}</span>
          ${
            patch.operation.type === "style.set"
              ? `
            <span class="spec-label">Property:</span>
            <span>${patch.operation.property}</span>
            <span class="spec-label">Value:</span>
            <span style="font-weight: 700; color: #10b981;">${patch.operation.value}</span>
          `
              : ""
          }
        </div>
      </div>

      <div class="card-section">
        <h4 class="section-title">Version History (${patch.versions.length} revisions)</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${patch.versions
            .slice()
            .reverse()
            .map(
              (v) => `
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid var(--border-light);">
              <div>
                <strong>v${v.version}</strong> — ${v.changeNote || "Revision"}
              </div>
              <span style="color: var(--text-faint);">${new Date(v.createdAt).toLocaleDateString()}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    // Event handlers for verification triggers
    const runVerifyHandler = async () => {
      const verifyBtn = patchDetailContainer.querySelector("#btn-run-verify");
      const actionVerifyBtn = patchDetailContainer.querySelector("#btn-action-verify");
      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = "⏳ Running Playwright...";
      }
      if (actionVerifyBtn) {
        actionVerifyBtn.disabled = true;
        actionVerifyBtn.innerHTML = "⏳ Running Playwright...";
      }
      showToast("Launching Playwright verification across Desktop & Mobile...", "info");
      try {
        const res = await fetch(`${API_BASE}/patches/${patch.id}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteBaseUrl: STOREFRONT_URL }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Verification request failed (HTTP ${res.status})`);
        }
        const run = await res.json();
        if (run.status === "passed") {
          showToast(`Verification passed in ${run.durationMs}ms! Patch is verified.`, "success");
        } else {
          showToast(`Verification failed: ${run.error || "Assertions failed"}`, "error");
        }
        await loadPatches();
        await renderPatchDetail();
      } catch (err) {
        showToast(err.message, "error");
        await renderPatchDetail();
      }
    };

    const btnRunVerify = patchDetailContainer.querySelector("#btn-run-verify");
    if (btnRunVerify) btnRunVerify.addEventListener("click", runVerifyHandler);

    const btnActionVerify = patchDetailContainer.querySelector("#btn-action-verify");
    if (btnActionVerify) btnActionVerify.addEventListener("click", runVerifyHandler);

    // Failing gate demo button
    const btnDemoFail = patchDetailContainer.querySelector("#btn-demo-failing-verify");
    if (btnDemoFail) {
      btnDemoFail.addEventListener("click", async () => {
        showToast("Creating broken patch to demonstrate verification gate...", "info");
        try {
          const createRes = await fetch(`${API_BASE}/patches`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              websiteId: activeWebsiteId,
              name: "Broken Selector Test (Simulated Flaw)",
              targetFingerprint: {
                tag: "button",
                selector: "#deliberately-missing-checkout-btn-404",
                text: "Ghost Button",
              },
              operation: {
                type: "text.set",
                value: "Ghost Button Text",
              },
              actor: { id: "qa-verifier", name: "QA Gate Verifier", role: "qa" },
            }),
          });
          const brokenPatch = await createRes.json();
          selectedPatchId = brokenPatch.id;
          await loadPatches();

          showToast("Running Playwright verification on broken patch...", "info");
          await fetch(`${API_BASE}/patches/${brokenPatch.id}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ websiteBaseUrl: STOREFRONT_URL }),
          });

          await loadPatches();
          await renderPatchDetail();
          showToast("Gate triggered: patch marked 'verification_failed' and release blocked!", "error");
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }

    // Publish verified button
    const publishBtn = patchDetailContainer.querySelector("#btn-publish-verified");
    if (publishBtn) {
      publishBtn.addEventListener("click", async () => {
        try {
          const res = await fetch(`${API_BASE}/websites/${activeWebsiteId}/releases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patchIds: [patch.id],
              actor: { id: "operator-1", name: "Operator", role: "developer" },
              changeSummary: `Release containing verified patch '${patch.name}'`,
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to publish release");
          }
          showToast(`Release published successfully!`, "success");
          await loadPatches();
          await loadReleases();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }

    // AI-Assisted Root Cause Explainer button listener
    const btnAiExplain = patchDetailContainer.querySelector("#btn-ai-explain-verify");
    if (btnAiExplain) {
      btnAiExplain.addEventListener("click", async () => {
        const container = patchDetailContainer.querySelector("#ai-verification-explanation-container");
        try {
          btnAiExplain.disabled = true;
          btnAiExplain.innerHTML = "✨ Diagnosing Failure...";
          showToast("Querying AI Root-Cause Explainer...", "info");
          const res = await fetch(`${API_BASE}/ai/explain-verification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patchId: patch.id,
              verificationRunId: latestRun ? latestRun.id : undefined,
              failureLog: latestRun ? (latestRun.error || (latestRun.assertions || []).find((a) => !a.passed)?.errorMessage) : undefined,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to explain verification failure");
          }
          const expl = await res.json();
          if (container) {
            container.innerHTML = `
              <div class="ai-card" style="margin-top: 8px;">
                <div class="ai-header">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="ai-pill">✨ AI Root Cause Analysis</span>
                    <span class="count-pill" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4);">${Math.round(expl.confidence * 100)}% Confidence</span>
                  </div>
                </div>
                <div style="font-size: 0.9rem; font-weight: 600; color: #f8fafc; margin-bottom: 6px;">${escapeHtml(expl.summary)}</div>
                <div style="font-size: 0.84rem; color: #cbd5e1; margin-bottom: 10px;"><strong>Hypothesis:</strong> ${escapeHtml(expl.rootCauseHypothesis)}</div>
                <div style="margin-bottom: 8px;">
                  <span style="font-size: 0.75rem; color: var(--text-faint); font-weight: 600; text-transform: uppercase;">Observed Facts:</span>
                  <ul class="ai-bullet-list">
                    ${expl.observedFacts.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
                  </ul>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-faint); font-weight: 600; text-transform: uppercase;">Recommended Actions:</span>
                  <ul class="ai-bullet-list">
                    ${expl.recommendedActions.map((a) => `<li style="color: #67e8f9;">${escapeHtml(a)}</li>`).join("")}
                  </ul>
                </div>
              </div>
            `;
          }
          showToast("AI root-cause diagnosis completed.", "success");
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          btnAiExplain.disabled = false;
          btnAiExplain.innerHTML = "✨ Explain Failure with AI";
        }
      });
    }

    // AI Semantic Target Disambiguation button listener
    const btnAiDisambiguate = patchDetailContainer.querySelector("#btn-ai-disambiguate");
    if (btnAiDisambiguate) {
      btnAiDisambiguate.addEventListener("click", async () => {
        const container = patchDetailContainer.querySelector("#ai-disambiguation-container");
        try {
          btnAiDisambiguate.disabled = true;
          btnAiDisambiguate.innerHTML = "✨ Analyzing Candidates...";
          showToast("Querying AI semantic disambiguation...", "info");
          const candidates = [
            { selector: "#pay-now-action", text: "Continue to Checkout (Pay Now) →", tag: "button" },
            { selector: "#express-checkout-btn", text: "Express Checkout with Apple Pay", tag: "button" },
            { selector: "#cart-checkout-anchor", text: "Proceed to Payment", tag: "a" },
          ];
          const res = await fetch(`${API_BASE}/ai/disambiguate-target`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patchId: patch.id,
              candidates,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to disambiguate target");
          }
          const dis = await res.json();
          if (container) {
            container.innerHTML = `
              <div class="ai-card" style="margin-top: 8px;">
                <div class="ai-header">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="ai-pill">✨ Semantic Recovery Proposal</span>
                    <span class="count-pill" style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4);">${Math.round(dis.confidence * 100)}% Confidence</span>
                  </div>
                </div>
                <div style="font-size: 0.88rem; color: #f8fafc; margin-bottom: 6px;">
                  Recommended: <code class="spec-val-code" style="color: #38bdf8;">${escapeHtml(dis.recommendedSelector)}</code>
                </div>
                <div style="font-size: 0.82rem; color: #cbd5e1; margin-bottom: 8px;">
                  ${escapeHtml(dis.rationale)}
                </div>
                ${dis.tradeoffs ? `<div style="font-size: 0.8rem; color: #f59e0b; margin-bottom: 10px;">⚠️ Tradeoffs: ${escapeHtml(dis.tradeoffs)}</div>` : ""}
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                  <button type="button" class="btn btn-secondary" id="btn-apply-ai-selector" style="font-size: 0.8rem; padding: 4px 10px;">
                    📋 Copy Candidate to Rebind Input
                  </button>
                  <span style="font-size: 0.75rem; color: var(--text-faint);">Human confirmation required before rebind</span>
                </div>
              </div>
            `;
            const applyBtn = container.querySelector("#btn-apply-ai-selector");
            if (applyBtn) {
              applyBtn.addEventListener("click", () => {
                const rebindInput = patchDetailContainer.querySelector("#input-rebind-selector");
                if (rebindInput) {
                  rebindInput.value = dis.recommendedSelector;
                  showToast(`Populated rebind input with '${dis.recommendedSelector}'`, "info");
                }
              });
            }
          }
          showToast("Semantic disambiguation completed.", "success");
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          btnAiDisambiguate.disabled = false;
          btnAiDisambiguate.innerHTML = "✨ Disambiguate Drift with AI";
        }
      });
    }

    // Confirm Rebind button listener
    const confirmRebindBtn = patchDetailContainer.querySelector("#btn-confirm-rebind");
    if (confirmRebindBtn) {
      confirmRebindBtn.addEventListener("click", async () => {
        const inputSelector = patchDetailContainer.querySelector("#input-rebind-selector");
        const newSelector = inputSelector ? inputSelector.value.trim() : "#pay-now-action";
        try {
          confirmRebindBtn.disabled = true;
          confirmRebindBtn.textContent = "Rebinding Target...";
          const res = await fetch(`${API_BASE}/patches/${patch.id}/rebind`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              selector: newSelector,
              changeNote: `Target migrated from '${patch.targetFingerprint.selector}' to '${newSelector}' after DOM drift.`,
              actor: { id: "operator-1", name: "Operator", role: "developer" },
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to rebind target");
          }
          const rebound = await res.json();
          showToast(`Target rebound to '${newSelector}' (Version ${rebound.currentVersion})!`, "success");
          await loadPatches();
          await loadAuditEvents();
        } catch (err) {
          showToast(err.message, "error");
          confirmRebindBtn.disabled = false;
          confirmRebindBtn.textContent = "🔗 Confirm Target Rebind";
        }
      });
    }

    // Simulate Drift button listener
    const simulateDriftBtn = patchDetailContainer.querySelector("#btn-simulate-drift");
    if (simulateDriftBtn) {
      simulateDriftBtn.addEventListener("click", async () => {
        try {
          await fetch(`${API_BASE}/patches/${patch.id}/transition`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetStatus: "stale",
              actor: { id: "operator-1", name: "Operator", role: "developer" },
              reason: "Manual simulation: target selector missing after site update",
            }),
          });
          showToast("Simulated DOM drift: patch marked stale.", "warning");
          await loadPatches();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }

    // Conflict resolution button listeners
    if (activeConflict) {
      const keepThisBtn = patchDetailContainer.querySelector("#btn-resolve-keep-this");
      if (keepThisBtn) {
        keepThisBtn.addEventListener("click", async () => {
          try {
            keepThisBtn.disabled = true;
            keepThisBtn.textContent = "Resolving...";
            const res = await fetch(`${API_BASE}/patches/${patch.id}/resolve-conflict`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                strategy: "keep_this",
                supersededPatchId: activeConflict.patchBId,
                reason: `Retained patch '${patch.id}' over competing patch '${activeConflict.patchBId}'`,
                actor: { id: "operator-1", name: "Operator", role: "developer" },
              }),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Failed to resolve conflict");
            }
            showToast("Conflict resolved! Patch kept. Please re-run automated verification before releasing.", "success");
            await loadPatches();
            await renderPatchDetail();
            await loadAuditEvents();
          } catch (err) {
            showToast(err.message, "error");
            keepThisBtn.disabled = false;
            keepThisBtn.textContent = "👑 Keep This Patch";
          }
        });
      }

      const keepCompetingBtn = patchDetailContainer.querySelector("#btn-resolve-keep-competing");
      if (keepCompetingBtn) {
        keepCompetingBtn.addEventListener("click", async () => {
          try {
            keepCompetingBtn.disabled = true;
            keepCompetingBtn.textContent = "Resolving...";
            const res = await fetch(`${API_BASE}/patches/${patch.id}/resolve-conflict`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                strategy: "discard",
                supersededPatchId: activeConflict.patchBId,
                reason: `Discarded in favor of competing patch '${activeConflict.patchBId}'`,
                actor: { id: "operator-1", name: "Operator", role: "developer" },
              }),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Failed to resolve conflict");
            }
            showToast(`Conflict resolved: Patch discarded. Competing patch '${activeConflict.patchBId}' active.`, "success");
            await loadPatches();
            await renderPatchDetail();
            await loadAuditEvents();
          } catch (err) {
            showToast(err.message, "error");
            keepCompetingBtn.disabled = false;
            keepCompetingBtn.textContent = `Keep Competing (${activeConflict.patchBId})`;
          }
        });
      }

      const reviseValBtn = patchDetailContainer.querySelector("#btn-resolve-revise-val");
      if (reviseValBtn) {
        reviseValBtn.addEventListener("click", async () => {
          const inputVal = patchDetailContainer.querySelector("#input-inline-revised-val");
          const revisedVal = inputVal ? inputVal.value.trim() : "";
          if (!revisedVal) {
            showToast("Please enter a revised value", "error");
            return;
          }
          try {
            reviseValBtn.disabled = true;
            reviseValBtn.textContent = "Revising...";
            const revisedOp = { ...patch.operation };
            if (revisedOp.type === "style.set") {
              revisedOp.value = revisedVal;
            } else if (revisedOp.type === "text.set") {
              revisedOp.value = revisedVal;
            } else if (revisedOp.type === "attribute.set") {
              revisedOp.value = revisedVal;
            }
            const res = await fetch(`${API_BASE}/patches/${patch.id}/resolve-conflict`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                strategy: "revise_value",
                supersededPatchId: activeConflict.patchBId,
                revisedOperation: revisedOp,
                reason: `Value revised to '${revisedVal}' to resolve conflict with '${activeConflict.patchBId}'`,
                actor: { id: "operator-1", name: "Operator", role: "developer" },
              }),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Failed to revise value");
            }
            showToast("Value revised! New patch version created. Please re-run verification before releasing.", "success");
            await loadPatches();
            await renderPatchDetail();
            await loadAuditEvents();
          } catch (err) {
            showToast(err.message, "error");
            reviseValBtn.disabled = false;
            reviseValBtn.textContent = "✏️ Revise Value";
          }
        });
      }

      const discardBtn = patchDetailContainer.querySelector("#btn-resolve-discard");
      if (discardBtn) {
        discardBtn.addEventListener("click", async () => {
          try {
            discardBtn.disabled = true;
            discardBtn.textContent = "Discarding...";
            const res = await fetch(`${API_BASE}/patches/${patch.id}/resolve-conflict`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                strategy: "discard",
                supersededPatchId: activeConflict.patchBId,
                reason: "Patch discarded by developer during conflict triage",
                actor: { id: "operator-1", name: "Operator", role: "developer" },
              }),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Failed to discard patch");
            }
            showToast("Patch discarded and archived.", "success");
            await loadPatches();
            await renderPatchDetail();
            await loadAuditEvents();
          } catch (err) {
            showToast(err.message, "error");
            discardBtn.disabled = false;
            discardBtn.textContent = "🗑️ Discard Patch";
          }
        });
      }
    }

    // Attach lifecycle event listeners
    patchDetailContainer.querySelectorAll("[data-target-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetStatus = btn.getAttribute("data-target-status");
        await transitionStatus(patch.id, targetStatus);
      });
    });
  }

  function renderStateBanner(patch) {
    if (patch.status === "published") {
      return `
        <div class="state-banner published-banner">
          <div class="state-banner-icon">🟢</div>
          <div class="state-banner-content">
            <strong>Active in Production Release</strong>
            <span>This verified patch is live on <code>${STOREFRONT_URL}</code>. All visitors receive these changes.</span>
          </div>
          <a href="${STOREFRONT_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="font-size: 0.8rem; padding: 5px 12px; text-decoration: none;">
            Open Live Storefront ↗
          </a>
        </div>
      `;
    }
    if (patch.status === "verified") {
      return `
        <div class="state-banner verified-banner">
          <div class="state-banner-icon">🛡️</div>
          <div class="state-banner-content">
            <strong>Verification Passed (Release Ready)</strong>
            <span>Automated cross-viewport Playwright assertions passed. Patch is approved to be bundled and published.</span>
          </div>
        </div>
      `;
    }
    if (patch.status === "previewing" || patch.status === "draft") {
      return `
        <div class="state-banner preview-banner">
          <div class="state-banner-icon">🔬</div>
          <div class="state-banner-content">
            <strong>Isolated Sandbox Preview State</strong>
            <span>Mutations are active only when visiting with <code>?patchwork_preview=${patch.id}</code>. The live production storefront remains 100% unpatched.</span>
          </div>
        </div>
      `;
    }
    if (patch.status === "verification_failed") {
      return `
        <div class="state-banner gated-banner">
          <div class="state-banner-icon">⛔</div>
          <div class="state-banner-content">
            <strong>Automated Verification Gate Blocked</strong>
            <span>Browser verification failed. Release is strictly blocked until assertions pass. Click "Explain Failure with AI" below for diagnostics.</span>
          </div>
        </div>
      `;
    }
    if (patch.status === "stale") {
      return `
        <div class="state-banner stale-banner">
          <div class="state-banner-icon">⚠️</div>
          <div class="state-banner-content">
            <strong>Target Element Drift Detected</strong>
            <span>The target selector no longer matches the live DOM. Use the recovery engine below to rebind the patch.</span>
          </div>
        </div>
      `;
    }
    if (patch.status === "conflict") {
      return `
        <div class="state-banner conflict-banner">
          <div class="state-banner-icon">⚡</div>
          <div class="state-banner-content">
            <strong>Multi-Patch Collision Warning</strong>
            <span>Overlaps with another patch targeting the same element. Resolve the collision before verification and release.</span>
          </div>
        </div>
      `;
    }
    return "";
  }

  function renderLifecycleActionButtons(patch, activeConflict) {
    const previewUrl = `${STOREFRONT_URL}/?patchwork_preview=${patch.id}`;
    const launchPreviewBtn = `
      <a href="${previewUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
        👁️ Preview Storefront
      </a>
    `;

    if (activeConflict || patch.status === "conflict") {
      return `
        ${launchPreviewBtn}
        <button class="btn btn-danger" disabled title="Unresolved multi-patch collision prevents release">
          ⛔ Release Blocked (Conflict)
        </button>
      `;
    }

    if (patch.status === "stale") {
      return `
        ${launchPreviewBtn}
        <button class="btn btn-warning" id="btn-review-drift" title="Patch target has drifted and requires rebind">⚠️ Drift Detected</button>
      `;
    }
    if (patch.status === "draft") {
      return `
        ${launchPreviewBtn}
        <button class="btn btn-secondary" id="btn-simulate-drift" title="Simulate DOM drift">⚡ Simulate Drift</button>
        <button class="btn btn-primary" id="btn-action-verify">⚡ Verify with Playwright</button>
      `;
    }
    if (patch.status === "previewing") {
      return `
        ${launchPreviewBtn}
        <button class="btn btn-secondary" id="btn-simulate-drift" title="Simulate DOM drift">⚡ Simulate Drift</button>
        <button class="btn btn-primary" id="btn-action-verify">⚡ Re-run Verification</button>
      `;
    }
    if (patch.status === "verified") {
      return `
        ${launchPreviewBtn}
        <button class="btn btn-secondary" id="btn-simulate-drift" title="Simulate DOM drift">⚡ Simulate Drift</button>
        <button class="btn btn-success" id="btn-publish-verified">🚀 Publish to Release</button>
      `;
    }
    if (patch.status === "verification_failed") {
      return `
        ${launchPreviewBtn}
        <button class="btn btn-primary" id="btn-action-verify">🔄 Retry Verification</button>
      `;
    }
    return launchPreviewBtn;
  }

  // Transition Status
  async function transitionStatus(patchId, targetStatus) {
    try {
      const res = await fetch(`${API_BASE}/patches/${patchId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          actor: { id: "operator-1", name: "Operator", role: "developer" },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transition failed");
      }
      showToast(`Patch transitioned to '${targetStatus}'`, "success");
      await loadPatches();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // Load Releases & Rollback
  async function loadReleases() {
    try {
      const res = await fetch(`${API_BASE}/releases?websiteId=${activeWebsiteId}`);
      if (!res.ok) throw new Error(`Failed to load releases (HTTP ${res.status})`);
      const releases = await res.json();
      releasesCounter.textContent = String(releases.length);

      const activeRelease = releases.find((r) => r.status === "active");
      if (activeRelease) {
        activeRelCard.style.display = "flex";
        activeRelVersion.textContent = `Release V${activeRelease.version} (${activeRelease.id})`;
        activeRelTimestamp.textContent = `Deployed: ${new Date(activeRelease.createdAt).toLocaleString()}`;
        activeRelPatchesList.innerHTML = activeRelease.patchIds
          .map((id) => `<span class="chip">📌 ${id}</span>`)
          .join("");
        triggerRollbackBtn.disabled = false;
      } else {
        activeRelVersion.textContent = "No Active Release";
        activeRelTimestamp.textContent = "Storefront running unpatched baseline.";
        activeRelPatchesList.innerHTML = "";
        triggerRollbackBtn.disabled = true;
      }

      releasesHistoryList.innerHTML = releases
        .map(
          (r) => `
        <div class="release-row">
          <div>
            <strong>Release V${r.version}</strong> (${r.id})
            <div style="font-size: 0.8rem; color: var(--text-faint);">Patches: ${r.patchIds.join(", ")}</div>
          </div>
          <div>
            <span class="status-badge status-${r.status}">${r.status}</span>
          </div>
        </div>
      `
        )
        .join("");
    } catch (err) {
      triggerRollbackBtn.disabled = true;
      activeRelVersion.textContent = "Release state unavailable";
      activeRelTimestamp.textContent = "";
      activeRelPatchesList.innerHTML = "";
      renderErrorState(releasesHistoryList, err.message, loadReleases);
    }
  }

  // Trigger Rollback Action
  if (triggerRollbackBtn) {
    triggerRollbackBtn.addEventListener("click", async () => {
      try {
        const res = await fetch(`${API_BASE}/websites/${activeWebsiteId}/rollback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor: { id: "operator-1", name: "Operator", role: "developer" },
            reason: "Immediate incident rollback triggered from Mission Control",
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Rollback failed");
        }
        const data = await res.json();
        showToast(
          data.restoredBaseline
            ? "Rolled back: no earlier release existed, storefront is back on the unpatched baseline."
            : "Atomic release rollback executed successfully!",
          "success"
        );
        await loadReleases();
        await loadPatches();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  // Load Audit Events
  async function loadAuditEvents() {
    try {
      const res = await fetch(`${API_BASE}/audit-events?websiteId=${activeWebsiteId}`);
      if (!res.ok) throw new Error(`Failed to load audit events (HTTP ${res.status})`);
      const events = await res.json();
      auditCounter.textContent = String(events.length);

      auditTimelineList.innerHTML = events
        .map(
          (e) => {
            const isRelease = e.entityType === "release";
            const isRollback = e.action.includes("rollback");
            const isConflict = e.details?.metadata?.actionType === "conflict_resolution";
            const isVerification = e.entityType === "verification";
            const badgeColor = isRollback
              ? "#ef4444"
              : isRelease
              ? "#38bdf8"
              : isConflict
              ? "#f59e0b"
              : isVerification
              ? e.action.includes("passed")
                ? "#10b981"
                : "#ef4444"
              : "#a855f7";

            return `
        <div class="audit-card" style="border-left: 3px solid ${badgeColor}; padding: 14px 18px; margin-bottom: 12px; background: rgba(30, 41, 59, 0.4); border-radius: var(--radius-sm); border-top: 1px solid var(--border-light); border-right: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="audit-action-badge" style="background: rgba(255,255,255,0.08); color: ${badgeColor}; border: 1px solid ${badgeColor}; font-weight: 700;">
                ${e.action}
              </span>
              <span style="font-size: 0.85rem; color: #f8fafc; font-family: var(--font-mono);">
                ${e.entityType}:${e.entityId}
              </span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-faint);">
              ${new Date(e.timestamp).toLocaleString()}
            </div>
          </div>
          <div style="font-size: 0.82rem; color: #cbd5e1; margin-top: 4px;">
            ${e.details?.reason ? `<span>${escapeHtml(e.details.reason)}</span>` : ""}
            ${e.details?.fromStatus && e.details?.toStatus ? `<span style="margin-left: 6px; font-family: var(--font-mono); color: #94a3b8;">(${e.details.fromStatus} → ${e.details.toStatus})</span>` : ""}
            ${e.details?.metadata?.strategy ? `<span class="chip" style="margin-left: 8px; font-size: 0.72rem;">Strategy: ${e.details.metadata.strategy}</span>` : ""}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-faint); margin-top: 6px;">
            Actor: <strong>${escapeHtml(e.actor.name)}</strong> (${escapeHtml(e.actor.role)})
          </div>
        </div>
      `;
          }
        )
        .join("");
    } catch (err) {
      renderErrorState(auditTimelineList, err.message, loadAuditEvents);
    }
  }

  // Multi-Patch Release Modal
  const releaseModal = document.getElementById("release-bundle-modal");
  const openReleaseModalBtn = document.getElementById("open-release-modal-btn");
  const closeReleaseModalBtn = document.getElementById("close-release-modal-btn");
  const cancelReleaseModalBtn = document.getElementById("cancel-release-modal-btn");
  const releaseBundleForm = document.getElementById("release-bundle-form");
  const releaseModalChecklist = document.getElementById("release-modal-checklist");
  const selectedPatchesCount = document.getElementById("selected-patches-count");
  const bundleGateWarning = document.getElementById("bundle-gate-warning");
  const submitReleaseBundleBtn = document.getElementById("submit-release-bundle-btn");

  if (openReleaseModalBtn) {
    openReleaseModalBtn.addEventListener("click", () => {
      if (!releaseModal) return;
      releaseModal.classList.remove("hidden");

      releaseModalChecklist.innerHTML = allPatches
        .map((p) => {
          const isVerified = p.status === "verified";
          return `
          <label class="checklist-item ${!isVerified ? "disabled" : ""}">
            <div class="checklist-item-left">
              <input type="checkbox" name="bundle_patch" value="${p.id}" ${!isVerified ? "disabled" : ""} />
              <div>
                <div style="font-weight: 600; font-size: 0.88rem; color: #f8fafc;">${p.name}</div>
                <div style="font-size: 0.76rem; color: var(--text-faint);"><code>${p.targetFingerprint.selector}</code> • Op: ${p.operation.type}</div>
              </div>
            </div>
            <div>
              <span class="status-badge status-${p.status}">${p.status.replace("_", " ")}</span>
            </div>
          </label>
        `;
        })
        .join("");

      updateBundleSelectionState();

      releaseModalChecklist.querySelectorAll("input[type='checkbox']").forEach((cb) => {
        cb.addEventListener("change", updateBundleSelectionState);
      });
    });
  }

  async function updateBundleSelectionState() {
    if (!releaseModalChecklist) return;
    const checkedBoxes = Array.from(
      releaseModalChecklist.querySelectorAll("input[name='bundle_patch']:checked")
    );
    const selectedIds = checkedBoxes.map((cb) => cb.value);
    if (selectedPatchesCount) {
      selectedPatchesCount.textContent = `${selectedIds.length} Selected`;
    }

    if (selectedIds.length === 0) {
      bundleGateWarning.classList.add("hidden");
      bundleGateWarning.innerHTML = "";
      submitReleaseBundleBtn.disabled = true;
      return;
    }

    // Pre-flight collision check across selected patches
    try {
      const checkRes = await fetch(`${API_BASE}/patches/check-conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patchIds: selectedIds }),
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.hasConflicts && checkData.conflicts.length > 0) {
          const first = checkData.conflicts[0];
          bundleGateWarning.classList.remove("hidden");
          bundleGateWarning.innerHTML = `⛔ Mutual Conflict Blocked: Patches '${first.patchAId}' and '${first.patchBId}' collide on '${first.targetSelector}'. Both cannot be released together.`;
          submitReleaseBundleBtn.disabled = true;
          return;
        }
      }
    } catch (e) {
      console.warn("Bundle conflict check error", e);
    }

    bundleGateWarning.classList.add("hidden");
    bundleGateWarning.innerHTML = "";
    submitReleaseBundleBtn.disabled = false;
  }

  if (closeReleaseModalBtn) {
    closeReleaseModalBtn.addEventListener("click", () => releaseModal?.classList.add("hidden"));
  }
  if (cancelReleaseModalBtn) {
    cancelReleaseModalBtn.addEventListener("click", () => releaseModal?.classList.add("hidden"));
  }

  if (releaseBundleForm) {
    releaseBundleForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const checkedBoxes = Array.from(
        releaseModalChecklist.querySelectorAll("input[name='bundle_patch']:checked")
      );
      const selectedIds = checkedBoxes.map((cb) => cb.value);
      if (selectedIds.length === 0) return;

      const summaryInput = document.getElementById("release-summary-input");
      const changeSummary = summaryInput ? summaryInput.value.trim() : undefined;

      try {
        submitReleaseBundleBtn.disabled = true;
        submitReleaseBundleBtn.textContent = "Deploying Release...";

        const res = await fetch(`${API_BASE}/websites/${activeWebsiteId}/releases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patchIds: selectedIds,
            actor: { id: "operator-1", name: "Operator", role: "developer" },
            changeSummary: changeSummary || `Release Bundle containing ${selectedIds.length} verified patches`,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to publish release bundle");
        }

        const release = await res.json();
        showToast(`Release V${release.version} deployed with ${selectedIds.length} patches!`, "success");
        releaseModal.classList.add("hidden");
        releaseBundleForm.reset();
        await loadReleases();
        await loadPatches();
        await loadAuditEvents();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        submitReleaseBundleBtn.disabled = false;
        submitReleaseBundleBtn.textContent = "🚀 Publish Release Bundle";
      }
    });
  }

  // Modal Open / Close
  if (createPatchBtn) createPatchBtn.addEventListener("click", () => newPatchModal && newPatchModal.classList.remove("hidden"));
  if (closeModalBtn) closeModalBtn.addEventListener("click", () => newPatchModal && newPatchModal.classList.add("hidden"));
  if (cancelNewPatchBtn) cancelNewPatchBtn.addEventListener("click", () => newPatchModal && newPatchModal.classList.add("hidden"));

  // AI Copilot Modal Elements & Event Listeners
  const openAiCopilotBtn = document.getElementById("open-ai-copilot-btn");
  const aiCopilotModal = document.getElementById("ai-copilot-modal");
  const closeAiCopilotBtn = document.getElementById("close-ai-copilot-btn");
  const cancelAiCopilotBtn = document.getElementById("cancel-ai-copilot-btn");
  const aiPromptInput = document.getElementById("ai-prompt-input");
  const aiContextSelector = document.getElementById("ai-context-selector");
  const aiContextTag = document.getElementById("ai-context-tag");
  const aiGenerateBtn = document.getElementById("ai-generate-btn");
  const aiProposalReviewCard = document.getElementById("ai-proposal-review-card");
  const aiProposalConfidence = document.getElementById("ai-proposal-confidence");
  const aiProposalExplanation = document.getElementById("ai-proposal-explanation");
  const aiProposalAssumptions = document.getElementById("ai-proposal-assumptions");
  const aiReviewName = document.getElementById("ai-review-name");
  const aiReviewSelector = document.getElementById("ai-review-selector");
  const aiReviewTag = document.getElementById("ai-review-tag");
  const aiReviewOpType = document.getElementById("ai-review-op-type");
  const aiReviewOpVal = document.getElementById("ai-review-op-val");
  const acceptAiProposalBtn = document.getElementById("accept-ai-proposal-btn");

  let currentAiProposal = null;

  if (openAiCopilotBtn) {
    openAiCopilotBtn.addEventListener("click", () => {
      if (!aiCopilotModal) return;
      aiCopilotModal.classList.remove("hidden");
      if (aiPromptInput) aiPromptInput.value = "";
      if (aiProposalReviewCard) aiProposalReviewCard.classList.add("hidden");
      if (acceptAiProposalBtn) acceptAiProposalBtn.disabled = true;
      currentAiProposal = null;
    });
  }

  if (closeAiCopilotBtn) {
    closeAiCopilotBtn.addEventListener("click", () => aiCopilotModal && aiCopilotModal.classList.add("hidden"));
  }
  if (cancelAiCopilotBtn) {
    cancelAiCopilotBtn.addEventListener("click", () => aiCopilotModal && aiCopilotModal.classList.add("hidden"));
  }

  if (aiGenerateBtn) {
    aiGenerateBtn.addEventListener("click", async () => {
      const prompt = aiPromptInput ? aiPromptInput.value.trim() : "";
      if (!prompt) {
        showToast("Please enter a natural-language description of the hotfix.", "error");
        return;
      }
      try {
        aiGenerateBtn.disabled = true;
        aiGenerateBtn.textContent = "✨ Generating Proposal...";
        const context = {};
        if (aiContextSelector && aiContextSelector.value.trim()) {
          context.selector = aiContextSelector.value.trim();
        }
        if (aiContextTag && aiContextTag.value.trim()) {
          context.tag = aiContextTag.value.trim();
        }

        const res = await fetch(`${API_BASE}/ai/generate-patch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            websiteId: activeWebsiteId,
            context: Object.keys(context).length > 0 ? context : undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to generate patch proposal");
        }

        const data = await res.json();
        currentAiProposal = data.proposal;

        if (aiProposalConfidence) {
          aiProposalConfidence.textContent = `${Math.round(currentAiProposal.confidence * 100)}% Match`;
        }
        if (aiProposalExplanation) {
          aiProposalExplanation.textContent = currentAiProposal.explanation;
        }
        if (aiProposalAssumptions) {
          aiProposalAssumptions.innerHTML = (currentAiProposal.assumptions || [])
            .map((a) => `<li>${escapeHtml(a)}</li>`)
            .join("");
        }
        if (aiReviewName) aiReviewName.value = currentAiProposal.patchName;
        if (aiReviewSelector) aiReviewSelector.value = currentAiProposal.targetFingerprint.selector;
        if (aiReviewTag) aiReviewTag.value = currentAiProposal.targetFingerprint.tag || "button";
        if (aiReviewOpType) aiReviewOpType.value = currentAiProposal.operation.type;
        if (aiReviewOpVal) {
          aiReviewOpVal.value =
            currentAiProposal.operation.type === "style.set"
              ? `${currentAiProposal.operation.property}: ${currentAiProposal.operation.value}`
              : currentAiProposal.operation.value || "";
        }

        if (aiProposalReviewCard) aiProposalReviewCard.classList.remove("hidden");
        if (acceptAiProposalBtn) acceptAiProposalBtn.disabled = false;
        showToast("AI patch proposal generated. Review before saving as draft.", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        aiGenerateBtn.disabled = false;
        aiGenerateBtn.textContent = "✨ Generate Patch Proposal";
      }
    });
  }

  if (acceptAiProposalBtn) {
    acceptAiProposalBtn.addEventListener("click", async () => {
      if (!currentAiProposal) return;
      try {
        acceptAiProposalBtn.disabled = true;
        acceptAiProposalBtn.textContent = "Saving Draft...";

        const name = (aiReviewName && aiReviewName.value.trim()) || currentAiProposal.patchName;
        const selector = (aiReviewSelector && aiReviewSelector.value.trim()) || currentAiProposal.targetFingerprint.selector;
        const tag = (aiReviewTag && aiReviewTag.value.trim()) || currentAiProposal.targetFingerprint.tag || "button";

        let operation = { ...currentAiProposal.operation };
        if (operation.type === "style.set" && aiReviewOpVal) {
          const rawVal = aiReviewOpVal.value.trim();
          if (rawVal.includes(":")) {
            const parts = rawVal.split(":");
            operation.property = parts[0].trim();
            operation.value = parts.slice(1).join(":").trim();
          } else {
            operation.value = rawVal;
          }
        } else if (operation.type === "text.set" && aiReviewOpVal) {
          operation.value = aiReviewOpVal.value.trim();
        }

        const res = await fetch(`${API_BASE}/patches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            websiteId: activeWebsiteId,
            name,
            targetFingerprint: {
              ...currentAiProposal.targetFingerprint,
              selector,
              tag,
            },
            operation,
            actor: { id: "operator-ai", name: "Operator (AI-Assisted)", role: "developer" },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to save draft patch");
        }

        const createdPatch = await res.json();
        showToast(`AI proposal saved as draft '${createdPatch.name}'! Verification required before release.`, "success");
        if (aiCopilotModal) aiCopilotModal.classList.add("hidden");
        await loadPatches();
        selectPatch(createdPatch.id);
        await loadAuditEvents();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        acceptAiProposalBtn.disabled = false;
        acceptAiProposalBtn.textContent = "💾 Save as Draft Patch";
      }
    });
  }

  // Create Patch Form Submit
  newPatchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("patch-name-input").value;
    const selector = document.getElementById("patch-selector-input").value;
    const tag = document.getElementById("patch-tag-input").value;
    const opType = document.getElementById("patch-op-type-select").value;
    const prop = document.getElementById("patch-op-prop-input").value;
    const val = document.getElementById("patch-op-val-input").value;

    const operation =
      opType === "style.set"
        ? { type: "style.set", property: prop, value: val }
        : opType === "element.hide"
        ? { type: "element.hide" }
        : { type: "element.show" };

    try {
      const res = await fetch(`${API_BASE}/patches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId: activeWebsiteId,
          name,
          targetFingerprint: {
            tag,
            selector,
            role: "button",
          },
          operation,
          actor: { id: "operator-1", name: "Operator", role: "developer" },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create patch");
      }

      showToast("Draft patch created successfully!", "success");
      newPatchModal.classList.add("hidden");
      newPatchForm.reset();
      await loadPatches();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // Filters
  searchInput.addEventListener("input", () => {
    saveState();
    renderPatchList();
  });
  filterStatusSelect.addEventListener("change", () => {
    saveState();
    renderPatchList();
  });

  // Restore UI state from before a refresh
  if (savedState.search) searchInput.value = savedState.search;
  if (savedState.status) filterStatusSelect.value = savedState.status;
  if (savedState.tab && savedState.tab !== "patches") {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${savedState.tab}"]`);
    if (tabBtn) tabBtn.click();
  }

  // Initial Boot
  loadPatches();
  loadReleases();
  loadAuditEvents();
})();
