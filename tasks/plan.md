# StickySite MVP Implementation Plan

## Active work — Review fixes (2026-09-09)

**Status:** Release blocked pending manual and release gates in [RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md). The original implementation phases are archived in [mvp_plan.md](mvp_plan.md) for reference. Track remediation in [todo.md](todo.md).

**Scope:** Resolve the ten findings from the implementation review against [the PRD](../docs/PRD.md). Preserve the MVP scope, storage compatibility, matching thresholds, and dependency stack. This section takes execution precedence over historical phase sequences.

**Second review follow-up:** Automated verification and additional clean-install, contrast, contact-field, and analytics-validation fixes are complete. Native permission dialogs, broader accessibility checks, and the ten-page restoration gate remain open. Current evidence and remaining manual/release gates are recorded in [RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md); do not infer release readiness from historical task checkmarks.

**Baseline:** `npm run check` passed (190 tests across 18 files, typecheck, production build). Historical probes reproduced unsafe restoration, hidden capture/missing ARIA radios, forced ARIA success, and stale success after a later control resets an earlier value. Automated remediation is verified; native permission, broader accessibility, and real-site release gates remain open.

### Execution and verification

- Work in the order below; dependencies identify the minimum prerequisites.
- For each behavior fix, retain a focused regression test that fails before the fix. Run the named focused suite and `npm run check` before marking the task complete.
- Browser checkpoints must exercise the production extension on HTTP fixtures and assert actual page values and action counters, not merely a visible status message.
- Do not lower reliability thresholds, invent measurements, add blanket host permissions, or enable remote delivery without the PRD disclosures. No deployment is part of this plan.
- Documentation-only tasks require link, arithmetic, and evidence checks rather than new tests.

### R0 — Correct release status and evidence claims (P1, finding 10) [Verified]

**Dependencies:** None. **Scope:** Small.

**Files:** `docs/RELEASE_CHECKLIST.md`, `docs/COMPATIBILITY.md`.

**Acceptance:**
- Mark release readiness and contradicted gates as blocked or unverified, linking to these remediation tasks.
- Separate observed evidence from claims needing reruns. The existing matrix rows total 58 attempts and 56 restores, while its summary claims 55; flag the discrepancy without treating recalculation as validation of the rows.
- Remove claims that popup reopen proves browser restart or status visibility proves successful Apply.

**Verification:** Cross-check each retained claim against the actual test/assertion or dated run artifact. Final release evidence is rebuilt in R13.

### R1 — Restrict actions to the active supported page (P1, finding 6) [Verified]

**Dependencies:** R0. **Scope:** Medium.

**Files:** `src/platform/page-agent.ts`, its test, `entrypoints/popup/App.tsx`, its test.

**Acceptance:**
- An internal, extension, file, blocked, or inaccessible active page produces an actionable unavailable-page state; never substitute another web tab or the popup's URL.
- Save, Apply, and Update resolve the current tab at action time. Permission denial cannot lead to injection or mutation.
- Tests model the actual active HTTP tab instead of relying on production fallbacks for popup-as-tab testing.

**Verification:** `npx vitest run src/platform/page-agent.test.ts entrypoints/popup/App.test.tsx`; browser unavailable-page checks in R12.

### R2 — Share capture and restoration eligibility (P1, findings 1 and 7) [Verified]

**Dependencies:** R1. **Scope:** Medium.

**Files:** `src/capture/controls.ts`, `src/restoration/restore.ts`, their tests; one shared eligibility helper if needed.

**Acceptance:**
- Capture excludes non-rendered controls and all PRD-prohibited input/autocomplete categories; preserve top-level-only behavior and meaningful labels.
- Restore filters candidates before scoring and rechecks immediately before mutation. A saved text field changed to password, disabled, hidden, or otherwise prohibited is skipped without events or value changes.
- Use one eligibility policy for capture and restore; do not relax confidence thresholds to compensate for filtering.

**Verification:** `npx vitest run src/capture/controls.test.ts src/restoration/restore.test.ts`; real layout visibility and zero action counters verified in R12.

