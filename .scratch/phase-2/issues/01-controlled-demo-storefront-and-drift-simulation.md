# 01: Controlled Demo Storefront and Drift Simulation

**What to build:** A lightweight, self-contained host demo storefront for the target website. Includes a product catalog, interactive cart counter, promo announcement banner, a mobile layout with an intentional CSS regression (the checkout button `#checkout-btn` within `#checkout-summary` is hidden on viewports <= 480px), and an interactive "Simulate Site Update" toggle button that mutates `#checkout-btn` into `#pay-now-action` and nests it inside `div.payment-drawer` with a reset control.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Build a responsive storefront page featuring an editable promo banner and headline.
- [ ] Implement an interactive shopping cart with items and a summary panel (`#checkout-summary`).
- [ ] Include `#checkout-btn` with a baseline mobile viewport regression (`display: none` at <= 480px width).
- [ ] Add an interactive "Simulate Site Update" toggle that renames the button to `#pay-now-action` and wraps it in `div.payment-drawer`.
- [ ] Provide an instant "Reset to Baseline" action to return the DOM to its initial state.
- [ ] Include the runtime injection seam tag `<script src="/patchwork.js" data-website-id="demo-store"></script>`.
