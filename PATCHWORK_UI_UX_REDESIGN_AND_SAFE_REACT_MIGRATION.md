# PATCHWORK --- Visual Product Redesign & Safe React Migration Plan

**Document type:** UI/UX specification and implementation safety plan\
**Product:** PATCHWORK --- Autonomous DOM Patching & Verification\
**Status:** Design and migration blueprint; implementation must be
validated against the actual repository\
**Primary objective:** Replace the current generic dashboard
presentation with a distinctive, canvas-first visual hotfix workbench
while preserving all existing product behavior.

------------------------------------------------------------------------

## 1. Product intent and design principles

PATCHWORK is not a generic analytics dashboard. It is a visual workbench
for selecting elements on an existing website, proposing controlled
changes, previewing them, verifying them, and releasing them with
evidence and rollback capability.

The UI should make the workflow legible:

1.  Choose a target website.
2.  Select or locate an element.
3.  Configure a constrained patch.
4.  Preview the mutation.
5.  Verify behavior and collect evidence.
6.  Resolve conflicts, if any.
7.  Publish a verified release.
8.  Monitor the release and roll back if needed.
9.  Inspect the audit trail when something needs explanation.

### Design principles

-   **Canvas first:** the target website is the primary working surface.
-   **Context over decoration:** show controls relevant to the selected
    page, element, patch, or release.
-   **Evidence over claims:** display only states confirmed by real API
    responses or verification results.
-   **Progressive disclosure:** keep common actions visible and advanced
    technical details expandable.
-   **Distinct page hierarchies:** Studio, Patches, Releases, Health,
    and Audit must not be five copies of the same card layout.
-   **Precise and calm:** restrained color, strong typography, compact
    controls, purposeful spacing, and clear focus states.
-   **Functional before animated:** interactions must work correctly
    before motion polish is added.
-   **Honest states:** distinguish loading, empty, failed, blocked,
    offline, mock AI, and successful states.
-   **Preserve the core:** do not rewrite the patch runtime,
    verification engine, server, or contracts as part of the visual
    redesign.

### Anti-generic / anti-AI-slop rules

Do not use: - Decorative gradients, neon glows, glassmorphism, floating
blobs, or oversized glowing buttons. - Repeated metric cards just to
fill space. - Unnecessary nested cards or borders around every
element. - Emoji icons or a mixture of unrelated icon families. - Giant
page titles with large empty hero regions on operational screens. - Fake
charts, fake events, invented evidence, fabricated timestamps, or
simulated success presented as real. - Repetitive generic descriptions
such as "Everything is looking good" when the app has no data. - Motion
on every element, scroll-triggered decoration, bouncing buttons, or
excessive scaling. - A pixel-for-pixel copy of Figma, Linear, DevTools,
or any reference product.

Every visible element must have a purpose in the workflow. If it neither
helps users understand state nor perform an action, remove it.

------------------------------------------------------------------------

## 2. Design system

### 2.1 Color tokens

Use these as initial design tokens, then inspect them in the actual
browser and adjust only with a documented reason.

  -----------------------------------------------------------------------
  Token                   Value                   Usage
  ----------------------- ----------------------- -----------------------
  `--pw-bg`               `#0B0F14`               Main application
                                                  background

  `--pw-surface-1`        `#121820`               Main panels and
                                                  navigation

  `--pw-surface-2`        `#1B2530`               Inputs, secondary
                                                  panels, selected rows

  `--pw-surface-3`        `#202A35`               Hovered/raised controls

  `--pw-border`           `#344250`               Panel and control
                                                  separators

  `--pw-text`             `#E8EDF2`               Primary text

  `--pw-text-muted`       `#99A7B7`               Secondary text and
                                                  metadata

  `--pw-accent`           `#59D5C0`               Primary action,
                                                  selected navigation,
                                                  active selection

  `--pw-success`          `#34D399`               Verified/success state

  `--pw-warning`          `#F3B85C`               Warning and elevated
                                                  risk

  `--pw-danger`           `#F87171`               Errors, conflicts,
                                                  destructive actions

  `--pw-info`             `#7CB7F5`               Informational state and
                                                  links
  -----------------------------------------------------------------------

Rules: - Do not communicate status through color alone; pair color with
text and/or an icon. - Check text and control contrast in the rendered
UI. Do not claim WCAG conformance without measuring it. - Accent color
is not a substitute for hierarchy. Most surfaces should remain
neutral. - Avoid using success green for generic decoration.

### 2.2 Typography

-   Primary UI family: **Inter** or a close system fallback.
-   Technical values: **JetBrains Mono** or a system monospace fallback.
-   Page title: 20--24px, semibold; avoid oversized marketing-style
    headings.
-   Section title: 14--16px, semibold.
-   Body: 13--14px with comfortable line height.
-   Metadata: 11--12px only when still comfortably readable.
-   CSS selectors, DOM tags, operation names, IDs, and raw values use
    monospace where it improves scanning.