**Checkpoint A:** [Verified] R1–R2 regression tests and project check pass; unavailable pages cannot redirect actions and ineligible fields remain untouched.

### R3 — Complete ARIA radio support and truthful state changes (P1/P2, findings 4 and 7) [Verified]

**Dependencies:** R2. **Scope:** Medium.

**Files:** `src/capture/controls.ts`, `src/restoration/apply-control.ts`, `src/matching/match.ts` if needed, capture/restoration tests.

**Acceptance:**
- Capture and restore labeled ARIA radios using an explicit group/option identity; unrelated groups must not be merged. Missing safe identity is skipped.
- Click only eligible, recognized reversible state controls when state differs. Never force `aria-checked` or native checked state to manufacture success after a rejected click.
- Supported native checkboxes/radios notify framework state correctly; a rejected or ignored change reports failure. Already-correct controls do not receive unnecessary clicks.

**Verification:** `npx vitest run src/capture/controls.test.ts src/matching/match.test.ts src/restoration/restore.test.ts`; framework-controlled checkbox/radio and ARIA fixtures in R12.

### R4 — Verify final values and enable bounded dynamic restoration (P1, findings 3 and 4) [Verified]

**Dependencies:** R3. **Scope:** Medium.

**Files:** `src/restoration/restore.ts`, `src/restoration/apply-control.ts`, `entrypoints/page-agent.content.ts`, restoration tests.

**Acceptance:**
- Production RESTORE enables a maximum five-second retry window after document readiness, capped by the operation's remaining deadline.
- Reverify all saved settings after changes/rerenders settle and before reporting completion. A later control resetting an earlier control or an asynchronous framework rejection cannot remain falsely restored.
- Mutation observation exists only during Apply, disconnects on every exit, and cannot retry indefinitely or continuously mutate a rejected control.

**Verification:** `npx vitest run src/restoration/restore.test.ts`; cover delayed insertion, asynchronous rejection, dependent controls, timeout, and observer cleanup with deterministic timing. Exercise the runtime message path in R12.

### R5 — Coordinate Apply lifetime in the service worker (P1, finding 3) [Verified]

**Dependencies:** R4. **Scope:** Medium.

**Files:** `src/apply/coordinator.ts`, `src/apply/operation.ts`, `entrypoints/background.ts`, `src/shared/page-messages.ts`, coordinator tests.

**Acceptance:**
- Background owns both direct and navigation Apply. Record start/deadline, verify current page identity before restoration, and allow at most one eligible-query navigation.
- Enforce ten seconds for the entire operation, including navigation/readiness. Errors, mismatched navigation, tab closure, and expired operations complete safely and clean up; stale records never resume a later visit.
- Popup closure does not cancel execution. Define and test overlapping requests so one operation cannot overwrite another's state or clear its record; prefer explicit busy rejection if sufficient for MVP.

**Verification:** `npx vitest run src/apply/coordinator.test.ts`; test timeout with no completion event, delayed completion after expiry, cleanup on rejection, and worker resumption from session state.

**Checkpoint B:** [Verified] R3–R5 tests and project check pass; restoration reflects observable state and every operation has bounded lifetime.

### R6 — Report verified URL and control results (P1, finding 2) [Verified]

**Dependencies:** R5. **Scope:** Medium.

**Files:** `src/apply/coordinator.ts`, `src/apply/operation.ts`, coordinator tests, `entrypoints/popup/App.tsx`, its test.

**Acceptance:**
- Navigation starts a pending operation, never a fabricated full result. The popup starts Apply through background messaging and can recover the final result after reopening.
- Verify saved eligible query values, including repeated values and removal of extra eligible parameters, while preserving current sensitive parameters and fragment. Count each reviewed query-parameter entry consistently with CaptureReview; controls plus included query entries form the attempted denominator.
- Full/partial/failed status uses all final outcomes, including skipped and failed settings. Query-only views and successfully restored queries with failed controls receive accurate counts and wording; transient result storage has bounded cleanup.

