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
  function renderPatchDetail() {
    const patch = allPatches.find((p) => p.id === selectedPatchId);
    if (!patch) return;

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

    // Attach lifecycle event listeners
    patchDetailContainer.querySelectorAll("[data-target-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetStatus = btn.getAttribute("data-target-status");
        await transitionStatus(patch.id, targetStatus);
      });
    });
  }

  function renderLifecycleActionButtons(patch) {
    if (patch.status === "draft") {
      return `<button class="btn btn-secondary" data-target-status="previewing">Enter Preview</button>`;
    }
    if (patch.status === "previewing") {
      return `
        <button class="btn btn-success" data-target-status="verified">Run Automated Verify (Pass)</button>
        <button class="btn btn-danger" data-target-status="verification_failed">Simulate Verification Failure</button>
      `;
    }
    if (patch.status === "verified") {
      return `<button class="btn btn-primary" id="publish-verified-btn">Publish to Release</button>`;
    }
    return "";
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