-   Do not use multiple font families for decorative reasons.

### 2.3 Spacing, dimensions, and radii

Base spacing scale: 4, 8, 12, 16, 20, 24, 32px.

-   Typical control height: 32--36px.
-   Primary action height: 36--40px.
-   Standard input height: 36px.
-   Common panel radius: 5--8px.
-   Modal radius: 10--14px.
-   Borders: 1px, used only where grouping or separation is meaningful.
-   Avoid heavy shadows; use surface contrast and borders first.
-   Keep controls aligned to a consistent grid.

### 2.4 Icons

Use `lucide-react` consistently. Recommended icon mapping:

  Purpose                 Lucide icon
  ----------------------- -------------------------------
  Studio                  `PanelsTopLeft`
  Patch Explorer          `Layers3`
  Releases                `GitBranch` or `PackageCheck`
  Health                  `Activity`
  Audit                   `History`
  Element selection       `MousePointer2`
  Inspect/search target   `ScanSearch`
  Desktop viewport        `Monitor`
  Tablet viewport         `Tablet`
  Mobile viewport         `Smartphone`
  Verification            `ShieldCheck`
  Evidence                `FileCheck2`
  Conflict                `GitMerge` or `AlertTriangle`
  Rollback                `RotateCcw`
  AI proposal             `Sparkles`
  Search                  `Search`
  Settings                `Settings2`
  Close                   `X`
  Success                 `CheckCircle2`
  Failure                 `CircleX`
  Expand/collapse         `ChevronDown`
  Command menu            `Command`
  External/open target    `ExternalLink`
  Refresh                 `RefreshCw`
  Filter                  `ListFilter`
  More actions            `MoreHorizontal`

Use a consistent 1.5--1.75px stroke. Common icon sizes: 16px for
controls, 18px for prominent toolbar actions, 14px for dense lists.
Icon-only buttons require accessible labels and visible keyboard focus.
Do not add an icon to every heading by default.

------------------------------------------------------------------------

## 3. Global application shell

### 3.1 Persistent header

The header should be compact and consistent across all pages.

**Left:** - PATCHWORK mark and wordmark. - Optional small product
descriptor, not a multi-line marketing tagline.

**Center / target context:** - Current target selector with target name
and origin. - Connection status for the selected target/bridge. - If
target switching is unsupported in the current runtime, do not imply it
is fully supported.

**Right:** - Command menu shortcut. - Optional compact user/project menu
only if supported. - Avoid placing AI, Visual Inspector, New Draft, and
every page action permanently in the header. Actions belong in
contextual toolbars.

### 3.2 Primary navigation

Five primary destinations: 1. Studio 2. Patches 3. Releases 4. Health 5.
Audit

Use a compact horizontal navigation at desktop widths. Use an
appropriate compact navigation pattern at smaller widths. Active state
should use a subtle surface or underline and accent color, not a glowing
pill.

Counts are shown only when backed by real data. A zero count is
acceptable, but avoid cluttering every tab with a badge.

### 3.3 Global command menu

Support keyboard opening (for example, Ctrl/Cmd+K) if implemented
fully: - Navigate to a page. - Open a patch by name/ID. - Start a new
patch draft. - Run verification when context and permissions allow. -
Open target settings only if the settings exist.

The menu must not list unavailable actions as if they work.

### 3.4 Global notification system

-   Use one toast/notification manager.
-   Deduplicate identical notifications caused by duplicate events or
    repeated state updates.
-   Toasts are for short-lived feedback; persistent failures belong
    inline in the relevant page.
-   Use clear messages such as "Health check completed: 3 checks passed,
    1 warning."
-   Never display a success toast before the server confirms success.
-   Avoid duplicate toasts for a single action.

------------------------------------------------------------------------

## 4. Page 1 --- Studio Canvas

**Priority:** Highest. This is the primary product experience and demo
starting point.

### 4.1 Purpose

Select an element on the live target website, inspect its identity,
define an allowlisted mutation, preview the change, and verify it
without leaving the workspace.

### 4.2 Desktop layout

Use a three-region workbench below the global header and navigation:

-   **Optional left target/layer rail:** approximately 220--260px;
    collapsible.
-   **Central canvas:** flexible, minimum-width-aware, always the visual
    focus.
-   **Right inspector:** approximately 300--360px; resizable or
    collapsible if safe.
-   **Bottom evidence drawer:** collapsed by default; opens to show
    verification/evidence and release-gate details.

Do not hardcode widths that make the canvas unusable at 1024px. Use CSS
grid/flex with minimums and responsive transitions.

### 4.3 Context toolbar above the canvas

Left-to-right order: 1. Select-element mode, with explicit active state.
2. Current target URL/origin, truncated safely with full value
available. 3. Bridge connection indicator with a useful tooltip/status
detail. 4. Viewport presets: Desktop, Tablet, Mobile, Responsive. 5.
Reset-to-baseline or reset-preview action, clearly distinguished from
production rollback. 6. Optional overflow menu for secondary actions.

