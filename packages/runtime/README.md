# @patchwork/runtime

The zero-dependency DOM runtime script.

## Responsibilities (Phase 3)
- Injected via `<script src="/patchwork.js" data-website-id="demo-store"></script>`.
- Evaluates preview token query parameter (`?patchwork_preview=<patchId>`).
- Fetches active release bundle or isolated preview patch.
- Resolves target element using primary selector and fallback fingerprint heuristics.
- Validates operation against allowlist.
- Applies mutation deterministically and preserves original state for safe reversals.
- Reports stale selector status if element structure has shifted.
