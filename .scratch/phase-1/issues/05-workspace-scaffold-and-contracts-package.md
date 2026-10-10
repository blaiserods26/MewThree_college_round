# 05: Workspace Scaffold and Shared Contracts Package

**What to build:** Foundational monorepo/workspace setup with a shared contracts library containing the TypeScript types, state transition validators, and operation allowlists. Provides a working test suite verifying contract integrity and sets up the clean directory layout for the demo storefront, dashboard, runtime, and verification worker for Phase 2 implementation.

**Blocked by:** 04: Data Contracts and Type Definitions

**Status:** ready-for-agent

- [x] Initialize the workspace repository with package scripts and configuration.
- [x] Create a shared contracts package exporting types, schemas, and transition validation functions.
- [x] Implement unit tests validating that illegal state transitions and disallowed operations throw errors.
- [x] Create stub folder structures for demo storefront, dashboard UI, runtime, and verification worker.
- [x] Provide clear setup and verification commands (`npm test` / typecheck).