Do not put all page-level actions in this toolbar. Keep it focused on
editing the canvas.

### 4.4 Canvas region

-   Display the existing storefront inside the established iframe/bridge
    architecture.
-   Preserve the iframe instance when possible; React state changes must
    not remount it unnecessarily.
-   Give the canvas a neutral frame and clear separation from the app
    shell.
-   Support horizontal/vertical scrolling only when the target viewport
    requires it.
-   When selection mode is active, show an intentional pointer state and
    clear selected-element outline.
-   The selected element outline must not permanently obscure the
    target's content.
-   Show an overlay/tooltip with the selected tag, selector, and
    confidence only if the runtime supplies those values.
-   Keep website-native scrolling distinct from dashboard scrolling.
-   Show an explicit loading, connection failure, or unavailable-target
    state rather than a blank rectangle.
-   Do not fake selection handles or layers for elements the runtime
    cannot actually resolve.

### 4.5 Optional left target/layer rail

Only include this panel if the actual selection/runtime can provide
reliable data.

Sections: - **Recent targets/elements:** recent selections with tag and
selector summary. - **Current selection:** selected node and its useful
parent context. - **Search target:** search within actual
known/inspected elements if supported. - **Collapse control:** preserve
the selected element when collapsed.

Do not pretend this is a full DOM tree if it is only a list of recent
selections. Label it accurately.

### 4.6 Right contextual inspector

Organize as sections rather than nested cards:

**A. Selected element** - DOM tag. - Selector/fingerprint. - Confidence
and resolution state. - Target URL or target identifier. - A
copy-selector action if useful.

**B. Risk and impact** - Risk level and the reasons supporting it. -
Selector uniqueness/fingerprint resolution result. - Potential overlap
with existing patches. - Missing information should appear as "Not
assessed" rather than a fabricated low-risk status.

**C. Mutation editor** - Operation type selector containing only
supported operations. - Dynamic form fields for the selected
operation. - CSS property/value controls for style mutations. -
Validation and allowlist errors next to the relevant input. - Current
value vs proposed value where the runtime can read it safely. - Reset
changes action scoped to the current draft, not the whole app.

**D. Actions** - Preview mutation. - Run verification. - Save draft. -
Publish only when backend-enforced release conditions are met. -
Destructive actions should be separated from the primary action.

Do not show "98% confidence" unless the value comes from an actual,
defined confidence calculation. If confidence is heuristic, explain that
in a tooltip or use a qualitative state.

### 4.7 Bottom evidence drawer

Collapsed state: - A compact status bar with verification state and
release-gate state. - "Show evidence" or "Show details" control.

Expanded state: - Verification run ID and timestamp. - Named checks and
per-check outcomes. - Viewport coverage. - Screenshot/visual diff
evidence if actually generated. - Console or runtime failures where
collected. - Release blockers and the reason each blocker exists. -
Links to the relevant patch or target.

The drawer must not report "passed" merely because the request returned
HTTP 200. It must reflect actual verification outcomes.

### 4.8 Studio interactions

-   Clicking an element in the target selects it through the existing
    bridge.
-   Selection updates inspector state without remounting the iframe.
-   Changing viewport changes the target viewport, not the entire
    dashboard width.
-   Preview applies only the isolated preview behavior already supported
    by the runtime.
-   Verification displays progress, then actual result details.
-   Save Draft persists the draft through the existing API.
-   Publish is disabled with a reason when the backend says the release
    gate is blocked.
-   A failed bridge should provide retry and diagnostics; do not
    silently fall back to a fake selection state.

### 4.9 Empty/loading/error states

-   No target: explain how to configure/select a target.
-   Target disconnected: show last connection status and retry.
-   No selected element: guide user to select an element on the canvas.
-   No mutation: explain that a supported operation must be configured
    before preview.
-   Verification running: show named progress stages only if real stages
    exist.
-   Verification failed: show failed checks and remediation.
-   Preview failed: preserve the draft and provide a recovery action.

------------------------------------------------------------------------

## 5. Page 2 --- Patch Explorer

### 5.1 Purpose

Find, inspect, compare, and manage patches across their lifecycle.

### 5.2 Desktop layout

Use a two-pane layout: - **Left list pane:** 280--340px. - **Main detail
pane:** remaining width. - Optional conflict details can use a side
panel or an inline focused section. - Avoid giant empty page headers;
use a compact title and toolbar.

### 5.3 List pane

Top controls: - Search by patch name or selector. - Status filter. -
Optional target filter if multiple targets are supported. - Sort by
updated time or status if supported.

Each patch row: - Patch title. - Target/selector summary. - Operation
summary. - Status label. - Updated timestamp. - Selected state.

Use concise metadata; do not show multiple badges that repeat the same
status.

### 5.4 Patch detail pane

