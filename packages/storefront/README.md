# @patchwork/storefront

The controlled demo storefront acting as the target web application.

## Responsibilities (Phase 2)
- Compact e-commerce checkout flow with `#checkout-btn` inside `#checkout-summary`.
- Promo announcement banner and headline.
- Mobile viewport CSS layout with intentional regression for demo step 1.
- "Simulate Site Update" toggle button that renames ID to `#pay-now-action` and wraps in `div.payment-drawer` for drift testing.
- Integration seam: `<script src="/patchwork.js" data-website-id="demo-store"></script>`.
