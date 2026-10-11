# Spec: Automated GitHub Actions Release & Hotfix-to-PR Reconciliation Pipeline

## Problem Statement

When production defects occur, operators use PATCHWORK to author, verify, and activate targeted DOM hotfixes live in seconds without redeploying the host application. However, this creates two major governance and lifecycle challenges:

1. **Production and Source Drift**: Live hotfixes deployed to production do not automatically persist back into the host repository's source code. Over time, subsequent application builds or standard deployments will overwrite or conflict with active hotfixes unless engineers manually translate each DOM mutation into CSS or template changes.
2. **Manual and Non-Standard Release Packaging**: Tagging GitHub releases, packaging signed release bundles, generating visual verification diffs, and orchestrating deployment artifacts across staging and production currently require manual execution rather than automated CI/CD workflows.

Operators and engineering teams need an automated pipeline that can package verified release bundles via GitHub Actions and backport active hotfixes directly into Pull Requests in the source repository.

## Solution

A two-part automated release governance extension to PATCHWORK:

1. **Automated GitHub Actions Release Workflow**:
   - Triggered automatically on Git version tags (`v*.*.*`) or manual workflow dispatch.
   - Executes full verification test gates (contracts, verification, server, runtime, dashboard).
   - Generates an immutable, signed release bundle artifact containing all active verified patches.
   - Publishes a formal GitHub Release with changelogs and Playwright visual proof diffs.
   - Deploys the release bundle directly to the production PATCHWORK platform.

2. **Hotfix-to-PR Codebase Reconciliation Bridge**:
   - Operators can trigger "Export to Pull Request" directly from any active release in the PATCHWORK Workbench.
   - The reconciliation engine translates allowlisted DOM mutations (`style.set`, `text.set`, `attribute.set`, `element.hide`) into standard CSS/HTML source changes.
   - Automatically opens an atomic GitHub Pull Request against the host repository (`hotfix/patchwork-vX.X.X-reconciliation`) with automated test coverage, closing the loop between emergency runtime hotfixing and permanent codebase maintenance.

## User Stories

1. As an operator, I want GitHub Actions to automatically run full typechecks and Playwright verification gates on release tags, so that broken hotfixes are never packaged into production distributions.
2. As an operator, I want automated GitHub Releases created with versioned release notes, so that stakeholders can trace which hotfixes were included in each deployed version.
3. As an operator, I want release bundle artifacts (`patchwork-release-vX.X.X.json`) uploaded as downloadable assets on each GitHub Release, so that releases can be archived and deployed deterministically across environments.
4. As a developer, I want a single-click action in the Workbench to convert an active release into a GitHub Pull Request, so that I do not have to manually reverse-engineer runtime hotfixes back into source files.
5. As a developer, I want the reconciliation engine to map allowlisted CSS mutations into persistent stylesheet modifications, so that styles patched at runtime become permanent in the codebase.
6. As a developer, I want the reconciliation engine to map text content mutations into template modifications, so that urgent copy changes persist across future application builds.
7. As a developer, I want the generated Pull Request to include the patch's verification evidence, visual diffs, and rationale, so that code reviewers have complete context without opening the Workbench.
8. As a release engineer, I want manual GitHub Actions workflow dispatch with environment parameters, so that I can trigger release deployments to staging or production on demand.
9. As an auditor, I want an immutable audit log entry recorded whenever a release is packaged by GitHub Actions or exported to a Pull Request, so that compliance tracking remains unbroken.
10. As a store operator, I want the GitHub Actions release job to notify Slack or Webhook endpoints upon successful deployment, so that customer support and product teams know the hotfix is live.
11. As a developer, I want the PR generator to check whether target source selectors still exist before generating the PR, so that stale drift in source code is caught immediately.
12. As a security engineer, I want GitHub Actions to sign release manifests cryptographically, so that tamper resistance is guaranteed between build and deployment.
13. As an operator, I want a dry-run preview of the generated Pull Request diff in the Workbench before opening the PR on GitHub, so that I can verify the code changes look clean and idiomatic.
14. As an operator, I want duplicate PR creation to be blocked if a reconciliation PR for the same release version is already open, so that repository noise is minimized.
15. As a developer, I want the backport PR branch to be cleanly branch-named following standard conventions (`patchwork/hotfix-vX.X.X`), so that automated CI checks on the host repository can easily identify hotfix PRs.

## Implementation Decisions

- **Unified Release Seam**: All release creation, whether initiated from the UI, API, or GitHub Actions, runs through the canonical release governance service. GitHub Actions acts as an authorized external actor invoking the existing release creation and verification gates.
- **Workflow Architecture**: The GitHub Actions workflow is defined with strict job ordering: lint/typecheck -> headless Playwright verification -> release bundling -> GitHub Release creation -> platform webhook deployment.
- **Backport Engine Protocol**: The reconciliation engine accepts an immutable release definition, resolves the target fingerprint selectors against known host assets, and produces structured patch chunks (CSS rule blocks or HTML attribute changes).
- **GitHub API Integration**: Pull Request creation utilizes standard GitHub REST API endpoints with GitHub App or personal token authentication, creating a remote branch, committing the translated files, and opening the PR with formatted markdown evidence.
- **Safety Gate Inheritance**: The reconciliation engine forbids processing any patch that has not passed Playwright automated verification; only `verified` or `published` patches can be backported to source code.
- **Zero Shell Injection**: Git operations and GitHub API interactions use programmatic APIs or SDKs rather than shell script concatenation, maintaining strict input sanitization.

## Testing Decisions

- **External Behavior Testing**: Tests will verify end-to-end behavior at the highest available seam: triggering the release bundling endpoint and asserting that valid release manifests, changelogs, and file diff representations are produced without inspecting internal helper functions.
- **Modules Tested**:
  - Release governance service (manifest generation, bundle validation).
  - Reconciliation service (DOM mutation to source diff translation).
  - GitHub Actions workflow definition (via workflow linter / synthetic mock dispatch).
- **Prior Art**: Follows the existing end-to-end testing conventions found in the test suite for release verification, rollback e2e, and audit event recording.

## Out of Scope

- Automatic merging of generated Pull Requests without human review (human approval and standard PR review policies remain strictly required).
- Automatic AST parsing of complex arbitrary React JSX components (reconciliation targets static assets, stylesheets, and template elements).
- Continuous real-time bi-directional live sync between source control and running DOM.

## Further Notes

- In environments without active GitHub CLI (`gh`), the Workbench will fall back to exporting downloadable `.patch` / unified diff files that developers can apply using `git apply`.
- This feature directly solves the primary operational objection to runtime hotfix platforms: *"How do we make sure our production fixes don't get lost when the next sprint ships?"*