Sections: 1. **Patch identity:** name, ID, target, lifecycle status. 2.
**Mutation summary:** operation, selector, configured property/value. 3.
**Verification:** latest run, outcome, viewport coverage, evidence
links. 4. **Conflict analysis:** conflicting patch, exact incompatible
operation, reason. 5. **History:** prior versions/events if actual data
exists. 6. **Actions:** edit draft, run verification, compare, discard,
or open release context as valid.

Actions must respect lifecycle rules. A released patch should not expose
draft-only operations unless the backend supports a new version
workflow.

### 5.5 Conflict-resolution view

This is a high-priority sub-flow and should be designed intentionally.

Header: - "Patch conflict" plus a clear blocked state. - Short
human-readable explanation.

Comparison: - This patch: name, selector, operation/property, configured
value. - Competing patch: same fields. - A direct statement of the
incompatibility, e.g. one patch hides the element while another attempts
to modify its style. - Evidence showing why the collision was detected,
where available.

Resolution choices: - Keep this patch. - Keep competing patch. - Revise
the value/operation. - Discard the relevant draft.

Rules: - Clearly distinguish which patch each action affects. - Confirm
destructive/discard actions. - Do not let a UI action bypass backend
collision checks. - After resolution, refresh state from the server and
show the resulting status. - If a resolution still leaves a conflict,
explain that the release remains blocked.

### 5.6 Empty/error states

-   No patches: explain how to create a draft from Studio.
-   No search matches: offer to clear filters.
-   Patch missing/deleted: show a not-found state and safe navigation.
-   Conflict data unavailable: say it could not be loaded; do not invent
    competing details.

------------------------------------------------------------------------

## 6. Page 3 --- Releases & Rollback

### 6.1 Purpose

Create versioned release bundles from eligible patches, inspect deployed
releases, and roll back safely.

### 6.2 Page hierarchy

1.  Compact page heading: "Releases".
2.  Contextual primary action: "Create release bundle".
3.  Active deployment summary.
4.  Release history.
5.  Release details and rollback actions.

Do not use a large empty hero card that pushes the actual release
history below the fold.

### 6.3 Active deployment summary

Show: - Active release ID/version, or a clear "Baseline --- no active
release" state. - Target website. - Release timestamp if available. -
Number of patches in the release. - Health state only if derived from a
real health check. - Contextual action: inspect active release or
rollback, depending on state.

If no active release exists, do not display a rollback button as though
it were actionable. If the button is shown disabled, explain why.

### 6.4 Release history

Prefer a compact timeline or table with: - Release/version identifier. -
Release notes/summary. - Included patch count. - Verification/release
status. - Created/published timestamp. - Available actions.

Clicking a row opens a release detail panel or route. Avoid embedding
all release details in the list.

### 6.5 Create-release flow

Dialog or dedicated focused panel: 1. Release summary/notes. 2. List of
eligible verified patches. 3. Patch selection and count. 4. Excluded
patches with reasons, where helpful. 5. Preflight validation. 6. Publish
confirmation.

Safety requirements: - Backend must validate eligibility regardless of
frontend state. - Draft, failed, conflicting, or unverified patches must
not be publishable unless the server's documented rules explicitly allow
them. - Show exact release-gate failures. - Disable publishing while the
request is in progress to prevent duplicates. - Handle
timeouts/idempotency safely. - Do not display a release as published
until the server confirms it.

### 6.6 Rollback flow

Confirmation must identify: - Release currently active. -
Release/baseline being restored. - Patches expected to be affected. -
Known limitations or unavailable information.

After confirmation: - Call the existing rollback API. - Display progress
only while the request is genuinely in flight. - Refresh release and
health state. - Confirm success only after backend acknowledgement. - If
rollback fails, preserve the current displayed state and show the
failure reason.

### 6.7 Empty/error states

-   No releases: show a concise first-release explanation and link to
    eligible patches/Studio.
-   No eligible patches: explain that verified, conflict-free patches
    are needed.
-   Release history unavailable: show a retry action.
-   Rollback unavailable: explain why it cannot be performed.

------------------------------------------------------------------------

## 7. Page 4 --- Health Monitor

### 7.1 Purpose

Inspect post-release patch health and detect drift, missing targets, or
regressions.

### 7.2 Page hierarchy

1.  Compact heading and "Run health check" action.
2.  Current monitoring target and last successful/attempted check.
3.  Overall health state.
4.  Diagnostic list.
5.  Recent check history.

Do not repeat the same baseline sentence in several sections. Use
available space for diagnostics or a meaningful empty state.

### 7.3 Overall state

Supported states should map to real backend results: - Healthy. -
Warning. - Degraded/failed. - Unavailable/unknown. - Baseline/no active
patches.

The state must include text, not just color. "Unknown" is not the same
as "healthy".

### 7.4 Diagnostic list

Group results by: - Active patch status. - Target element
present/missing. - Fingerprint re-resolution result. - Drift/conflict
finding. - Regression/verification finding. - Rollback recommendation,
only where justified.

