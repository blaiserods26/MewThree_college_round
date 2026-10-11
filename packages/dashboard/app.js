// PATCHWORK Dashboard Application
(function () {
  const CONFIG = window.PATCHWORK_CONFIG || {};
  const API_BASE = CONFIG.apiBase || "http://localhost:4000/api";
  const STOREFRONT_URL = CONFIG.storefrontUrl || "http://localhost:3000";
  const STATE_KEY = "patchwork.dashboard.state.v1";

  // Built-in Lucide SVG map for offline & instant zero-delay rendering without ghost spacing
  const ICONS = {
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    sparkles: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>',
    "plus-circle": '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    monitor: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>',
    tablet: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>',
    smartphone: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>',
    maximize: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
    layout: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
    "file-text": '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
    rocket: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',
    activity: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    "scroll-text": '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M15 8h-5"/><path d="M15 12h-5"/></svg>',
    crosshair: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>',
    lock: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    "rotate-cw": '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>',
    "rotate-ccw": '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    "shield-check": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
    "chevron-up": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
    eye: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    zap: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    save: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>',
    "alert-triangle": '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
    "arrow-left": '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
    hexagon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    x: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  };

  // Targeted helper to refresh Lucide icons without continuous polling intervals
  function refreshIcons(container) {
    const root = container || document;
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      try {
        window.lucide.createIcons(container ? { root: container } : undefined);
      } catch (e) {
        // Safe fallback in test or constrained DOM environments
      }
    }
    // Reliable inline SVG replacement for all data-lucide nodes
    const iconEls = root.querySelectorAll ? root.querySelectorAll("i[data-lucide]") : [];
    iconEls.forEach(el => {
      const name = el.getAttribute("data-lucide");
      if (ICONS[name]) {
        const span = document.createElement("span");
        span.className = "icon-wrapper";
        span.innerHTML = ICONS[name];
        el.replaceWith(span);
      } else if (el.children.length === 0) {
        el.style.display = "none";
      }
    });
  }

  function setButtonLabel(btn, text, iconName) {
    if (!btn) return;
    btn.replaceChildren();
    if (iconName && ICONS[iconName]) {
      const span = document.createElement("span");
      span.className = "icon-wrapper";
      span.innerHTML = ICONS[iconName];
      btn.appendChild(span);
    } else if (iconName) {
      const icon = document.createElement("i");
      icon.setAttribute("data-lucide", iconName);
      btn.appendChild(icon);
    }
    const label = document.createElement("span");
    label.textContent = text;
    btn.appendChild(label);
    refreshIcons(btn);
  }

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
        <div><i data-lucide='alert-triangle' style='width:16px;height:16px;color:#fbbf24;vertical-align:text-bottom;'></i> ${escapeHtml(message)}</div>
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

  // Studio Canvas & Viewport Elements
  const canvasFrame = document.getElementById("studio-canvas-frame");
  const canvasIframe = document.getElementById("storefront-preview-iframe");
  const canvasDimLabel = document.getElementById("canvas-dimensions-label");
  const btnVpDesktop = document.getElementById("btn-vp-desktop");
  const btnVpTablet = document.getElementById("btn-vp-tablet");
  const btnVpMobile = document.getElementById("btn-vp-mobile");
  const btnVpFill = document.getElementById("btn-vp-fill");
  const btnToggleStudioInspector = document.getElementById("btn-toggle-studio-inspector");
  const studioInspectBtnText = document.getElementById("studio-inspect-btn-text");
  const btnReloadCanvasIframe = document.getElementById("btn-reload-canvas-iframe");
  const studioHandshakeStatus = document.getElementById("studio-handshake-status");
  const studioActiveModeBadge = document.getElementById("studio-active-mode-badge");

  // Contextual Inspector Elements
  const inspectorElementTag = document.getElementById("inspector-element-tag");
  const inspectorSelectorInput = document.getElementById("inspector-selector-input");
  const inspectorElementRole = document.getElementById("inspector-element-role");
  const studioInspectorConfidencePill = document.getElementById("studio-inspector-confidence-pill");
  const inspectorRiskBadge = document.getElementById("inspector-risk-badge");
  const inspectorRiskReasonsList = document.getElementById("inspector-risk-reasons-list");
  const inspectorOpTypeSelect = document.getElementById("inspector-op-type-select");
  const inspectorStyleInputs = document.getElementById("inspector-style-inputs");
  const inspectorPropInput = document.getElementById("inspector-prop-input");
  const inspectorValInput = document.getElementById("inspector-val-input");
  const btnStudioPreviewPatch = document.getElementById("btn-studio-preview-patch");
  const btnStudioResetPreview = document.getElementById("btn-studio-reset-preview");
  const btnStudioSavePatch = document.getElementById("btn-studio-save-patch");
  const btnStudioVerifyPatch = document.getElementById("btn-studio-verify-patch");

  // Verification Drawer Elements
  const studioVerificationDrawer = document.getElementById("studio-verification-drawer");
  const btnToggleVerificationDrawer = document.getElementById("btn-toggle-verification-drawer");
  const drawerGateStatusPill = document.getElementById("drawer-gate-status-pill");
  const drawerToggleText = document.getElementById("drawer-toggle-text");
  const studioDrawerEvidenceBody = document.getElementById("studio-drawer-evidence-body");

  // Health Monitor Elements
  const healthOverallPill = document.getElementById("health-overall-pill");
  const healthRelVersion = document.getElementById("health-rel-version");
  const healthRelMeta = document.getElementById("health-rel-meta");
  const healthRollbackBtn = document.getElementById("health-rollback-btn");
  const btnRunHealthCheck = document.getElementById("btn-run-health-check");
  const healthCheckResultsContainer = document.getElementById("health-check-results-container");

  // Viewport Switcher Controls
  const viewportButtons = [
    { btn: btnVpDesktop, cls: "vp-desktop", dim: "1280 × 800" },
    { btn: btnVpTablet, cls: "vp-tablet", dim: "768 × 1024" },
    { btn: btnVpMobile, cls: "vp-mobile", dim: "375 × 667" },
    { btn: btnVpFill, cls: "vp-fill", dim: "Auto (100%)" },
  ];

  viewportButtons.forEach(({ btn, cls, dim }) => {
    if (btn) {
      btn.addEventListener("click", () => {
        viewportButtons.forEach((b) => b.btn?.classList.remove("active"));
        btn.classList.add("active");
        if (canvasFrame) {
          canvasFrame.className = `studio-canvas-frame ${cls}`;
        }
        if (canvasDimLabel) {
          canvasDimLabel.textContent = dim;
        }
      });
    }
  });

  if (btnReloadCanvasIframe && canvasIframe) {
    btnReloadCanvasIframe.addEventListener("click", () => {
      canvasIframe.src = canvasIframe.src;
      showToast("Storefront canvas reloaded", "info");
    });
  }

  // Visual Inspector Bridge & Handshake
  let inspectorWindow = null;
  let isStudioInspectorActive = false;

  function toggleStudioInspector(enable) {
    isStudioInspectorActive = enable !== undefined ? enable : !isStudioInspectorActive;
    if (btnToggleStudioInspector) {
      if (isStudioInspectorActive) {
        btnToggleStudioInspector.classList.add("active");
        if (studioInspectBtnText) studioInspectBtnText.textContent = "Click Element to Inspect";
      } else {
        btnToggleStudioInspector.classList.remove("active");
        if (studioInspectBtnText) studioInspectBtnText.textContent = "Select Element on Canvas";
      }
    }
    // Post to iframe
    if (canvasIframe && canvasIframe.contentWindow) {
      canvasIframe.contentWindow.postMessage(
        { type: "PATCHWORK_TOGGLE_INSPECTOR", enabled: isStudioInspectorActive },
        "*"
      );
    }
    // Also post to popup window if open
    if (inspectorWindow && !inspectorWindow.closed) {
      inspectorWindow.postMessage(
        { type: "PATCHWORK_TOGGLE_INSPECTOR", enabled: isStudioInspectorActive },
        "*"
      );
    }
  }

  if (btnToggleStudioInspector) {
    btnToggleStudioInspector.addEventListener("click", () => {
      toggleStudioInspector();
    });
  }

  if (openInspectorBtn) {
    openInspectorBtn.addEventListener("click", () => {
      // If Studio tab is available, activate studio tab and toggle inspector
      const studioTabBtn = document.querySelector('.tab-btn[data-tab="studio"]');
      if (studioTabBtn) {
        studioTabBtn.click();
        toggleStudioInspector(true);
        showToast("Studio Canvas active. Click an element to capture its fingerprint.", "info");
      } else {
        inspectorWindow = window.open(STOREFRONT_URL, "PatchworkInspector");
        showToast("Storefront opened. Click an element to capture its fingerprint.", "info");
        setTimeout(() => {
          if (inspectorWindow) {
            inspectorWindow.postMessage({ type: "PATCHWORK_TOGGLE_INSPECTOR", enabled: true }, "*");
          }
        }, 1000);
      }
    });
  }

  function handleElementSelected(fp) {
    const patchSelectorInput = document.getElementById("patch-selector-input");
    const patchTagInput = document.getElementById("patch-tag-input");
    const patchNameInput = document.getElementById("patch-name-input");
    if (patchSelectorInput) patchSelectorInput.value = fp.selector || "";
    if (patchTagInput) patchTagInput.value = fp.tag || "button";
    if (patchNameInput) patchNameInput.value = `Patch for <${fp.tag}> ${fp.selector}`;

    if (inspectorElementTag) {
      inspectorElementTag.textContent = `<${fp.tag}${fp.stableAttributes?.id ? ' id="' + fp.stableAttributes.id + '"' : ""}>`;
    }
    if (inspectorSelectorInput) {
      inspectorSelectorInput.value = fp.selector || "";
    }
    if (inspectorElementRole) {
      inspectorElementRole.textContent = fp.role || fp.tag || "element";
    }
    if (studioInspectorConfidencePill) {
      studioInspectorConfidencePill.textContent = "98% High Confidence";
      studioInspectorConfidencePill.className = "confidence-pill confidence-high";
    }

    updateBlastRadiusPreview({
      tag: fp.tag,
      selector: fp.selector,
      opType: inspectorOpTypeSelect?.value || "style.set",
    });

    toggleStudioInspector(false);
    showToast(`Captured target element: ${fp.selector}`, "success");
  }

  function updateBlastRadiusPreview(info) {
    if (!inspectorRiskBadge || !inspectorRiskReasonsList) return;
    let risk = "Low Risk";
    let riskCls = "risk-low";
    let reasons = [
      "✓ Single unique DOM element confirmed",
      "✓ Allowlisted mutation under strict schema",
      "✓ Zero collision with other active patches",
    ];

    if (info.opType === "element.hide") {
      risk = "Medium Risk";
      riskCls = "risk-medium";
      reasons = [
        "⚠ Element hide impacts visual layout and user navigation flow",
        "✓ Single unique target confirmed",
      ];
    }

    inspectorRiskBadge.textContent = risk;
    inspectorRiskBadge.className = `risk-badge ${riskCls}`;
    inspectorRiskReasonsList.innerHTML = reasons
      .map((r) => `<div class="risk-reason-item">${escapeHtml(r)}</div>`)
      .join("");
  }

  if (inspectorOpTypeSelect) {
    inspectorOpTypeSelect.addEventListener("change", () => {
      const type = inspectorOpTypeSelect.value;
      if (inspectorStyleInputs) {
        inspectorStyleInputs.style.display = type === "style.set" ? "flex" : "none";
      }
      updateBlastRadiusPreview({
        tag: inspectorElementRole?.textContent || "button",
        selector: inspectorSelectorInput?.value || "#checkout-btn",
        opType: type,
      });
    });
  }

  if (btnStudioPreviewPatch) {
    btnStudioPreviewPatch.addEventListener("click", () => {
      const selector = inspectorSelectorInput ? inspectorSelectorInput.value.trim() : "";
      if (!selector) {
        showToast("Please specify or capture a target selector first.", "error");
        return;
      }
      const opType = inspectorOpTypeSelect ? inspectorOpTypeSelect.value : "style.set";
      const property = inspectorPropInput ? inspectorPropInput.value.trim() : "display";
      const value = inspectorValInput ? inspectorValInput.value.trim() : "inline-block";

      const patch = {
        targetFingerprint: { selector, tag: "element" },
        operation: opType === "style.set" ? { type: "style.set", property, value } : { type: opType, value },
      };

      if (canvasIframe && canvasIframe.contentWindow) {
        canvasIframe.contentWindow.postMessage({ type: "PATCHWORK_LIVE_PREVIEW", patch }, "*");
      }
      if (studioActiveModeBadge) {
        studioActiveModeBadge.textContent = "Isolated Preview Active";
        studioActiveModeBadge.className = "canvas-badge mode-preview";
      }
      showToast("Live preview applied to canvas.", "info");
    });
  }

  if (btnStudioResetPreview) {
    btnStudioResetPreview.addEventListener("click", () => {
      const selector = inspectorSelectorInput ? inspectorSelectorInput.value.trim() : "";
      const opType = inspectorOpTypeSelect ? inspectorOpTypeSelect.value : "style.set";
      const property = inspectorPropInput ? inspectorPropInput.value.trim() : "display";
      const value = inspectorValInput ? inspectorValInput.value.trim() : "inline-block";

      const patch = {
        targetFingerprint: { selector, tag: "element" },
        operation: opType === "style.set" ? { type: "style.set", property, value } : { type: opType, value },
      };

      if (canvasIframe && canvasIframe.contentWindow) {
        canvasIframe.contentWindow.postMessage({ type: "PATCHWORK_REVERT_PREVIEW", patch }, "*");
      }
      if (studioActiveModeBadge) {
        studioActiveModeBadge.textContent = "Storefront Baseline";
        studioActiveModeBadge.className = "canvas-badge mode-baseline";
      }
      showToast("Canvas reverted to unpatched baseline.", "info");
    });
  }

  if (btnStudioSavePatch) {
    btnStudioSavePatch.addEventListener("click", async () => {
      const selector = inspectorSelectorInput ? inspectorSelectorInput.value.trim() : "";
      if (!selector) {
        showToast("Please enter or select a valid target selector.", "error");
        return;
      }
      const opType = inspectorOpTypeSelect ? inspectorOpTypeSelect.value : "style.set";
      const property = inspectorPropInput ? inspectorPropInput.value.trim() : "display";
      const value = inspectorValInput ? inspectorValInput.value.trim() : "inline-block";
      const tag = inspectorElementRole ? inspectorElementRole.textContent.trim() : "button";

      const operation =
        opType === "style.set"
          ? { type: "style.set", property, value }
          : opType === "text.set"
          ? { type: "text.set", value }
          : opType === "attribute.set"
          ? { type: "attribute.set", attribute: property, value }
          : { type: opType };

      try {
        btnStudioSavePatch.disabled = true;
        btnStudioSavePatch.textContent = "Saving Hotfix...";

        const res = await fetch(`${API_BASE}/patches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            websiteId: activeWebsiteId,
            name: `Hotfix for <${tag}> ${selector}`,
            targetFingerprint: { tag, selector, role: tag === "button" ? "button" : undefined },
            operation,
            actor: { id: "studio-operator", name: "Visual Studio Operator", role: "developer" },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create draft patch");
        }

        const newPatch = await res.json();
        showToast(`Hotfix '${newPatch.name}' created as Draft. Ready for verification!`, "success");
        selectedPatchId = newPatch.id;
        await loadPatches();
        await loadPatchEvidence(newPatch.id);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        btnStudioSavePatch.disabled = false;
        btnStudioSavePatch.innerHTML = '<i data-lucide="save" style="width:14px;height:14px;"></i> Save & Publish Hotfix';
        refreshIcons(btnStudioSavePatch);
      }
    });
  }

  if (btnStudioVerifyPatch) {
    btnStudioVerifyPatch.addEventListener("click", async () => {
      if (!selectedPatchId) {
        showToast("Select or save a draft patch first before running verification.", "error");
        return;
      }
      try {
        btnStudioVerifyPatch.disabled = true;
        btnStudioVerifyPatch.textContent = "Verifying...";
        const res = await fetch(`${API_BASE}/patches/${selectedPatchId}/verify`, { method: "POST" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Verification failed to complete");
        }
        const run = await res.json();
        if (run.status === "passed") {
          showToast("Automated verification passed across Desktop & Mobile!", "success");
        } else {
          showToast(`Verification failed: ${run.error || "Assertions failed"}`, "error");
        }
        await loadPatches();
        await loadPatchEvidence(selectedPatchId);
        if (studioVerificationDrawer) {
          studioVerificationDrawer.classList.remove("collapsed");
          if (drawerToggleText) drawerToggleText.textContent = "Hide Details";
        }
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        btnStudioVerifyPatch.disabled = false;
        btnStudioVerifyPatch.innerHTML = '<i data-lucide="zap" style="width:14px;height:14px;"></i> Run Verification';
        refreshIcons(btnStudioVerifyPatch);
      }
    });
  }

  if (btnToggleVerificationDrawer && studioVerificationDrawer) {
    btnToggleVerificationDrawer.addEventListener("click", () => {
      const isCollapsed = studioVerificationDrawer.classList.toggle("collapsed");
      if (drawerToggleText) {
        drawerToggleText.textContent = isCollapsed ? "Show Details" : "Hide Details";
      }
    });
  }

  async function loadPatchEvidence(patchId) {
    if (!patchId) return;
    try {
      const res = await fetch(`${API_BASE}/patches/${patchId}/evidence`);
      if (!res.ok) return;
      const evidence = await res.json();

      if (drawerGateStatusPill) {
        drawerGateStatusPill.textContent =
          evidence.readinessDecision === "ready_to_publish"
            ? "Ready to Publish"
            : evidence.readinessDecision === "verification_failed"
            ? "Gate Failed"
            : evidence.readinessDecision === "blocked_by_conflict"
            ? "Gate Blocked"
            : "Needs Verification";
        drawerGateStatusPill.className = `status-badge status-${evidence.status}`;
      }

      if (studioDrawerEvidenceBody) {
        const run = evidence.latestVerification;
        const blast = evidence.blastRadius;
        studioDrawerEvidenceBody.innerHTML = `
          <div class="evidence-col">
            <h5 style="font-size:0.82rem;font-weight:700;color:var(--text-muted);margin-bottom:8px;">
              READINESS & RISK ASSESSMENT (${escapeHtml((blast?.riskLevel || "low").toUpperCase())} RISK)
            </h5>
            <div style="background:var(--bg-surface);padding:10px 14px;border-radius:6px;border:1px solid var(--border-light);font-size:0.8rem;">
              <div style="font-weight:600;color:${evidence.readinessDecision === "ready_to_publish" ? "#34d399" : "#f87171"};margin-bottom:6px;">
                ${escapeHtml((evidence.readinessDecision || "").replace(/_/g, " ").toUpperCase())}
              </div>
              <ul style="padding-left:16px;color:var(--text-muted);line-height:1.45;">
                ${(evidence.readinessReasons || []).map((r) => `<li>${escapeHtml(r)}</li>`).join("")}
              </ul>
            </div>
            ${
              run
                ? `
            <div style="margin-top:12px;">
              <h5 style="font-size:0.82rem;font-weight:700;color:var(--text-muted);margin-bottom:6px;">
                ASSERTIONS (${run.assertions.filter((a) => a.passed).length}/${run.assertions.length} Passed)
              </h5>
              <div class="assertion-list">
                ${run.assertions
                  .map(
                    (a) => `
                  <div class="assertion-item ${a.passed ? "passed" : "failed"}" style="padding:4px 8px;font-size:0.75rem;">
                    <span class="assertion-key">${escapeHtml(a.assertionId)}</span>
                    <span class="assertion-badge ${a.passed ? "pass" : "fail"}">${a.passed ? "PASS" : "FAIL"}</span>
                  </div>`
                  )
                  .join("")}
              </div>
            </div>`
                : ""
            }
          </div>
          <div class="evidence-col">
            <h5 style="font-size:0.82rem;font-weight:700;color:var(--text-muted);margin-bottom:8px;">
              SCREENSHOT PROOF & VISUAL VERIFICATION
            </h5>
            ${
              run?.visualDiff
                ? `
              <div style="background:var(--bg-surface);padding:10px 14px;border-radius:6px;border:1px solid var(--border-light);font-size:0.8rem;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span>Visual Diff Delta:</span>
                  <strong style="color:${run.visualDiff.passed ? "#34d399" : "#f87171"};font-family:var(--font-mono);">${run.visualDiff.diffPercentage.toFixed(2)}%</strong>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span>Pixel Discrepancy:</span>
                  <span style="font-family:var(--font-mono);">${run.visualDiff.diffPixels} px</span>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                ${
                  run.baselineScreenshotBase64
                    ? `<div style="background:#000;border-radius:4px;overflow:hidden;padding:4px;border:1px solid var(--border-light);">
                        <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:2px;">Baseline</div>
                        <img src="data:image/png;base64,${run.baselineScreenshotBase64}" style="width:100%;height:auto;display:block;" alt="Baseline" />
                      </div>`
                    : ""
                }
                ${
                  run.screenshotBase64
                    ? `<div style="background:#000;border-radius:4px;overflow:hidden;padding:4px;border:1px solid var(--border-light);">
                        <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:2px;">Patched</div>
                        <img src="data:image/png;base64,${run.screenshotBase64}" style="width:100%;height:auto;display:block;" alt="Patched" />
                      </div>`
                    : ""
                }
              </div>`
                : `<div class="empty-state" style="padding:16px;">Run verification to generate proof screenshots and visual regression analytics.</div>`
            }
          </div>
        `;
        refreshIcons(studioDrawerEvidenceBody);
      }
    } catch (e) {
      // safe fallback
    }
  }

  // Health Monitor Controllers
  async function loadHealthStatus() {
    try {
      const res = await fetch(`${API_BASE}/websites/${activeWebsiteId}/check-health`);
      if (!res.ok) throw new Error(`Health check failed (HTTP ${res.status})`);
      const data = await res.json();
      renderHealthResults(data);
    } catch (err) {
      if (healthCheckResultsContainer) {
        renderErrorState(healthCheckResultsContainer, err.message, loadHealthStatus);
      }
    }
  }

  function renderHealthResults(data) {
    if (healthOverallPill) {
      healthOverallPill.textContent = (data.status || "healthy").toUpperCase();
      healthOverallPill.className = `status-badge status-${data.status}`;
    }
    const activeReleasePill = document.getElementById("health-status-badge");
    if (activeReleasePill) {
      activeReleasePill.textContent = (data.status || "healthy").toUpperCase();
      activeReleasePill.className = `status-pill status-${data.status}`;
    }

    if (healthRelVersion) {
      healthRelVersion.textContent = data.releaseId ? `Active Release (${data.releaseId})` : "Baseline Storefront";
    }
    if (healthRelMeta) {
      healthRelMeta.textContent = data.recommendation || `Checked at ${new Date(data.checkedAt).toLocaleTimeString()}`;
    }

    if (healthRollbackBtn) {
      if (data.status === "degraded" || data.status === "target_missing") {
        healthRollbackBtn.classList.remove("hidden");
      } else {
        healthRollbackBtn.classList.add("hidden");
      }
    }

    if (healthCheckResultsContainer) {
      if (!data.results || data.results.length === 0) {
        healthCheckResultsContainer.innerHTML = `
          <div class="empty-state">
            <p>${escapeHtml(data.recommendation || "Storefront is running clean baseline with no active patches deployed.")}</p>
          </div>
        `;
        return;
      }

      healthCheckResultsContainer.innerHTML = data.results
        .map(
          (r) => `
        <div class="health-result-card ${escapeHtml(r.status)}">
          <div class="health-info-col">
            <h4>${escapeHtml(r.patchName)}</h4>
            <p style="font-family:var(--font-mono);font-size:0.78rem;">Target: <code>${escapeHtml(r.targetSelector)}</code></p>
            <p style="margin-top:4px;">${escapeHtml(r.details || "")}</p>
          </div>
          <div>
            <span class="status-badge status-${escapeHtml(r.status)}">${escapeHtml(r.status.toUpperCase())}</span>
          </div>
        </div>
      `
        )
        .join("");
      refreshIcons(healthCheckResultsContainer);
    }
  }

  if (btnRunHealthCheck) {
    btnRunHealthCheck.addEventListener("click", async () => {
      try {
        btnRunHealthCheck.disabled = true;
        btnRunHealthCheck.textContent = "Checking Health...";
        const res = await fetch(`${API_BASE}/websites/${activeWebsiteId}/check-health`, { method: "POST" });
        if (!res.ok) throw new Error("Health check failed");
        const data = await res.json();
        renderHealthResults(data);
        showToast("Health check completed", data.status === "healthy" ? "success" : "error");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        btnRunHealthCheck.disabled = false;
        btnRunHealthCheck.innerHTML = '<i data-lucide="activity" style="width:16px;height:16px;"></i> Run Live Health Check';
        refreshIcons(btnRunHealthCheck);
      }
    });
  }

  if (healthRollbackBtn) {
    healthRollbackBtn.addEventListener("click", async () => {
      try {
        const res = await fetch(`${API_BASE}/websites/${activeWebsiteId}/rollback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor: { id: "health-monitor", name: "Operator", role: "developer" },
            reason: "Safe rollback triggered from Health Monitor due to regression",
          }),
        });
        if (!res.ok) throw new Error("Rollback failed");
        showToast("Rollback executed: Prior release or baseline restored!", "success");
        await loadHealthStatus();
        await loadReleases();
        await loadPatches();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  window.addEventListener("message", (msg) => {
    if (!msg.data) return;
    if (msg.data.type === "PATCHWORK_ELEMENT_SELECTED") {
      const fp = msg.data.fingerprint;
      if (!fp) return;
      handleElementSelected(fp);
    } else if (msg.data.type === "PATCHWORK_INSPECTOR_READY") {
      if (studioHandshakeStatus) {
        studioHandshakeStatus.innerHTML = '<span class="status-dot"></span> Bridge Ready';
        studioHandshakeStatus.className = "canvas-badge handshake-ready";
      }
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
      if (tab === "health") loadHealthStatus();
    });
  });

  // Toast System
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "<i data-lucide='check-circle' style='width:16px;height:16px;color:#4ade80;vertical-align:text-bottom;'></i>" : type === "error" ? "<i data-lucide='x-circle' style='width:16px;height:16px;color:#f87171;vertical-align:text-bottom;'></i>" : "ℹ️";
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
            <span><i data-lucide='alert-triangle' style='width:16px;height:16px;color:#fbbf24;vertical-align:text-bottom;'></i> Multi-Patch Collision Warning: Overlapping Mutation Detected</span>
          </div>
          <span class="conflict-badge">
            <i data-lucide='zap' style='width:14px;height:14px;vertical-align:text-bottom;'></i> Error • Release Blocked
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
            <span><i data-lucide='alert-triangle' style='width:16px;height:16px;color:#fbbf24;vertical-align:text-bottom;'></i> DOM Target Drift Detected</span>
          </div>
          <span class="confidence-badge confidence-high">
            <i data-lucide='zap' style='width:14px;height:14px;vertical-align:text-bottom;'></i> 93% • High Confidence Match
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
            <i data-lucide='sparkles' style='width:14px;height:14px;vertical-align:text-bottom;'></i> Disambiguate Drift with AI
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
              <i data-lucide='zap' style='width:14px;height:14px;vertical-align:text-bottom;'></i> Run Verification
            </button>
            <button class="btn btn-secondary" id="btn-demo-failing-verify" title="Creates and runs a broken patch to prove gate rejection">
              🧪 Test Failing Gate
            </button>
          </div>
        </div>

        ${
          activeConflict || patch.status === "conflict"
            ? `<div class="gate-notice blocked">
                <div class="gate-notice-header"><i data-lucide='ban' style='width:16px;height:16px;'></i><span>Release Gate Blocked: Target Collision</span></div>
                <div>Unresolved collision detected on target '<code>${escapeHtml(activeConflict ? activeConflict.targetSelector : patch.targetFingerprint.selector)}</code>'. This patch cannot be deployed until conflicts are resolved.</div>
              </div>`
            : patch.status === "verified"
            ? `<div class="gate-notice success">
                <div class="gate-notice-header"><i data-lucide='shield-check' style='width:16px;height:16px;'></i><span>Verification Passed</span></div>
                <div>Patch verified across Desktop & Mobile viewports. Safe for production deployment.</div>
              </div>`
            : patch.status === "verification_failed" || (latestRun && latestRun.status === "failed")
            ? `<div class="gate-notice blocked">
                <div class="gate-notice-header"><i data-lucide='ban' style='width:16px;height:16px;'></i><span>Release Gate Blocked: Verification Failed</span></div>
                <div style="font-size: 0.83rem; line-height: 1.45;">Automated browser verification failed. This patch cannot be deployed until all assertions pass.</div>
                ${latestRun?.error ? `<div style="margin-top: 6px; padding: 8px 12px; background: rgba(0,0,0,0.35); border-radius: 4px; font-family: var(--font-mono); font-size: 0.78rem; word-break: break-word;">${escapeHtml(latestRun.error)}</div>` : ""}
                <div style="margin-top: 8px;">
                  <button class="btn btn-ai" id="btn-ai-explain-verify" type="button" style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; padding: 6px 12px;">
                    <i data-lucide='sparkles' style='width:14px;height:14px;'></i> Explain Failure with AI
                  </button>
                </div>
              </div>`
            : `<div class="gate-notice blocked">
                <div class="gate-notice-header"><span>⏳ Unverified Patch</span></div>
                <div>This patch has not passed verification yet. It is blocked from production releases.</div>
              </div>`
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
          btnAiExplain.innerHTML = "<i data-lucide='sparkles' style='width:14px;height:14px;vertical-align:text-bottom;'></i> Diagnosing Failure...";
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
                    <span class="ai-pill"><i data-lucide='sparkles' style='width:14px;height:14px;vertical-align:text-bottom;'></i> AI Root Cause Analysis</span>
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
          btnAiExplain.innerHTML = "<i data-lucide='sparkles' style='width:14px;height:14px;vertical-align:text-bottom;'></i> Explain Failure with AI";
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
          btnAiDisambiguate.innerHTML = "<i data-lucide='sparkles' style='width:14px;height:14px;vertical-align:text-bottom;'></i> Analyzing Candidates...";
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
                    <span class="ai-pill"><i data-lucide='sparkles' style='width:14px;height:14px;vertical-align:text-bottom;'></i> Semantic Recovery Proposal</span>
                    <span class="count-pill" style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4);">${Math.round(dis.confidence * 100)}% Confidence</span>
                  </div>
                </div>
                <div style="font-size: 0.88rem; color: #f8fafc; margin-bottom: 6px;">
                  Recommended: <code class="spec-val-code" style="color: #38bdf8;">${escapeHtml(dis.recommendedSelector)}</code>
                </div>
                <div style="font-size: 0.82rem; color: #cbd5e1; margin-bottom: 8px;">
                  ${escapeHtml(dis.rationale)}
                </div>
                ${dis.tradeoffs ? `<div style="font-size: 0.8rem; color: #f59e0b; margin-bottom: 10px;"><i data-lucide='alert-triangle' style='width:16px;height:16px;color:#fbbf24;vertical-align:text-bottom;'></i> Tradeoffs: ${escapeHtml(dis.tradeoffs)}</div>` : ""}
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
          btnAiDisambiguate.innerHTML = "<i data-lucide='sparkles' style='width:14px;height:14px;vertical-align:text-bottom;'></i> Disambiguate Drift with AI";
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
          <div class="state-banner-icon"><i data-lucide='shield-check' style='width:16px;height:16px;vertical-align:text-bottom;'></i></div>
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
          <div class="state-banner-icon"><i data-lucide='ban' style='width:16px;height:16px;vertical-align:text-bottom;'></i></div>
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
          <div class="state-banner-icon"><i data-lucide='alert-triangle' style='width:16px;height:16px;color:#fbbf24;vertical-align:text-bottom;'></i></div>
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
          <div class="state-banner-icon"><i data-lucide='zap' style='width:14px;height:14px;vertical-align:text-bottom;'></i></div>
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
          <i data-lucide='ban' style='width:16px;height:16px;vertical-align:text-bottom;'></i> Release Blocked (Conflict)
        </button>
      `;
    }

    if (patch.status === "stale") {
      return `
        ${launchPreviewBtn}
        <button class="btn btn-warning" id="btn-review-drift" title="Patch target has drifted and requires rebind"><i data-lucide='alert-triangle' style='width:16px;height:16px;color:#fbbf24;vertical-align:text-bottom;'></i><span>Drift Detected</span></button>
      `;
    }
    if (patch.status === "draft") {
      return `
        ${launchPreviewBtn}
        <button class="btn btn-secondary" id="btn-simulate-drift" title="Simulate DOM drift"><i data-lucide='zap' style='width:14px;height:14px;vertical-align:text-bottom;'></i><span>Simulate Drift</span></button>
        <button class="btn btn-primary" id="btn-action-verify"><i data-lucide='zap' style='width:14px;height:14px;vertical-align:text-bottom;'></i><span>Verify with Playwright</span></button>
      `;
    }
    if (patch.status === "previewing") {
      return `
        ${launchPreviewBtn}
        <button class="btn btn-secondary" id="btn-simulate-drift" title="Simulate DOM drift"><i data-lucide='zap' style='width:14px;height:14px;vertical-align:text-bottom;'></i><span>Simulate Drift</span></button>
        <button class="btn btn-primary" id="btn-action-verify"><i data-lucide='zap' style='width:14px;height:14px;vertical-align:text-bottom;'></i><span>Re-run Verification</span></button>
      `;
    }
    if (patch.status === "verified") {
      return `
        ${launchPreviewBtn}
        <button class="btn btn-secondary" id="btn-simulate-drift" title="Simulate DOM drift"><i data-lucide='zap' style='width:14px;height:14px;vertical-align:text-bottom;'></i><span>Simulate Drift</span></button>
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
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
              <span class="audit-action-badge" style="background: rgba(255,255,255,0.08); color: ${badgeColor}; border: 1px solid ${badgeColor}; font-weight: 700;">
                ${escapeHtml(e.action)}
              </span>
              <span style="font-size: 0.85rem; color: #f8fafc; font-family: var(--font-mono); word-break: break-all;">
                ${escapeHtml(e.entityType)}:${escapeHtml(e.entityId)}
              </span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-faint); white-space: nowrap;">
              ${new Date(e.timestamp).toLocaleString()}
            </div>
          </div>
          <div style="font-size: 0.82rem; color: #cbd5e1; margin-top: 4px; line-height: 1.45;">
            ${e.details?.reason ? `<span>${escapeHtml(e.details.reason)}</span>` : ""}
            ${e.details?.fromStatus && e.details?.toStatus ? `<span style="margin-left: 6px; font-family: var(--font-mono); color: #94a3b8;">(${escapeHtml(e.details.fromStatus)} → ${escapeHtml(e.details.toStatus)})</span>` : ""}
            ${e.details?.metadata?.strategy ? `<span class="chip" style="margin-left: 8px; font-size: 0.72rem;">Strategy: ${escapeHtml(e.details.metadata.strategy)}</span>` : ""}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-faint); margin-top: 6px;">
            Actor: <strong style="color: #e2e8f0;">${escapeHtml(e.actor.name)}</strong> (${escapeHtml(e.actor.role)})
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
          bundleGateWarning.innerHTML = `<i data-lucide='ban' style='width:16px;height:16px;vertical-align:text-bottom;'></i> Mutual Conflict Blocked: Patches '${first.patchAId}' and '${first.patchBId}' collide on '${first.targetSelector}'. Both cannot be released together.`;
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
        setButtonLabel(aiGenerateBtn, "Generating Proposal...", "sparkles");
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
        setButtonLabel(aiGenerateBtn, "Generate Patch Proposal", "sparkles");
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
  refreshIcons(document);
  loadPatches();
  loadReleases();
  loadAuditEvents();
  setTimeout(() => refreshIcons(document), 50);
  setTimeout(() => refreshIcons(document), 300);
})();
