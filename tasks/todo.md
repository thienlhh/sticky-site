# StickySite MVP Task Checklist

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

- [ ] **Task 2: Per-origin access and on-demand page agent**
  - [ ] Grant, denial, ping, and injection tests pass
  - [ ] Chrome requests only the active origin
  - [ ] `npm run check` passes

## Phase 3 — Capture and Review

- [ ] **Task 3A: Eligible control and URL capture**
  - [ ] Supported-control fixtures pass
  - [ ] Credential exclusions and benign `zipcode` pass
  - [ ] `npm run check` passes
- [ ] **Task 3B: Capture review screen**
  - [ ] Include, exclude, unsupported, and empty-selection tests pass
  - [ ] Keyboard-only review succeeds
  - [ ] `npm run check` passes
- [ ] **Checkpoint: Capture**
  - [ ] Permission → injection → capture → review works
  - [ ] No view is persisted yet

## Phase 4 — Save and List

- [ ] **Task 4A: Persistent Save and exact-page list**
  - [ ] Name and grouping tests pass
- [ ] **Task 4B: Save persistence browser verification**
  - [ ] Saved view survives popup and browser restart
  - [ ] `npm run check` and `npm run test:e2e` pass

## Phase 5 — View Management

- [ ] **Task 5: Rename, Update, and confirmed Delete**
  - [ ] Success, cancellation, incompatibility, and storage-failure tests pass
  - [ ] IDs and creation timestamps remain stable
  - [ ] `npm run check` passes

## Phase 6 — Matching

- [ ] **Task 6: Deterministic fingerprint scoring**
  - [ ] Every scoring boundary passes
  - [ ] Ambiguous and low-confidence controls are skipped
  - [ ] `npm run check` passes

## Phase 7 — Native Restoration

- [ ] **Task 7: Safe value restoration and verification**
  - [ ] Native fixture reliability is at least 95%
  - [ ] Prohibited-action counters remain zero
  - [ ] `npm run check` passes

## Phase 8 — URL and Dynamic Restoration

- [ ] **Task 8A: Navigation continuation and bounded retries**
  - [ ] Popup closure and one query navigation preserve Apply
  - [ ] Partial, failure, timeout, and cleanup tests pass
- [ ] **Task 8B: Dynamic Apply browser verification**
  - [ ] `npm run check` and the extended browser workflow pass
- [ ] **Checkpoint: Core workflow**
  - [ ] Save, reopen, Apply, Rename, Update, and Delete work
  - [ ] Native reliability and safety gates pass

## Phase 9 — Product Hardening

- [ ] **Task 9: Status, accessibility, and performance**
  - [ ] Error and aria-live tests pass
  - [ ] Keyboard, contrast, and 44-pixel target checks pass
  - [ ] Popup and 200-control scan meet PRD targets
  - [ ] `npm run check` passes

## Phase 10 — Analytics and Privacy

- [ ] **Task 10A: Allowlisted analytics adapter**
  - [ ] Prohibited payload fields are rejected
  - [ ] Configured and no-op delivery work
  - [ ] `npm run check` passes
- [ ] **Task 10B: Privacy controls and reporting**
  - [ ] Opt-out and identity clearing work
  - [ ] Compatibility reporting requires a preview and confirmation
  - [ ] Privacy policy matches tested behavior
  - [ ] `npm run check` passes

## Phase 11 — Release Evidence

- [ ] **Task 11A: End-to-end extension verification**
  - [ ] `npm run check` passes from a clean install
  - [ ] `npm run test:e2e` passes against the production extension
- [ ] **Task 11B: Release documentation and evidence**
  - [ ] First-run onboarding passes
  - [ ] Ten-page compatibility matrix is current
  - [ ] Production manifest and privacy policy are verified
  - [ ] Every PRD Definition of Done item has evidence
- [ ] **Checkpoint: Release**
  - [ ] MVP is ready for behavioral validation