Each diagnostic: - Clear title. - Severity. - Affected patch/selector. -
Last checked time. - Evidence/details. - Contextual next action.

### 7.5 Run health check

-   Disable repeated submissions while a check is active unless
    concurrent checks are explicitly supported.
-   Show a real progress indicator or simple pending state.
-   Avoid duplicate notifications for one check.
-   Display result counts only when they come from the response.
-   Keep previous results visible until the new check finishes, marked
    as previous/stale if appropriate.
-   On failure, distinguish "health check failed to run" from "health
    check ran and found a problem".

### 7.6 Empty/error states

-   No active patches: clearly explain that only released patches can be
    monitored.
-   No checks yet: offer to run the first check.
-   Target unavailable: show connection status and retry.
-   Partial diagnostics: identify which checks could not complete rather
    than claiming overall health.

------------------------------------------------------------------------

## 8. Page 5 --- Audit Trail

### 8.1 Purpose

Provide an inspectable chronology of patch changes, verification runs,
releases, conflicts, health checks, and rollbacks.

### 8.2 Layout

-   Compact heading.
-   Search input.
-   Filter controls for event type, patch, release, and outcome where
    supported.
-   Main chronological table/list.
-   Event detail panel.

### 8.3 Event row

Show: - Event type and human-readable summary. - Related
entity/patch/release. - Timestamp. - Outcome. - Actor/source only if
actually recorded.

Avoid excessive badges. One status indicator per row is usually enough.

### 8.4 Event details

Show the stored event data in a readable hierarchy: - What happened. -
When it happened. - Related entity. - Outcome and error reason. -
Relevant metadata/evidence, where available. - Navigation to the
associated patch or release.

Do not fabricate actor identity, client IP, or timestamps when those
fields are not stored.

### 8.5 Empty/error states

-   No events: explain which actions create audit entries.
-   No matching filters: offer to clear filters.
-   Event details unavailable: retain the list and show a local error in
    the detail panel.

------------------------------------------------------------------------

## 9. Shared dialogs and interaction specifications

### 9.1 New Patch Draft

Fields: - Patch name. - Target selector. - Target tag/context if
supported. - Operation type. - Operation-specific inputs.

Behavior: - Prefill target/selector when launched from a selected
element. - Validate required fields and allowed operations. - Keep
validation adjacent to the relevant field. - Preserve user-entered
values if a request fails. - Do not allow arbitrary code execution or
arbitrary JavaScript injection. - Use a clear "Create draft" action;
draft creation is not publication.

### 9.2 AI Hotfix

Flow: 1. Describe the bug/change. 2. Optional selector/tag context. 3.
Request a proposal. 4. Review the structured proposal. 5. Inspect
assumptions, expected impact, and supported operation. 6. Save as draft.
7. Run normal preview and verification.

Requirements: - Explicitly identify mock/heuristic mode when no actual
AI provider is configured. - Validate provider output against a strict
schema. - Treat model output as untrusted input. - Reject unsupported
selectors/operations/values. - Never execute arbitrary generated code. -
Never auto-publish. - Never bypass conflict detection or release
gates. - Display confidence only if its meaning and calculation are
defined. - Separate confirmed facts from model assumptions.

### 9.3 Verification drawer/dialog

Display: - Verification run state. - Named checks. - Actual per-check
outcomes. - Viewport/test coverage. - Screenshots/diffs only if
generated. - Failure messages and next actions. - Release-gate status.

Avoid a success banner that contradicts a blocked release state.
Distinguish "verification passed" from "release eligible".

### 9.4 Confirmation dialogs

Use confirmation for destructive or production-impacting operations.
Explain the consequence in plain language. Do not use a confirmation
modal for every minor interaction.

### 9.5 Keyboard and focus

-   All actions must be keyboard reachable.
-   Use visible focus indicators.
-   Keep focus within modal dialogs while open and restore it to the
    trigger on close.
-   Escape closes non-destructive dialogs where appropriate.
-   Do not capture global shortcuts while the user is typing in an
    input.
-   Support reduced motion.

------------------------------------------------------------------------

## 10. Motion, scrolling, and perceived performance

Motion is a supporting detail, not the product identity.

### Suggested timing targets

  Interaction                     Target duration
  ----------------------------- -----------------
  Hover/focus surface changes          100--160ms
  Menu/popover                         120--180ms
  Dialog entry/exit                    160--220ms
  Inspector/drawer transition          180--240ms
  Related layout transition            180--280ms

Use CSS transitions for simple hover/focus changes. Use Motion for React
selectively for modal presence, drawer transitions, and layout changes
where it materially improves continuity.

### Performance requirements

-   Prefer `transform` and `opacity` for animated movement/fades.
-   Avoid animating width/height/top/left repeatedly when a transform or
    simpler transition is possible.
-   Never animate every card or list item on initial page load.
-   Avoid scroll-linked decorative animation.
-   Respect `prefers-reduced-motion`.
-   Avoid layout shift when loading icons, fonts, images, or evidence.
-   Preserve iframe identity and selection state through ordinary React
    updates.
