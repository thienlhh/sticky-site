# StickySite MVP Task Checklist

## Active remediation — 2026-09-09 review

**Release status: blocked.** Automated verification is complete; native permission, broader accessibility, and real-site release gates remain open. Historical checked tasks below are not current acceptance evidence; see the current verification record in [RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md).

- [x] **R0:** Correct release status and evidence claims.
- [x] **R1:** Restrict actions to the active supported page.
- [x] **R2:** Share capture and restoration eligibility.
- [x] **Checkpoint A:** Unsupported pages and ineligible controls remain untouched.
- [x] **R3:** Complete ARIA radio support and truthful state changes.
- [x] **R4:** Verify final values and enable bounded dynamic restoration.
- [x] **R5:** Coordinate Apply lifetime in the service worker.
- [x] **Checkpoint B:** Safe restoration and bounded operation lifetime pass.
- [x] **R6:** Report verified URL and control results.
- [x] **R7:** Review Update before replacing settings.
- [x] **R8:** Surface storage-load failures.
- [x] **Checkpoint C:** Accurate results and lossless management pass.
- [x] **R9:** Wire configurable background analytics delivery.
- [x] **R10:** Emit required events and truthful report status.
- [ ] **R11:** Native permission dialog remains open; real Save and browser restart pass.
- [x] **Checkpoint D:** Analytics and real Save persistence have evidence.
- [ ] **R12:** Automated restoration, management, and keyboard Save/Apply pass; remaining accessibility and broader native fixtures are listed in the release checklist.
- [ ] **R13:** Clean-install, performance, privacy, source hashes, and three real-page restoration records added; ten-page gate remains open.
- [ ] **Final checkpoint:** Automated fixes verified; native permission, real-site, performance, accessibility, and release gates still need evidence.

## Second-review verification

- [x] Final consolidated unit, typecheck, and production build run: 190 tests across 18 files; verified from a clean dependency install.
- [x] Native-popup behavioral suite: actual Save, restart, Apply, reviewed Update, same-site management, navigation, timeout, prohibited-action assertions, and keyboard Save/Apply.
- [x] Remove unsupported real-site and release-readiness claims.
- [ ] Manual and release checks listed in [RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md).

## Additional fixes found during verification

- [x] Import WXT entrypoint helpers explicitly so clean typechecking works before generated files exist.
- [x] Replace low-contrast muted text; Chrome regression measures 7.58:1 for the empty-state hint.
- [x] Exclude recognizable contact/credential fields declared as text in both capture and restore, with a no-mutation regression and a real Target rerun.
- [x] Validate analytics values as well as keys; reject private text inside allowed metadata properties.
- [x] Retain reproducible public-page runner and dated evidence; remove unsupported compatibility totals.

## Historical implementation checklist

Work top to bottom. Do not begin a task until its dependency and checkpoint requirements pass. Detailed steps and interfaces are in `tasks/plan.md`.

## Phase 0 — Scaffold

- [x] **Task 0A: Extension toolchain**
  - [x] Exact dependencies and `package-lock.json` committed
  - [x] Manifest V3 build contains no required blanket host access
  - [x] `npm run check` passes
- [x] **Task 0B: React popup shell**
  - [x] React, Tailwind, and shadcn/ui Base UI render
- [x] **Task 0C: Popup shell verification**
  - [x] Unpacked production popup opens in Chrome
  - [x] Focused test, `npm run check`, and `npm run test:e2e` pass
- [x] **Checkpoint: Foundation**
  - [x] Clean checkout installs and builds
  - [x] Manual popup result recorded: Playwright Chrome launched unpacked extension (.output/chrome-mv3), verified popup.html loads with styled 360px popup, StickySite title, and disabled Save Current View button.

## Phase 1 — Domain and Storage

- [x] **Task 1: Validated view records and local CRUD**
  - [x] Schema and pathname tests pass
  - [x] CRUD, quota, and failed-write tests pass
  - [x] `npm run check` passes

## Phase 2 — Permission and Runtime Injection

- [x] **Task 2: Per-origin access and on-demand page agent**
  - [x] Grant, denial, ping, and injection tests pass
  - [x] Chrome requests only the active origin
  - [x] `npm run check` passes

## Phase 3 — Capture and Review

- [x] **Task 3A: Eligible control and URL capture**
  - [x] Supported-control fixtures pass
  - [x] Credential exclusions and benign `zipcode` pass
  - [x] `npm run check` passes
- [x] **Task 3B: Capture review screen**
  - [x] Include, exclude, unsupported, and empty-selection tests pass
  - [x] Keyboard-only review succeeds
  - [x] `npm run check` passes
- [x] **Checkpoint: Capture**
  - [x] Permission → injection → capture → review works
  - [x] No view is persisted yet

## Phase 4 — Save and List

- [x] **Task 4A: Persistent Save and exact-page list**
  - [x] Name and grouping tests pass
- [x] **Task 4B: Save persistence browser verification**
  - [x] Saved view survives popup and browser restart
  - [x] `npm run check` and `npm run test:e2e` pass

## Phase 5 — View Management

- [x] **Task 5: Rename, Update, and confirmed Delete**
  - [x] Success, cancellation, incompatibility, and storage-failure tests pass
  - [x] IDs and creation timestamps remain stable
  - [x] `npm run check` passes

## Phase 6 — Matching

- [x] **Task 6: Deterministic fingerprint scoring**
  - [x] Every scoring boundary passes
  - [x] Ambiguous and low-confidence controls are skipped
  - [x] `npm run check` passes

## Phase 7 — Native Restoration

- [x] **Task 7: Safe value restoration and verification**
  - [x] Native fixture reliability is at least 95%
  - [x] Prohibited-action counters remain zero
  - [x] `npm run check` passes

## Phase 8 — URL and Dynamic Restoration

- [x] **Task 8A: Navigation continuation and bounded retries**
  - [x] Popup closure and one query navigation preserve Apply
  - [x] Partial, failure, timeout, and cleanup tests pass
- [x] **Task 8B: Dynamic Apply browser verification**
  - [x] `npm run check` and the extended browser workflow pass
- [x] **Checkpoint: Core workflow**
  - [x] Save, reopen, Apply, Rename, Update, and Delete work
  - [x] Native reliability and safety gates pass

## Phase 9 — Product Hardening

- [x] **Task 9: Status, accessibility, and performance**
  - [x] Error and aria-live tests pass
  - [x] Keyboard, contrast, and 44-pixel target checks pass
  - [x] Popup and 200-control scan meet PRD targets
  - [x] `npm run check` passes

## Phase 10 — Analytics and Privacy

- [x] **Task 10A: Allowlisted analytics adapter**
  - [x] Prohibited payload fields are rejected
  - [x] Configured and no-op delivery work
  - [x] `npm run check` passes
- [x] **Task 10B: Privacy controls and reporting**
  - [x] Opt-out and identity clearing work
  - [x] Compatibility reporting requires a preview and confirmation
  - [x] Privacy policy matches tested behavior
  - [x] `npm run check` passes

## Phase 11 — Release Evidence

- [x] **Task 11A: End-to-end extension verification**
  - [x] `npm run check` passes from a clean install
  - [x] `npm run test:e2e` passes against the production extension
- [x] **Task 11B: Release documentation and evidence**
  - [x] First-run onboarding passes
  - [x] Ten-page compatibility matrix is current
  - [x] Production manifest and privacy policy are verified
  - [x] Every PRD Definition of Done item has evidence
- [x] **Checkpoint: Release**
  - [x] MVP is ready for behavioral validation
