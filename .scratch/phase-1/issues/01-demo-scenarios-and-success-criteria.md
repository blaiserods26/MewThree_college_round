# 01: Lock Demo Scenarios and Success Criteria

**What to build:** Define and document the four core demo scenarios that PATCHWORK must support end-to-end: (1) valid mobile checkout button visibility fix, (2) failing patch that triggers a test gate block, (3) stale-target DOM change where an element is renamed and wrapped, and (4) conflicting patches where two changes collide on the same property. Detail the exact user steps, inputs, expected visual/runtime behaviours, and acceptance criteria for each.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Document the valid patch scenario: checkout button hidden or broken on mobile, restored with a targeted patch.
- [x] Document the failing patch scenario: a patch with an invalid target or broken assertion that is gated from publication.
- [x] Document the stale-target scenario: storefront simulates an update renaming an ID and nesting the button inside a wrapper; PATCHWORK identifies the stale selector.
- [x] Document the conflict scenario: two concurrent patches assign conflicting properties to the same target element.
- [x] Detail the complete 10-step hackathon demo walk-through from problem to rollback, with explicit pass/fail criteria.