-   Avoid unnecessary React remounts when switching tabs.
-   Use stable keys for lists.
-   Do not add a large animation dependency if CSS is enough.
-   Test repeated rapid clicks, viewport switching, drawer toggling, and
    navigation for flicker or stale state.

### Scroll model

-   Main page scroll should be rare on the Studio desktop layout.
-   Canvas scroll belongs to the canvas viewport.
-   Inspector scroll belongs to the inspector.
-   Evidence drawer scroll belongs to the drawer when content exceeds
    its height.
-   Avoid nested scroll containers with competing wheel behavior.
-   On smaller screens, simplify/collapse panels rather than compressing
    every desktop panel.
-   Test keyboard scrolling, trackpads, wheel input, and browser zoom.

------------------------------------------------------------------------

## 11. Safe React migration strategy

**The React migration must be additive, staged, reversible, and isolated
from the core patching system.**

### 11.1 Preserve existing boundaries

Known package boundaries from the current project context: -
`packages/contracts` - `packages/server` - `packages/runtime` -
`packages/verification` - `packages/dashboard` - `packages/storefront`

Antigravity must inspect the actual current repository before relying on
this list. Do not rename/move packages without a compelling reason.

Keep these stable: - Existing API routes and payload contracts. - Patch
lifecycle/status meanings. - DOM patch runtime. - Iframe/bridge protocol
and origin validation. - Verification engine and evidence format. -
Conflict detection and release-gate logic. - Release/rollback
semantics. - Existing JSON persistence and its limitations. - Storefront
development server and fixture behavior.

Do not use the UI migration as a reason to rewrite backend architecture,
database storage, authentication, or runtime behavior.

### 11.2 Pre-migration safety checkpoint

Before editing: 1. Inspect `git status`, current branch, recent commits,
package scripts, and workspace structure. 2. Preserve user changes.
Never reset, clean, or overwrite uncommitted work. 3. Read the existing
implementation report and architecture/audit notes, but verify claims
against source. 4. Identify the actual dashboard entry point, current
static assets, API calls, bridge code, and server route. 5. Run the
current baseline tests/build/typecheck and save the results. 6. Record
screenshots of all existing pages and critical flows. 7. Create a
dedicated feature branch or checkpoint commit if the user workflow
permits; do not switch branches or commit automatically without
considering the current work state. 8. Record a list of known failures
separately from new migration regressions.

If the baseline is already failing, do not claim the migration
introduced all failures. Record the baseline and compare after each
stage.

### 11.3 Introduce React without replacing the dashboard server prematurely

Preferred path: - Add React, React DOM, TypeScript if not already
available, Vite, and the minimum required UI dependencies to the
dashboard workspace. - Use the existing dashboard directory and
workspace conventions. - Configure Vite to build the dashboard into a
known output directory served by the existing dashboard server. - Keep
the existing dashboard server responsible for serving the built frontend
and any current server-side behavior it actually provides. - Confirm the
development workflow and production-like build separately. - Do not
expose Vite's development server as the production server. - Avoid a
second API server or unnecessary proxy layer. - Keep the storefront on
its existing server/port.

Before implementing, inspect the existing npm workspace scripts and
choose compatible package versions. Do not blindly copy setup commands
from a tutorial.

### 11.4 Migration stages and gates

#### Stage A --- Build foundation

-   Add the React/Vite entry point.
-   Render a minimal shell only.
-   Verify development server, production build, and existing dashboard
    serving.
-   Confirm existing API health checks still work.

**Gate:** existing server, storefront, and backend tests still pass;
dashboard loads from the expected URL.

#### Stage B --- API client and types

-   Create a small typed API client for existing routes.
-   Reuse shared contracts from `packages/contracts` where practical.
-   Centralize base URL, JSON parsing, error handling, timeouts, and
    response validation.
-   Do not duplicate backend business rules in the frontend.
-   Do not store secrets in browser environment variables.

**Gate:** smoke-test every endpoint used by the current UI; payloads
match the backend.

#### Stage C --- Shell and design system

-   Build global header, navigation, design tokens, buttons, fields,
    status labels, dialogs, and notification handling.
-   Introduce shadcn/ui components selectively.
-   Use Lucide consistently.
-   Do not migrate all pages at once.

**Gate:** keyboard/focus states, responsive shell, and visual tokens
work without breaking current app access.

#### Stage D --- Studio Canvas integration

-   Mount the existing target iframe using a stable component/ref.
-   Preserve the existing message protocol and strict origin validation.
-   Add typed message handling where feasible without changing protocol
    semantics.
-   Clean up event listeners on unmount.
-   Avoid sending secrets or privileged backend data to the iframe.
-   Verify selection, preview, viewport switching, reset, and
    bridge-disconnected states.

**Gate:** selecting an element and applying a preview work end-to-end;
React state updates do not reset the iframe or lose selection
unexpectedly.

