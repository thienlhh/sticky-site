# StickySite MVP Task Checklist

## Active remediation — 2026-09-09 review

**Release status: blocked.** Follow the review-fix tasks in [plan.md](plan.md#active-work--review-fixes-2026-09-09). The completed phase checklist below records previous claims; it is not current release evidence. Complete focused verification and the project check before checking off a behavior task.

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
- [ ] **R11:** Prove permission, Save, and browser restart.
- [ ] **Checkpoint D:** Analytics and real Save persistence have evidence.
- [ ] **R12:** Prove restoration and management in Chrome.
- [ ] **R13:** Rebuild real-site, performance, privacy, and release evidence.
- [ ] **Final checkpoint:** All ten findings resolved; all PRD gates supported by current evidence.

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
