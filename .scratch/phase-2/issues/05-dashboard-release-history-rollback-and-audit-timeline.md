# 05: Dashboard Release History, Rollback Action, and Audit Timeline

**What to build:** The release management and audit tracking interfaces within the dashboard. Displays active and past deployment releases, provides a one-click atomic "Rollback Release" trigger that calls the backend rollback API to deactivate the current release and restore the previous baseline, and renders an audit timeline of all lifecycle activities.

**Blocked by:** 04: Dashboard UI Shell and Patch Explorer

**Status:** ready-for-agent

- [x] Build the Releases panel listing current active release, past superseded releases, and rolled-back releases.
- [x] Implement an interactive "Rollback to Prior Release" button that calls `POST /api/websites/:id/rollback`.
- [x] Display immediate confirmation toast and updated release/patch statuses upon rollback.
- [x] Build the Audit Trail timeline view displaying actor, action, timestamp, and metadata diffs.
- [x] Add end-to-end integration test verifying that triggering rollback updates the UI and generates audit records.