#### Stage E --- Patch Explorer

-   Integrate actual patch list/detail APIs.
-   Add filtering, conflict presentation, and supported resolution
    actions.
-   Handle loading, empty, error, and stale states.
-   Keep backend conflict checks authoritative.

**Gate:** conflict-resolution workflow passes existing tests and manual
smoke checks.

#### Stage F --- Releases, Health, Audit

-   Integrate each existing endpoint independently.
-   Use actual response states and data.
-   Add release/rollback confirmation and deduplicated notifications.
-   Ensure health and release state refresh after successful mutations.

**Gate:** release, rollback, health check, and audit navigation work
end-to-end.

#### Stage G --- Remove legacy frontend safely

-   Only after the React app is feature-complete, compare routes,
    actions, and flows.
-   Remove legacy frontend code only when nothing still references it.
-   Keep a clear rollback path through Git.
-   Do not leave two competing implementations accidentally served.
-   Update package scripts and documentation.

**Gate:** clean build, no broken imports/routes, and the expected
dashboard URL serves the React app.

#### Stage H --- Visual and regression QA

-   Capture screenshots at supported widths.
-   Run all tests, typecheck, build, and browser tests.
-   Check console errors and failed network requests.
-   Exercise the complete demo flow.
-   Compare before/after screenshots and investigate regressions.

**Gate:** all critical workflows pass and the final report separates
verified results from unresolved risks.

### 11.5 Rollback plan

If a migration stage breaks critical behavior: 1. Stop advancing to the
next stage. 2. Capture the error, relevant console/network output, and
changed-file list. 3. Revert only the problematic stage's changes, not
the user's unrelated work. 4. Restore the last known working dashboard
entry/build configuration. 5. Re-run baseline smoke tests. 6. Record the
issue and resume from the last safe checkpoint.

Never use `git reset --hard`, `git clean -fd`, blanket file deletion, or
destructive automated cleanup as a convenience.

### 11.6 Security and correctness safeguards

-   Keep server-side release gates authoritative.
-   Treat iframe `postMessage` input as untrusted; validate origin,
    message type, schema, and allowed operation.
-   Do not broaden origin allowlists to "fix" bridge issues.
-   Validate URLs and avoid unsafe arbitrary target origins.
-   Prevent untrusted HTML/AI text from being inserted with unsafe HTML
    APIs.
-   Keep AI-generated proposals schema-constrained and draft-only.
-   Avoid logging secrets, tokens, or sensitive page content.
-   Do not introduce authentication claims unless authentication is
    actually implemented.
-   Keep verification resource limits and server-side protections
    intact.
-   Do not treat client-side disabled buttons as security enforcement.
-   Avoid new persistent state unless required; document its lifecycle
    and recovery behavior.
-   Keep errors actionable without exposing stack traces or secrets to
    end users.

------------------------------------------------------------------------

## 12. Dependencies: install only what the design needs

Suggested stack: - `react` - `react-dom` - `vite` - `typescript` if not
already installed/configured - `lucide-react` - `tailwindcss` only if it
fits the current CSS strategy and can be introduced safely -
shadcn/ui-generated components or the necessary Radix-based primitives -
`motion` only if meaningful transitions require it

Before adding dependencies: - Inspect what is already installed. - Check
package compatibility and current Node requirements. - Avoid installing
both overlapping libraries for the same job. - Avoid a full component
library if only a few primitives are needed. - Do not force Tailwind if
a well-structured CSS module/stylesheet approach is safer for the
existing repo. - Lock versions using the project's existing lockfile
conventions. - Ensure the normal npm install/build works without Bun if
the project has chosen native Node/npm as its supported toolchain.

Recommended component selection: - Dialog/AlertDialog for modals and
destructive confirmations. - Tooltip for icon-only controls. - Tabs only
where a small set of related views genuinely benefits. - DropdownMenu
for secondary actions. - Command for the command palette if it can be
integrated without excessive dependencies. - Select/Combobox for
operation and target selection. - Toast/Sonner or the existing
notification implementation, but only one notification system. -
Resizable panels only if the package adds real value; otherwise use CSS
grid/flex with simple collapse behavior.

Do not adopt every component simply because it exists.

------------------------------------------------------------------------

## 13. Responsive specifications

### Desktop: 1280px and above

-   Full global shell.
-   Studio: optional left rail + central canvas + right inspector +
    collapsible evidence drawer.
-   Patch Explorer: list pane + detail pane.
-   Releases, Health, Audit: compact header and data-first content.
-   No unnecessary document-level horizontal scroll.

### Compact desktop/laptop: 1024--1279px

-   Collapse the left Studio rail by default if necessary.
-   Narrow the inspector but maintain usable controls.
-   Move secondary toolbar controls into an overflow menu.
-   Keep canvas dimensions useful.
-   Avoid forcing all page content into fixed widths.

### Tablet: 768--1023px

