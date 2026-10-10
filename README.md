# PATCHWORK: demo runbook

PATCHWORK patches a live website's DOM without redeploying it, verifies each patch in a real
browser, and can publish or roll back releases instantly. This runbook covers running the demo
from a clean clone, resetting it, and recovering when something breaks.

## Requirements

- Node.js 20+ and npm
- [Bun](https://bun.sh) (runs the test suite and the dev server)
- Chromium for Playwright: `npx playwright install chromium`

## Clean start

```bash
git clone <repo> && cd MewThree_college_round
npm install
npx playwright install chromium
npm run build        # contracts -> verification -> server -> runtime (order matters)
npm run typecheck
npm test             # full suite incl. the end-to-end lifecycle scenario
```

Run the three processes (each in its own terminal):

```bash
npm run start --workspace=packages/server       # API        http://localhost:4000
npm run start --workspace=packages/storefront   # Storefront http://localhost:3000
npm run start --workspace=packages/dashboard    # Dashboard  http://localhost:5173
```

Configuration is via environment variables, all optional. See [.env.example](.env.example).
There are no API keys or secrets. The database is a single JSON file (default
`packages/server/data/patchwork-db.json`) that is created and seeded automatically on first start,
so a clean checkout needs no migrations.

## Resetting the demo

Return to the known baseline (one website, no patches/releases/audit history):

```bash
# Option A: server stopped
npm run demo:reset

# Option B: server running; start it with ENABLE_DEMO_RESET=true, then
curl -X POST http://localhost:4000/api/admin/reset
```

Then refresh the dashboard. Its saved selection is discarded automatically if the patch no
longer exists. If the database file is ever unreadable, the server keeps it as
`<db>.corrupt-<timestamp>` and starts from the baseline instead of overwriting it.

## Recovery cheat-sheet

| Symptom | Fix |
| --- | --- |
| Dashboard shows "Engine Offline" | Start the API (port 4000); press **Retry** on the panel. |
| Verification fails with "worker could not start" or "timed out" | Run `npx playwright install chromium`, confirm the storefront is up on port 3000, re-run verification. A hung worker is killed automatically after 90s. |
| Publish blocked | Open the patch: it is unverified, stale, or in conflict. Fix that, re-verify, publish again. |
| Live page looks wrong | Click **Rollback Release** on the Releases tab; it restores the previous release (or the unpatched baseline if none). |
| Everything looks wrong | `npm run demo:reset`, then re-run the scenario below. |

## Demo scenario (about 3 minutes)

1. Open the dashboard and storefront; show the baseline checkout button.
2. Inspect the button, create a patch (background colour), **Preview** it.
3. **Run Verification** (Desktop + Mobile Playwright run), then **Publish**; the live site updates.
4. Change the storefront structure (`?drift` layout) and show the stale-target warning and rebind.
5. Create a conflicting patch; show conflict detection and resolve it.
6. Run a failing patch; show that publication is blocked.
7. **Rollback**; show the page and the audit trail agree.

The same flow runs unattended as `bun test packages/server/test/lifecycle-e2e.test.ts` (twice, with
a reset between runs), which is the quickest pre-demo smoke check.

## Backup recording

Record the scenario above once on a good run (screen recorder of your choice) and keep it
alongside the repo, e.g. `docs/demo-backup.mp4` (large binaries are git-ignored by default; share it
out-of-band). Play it if the venue network or live deployment fails.