**Verification:** `npx vitest run src/apply/coordinator.test.ts entrypoints/popup/App.test.tsx`; cover no navigation, navigation, query rejection/redirect, query-only, mixed outcomes, and popup reopen.

### R7 — Review Update before replacing settings (P1, finding 5) [Verified]

**Dependencies:** R1, R2. **Scope:** Medium.

**Files:** `entrypoints/popup/App.tsx`, `CaptureReview.tsx`, `ViewActions.tsx`, `view-actions.test.tsx`, `src/storage/views.test.ts`.

**Acceptance:**
- Compare the fresh captured origin/normalized pathname with the selected view before proceeding; a changed page cannot overwrite the view.
- Reuse CaptureReview and allow individual exclusions before replacing settings. Cancel and zero included settings leave storage untouched.
- Successful Update preserves ID, name, and creation time; validation/write failure preserves the original view and shows an actionable error.

**Verification:** `npx vitest run entrypoints/popup/view-actions.test.tsx entrypoints/popup/CaptureReview.test.tsx src/storage/views.test.ts`; complete Update through the browser in R12.

### R8 — Surface storage-load failures (P2, finding 8) [Verified]

**Dependencies:** R7. **Scope:** Medium.

**Files:** `entrypoints/popup/App.tsx`, `StatusMessage.tsx`, `App.test.tsx`, `accessibility.test.tsx`.

**Acceptance:**
- Unknown schemas and read failures produce visible, announced errors with a next action rather than an empty-view success state.
- Unknown records remain untouched; failed refresh does not discard the last successfully loaded list or announce a successful refresh.
- Retry/reopen can recover once storage becomes readable, without requiring data deletion.

**Verification:** `npx vitest run entrypoints/popup/App.test.tsx entrypoints/popup/accessibility.test.tsx`; keyboard and live-region checks in R12.

**Checkpoint C:** [Verified] R6–R8 tests and project check pass; Apply reports final outcomes and Update/errors preserve user data.

### R9 — Wire configurable background analytics delivery (P2, finding 9) [Verified]

**Dependencies:** R6. **Scope:** Medium.

**Files:** `src/analytics.ts`, its test, `entrypoints/background.ts`, `src/shared/page-messages.ts`, build environment typings/config only if needed.

**Acceptance:**
- Initialize the configured adapter in the service worker; missing configuration or opt-out selects no-op delivery. UI events use messages instead of popup-local adapters.
- Validate event names and property values at the runtime boundary, add the required timestamp/version/identity, and reject prohibited data before any delivery.
- Test configured delivery with a local collector. Production enablement remains contingent on store, privacy, and onboarding disclosures; no real analytics endpoint or backend is invented for this fix.

**Verification:** `npx vitest run src/analytics.test.ts`; inspect the exact test request and verify no network request under missing config or opt-out.

### R10 — Emit required events and truthful report status (P2, finding 9) [Verified]

**Dependencies:** R7, R9. **Scope:** Medium.

**Files:** `entrypoints/popup/App.tsx`, `ReportIssue.tsx`, `entrypoints/background.ts`, `privacy.test.tsx`, `src/analytics.test.ts`.

**Acceptance:**
- Emit all PRD events at their actual lifecycle points, including permission, capture start, Update/Delete success, and final background Apply outcomes. Do not emit navigation as Apply success.
- Counts come from reviewed settings/final results; calculate distinct-site buckets locally and exclude origins, labels, values, and view names.
- Compatibility reporting previews the exact metadata sent, requires confirmation, and distinguishes delivered, disabled/unconfigured, and failed delivery. Identity reset and opt-out affect subsequent events.

**Verification:** `npx vitest run src/analytics.test.ts entrypoints/popup/privacy.test.tsx`; assert event ordering, no duplicates, and no success event after a failed action.

### R11 — Prove permission, Save, and browser restart (P1, finding 10) [Partially Verified — Native Permission Dialog Gate Open]

**Dependencies:** R8. **Scope:** Medium.

**Files:** `e2e/extension.spec.ts`, `playwright.config.ts`, `tests/fixtures/filter-page.html`.