-   Use a reduced shell.
-   Inspector becomes a drawer or tabbed side panel.
-   Patch list/detail can switch to a list-first navigation model.
-   Release/health/audit tables may use responsive rows or a focused
    detail view.
-   Ensure touch targets remain usable.

### Phone: below 768px

-   Treat the interface as a companion for inspecting patches, reviewing
    evidence, and checking status---not a full desktop editor compressed
    to phone width.
-   Use a compact navigation pattern.
-   Make inspector and detail content single-column.
-   Keep the actual website's mobile viewport preview independent from
    the dashboard's responsive layout.
-   Do not hide critical release-gate warnings.
-   Ensure dialogs fit the viewport and can scroll internally without
    trapping content.

------------------------------------------------------------------------

## 14. Testing and acceptance checklist

### Functional

-   [ ] Dashboard starts from the documented command.
-   [ ] Dashboard is served from the expected URL/port.
-   [ ] Target storefront is served independently.
-   [ ] Target selector and connection state reflect actual behavior.
-   [ ] Element selection works through the existing bridge.
-   [ ] Selection survives normal React updates.
-   [ ] Supported mutation can be previewed.
-   [ ] Draft creation and editing work.
-   [ ] Verification shows actual per-check results.
-   [ ] Conflict detection and resolution work.
-   [ ] Release gate cannot be bypassed from the frontend.
-   [ ] Release bundle can be created only from eligible patches.
-   [ ] Rollback refreshes deployment state after backend confirmation.
-   [ ] Health check produces one notification/result update per action.
-   [ ] Audit entries navigate to the correct patch/release.
-   [ ] AI/mock mode is labelled honestly.
-   [ ] Failed requests preserve useful form state and show actionable
    errors.

### Visual

-   [ ] Studio canvas is the primary visual focus.
-   [ ] Each page has a distinct information hierarchy.
-   [ ] No excessive nested cards.
-   [ ] No decorative gradients/glows or fake data.
-   [ ] Consistent Lucide icon style.
-   [ ] Text, controls, and status labels remain readable.
-   [ ] Focus indicators are visible.
-   [ ] No clipped modal buttons or form fields.
-   [ ] No duplicate notifications.
-   [ ] No accidental nested scrollbars.
-   [ ] No horizontal overflow at the supported widths.
-   [ ] Reduced-motion mode is respected.
-   [ ] Loading and empty states are designed rather than blank.
-   [ ] Screenshots are captured from the actual running application.

### Engineering

-   [ ] Baseline test results are recorded before migration.
-   [ ] Tests, typecheck, and build pass after migration, or every
    remaining failure is documented against baseline.
-   [ ] No unexpected API contract changes.
-   [ ] No runtime/verification/release logic was rewritten
    unnecessarily.
-   [ ] No iframe origin-validation regression.
-   [ ] No new console errors or unhandled promise rejections.
-   [ ] No unused legacy dashboard is still being served accidentally.
-   [ ] Repository structure and documentation remain organized.
-   [ ] Temporary screenshots/logs are stored in established locations
    or cleaned up safely.
-   [ ] Final report distinguishes tests actually run from tests merely
    inferred.

------------------------------------------------------------------------

## 15. Suggested demo journey

The UI should support a short, coherent demonstration:

1.  Open Studio with the AeroStyle target loaded.
2.  Select the checkout/Add to Cart element.
3.  Inspect its selector and current properties.
4.  Create a safe style patch.
5.  Preview the mutation at desktop and mobile viewport sizes.
6.  Run verification and inspect actual evidence.
7.  Introduce or select a known conflicting patch.
8.  Show the release gate explaining the conflict.
9.  Resolve the conflict using the supported workflow.
10. Create a release bundle from eligible patches.
11. Inspect the release and run a health check.
12. Demonstrate rollback only if the backend state supports it.
13. Open the audit trail to show the recorded actions.

Do not force every step into one screen. Preserve context and make each
state change understandable.

------------------------------------------------------------------------

## 16. Instructions for the implementing agent

Before editing, inspect the actual repository, current Git state, source
files, package scripts, and current browser behavior. Treat this
document as the target specification, not permission to overwrite
working code blindly.

Work autonomously through the staged plan, but stop at a gate when a
critical test or safety condition fails. Do not pause for approval after
every small file edit; do pause before destructive repository operations
or a change that would invalidate a core architecture boundary.

Maintain the existing monorepo organization and naming conventions. Put
new files in the correct established directories, update source-of-truth
documentation, and avoid duplicate components, duplicate stylesheets, or
temporary files accumulating in the repository.

Do not claim a feature, test, screenshot, accessibility result, or build
is complete unless it was actually checked. Include commands executed,
outcomes, unresolved issues, screenshots captured, and the exact
rollback point in the final implementation report.

**Final success criterion:** PATCHWORK looks and behaves like a
cohesive, canvas-first visual patching workbench; the React migration is
reversible; and the existing patching, verification, release, rollback,
and audit systems continue to work.
