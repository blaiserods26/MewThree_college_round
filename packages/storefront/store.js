// AeroStyle Collective Storefront Logic
(function () {
  const PRODUCTS = {
    1: {
      id: 1,
      name: "Nomad Matte Shell Jacket",
      price: 240,
      image: "images/jacket.jpg",
      tag: "Bestseller",
      specs: "GORE-TEX 3L • Matte Slate",
    },
    2: {
      id: 2,
      name: "Carbon Modular Sling Pack",
      price: 120,
      image: "images/sling.jpg",
      tag: "New",
      specs: "Cordura® 500D • 9L Capacity",
    },
    3: {
      id: 3,
      name: "Titanium Kinetic Chrono",
      price: 380,
      image: "images/watch.jpg",
      tag: "Popular",
      specs: "Grade 5 Titanium • Sapphire Crystal",
    },
  };

  // State
  let cart = [
    { id: 1, qty: 1 },
    { id: 2, qty: 1 },
  ];
  let discountRate = 0;
  let isDrifted = false;

  // DOM Elements - Nav & General
  const cartToggleBtn = document.getElementById("cart-toggle-btn");
  const cartCountEl = document.getElementById("cart-count");
  const toastContainer = document.getElementById("toast-container");

  // DOM Elements - Order Summary
  const summaryItemsCountEl = document.getElementById("summary-items-count");
  const summaryItemsListEl = document.getElementById("order-summary-items");
  const summaryEditCartBtn = document.getElementById("summary-edit-cart-btn");
  const subtotalEl = document.getElementById("summary-subtotal");
  const cartTotalEl = document.getElementById("cart-total");
  const summaryDiscountRow = document.getElementById("summary-discount-row");
  const summaryDiscountEl = document.getElementById("summary-discount");
  const promoInput = document.getElementById("promo-input");
  const promoApplyBtn = document.getElementById("promo-apply-btn");
  const promoFeedback = document.getElementById("promo-feedback");
  const promoCopyBtn = document.getElementById("promo-copy-btn");
  const actionContainer = document.getElementById("checkout-action-container");
  const driftBanner = document.getElementById("drift-status-banner");
  const simulateDriftBtn = document.getElementById("simulate-drift-btn");
  const resetBtn = document.getElementById("reset-storefront-btn");

  // DOM Elements - Cart Drawer
  const cartDrawer = document.getElementById("cart-drawer");
  const cartBackdrop = document.getElementById("cart-drawer-backdrop");
  const cartCloseBtn = document.getElementById("cart-close-btn");
  const drawerCartBadge = document.getElementById("drawer-cart-badge");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartEmptyState = document.getElementById("cart-empty-state");
  const drawerSubtotalEl = document.getElementById("drawer-subtotal");
  const drawerDiscountRow = document.getElementById("drawer-discount-row");
  const drawerDiscountEl = document.getElementById("drawer-discount");
  const drawerTotalEl = document.getElementById("drawer-total");
  const drawerCheckoutBtn = document.getElementById("drawer-checkout-btn");
  const drawerContinueBtn = document.getElementById("drawer-continue-btn");
  const emptyShopNowBtn = document.getElementById("empty-shop-now-btn");
  const shippingMeterLabel = document.getElementById("shipping-meter-label");
  const shippingProgressBar = document.getElementById("shipping-progress-bar");

  // Toast Notification Helper
  function showToast(message, type = "info", actionText = null, onAction = null) {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `store-toast toast-${type}`;
    
    const textSpan = document.createElement("span");
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    if (actionText && onAction) {
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "toast-action-btn";
      actionBtn.textContent = actionText;
      actionBtn.onclick = () => {
        onAction();
        toast.remove();
      };
      toast.appendChild(actionBtn);
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "toast-close-btn";
    closeBtn.innerHTML = "✕";
    closeBtn.onclick = () => toast.remove();
    toast.appendChild(closeBtn);

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-fade-out");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Slide-over Drawer Controls
  function openCart() {
    if (!cartDrawer || !cartBackdrop) return;
    cartBackdrop.classList.remove("hidden");
    cartDrawer.classList.add("open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    if (!cartDrawer || !cartBackdrop) return;
    cartDrawer.classList.remove("open");
    cartDrawer.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      cartBackdrop.classList.add("hidden");
    }, 250);
    document.body.style.overflow = "";
  }

  if (cartToggleBtn) cartToggleBtn.addEventListener("click", openCart);
  if (cartCloseBtn) cartCloseBtn.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);
  if (drawerContinueBtn) drawerContinueBtn.addEventListener("click", closeCart);
  if (emptyShopNowBtn) emptyShopNowBtn.addEventListener("click", closeCart);
  if (summaryEditCartBtn) summaryEditCartBtn.addEventListener("click", openCart);

  // Keyboard shortcut (Escape closes drawer)
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cartDrawer && cartDrawer.classList.contains("open")) {
      closeCart();
    }
  });

  // Drawer Checkout button scrolls to Checkout Card
  if (drawerCheckoutBtn) {
    drawerCheckoutBtn.addEventListener("click", () => {
      closeCart();
      const checkoutCard = document.getElementById("checkout-summary");
      if (checkoutCard) {
        checkoutCard.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  // Recalculate & Render Cart
  function renderCart() {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => {
      const product = PRODUCTS[item.id];
      return sum + (product ? product.price * item.qty : 0);
    }, 0);

    const discountAmount = subtotal * discountRate;
    const finalTotal = Math.max(0, subtotal - discountAmount);

    // Update Counter Badges
    if (cartCountEl) {
      cartCountEl.textContent = String(totalCount);
      cartCountEl.classList.add("bump");
      setTimeout(() => cartCountEl.classList.remove("bump"), 300);
    }
    if (drawerCartBadge) {
      drawerCartBadge.textContent = `${totalCount} item${totalCount === 1 ? "" : "s"}`;
    }
    if (summaryItemsCountEl) {
      summaryItemsCountEl.textContent = `${totalCount} Item${totalCount === 1 ? "" : "s"} selected`;
    }

    // Update Prices
    const formattedSubtotal = `$${subtotal.toFixed(2)}`;
    const formattedTotal = `$${finalTotal.toFixed(2)}`;
    const formattedDiscount = `-$${discountAmount.toFixed(2)}`;

    if (subtotalEl) subtotalEl.textContent = formattedSubtotal;
    if (cartTotalEl) cartTotalEl.textContent = formattedTotal;
    if (drawerSubtotalEl) drawerSubtotalEl.textContent = formattedSubtotal;
    if (drawerTotalEl) drawerTotalEl.textContent = formattedTotal;
    if (drawerCheckoutBtn) {
      drawerCheckoutBtn.textContent = `Proceed to Checkout (${formattedTotal}) →`;
    }

    // Discount Breakdown Visibility
    if (discountRate > 0) {
      if (summaryDiscountRow) {
        summaryDiscountRow.classList.remove("hidden");
        if (summaryDiscountEl) summaryDiscountEl.textContent = formattedDiscount;
      }
      if (drawerDiscountRow) {
        drawerDiscountRow.classList.remove("hidden");
        if (drawerDiscountEl) drawerDiscountEl.textContent = formattedDiscount;
      }
    } else {
      if (summaryDiscountRow) summaryDiscountRow.classList.add("hidden");
      if (drawerDiscountRow) drawerDiscountRow.classList.add("hidden");
    }

    // Shipping Meter (Free at $150)
    const threshold = 150;
    if (shippingProgressBar && shippingMeterLabel) {
      if (subtotal >= threshold) {
        shippingProgressBar.style.width = "100%";
        shippingMeterLabel.innerHTML = "🎉 You qualify for <strong>FREE Express Shipping</strong>!";
      } else if (subtotal > 0) {
        const remaining = (threshold - subtotal).toFixed(2);
        const percent = Math.min(100, Math.round((subtotal / threshold) * 100));
        shippingProgressBar.style.width = `${percent}%`;
        shippingMeterLabel.innerHTML = `Add <strong>$${remaining}</strong> more for <strong>FREE Express Shipping</strong>`;
      } else {
        shippingProgressBar.style.width = "0%";
        shippingMeterLabel.innerHTML = `Add <strong>$${threshold}.00</strong> for <strong>FREE Express Shipping</strong>`;
      }
    }

    // Render Drawer Items
    if (cartItemsContainer && cartEmptyState) {
      if (cart.length === 0) {
        cartItemsContainer.innerHTML = "";
        cartEmptyState.classList.remove("hidden");
        if (drawerCheckoutBtn) drawerCheckoutBtn.disabled = true;
      } else {
        cartEmptyState.classList.add("hidden");
        if (drawerCheckoutBtn) drawerCheckoutBtn.disabled = false;

        cartItemsContainer.innerHTML = cart
          .map((item) => {
            const product = PRODUCTS[item.id];
            if (!product) return "";
            const lineTotal = (product.price * item.qty).toFixed(2);
            return `
              <div class="cart-drawer-item" data-item-id="${item.id}">
                <div class="item-thumb-wrapper">
                  <img src="${product.image}" alt="${product.name}" class="item-thumb">
                </div>
                <div class="item-details">
                  <div class="item-header">
                    <h4 class="item-title">${product.name}</h4>
                    <button class="item-remove-btn" data-action="remove" data-id="${item.id}" type="button" aria-label="Remove item" title="Remove">✕</button>
                  </div>
                  <span class="item-spec-tag">${product.specs}</span>
                  <div class="item-bottom-row">
                    <div class="quantity-stepper">
                      <button class="step-btn" data-action="dec" data-id="${item.id}" type="button" aria-label="Decrease quantity">−</button>
                      <span class="step-value">${item.qty}</span>
                      <button class="step-btn" data-action="inc" data-id="${item.id}" type="button" aria-label="Increase quantity">+</button>
                    </div>
                    <div class="item-price-col">
                      <span class="item-line-price">$${lineTotal}</span>
                      ${item.qty > 1 ? `<span class="item-unit-price">($${product.price}/ea)</span>` : ""}
                    </div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("");
      }
    }

    // Render Order Summary Items List (Inside Checkout Summary Card)
    if (summaryItemsListEl) {
      if (cart.length === 0) {
        summaryItemsListEl.innerHTML = `
          <div class="summary-empty-notice">
            <span>Your order is currently empty. Add items from the catalog above.</span>
          </div>
        `;
      } else {
        summaryItemsListEl.innerHTML = cart
          .map((item) => {
            const product = PRODUCTS[item.id];
            if (!product) return "";
            const lineTotal = (product.price * item.qty).toFixed(2);
            return `
              <div class="summary-item-row">
                <div class="summary-item-left">
                  <img src="${product.image}" alt="${product.name}" class="summary-item-thumb">
                  <div class="summary-item-info">
                    <span class="summary-item-name">${product.name}</span>
                    <span class="summary-item-meta">Qty: ${item.qty} • $${product.price}.00 each</span>
                  </div>
                </div>
                <div class="summary-item-right">
                  <span class="summary-item-total">$${lineTotal}</span>
                </div>
              </div>
            `;
          })
          .join("");
      }
    }
  }

  // Handle Cart Interactions inside Drawer (Quantity change / Remove)
  if (cartItemsContainer) {
    cartItemsContainer.addEventListener("click", (e) => {
      const button = e.target.closest("button[data-action]");
      if (!button) return;

      const action = button.getAttribute("data-action");
      const id = parseInt(button.getAttribute("data-id") || "0", 10);
      const product = PRODUCTS[id];

      if (action === "inc") {
        const item = cart.find((i) => i.id === id);
        if (item) {
          item.qty += 1;
          renderCart();
        }
      } else if (action === "dec") {
        const item = cart.find((i) => i.id === id);
        if (item) {
          if (item.qty > 1) {
            item.qty -= 1;
          } else {
            cart = cart.filter((i) => i.id !== id);
            if (product) showToast(`Removed ${product.name} from bag`, "info");
          }
          renderCart();
        }
      } else if (action === "remove") {
        cart = cart.filter((i) => i.id !== id);
        if (product) showToast(`Removed ${product.name} from bag`, "info");
        renderCart();
      }
    });
  }

  // Add to cart buttons in Product Catalog
  document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = parseInt(e.currentTarget.getAttribute("data-product-id") || "0", 10);
      const product = PRODUCTS[id];
      if (!product) return;

      const existingItem = cart.find((i) => i.id === id);
      if (existingItem) {
        existingItem.qty += 1;
      } else {
        cart.push({ id, qty: 1 });
      }

      renderCart();

      // Button micro-interaction feedback
      const originalHtml = e.currentTarget.innerHTML;
      e.currentTarget.innerHTML = `<span>✓ Added</span>`;
      e.currentTarget.classList.add("btn-success");
      setTimeout(() => {
        e.currentTarget.innerHTML = originalHtml;
        e.currentTarget.classList.remove("btn-success");
      }, 1000);

      // Toast notification with "View Bag" quick action
      showToast(`Added ${product.name} to shopping bag`, "success", "View Bag", openCart);
    });
  });

  // Promo Code Validation & Application
  function applyPromoCode(code) {
    const cleanCode = (code || "").trim().toUpperCase();
    if (!promoFeedback) return;

    if (cleanCode === "PATCHWORK20") {
      discountRate = 0.2;
      promoFeedback.className = "promo-feedback success";
      promoFeedback.textContent = "✓ 20% discount applied successfully with PATCHWORK20!";
      promoFeedback.classList.remove("hidden");
      renderCart();
      showToast("Promo Code PATCHWORK20 Applied (-20%)", "success");
    } else if (cleanCode === "") {
      discountRate = 0;
      promoFeedback.className = "promo-feedback error";
      promoFeedback.textContent = "Please enter a promo code.";
      promoFeedback.classList.remove("hidden");
      renderCart();
    } else {
      discountRate = 0;
      promoFeedback.className = "promo-feedback error";
      promoFeedback.textContent = `Promo code "${cleanCode}" is invalid or expired.`;
      promoFeedback.classList.remove("hidden");
      renderCart();
    }
  }

  if (promoApplyBtn && promoInput) {
    promoApplyBtn.addEventListener("click", () => {
      applyPromoCode(promoInput.value);
    });

    promoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyPromoCode(promoInput.value);
      }
    });
  }

  // Promo Banner Copy Button
  if (promoCopyBtn) {
    promoCopyBtn.addEventListener("click", () => {
      const code = "PATCHWORK20";
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
      if (promoInput) promoInput.value = code;
      promoCopyBtn.textContent = "Copied!";
      setTimeout(() => (promoCopyBtn.textContent = "Copy Code"), 2000);
      showToast("Promo code PATCHWORK20 copied to clipboard!", "info", "Apply Now", () => {
        applyPromoCode(code);
      });
    });
  }

  // Attach checkout click listener
  function attachCheckoutListener(button) {
    if (!button) return;
    button.onclick = () => {
      if (cart.length === 0) {
        showToast("Your shopping bag is empty. Please select products to continue.", "error");
        return;
      }
      const totalText = cartTotalEl ? cartTotalEl.textContent : "$360.00";
      alert(`Checkout simulated! Proceeding to payment processing for ${totalText}.`);
    };
  }

  const initialCheckoutBtn = document.getElementById("checkout-btn");
  attachCheckoutListener(initialCheckoutBtn);

  // Simulate Site Update (Drift)
  if (simulateDriftBtn && actionContainer) {
    simulateDriftBtn.addEventListener("click", () => {
      if (isDrifted) return;
      isDrifted = true;

      // Mutate ID and nest inside wrapper
      actionContainer.innerHTML = `
        <div class="payment-drawer">
          <button id="pay-now-action" class="btn btn-checkout" type="button" aria-label="Pay Now">
            Pay Now (Express) →
          </button>
        </div>
      `;

      if (driftBanner) driftBanner.classList.remove("hidden");
      simulateDriftBtn.textContent = "⚡ Drift Active";
      simulateDriftBtn.disabled = true;

      const newBtn = document.getElementById("pay-now-action");
      attachCheckoutListener(newBtn);
      showToast("Site update simulation triggered: DOM structure mutated (#pay-now-action)", "warning");
    });
  }

  // Reset to Baseline
  if (resetBtn && actionContainer) {
    resetBtn.addEventListener("click", () => {
      isDrifted = false;

      actionContainer.innerHTML = `
        <button id="checkout-btn" class="btn btn-checkout" type="button" aria-label="Continue to Checkout">
          Continue to Checkout →
        </button>
      `;

      if (driftBanner) driftBanner.classList.add("hidden");
      if (simulateDriftBtn) {
        simulateDriftBtn.textContent = "⚡ Simulate Site Update (Drift)";
        simulateDriftBtn.disabled = false;
      }

      const resetCheckoutBtn = document.getElementById("checkout-btn");
      attachCheckoutListener(resetCheckoutBtn);
      showToast("Baseline DOM structure restored (#checkout-btn)", "info");
    });
  }

  // Initial render
  renderCart();
})();