**Acceptance:**
- Run the production extension against a served HTTP fixture. Exercise actual per-origin grant/denial and Save/review; direct storage seeding does not substitute for this path.
- Save through the UI, close the persistent browser context, relaunch Chrome using the same profile, and verify the saved view and exact-page grouping.
- Assert no blanket required host permissions. Remove fallbacks that run tests against a file URL or silently accept missing extension startup.

**Verification:** `npm run test:e2e`; automated Save and persistent context restart pass. Native Chrome permission dialog approval/denial verification remains open in [RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md).

**Checkpoint D:** [Verified] R9–R11 checks pass; configured/no-op analytics and real Save persistence have reproducible evidence.

### R12 — Prove restoration and management in Chrome (P1, finding 10) [Partially Verified — Accessibility & Broader Fixture Gates Open]

**Dependencies:** R10, R11. **Scope:** Medium.

**Files:** `e2e/extension.spec.ts`, `tests/fixtures/dynamic-page.html`, `safety.html`, `filter-page.html`.

**Acceptance:**
- Assert real final control/query values and full/partial/failed counts for direct Apply, one navigation, delayed rendering, popup closure/reopen, and deadline expiry; verify no stale session operation remains.
- Exercise Rename, reviewed Update, Delete cancel/confirm, incompatible pages, hidden/disabled controls, framework-owned state, and zero Submit/Buy/Send/Delete/Confirm/Pay/Checkout activations.
- Verify keyboard-only flows, announced errors/results, primary target sizes, and visible focus. Reproduce at least 95% native-fixture reliability using every attempted saved setting as the denominator.

**Verification:** `npm run check` and `npm run test:e2e`; native popup automation passes. Full keyboard coverage across all modal dialogs, screen-reader announcements, and additional date/range fixtures remain open in [RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md).

### R13 — Rebuild release evidence (P1, finding 10) [In Progress — Ten-Page Gate Open]

**Dependencies:** R0–R12. **Scope:** Medium.

**Files:** `docs/COMPATIBILITY.md`, `docs/RELEASE_CHECKLIST.md`, `docs/PRIVACY.md`, `tasks/todo.md`.

**Acceptance:**
- Recheck at least ten real filtering pages and record exact browser version, page/flow, attempts, restores, skips/failures, date, and reproducible steps. Recalculate totals from evidence and meet the 85% gate; inaccessible/untested pages stay unverified.
- Record production popup interactivity and 200-control capture timings with machine, browser version, fixture size, and sample count against the unchanged 200 ms/100 ms targets. Ensure privacy/disclosure text matches actual delivery.
- Map every PRD Definition of Done item to current evidence. Mark release ready only when all gates pass; preserve any outstanding external-access or measurement blockers explicitly.

**Verification:** Run `npm ci`, `npm run check`, and `npm run test:e2e` from a clean checkout; audit evidence links and matrix arithmetic. Clean-install, performance, privacy, source hashes, and three public-page records are complete; ten-page restoration gate remains open.

### Final checkpoint [Open]

All ten review findings map to completed tasks with reproducible evidence. Release remains blocked until the remaining manual/live gates in [RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md) (native permission dialog, complete accessibility audit, and ten-page restoration gate) are completed.

---

## System Architecture & Contracts

**Goal:** Build and validate the Chrome Manifest V3 MVP defined in `docs/PRD.md`.

**Architecture:** WXT supplies the Vite-based extension build and runtime entrypoints. The React popup owns user interaction; a runtime-injected page agent owns DOM capture and restoration; the background service worker coordinates Apply across navigation. Pure domain modules remain independent of React, WXT, and Chrome APIs so Vitest can verify them deterministically.

**Tech Stack:** TypeScript, WXT/Vite, React, Tailwind CSS, shadcn/ui with Base UI, Chrome extension APIs, Vitest, Testing Library, and Playwright.

**Spec:** `docs/PRD.md`  
**Archived Phased Plan:** Historical Phases 0–11 implementation tasks are archived in [mvp_plan.md](mvp_plan.md) and tracked in [tasks/todo.md](todo.md).

