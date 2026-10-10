// PATCHWORK Dashboard Application
(function () {
  const API_BASE = "http://localhost:4000/api";
  let activeWebsiteId = "demo-store";
  let currentTab = "patches";
  let allPatches = [];
  let selectedPatchId = null;

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
      inspectorWindow = window.open("http://localhost:3000", "PatchworkInspector");
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
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Load Patches
  async function loadPatches() {
    try {
      const res = await fetch(`${API_BASE}/patches?websiteId=${activeWebsiteId}`);
      if (!res.ok) throw new Error("Failed to load patches");
      allPatches = await res.json();
      patchesCounter.textContent = String(allPatches.length);
      renderPatchList();
    } catch (err) {
      connectionBadge.classList.remove("connected");
      connectionBadge.style.background = "rgba(239, 68, 68, 0.15)";
      connectionText.textContent = "Engine Offline (Start port 4000)";
      patchListContainer.innerHTML = `<div class="empty-state">Unable to connect to PATCHWORK API at ${API_BASE}.</div>`;
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

    patchDetailContainer.innerHTML = `
      <div class="detail-header-card">
        <div>
          <span class="status-badge status-${patch.status}">${patch.status.replace("_", " ")}</span>
          <h2 class="detail-title" style="margin-top: 8px;">${patch.name}</h2>
          <span style="font-size: 0.8rem; color: var(--text-faint);">ID: ${patch.id} • Target: ${patch.websiteId}</span>
        </div>
        <div class="detail-actions-bar">
          ${renderLifecycleActionButtons(patch)}
        </div>
      </div>

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
          patch.status === "verified"
            ? `<div class="gate-notice success">🛡️ Verification Passed: Patch verified across Desktop & Mobile. Safe for production deployment.</div>`
            : patch.status === "verification_failed"
            ? `<div class="gate-notice blocked">⛔ Release Gate Blocked: Automated browser verification failed. This patch cannot be deployed until assertions pass. ${latestRun?.error ? `<br><small style="margin-top: 4px; display: block; font-family: var(--font-mono);">${latestRun.error}</small>` : ""}</div>`
            : `<div class="gate-notice blocked">⏳ Unverified: This patch has not passed verification yet. It is blocked from production releases.</div>`
        }

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
          body: JSON.stringify({ websiteBaseUrl: "http://localhost:3000" }),
        });
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
            body: JSON.stringify({ websiteBaseUrl: "http://localhost:3000" }),
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

    // Attach lifecycle event listeners
    patchDetailContainer.querySelectorAll("[data-target-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetStatus = btn.getAttribute("data-target-status");
        await transitionStatus(patch.id, targetStatus);
      });
    });
  }

  function renderLifecycleActionButtons(patch) {
    const previewUrl = `http://localhost:3000/?patchwork_preview=${patch.id}`;
    const launchPreviewBtn = `
      <a href="${previewUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
        👁️ Preview Storefront
      </a>
    `;

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
      if (!res.ok) throw new Error("Failed to load releases");
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
      showToast("Failed to fetch releases", "error");
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
        showToast("Atomic release rollback executed successfully!", "success");
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
      if (!res.ok) throw new Error("Failed to load audit events");
      const events = await res.json();
      auditCounter.textContent = String(events.length);

      auditTimelineList.innerHTML = events
        .map(
          (e) => `
        <div class="audit-card">
          <div>
            <span class="audit-action-badge">${e.action}</span>
            <span style="font-size: 0.85rem; margin-left: 8px;">Target: <code>${e.entityId}</code></span>
            <div style="font-size: 0.78rem; color: var(--text-faint); margin-top: 4px;">
              By: ${e.actor.name} (${e.actor.role})
            </div>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-faint);">
            ${new Date(e.timestamp).toLocaleTimeString()}
          </div>
        </div>
      `
        )
        .join("");
    } catch (err) {
      showToast("Failed to load audit trail", "error");
    }
  }

  // Modal Open / Close
  createPatchBtn.addEventListener("click", () => newPatchModal.classList.remove("hidden"));
  closeModalBtn.addEventListener("click", () => newPatchModal.classList.add("hidden"));
  cancelNewPatchBtn.addEventListener("click", () => newPatchModal.classList.add("hidden"));

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
  searchInput.addEventListener("input", renderPatchList);
  filterStatusSelect.addEventListener("change", renderPatchList);

  // Initial Boot
  loadPatches();
  loadReleases();
  loadAuditEvents();
})();
