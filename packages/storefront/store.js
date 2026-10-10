// AeroStyle Collective Storefront Logic
(function () {
  let cartCount = 2;
  let cartTotal = 360.0;
  let isDrifted = false;

  const cartCountEl = document.getElementById("cart-count");
  const cartTotalEl = document.getElementById("cart-total");
  const subtotalEl = document.getElementById("summary-subtotal");
  const summaryItemsCountEl = document.getElementById("summary-items-count");
  const actionContainer = document.getElementById("checkout-action-container");
  const driftBanner = document.getElementById("drift-status-banner");
  const simulateDriftBtn = document.getElementById("simulate-drift-btn");
  const resetBtn = document.getElementById("reset-storefront-btn");

  // Add to cart buttons
  document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const price = parseFloat(e.currentTarget.getAttribute("data-price") || "0");
      cartCount += 1;
      cartTotal += price;

      if (cartCountEl) cartCountEl.textContent = String(cartCount);
      if (cartTotalEl) cartTotalEl.textContent = `$${cartTotal.toFixed(2)}`;
      if (subtotalEl) subtotalEl.textContent = `$${cartTotal.toFixed(2)}`;
      if (summaryItemsCountEl) summaryItemsCountEl.textContent = `${cartCount} Items selected`;

      const originalText = e.currentTarget.textContent;
      e.currentTarget.textContent = "✓ Added";
      e.currentTarget.classList.add("btn-secondary");
      setTimeout(() => {
        e.currentTarget.textContent = originalText;
        e.currentTarget.classList.remove("btn-secondary");
      }, 1000);
    });
  });

  // Attach checkout click listener
  function attachCheckoutListener(button) {
    if (!button) return;
    button.onclick = () => {
      alert("Checkout simulated! Proceeding to payment processing.");
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
    });
  }
})();