## Global Constraints

- Target Chrome Manifest V3 only.
- Request HTTP or HTTPS host access only for the active origin and only after a user gesture.
- Persist views in `chrome.storage.local`; use `chrome.storage.session` only for an in-progress Apply.
- Keep the service worker and page agent framework-independent.
- Add UI components only when needed.
- Never submit forms or activate general buttons and links.
- Every change verified with `npm run check` (190 unit/integration tests, typecheck, production build); browser checkpoints run `npm run test:e2e`.
- Use failing-test, minimal-implementation, passing-test order for behavior changes.
- Commit `package-lock.json` and exact dependency versions.

## File Map

| Path | Responsibility |
|---|---|
| `wxt.config.ts` | WXT, Vite, manifest permissions, and Tailwind configuration |
| `entrypoints/popup/*` | React popup entrypoint, UI views, and screen composition |
| `entrypoints/background.ts` | Service-worker listeners, Apply coordinator, and analytics routing |
| `entrypoints/page-agent.content.ts` | Runtime-injected message endpoint for page operations |
| `src/domain/view.ts` | Saved-view schema, value types, validation, and page identity |
| `src/domain/url.ts` | Safe query capture, query verification, and replacement |
| `src/storage/views.ts` | Lossless local view CRUD with schema versioning |
| `src/platform/page-agent.ts` | Active-tab resolution, origin permission, injection, and typed messaging |
| `src/capture/*` | Control and query eligibility, label resolution, and page capture |
| `src/matching/*` | Fingerprints, scoring, and ambiguity rejection |
| `src/restoration/*` | Safe value application, verification, mutation observation, and retry window |
| `src/apply/*` | Service worker Apply coordinator, timeout, and result aggregation |
| `src/analytics.ts` | Allowlisted event adapter, key+value validation, and no-op implementation |
| `tests/fixtures/*` | Deterministic DOM, dynamic, and safety pages |
| `e2e/*` | Playwright browser workflows and native popup harness |

## Stable Interfaces

These shared contracts define module boundaries across domain, capture, restoration, background coordinator, and analytics.

### View Domain (`src/domain/view.ts`)

```ts
export type StoredValue = string | boolean | string[];

export type ControlKind =
  | 'text'
  | 'number'
  | 'range'
  | 'date'
  | 'checkbox'
  | 'radio'
  | 'select-one'
  | 'select-multiple'
  | 'aria-state';

export interface PageKey {
  origin: string;
  pathname: string;
}

export interface Fingerprint {
  kind: ControlKind;
  tag: string;
  type?: string;
  role?: string;
  label: string;
  name?: string;
  id?: string;
  semanticAttribute?: string;
  options?: string[];
  region?: string;
  ordinal: number;
}

export interface CapturedSetting {
  id: string;
  label: string;
  value: StoredValue;
  fingerprint: Fingerprint;
}

export interface SavedView extends PageKey {
  schemaVersion: 1;
  id: string;
  name: string;
  queryParams: Record<string, string[]>;
  controls: CapturedSetting[];
  createdAt: string;
  updatedAt: string;
}
```

### Messaging (`src/shared/page-messages.ts`)

```ts
export type PageCommand =
  | { type: 'PING' }
  | { type: 'CAPTURE' }
  | { type: 'RESTORE'; controls: CapturedSetting[]; timeoutMs?: number; deadlineAt?: number };

export interface PingResponse {
  status: 'ok';
  pong: true;
}

export interface CaptureResponse {
  status: 'ok';
  data: import('@/capture/controls').CaptureResult;
}

export interface RestoreResponse {
  status: 'ok';
  data: import('@/restoration/restore').RestoreReport;
}

export type BackgroundCommand =
  | { type: 'START_APPLY'; tabId: number; view: SavedView }
  | { type: 'GET_LAST_APPLY_RESULT'; tabId: number }
  | { type: 'TRACK_ANALYTICS'; event: AnalyticsEvent; properties?: Record<string, number | string> };
```

### Restoration (`src/restoration/restore.ts`)

```ts
export type SettingOutcome = 'restored' | 'skipped' | 'failed';

export interface RestoreOutcome {
  id: string;
  outcome: SettingOutcome;
}

export interface RestoreReport {
  outcomes: RestoreOutcome[];
}

export async function restoreControls(
  doc: Document,
  controls: CapturedSetting[],
  options?: { timeoutMs?: number; deadlineAt?: number }
): Promise<RestoreReport>;
```

### Apply Coordination (`src/apply/coordinator.ts`)

```ts
export type ViewApplyStatus =
  | 'Fully applied view'
  | 'Partially applied view'
  | 'Could not apply'
  | 'Applying view';

export interface ViewApplyResult {
  status: ViewApplyStatus;
  restoredCount: number;
  totalAttempted: number;
  skippedCount: number;
  failedCount: number;
  message: string;
}

export type ResumeApplyResult = ViewApplyResult & {
  outcomes: RestoreOutcome[];
};

export async function startApply(tabId: number, view: SavedView): Promise<ViewApplyResult>;
export async function resumeApply(tabId: number): Promise<ResumeApplyResult>;
```

### Analytics (`src/analytics.ts`)

```ts
export type AnalyticsEvent =
  | 'extension_installed'
  | 'site_permission_granted'
  | 'save_view_started'
  | 'view_created'
  | 'view_apply_started'
  | 'view_apply_full'
  | 'view_apply_partial'
  | 'view_apply_failed'
  | 'view_updated'
  | 'view_deleted';

export async function track(
  event: AnalyticsEvent,
  properties?: Record<string, number | string>
): Promise<void>;
```

## Checkpoints

### Foundation Checkpoint (Phase 0) — Passed
- Toolchain, popup, and clean dependency export build successfully.
- Production manifest requests no blanket host access.

### Capture Checkpoint (Phase 3 / Checkpoint A) — Passed
- Permission, injection, capture, privacy exclusions, and review work together.
- Ineligible/sensitive fields excluded; zero mutation on ineligible controls.

### Core Workflow Checkpoint (Phase 8 / Checkpoint B & C) — Passed
- Save, reopen, Apply, Rename, Update, and Delete pass automated verification.
- Bounded Apply lifetime (5s dynamic retry, 10s coordinator timeout).
- Prohibited-action counters remain zero.

### Release Checkpoint (Checkpoint D / Phase 11) — Blocked on Manual Gates
- Automated checks pass (190 tests, typecheck, build, browser workflows).
- Outstanding gates tracked in [RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md):
  1. R11: Native Chrome permission dialog approval/denial verification.
  2. R12: Full keyboard navigation and WCAG AA contrast coverage across all modal flows.
  3. R13: 10-page real-site restoration matrix meeting 85% threshold.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Site controls change often | Restore failures | Multi-signal fingerprints, confidence threshold, safe skip |
| Query navigation closes popup | Lost Apply operation | Background coordinator plus session-scoped operation |
| Framework-controlled inputs ignore assignment | Partial restores | Native setters, standard events, final-value verification |
| Optional permission handling drifts | Excessive access | Manifest assertion and browser permission test |
| UI toolkit grows unchecked | Bundle and maintenance cost | Add only components used in the current phase |
| Analytics leaks saved data | Privacy violation | Key and value property allowlists, regex validation, default no-op |
| Real-site tests become stale | False confidence | Dated matrix; fixtures remain the release gate |

## Authoritative Sources

- Chrome scripting and permissions: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Chrome manifest format: https://developer.chrome.com/docs/extensions/reference/manifest
- WXT installation and Vite build: https://wxt.dev/guide/installation.html and https://wxt.dev/guide/essentials/config/vite.html
- WXT runtime content scripts: https://wxt.dev/guide/essentials/scripting
- shadcn/ui with Vite: https://ui.shadcn.com/docs/installation/vite
- shadcn/ui Base UI default: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- Tailwind Vite plugin: https://tailwindcss.com/docs/installation/using-vite
