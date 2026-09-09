# StickySite MVP Implementation Plan

## Active work — Review fixes (2026-09-09)

**Status:** Release blocked pending the fixes and evidence below. The original implementation phases remain below for reference; their historical completion claims do not establish current acceptance. Track remediation in [todo.md](todo.md).

**Scope:** Resolve the ten findings from the implementation review against [the PRD](../docs/PRD.md). Preserve the MVP scope, storage compatibility, matching thresholds, and dependency stack. This section takes execution precedence over the original phase sequence.

**Baseline:** `npm run check` passed (124 tests, typecheck, production build). Four temporary probes reproduced unsafe restoration, hidden capture/missing ARIA radios, forced ARIA success, and stale success after a later control resets an earlier value. The probes were removed. Browser tests were inspected, not rerun; real-site results were not independently verified.

### Execution and verification

- Work in the order below; dependencies identify the minimum prerequisites.
- For each behavior fix, retain a focused regression test that fails before the fix. Run the named focused suite and `npm run check` before marking the task complete.
- Browser checkpoints must exercise the production extension on HTTP fixtures and assert actual page values and action counters, not merely a visible status message.
- Do not lower reliability thresholds, invent measurements, add blanket host permissions, or enable remote delivery without the PRD disclosures. No deployment is part of this plan.
- Documentation-only tasks require link, arithmetic, and evidence checks rather than new tests.

### R0 — Correct release status and evidence claims (P1, finding 10)

**Dependencies:** None. **Scope:** Small.

**Files:** `docs/RELEASE_CHECKLIST.md`, `docs/COMPATIBILITY.md`.

**Acceptance:**
- Mark release readiness and contradicted gates as blocked or unverified, linking to these remediation tasks.
- Separate observed evidence from claims needing reruns. The existing matrix rows total 58 attempts and 56 restores, while its summary claims 55; flag the discrepancy without treating recalculation as validation of the rows.
- Remove claims that popup reopen proves browser restart or status visibility proves successful Apply.

**Verification:** Cross-check each retained claim against the actual test/assertion or dated run artifact. Final release evidence is rebuilt in R13.

### R1 — Restrict actions to the active supported page (P1, finding 6)

**Dependencies:** R0. **Scope:** Medium.

**Files:** `src/platform/page-agent.ts`, its test, `entrypoints/popup/App.tsx`, its test.

**Acceptance:**
- An internal, extension, file, blocked, or inaccessible active page produces an actionable unavailable-page state; never substitute another web tab or the popup's URL.
- Save, Apply, and Update resolve the current tab at action time. Permission denial cannot lead to injection or mutation.
- Tests model the actual active HTTP tab instead of relying on production fallbacks for popup-as-tab testing.

**Verification:** `npx vitest run src/platform/page-agent.test.ts entrypoints/popup/App.test.tsx`; browser unavailable-page checks in R12.

### R2 — Share capture and restoration eligibility (P1, findings 1 and 7)

**Dependencies:** R1. **Scope:** Medium.

**Files:** `src/capture/controls.ts`, `src/restoration/restore.ts`, their tests; one shared eligibility helper if needed.

**Acceptance:**
- Capture excludes non-rendered controls and all PRD-prohibited input/autocomplete categories; preserve top-level-only behavior and meaningful labels.
- Restore filters candidates before scoring and rechecks immediately before mutation. A saved text field changed to password, disabled, hidden, or otherwise prohibited is skipped without events or value changes.
- Use one eligibility policy for capture and restore; do not relax confidence thresholds to compensate for filtering.

**Verification:** `npx vitest run src/capture/controls.test.ts src/restoration/restore.test.ts`; real layout visibility and zero action counters verified in R12.

**Checkpoint A:** R1–R2 regression tests and project check pass; unavailable pages cannot redirect actions and ineligible fields remain untouched.

### R3 — Complete ARIA radio support and truthful state changes (P1/P2, findings 4 and 7)

**Dependencies:** R2. **Scope:** Medium.

**Files:** `src/capture/controls.ts`, `src/restoration/apply-control.ts`, `src/matching/match.ts` if needed, capture/restoration tests.

**Acceptance:**
- Capture and restore labeled ARIA radios using an explicit group/option identity; unrelated groups must not be merged. Missing safe identity is skipped.
- Click only eligible, recognized reversible state controls when state differs. Never force `aria-checked` or native checked state to manufacture success after a rejected click.
- Supported native checkboxes/radios notify framework state correctly; a rejected or ignored change reports failure. Already-correct controls do not receive unnecessary clicks.

**Verification:** `npx vitest run src/capture/controls.test.ts src/matching/match.test.ts src/restoration/restore.test.ts`; framework-controlled checkbox/radio and ARIA fixtures in R12.

### R4 — Verify final values and enable bounded dynamic restoration (P1, findings 3 and 4)

**Dependencies:** R3. **Scope:** Medium.

**Files:** `src/restoration/restore.ts`, `src/restoration/apply-control.ts`, `entrypoints/page-agent.content.ts`, restoration tests.

**Acceptance:**
- Production RESTORE enables a maximum five-second retry window after document readiness, capped by the operation's remaining deadline.
- Reverify all saved settings after changes/rerenders settle and before reporting completion. A later control resetting an earlier control or an asynchronous framework rejection cannot remain falsely restored.
- Mutation observation exists only during Apply, disconnects on every exit, and cannot retry indefinitely or continuously mutate a rejected control.

**Verification:** `npx vitest run src/restoration/restore.test.ts`; cover delayed insertion, asynchronous rejection, dependent controls, timeout, and observer cleanup with deterministic timing. Exercise the runtime message path in R12.

### R5 — Coordinate Apply lifetime in the service worker (P1, finding 3)

**Dependencies:** R4. **Scope:** Medium.

**Files:** `src/apply/coordinator.ts`, `src/apply/operation.ts`, `entrypoints/background.ts`, `src/shared/page-messages.ts`, coordinator tests.

**Acceptance:**
- Background owns both direct and navigation Apply. Record start/deadline, verify current page identity before restoration, and allow at most one eligible-query navigation.
- Enforce ten seconds for the entire operation, including navigation/readiness. Errors, mismatched navigation, tab closure, and expired operations complete safely and clean up; stale records never resume a later visit.
- Popup closure does not cancel execution. Define and test overlapping requests so one operation cannot overwrite another's state or clear its record; prefer explicit busy rejection if sufficient for MVP.

**Verification:** `npx vitest run src/apply/coordinator.test.ts`; test timeout with no completion event, delayed completion after expiry, cleanup on rejection, and worker resumption from session state.

**Checkpoint B:** R3–R5 tests and project check pass; restoration reflects observable state and every operation has bounded lifetime.

### R6 — Report verified URL and control results (P1, finding 2)

**Dependencies:** R5. **Scope:** Medium.

**Files:** `src/apply/coordinator.ts`, `src/apply/operation.ts`, coordinator tests, `entrypoints/popup/App.tsx`, its test.

**Acceptance:**
- Navigation starts a pending operation, never a fabricated full result. The popup starts Apply through background messaging and can recover the final result after reopening.
- Verify saved eligible query values, including repeated values and removal of extra eligible parameters, while preserving current sensitive parameters and fragment. Count each reviewed query-parameter entry consistently with CaptureReview; controls plus included query entries form the attempted denominator.
- Full/partial/failed status uses all final outcomes, including skipped and failed settings. Query-only views and successfully restored queries with failed controls receive accurate counts and wording; transient result storage has bounded cleanup.

**Verification:** `npx vitest run src/apply/coordinator.test.ts entrypoints/popup/App.test.tsx`; cover no navigation, navigation, query rejection/redirect, query-only, mixed outcomes, and popup reopen.

### R7 — Review Update before replacing settings (P1, finding 5)

**Dependencies:** R1, R2. **Scope:** Medium.

**Files:** `entrypoints/popup/App.tsx`, `CaptureReview.tsx`, `ViewActions.tsx`, `view-actions.test.tsx`, `src/storage/views.test.ts`.

**Acceptance:**
- Compare the fresh captured origin/normalized pathname with the selected view before proceeding; a changed page cannot overwrite the view.
- Reuse CaptureReview and allow individual exclusions before replacing settings. Cancel and zero included settings leave storage untouched.
- Successful Update preserves ID, name, and creation time; validation/write failure preserves the original view and shows an actionable error.

**Verification:** `npx vitest run entrypoints/popup/view-actions.test.tsx entrypoints/popup/CaptureReview.test.tsx src/storage/views.test.ts`; complete Update through the browser in R12.

### R8 — Surface storage-load failures (P2, finding 8)

**Dependencies:** R7. **Scope:** Medium.

**Files:** `entrypoints/popup/App.tsx`, `StatusMessage.tsx`, `App.test.tsx`, `accessibility.test.tsx`.

**Acceptance:**
- Unknown schemas and read failures produce visible, announced errors with a next action rather than an empty-view success state.
- Unknown records remain untouched; failed refresh does not discard the last successfully loaded list or announce a successful refresh.
- Retry/reopen can recover once storage becomes readable, without requiring data deletion.

**Verification:** `npx vitest run entrypoints/popup/App.test.tsx entrypoints/popup/accessibility.test.tsx`; keyboard and live-region checks in R12.

**Checkpoint C:** R6–R8 tests and project check pass; Apply reports final outcomes and Update/errors preserve user data.

### R9 — Wire configurable background analytics delivery (P2, finding 9)

**Dependencies:** R6. **Scope:** Medium.

**Files:** `src/analytics.ts`, its test, `entrypoints/background.ts`, `src/shared/page-messages.ts`, build environment typings/config only if needed.

**Acceptance:**
- Initialize the configured adapter in the service worker; missing configuration or opt-out selects no-op delivery. UI events use messages instead of popup-local adapters.
- Validate event names and property values at the runtime boundary, add the required timestamp/version/identity, and reject prohibited data before any delivery.
- Test configured delivery with a local collector. Production enablement remains contingent on store, privacy, and onboarding disclosures; no real analytics endpoint or backend is invented for this fix.

**Verification:** `npx vitest run src/analytics.test.ts`; inspect the exact test request and verify no network request under missing config or opt-out.

### R10 — Emit required events and truthful report status (P2, finding 9)

**Dependencies:** R7, R9. **Scope:** Medium.

**Files:** `entrypoints/popup/App.tsx`, `ReportIssue.tsx`, `entrypoints/background.ts`, `privacy.test.tsx`, `src/analytics.test.ts`.

**Acceptance:**
- Emit all PRD events at their actual lifecycle points, including permission, capture start, Update/Delete success, and final background Apply outcomes. Do not emit navigation as Apply success.
- Counts come from reviewed settings/final results; calculate distinct-site buckets locally and exclude origins, labels, values, and view names.
- Compatibility reporting previews the exact metadata sent, requires confirmation, and distinguishes delivered, disabled/unconfigured, and failed delivery. Identity reset and opt-out affect subsequent events.

**Verification:** `npx vitest run src/analytics.test.ts entrypoints/popup/privacy.test.tsx`; assert event ordering, no duplicates, and no success event after a failed action.

### R11 — Prove permission, Save, and browser restart (P1, finding 10)

**Dependencies:** R8. **Scope:** Medium.

**Files:** `e2e/extension.spec.ts`, `playwright.config.ts`, `tests/fixtures/filter-page.html`.

**Acceptance:**
- Run the production extension against a served HTTP fixture. Exercise actual per-origin grant/denial and Save/review; direct storage seeding does not substitute for this path.
- Save through the UI, close the persistent browser context, relaunch Chrome using the same profile, and verify the saved view and exact-page grouping.
- Assert no blanket required host permissions. Remove fallbacks that run tests against a file URL or silently accept missing extension startup.

**Verification:** `npm run test:e2e`; record browser version and startup/restart evidence. If native permission UI needs a separate manual run, record that boundary and leave its gate open until completed.

**Checkpoint D:** R9–R11 checks pass; configured/no-op analytics and real Save persistence have reproducible evidence.

### R12 — Prove restoration and management in Chrome (P1, finding 10)

**Dependencies:** R10, R11. **Scope:** Medium.

**Files:** `e2e/extension.spec.ts`, `tests/fixtures/dynamic-page.html`, `safety.html`, `filter-page.html`.

**Acceptance:**
- Assert real final control/query values and full/partial/failed counts for direct Apply, one navigation, delayed rendering, popup closure/reopen, and deadline expiry; verify no stale session operation remains.
- Exercise Rename, reviewed Update, Delete cancel/confirm, incompatible pages, hidden/disabled controls, framework-owned state, and zero Submit/Buy/Send/Delete/Confirm/Pay/Checkout activations.
- Verify keyboard-only flows, announced errors/results, primary target sizes, and visible focus. Reproduce at least 95% native-fixture reliability using every attempted saved setting as the denominator.

**Verification:** `npm run check` and `npm run test:e2e`; retain browser artifacts for failures and a concise dated verification record for passing gates.

### R13 — Rebuild release evidence (P1, finding 10)

**Dependencies:** R0–R12. **Scope:** Medium.

**Files:** `docs/COMPATIBILITY.md`, `docs/RELEASE_CHECKLIST.md`, `docs/PRIVACY.md`, `tasks/todo.md`.

**Acceptance:**
- Recheck at least ten real filtering pages and record exact browser version, page/flow, attempts, restores, skips/failures, date, and reproducible steps. Recalculate totals from evidence and meet the 85% gate; inaccessible/untested pages stay unverified.
- Record production popup interactivity and 200-control capture timings with machine, browser version, fixture size, and sample count against the unchanged 200 ms/100 ms targets. Ensure privacy/disclosure text matches actual delivery.
- Map every PRD Definition of Done item to current evidence. Mark release ready only when all gates pass; preserve any outstanding external-access or measurement blockers explicitly.

**Verification:** Run `npm ci`, `npm run check`, and `npm run test:e2e` from a clean checkout; audit evidence links and matrix arithmetic. Passing unit tests alone cannot close browser or real-site gates.

### Final checkpoint

All ten review findings map to completed tasks with reproducible evidence. No unsupported readiness claim remains. Review the final diff for safety, regressions, and scope before marking remediation complete.

## Original implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and validate the Chrome Manifest V3 MVP defined in `docs/PRD.md`.

**Architecture:** WXT supplies the Vite-based extension build and runtime entrypoints. The React popup owns user interaction; a runtime-injected page agent owns DOM capture and restoration; the background service worker resumes Apply across navigation. Pure domain modules remain independent of React, WXT, and Chrome APIs so Vitest can verify them deterministically.

**Tech Stack:** TypeScript, WXT/Vite, React, Tailwind CSS, shadcn/ui with Base UI, Chrome extension APIs, Vitest, Testing Library, and Playwright.

**Spec:** `docs/PRD.md`

## Global Constraints

- Target Chrome Manifest V3 only.
- Request HTTP or HTTPS host access only for the active origin and only after a user gesture.
- Persist views in `chrome.storage.local`; use `chrome.storage.session` only for an in-progress Apply.
- Keep the service worker and page agent framework-independent.
- Add shadcn/ui components only when a phase uses them.
- Never submit forms or activate general buttons and links.
- Every phase ends with `npm run check`; browser checkpoints also run `npm run test:e2e`.
- Use failing-test, minimal-implementation, passing-test order for behavior changes.
- Commit `package-lock.json` and exact dependency versions.
- Do not start a phase until the previous phase’s exit gate passes.

## File Map

| Path | Responsibility |
|---|---|
| `wxt.config.ts` | WXT, Vite, manifest permissions, and Tailwind configuration |
| `entrypoints/popup/*` | React popup entrypoint and screen composition |
| `entrypoints/background.ts` | Service-worker listeners and Apply resumption |
| `entrypoints/page-agent.content.ts` | Runtime-injected message endpoint for page operations |
| `src/domain/view.ts` | Saved-view schema, value types, validation, and page identity |
| `src/domain/url.ts` | Safe query capture and replacement |
| `src/storage/views.ts` | Lossless local view CRUD |
| `src/platform/page-agent.ts` | Permission, injection, ping, and typed page messaging |
| `src/capture/*` | Eligibility, label resolution, and page capture |
| `src/matching/*` | Fingerprints, scoring, and ambiguity rejection |
| `src/restoration/*` | Safe value application, verification, and retry window |
| `src/apply/*` | Cross-navigation Apply operation and result aggregation |
| `src/analytics.ts` | Allowlisted event adapter and no-op implementation |
| `src/components/ui/*` | Only shadcn/ui components used by the popup |
| `tests/fixtures/*` | Deterministic DOM and safety pages |
| `e2e/*` | Built-extension browser workflows |

## Stable Interfaces

Task 1 introduces these shared contracts; later tasks extend them only when the PRD requires it.

```ts
export type StoredValue = string | boolean | string[];

export type ControlKind =
  | "text"
  | "number"
  | "range"
  | "date"
  | "checkbox"
  | "radio"
  | "select-one"
  | "select-multiple"
  | "aria-state";

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

## Phase 0 — Scaffold

### Task 0A: Establish the extension toolchain

**Dependencies:** None  
**Estimated scope:** Medium; generated configuration only

**Files:**

- Create: `package.json`, `package-lock.json`, `.npmrc`, `.gitignore`
- Create: `tsconfig.json`, `wxt.config.ts`

**Produces:** `npm run dev`, `npm run build`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, and `npm run check`.

**Steps:**

- [ ] Initialize Git and npm; set `save-exact=true` before installing dependencies.
- [ ] Install React, WXT’s React module, Vite, TypeScript, Tailwind’s Vite plugin, Vitest, jsdom, Testing Library, and Playwright.
- [ ] Configure WXT with Manifest V3, `storage` and `scripting` permissions, optional HTTP/HTTPS host permissions, React, and Tailwind.
- [ ] Configure TypeScript strict mode and the `@/*` alias to `src/*`.
- [ ] Define `check` as typecheck, unit tests, then production build.
- [ ] Run `npm run check` and verify an empty extension build is produced.
- [ ] Commit as `chore: scaffold extension toolchain`.

**Acceptance criteria:**

- Dependencies are exact and the lockfile is committed.
- The generated manifest contains no required blanket host access.
- `npm run check` exits zero.

### Task 0B: Add the React popup shell

**Dependencies:** Task 0A  
**Estimated scope:** Medium; one generated UI component and its shell

**Files:**

- Create: `entrypoints/popup/index.html`, `main.tsx`, `App.tsx`, `style.css`
- Create: `src/components/ui/button.tsx`

**Produces:** A loadable 360-pixel-wide popup showing “StickySite” and a disabled Save Current View button.

**Steps:**

- [ ] Run shadcn initialization with the Base UI option and add only Button.
- [ ] Add the minimal React entrypoint and Tailwind import.
- [ ] Run `npm run typecheck` and `npm run build`.
- [ ] Commit as `feat: add popup shell`.

**Acceptance criteria:** The production build renders the titled, styled popup with a disabled Save action.

### Task 0C: Verify the popup shell

**Dependencies:** Task 0B  
**Estimated scope:** Small

**Files:**

- Test: `entrypoints/popup/App.test.tsx`
- Test: `e2e/extension.spec.ts`, `playwright.config.ts`

**Steps:**

- [ ] Write a Testing Library test for the title and disabled action.
- [ ] Run the focused test and confirm failure before adding the required accessible labels.
- [ ] Add the minimal labels and state required to pass.
- [ ] Add a Playwright smoke test that opens the built popup and asserts its title and disabled action.
- [ ] Run the focused tests, `npm run check`, then `npm run test:e2e`.
- [ ] Load the unpacked production output in Chrome and capture the manual result in `tasks/todo.md`.
- [ ] Commit as `test: verify popup shell`.

**Exit gate:** The unpacked extension opens a styled popup and all checks pass.

## Phase 1 — Domain and Storage

### Task 1: Add validated view records and local CRUD

**Dependencies:** Task 0C  
**Estimated scope:** Medium

**Files:**

- Create: `src/domain/view.ts`
- Create: `src/storage/views.ts`
- Test: `src/domain/view.test.ts`, `src/storage/views.test.ts`

**Produces:**

```ts
export function normalizePathname(pathname: string): string;
export function parseSavedView(input: unknown): SavedView;
export async function listViews(): Promise<SavedView[]>;
export async function createView(view: SavedView): Promise<void>;
export async function replaceView(view: SavedView): Promise<void>;
export async function renameView(id: string, name: string, now: string): Promise<void>;
export async function deleteView(id: string): Promise<void>;
```

**Steps:**

- [ ] Write tests for pathname normalization, schema rejection, repeated query values, unique case-insensitive page names, and ISO timestamps.
- [ ] Run the domain tests and confirm failure.
- [ ] Implement the types and explicit runtime parser without adding a schema dependency.
- [ ] Write storage tests using a mocked `chrome.storage.local` for CRUD, quota rejection, and preservation after failed writes.
- [ ] Implement one storage key containing schema-versioned view records.
- [ ] Run focused tests and `npm run check`.
- [ ] Commit as `feat: add saved view storage`.

**Exit gate:** Invalid data cannot enter storage and failed writes preserve existing views.

## Phase 2 — Permission and Runtime Injection

### Task 2: Connect the popup to an on-demand page agent

**Dependencies:** Task 1  
**Estimated scope:** Medium

**Files:**

- Create: `src/shared/page-messages.ts`
- Create: `src/platform/page-agent.ts`
- Create: `entrypoints/page-agent.content.ts`
- Test: `src/platform/page-agent.test.ts`

**Interfaces:**

```ts
export type PageCommand =
  | { type: "PING" }
  | { type: "CAPTURE" }
  | { type: "RESTORE"; controls: CapturedSetting[] };

export async function getActivePage(): Promise<{ tabId: number; url: URL }>;
export async function requestOriginAccess(url: URL): Promise<boolean>;
export async function ensurePageAgent(tabId: number): Promise<void>;
export async function sendPageCommand<T>(tabId: number, command: PageCommand): Promise<T>;
```

**Steps:**

- [ ] Write tests for unsupported URLs, exact-origin permission requests, denial, successful ping, and injection after a missing receiver.
- [ ] Run the focused test and confirm failure.
- [ ] Define the WXT page-agent with `registration: "runtime"` and no match patterns, so WXT does not generate required host permissions.
- [ ] Implement ping-before-inject using `browser.scripting.executeScript` and the generated runtime content-script file.
- [ ] Wire the popup button to permission and a real Ping response that displays “Page access ready.”
- [ ] Run focused tests and `npm run check`.
- [ ] Inspect the built manifest and confirm the page agent added no required `host_permissions`.
- [ ] Manually verify Chrome requests only the active origin.
- [ ] Commit as `feat: add per-origin page access`.

**Exit gate:** Grant and denial work without required blanket host access or inactive scanning.

## Phase 3 — Capture and Review

### Task 3A: Capture eligible controls and URL parameters

**Dependencies:** Task 2  
**Estimated scope:** Medium

**Files:**

- Create: `src/capture/labels.ts`, `src/capture/controls.ts`
- Create: `src/domain/url.ts`
- Test: `src/capture/controls.test.ts`, `src/domain/url.test.ts`

**Produces:**

```ts
export interface CaptureResult extends PageKey {
  queryParams: Record<string, string[]>;
  controls: CapturedSetting[];
  unsupportedCount: number;
}

export function resolveLabel(element: Element): string | null;
export function capturePage(document: Document, url: URL): CaptureResult;
export function replaceEligibleQuery(url: URL, saved: Record<string, string[]>): URL;
```

**Steps:**

- [ ] Create DOM fixtures for every supported and excluded input category.
- [ ] Write failing tests for label precedence, radio grouping, multi-select arrays, unsupported counts, repeated parameters, the credential denylist, and benign `zipcode`.
- [ ] Implement eligibility and label resolution exactly as PRD Section 6 specifies.
- [ ] Implement URL capture and replacement without fragments, credentials, cross-origin, or cross-path changes.
- [ ] Connect the page agent’s Capture command to `capturePage`.
- [ ] Run focused tests and `npm run check`.
- [ ] Commit as `feat: capture supported page settings`.

**Acceptance criteria:** The Capture result includes every supported fixture value and excludes every PRD-prohibited value.

### Task 3B: Present the capture review screen

**Dependencies:** Task 3A  
**Estimated scope:** Medium

**Files:**

- Create: `entrypoints/popup/CaptureReview.tsx`
- Add: `src/components/ui/checkbox.tsx`, `label.tsx`
- Modify: `entrypoints/popup/App.tsx`
- Test: `entrypoints/popup/CaptureReview.test.tsx`

**Steps:**

- [ ] Write a failing interaction test for included-by-default settings, individual exclusion, unsupported count, and zero-selection blocking.
- [ ] Add only the shadcn Checkbox and Label components.
- [ ] Render human-readable control and query values without selectors.
- [ ] Disable continuation when no setting remains.
- [ ] Run focused tests and `npm run check`.
- [ ] Manually complete the review by keyboard only.
- [ ] Commit as `feat: add capture review`.

**Exit gate:** Fixtures capture only eligible data and every saved candidate is reviewable.

## Phase 4 — Save and List

### Task 4A: Complete the first persistent vertical slice

**Dependencies:** Task 3B  
**Estimated scope:** Medium

**Files:**

- Create: `entrypoints/popup/SaveView.tsx`, `ViewList.tsx`
- Add: `src/components/ui/input.tsx`
- Modify: `entrypoints/popup/App.tsx`
- Test: `entrypoints/popup/save-flow.test.tsx`

**Steps:**

- [ ] Write a failing test for trimmed 1–60-character names, duplicate-name rejection, saving selected settings, and exact-page grouping.
- [ ] Add only the shadcn Input component.
- [ ] Implement Save with `crypto.randomUUID()` and ISO timestamps.
- [ ] Load local views when the popup opens and group them by `PageKey`.
- [ ] Run focused tests and `npm run check`.
- [ ] Commit as `feat: save and list views`.

**Acceptance criteria:** Unit tests prove reviewed settings are validated, persisted, and grouped by exact page identity.

### Task 4B: Verify Save persistence in Chrome

**Dependencies:** Task 4A  
**Estimated scope:** Small

**Files:**

- Test: `e2e/extension.spec.ts`

**Steps:**

- [ ] Extend Playwright with Save, popup reopen, browser restart, and exact-page listing.
- [ ] Run the new test and confirm any missing persistence behavior fails.
- [ ] Make the smallest Task 4A correction required by the browser evidence.
- [ ] Run `npm run check` and `npm run test:e2e`.
- [ ] Commit as `test: verify saved view persistence`.

**Exit gate:** A reviewed view survives popup and browser restart and appears only in the correct group.

## Phase 5 — View Management

### Task 5: Add Rename, Update, and confirmed Delete

**Dependencies:** Task 4B  
**Estimated scope:** Medium

**Files:**

- Create: `entrypoints/popup/ViewActions.tsx`
- Add: `src/components/ui/alert-dialog.tsx`
- Modify: `entrypoints/popup/App.tsx`
- Test: `entrypoints/popup/view-actions.test.tsx`

**Steps:**

- [ ] Write failing tests for rename validation, compatible-page Update, incompatible-page blocking, delete cancellation, and delete confirmation.
- [ ] Add only the shadcn Alert Dialog component.
- [ ] Reuse the Phase 3 capture review for Update.
- [ ] Preserve ID and creation time during Rename and Update.
- [ ] Surface storage failures without changing the displayed stored state.
- [ ] Run focused tests and `npm run check`.
- [ ] Commit as `feat: manage saved views`.

**Exit gate:** All three actions pass success, cancellation, incompatibility, and storage-failure paths.

## Phase 6 — Matching

### Task 6: Implement deterministic fingerprint scoring

**Dependencies:** Task 5  
**Estimated scope:** Medium

**Files:**

- Create: `src/matching/fingerprint.ts`, `src/matching/match.ts`
- Test: `src/matching/fingerprint.test.ts`, `src/matching/match.test.ts`

**Produces:**

```ts
export function fingerprintControl(element: Element, label: string): Fingerprint;
export function scoreCandidate(saved: Fingerprint, candidate: Fingerprint): number;
export function matchControl(
  saved: Fingerprint,
  candidates: Element[],
): { element: Element; score: number } | null;
```

**Steps:**

- [ ] Write failing tests for every PRD score, the 70-point threshold, the 10-point lead, changed IDs/classes, inserted siblings, and duplicate labels.
- [ ] Implement normalized labels and control-family rejection before scoring.
- [ ] Implement score calculation as a pure function.
- [ ] Return null for low-confidence or ambiguous candidates.
- [ ] Run focused tests and `npm run check`.
- [ ] Commit as `feat: match controls safely`.

**Exit gate:** All scoring boundaries are deterministic and ambiguous controls are skipped.

## Phase 7 — Native Restoration

### Task 7: Restore and verify reversible controls

**Dependencies:** Task 6  
**Estimated scope:** Medium

**Files:**

- Create: `src/restoration/apply-control.ts`, `src/restoration/restore.ts`
- Modify: `entrypoints/page-agent.content.ts`
- Test: `src/restoration/restore.test.ts`, `tests/fixtures/safety.html`

**Produces:**

```ts
export type SettingOutcome = "restored" | "skipped" | "failed";

export interface RestoreReport {
  outcomes: Array<{ id: string; outcome: SettingOutcome }>;
}

export async function restoreControls(
  document: Document,
  controls: CapturedSetting[],
): Promise<RestoreReport>;
```

**Steps:**

- [ ] Write failing tests for native setters, input/change events, checkable-state clicks, select fallback labels, final-value verification, and unsafe actions.
- [ ] Implement one control-family branch at a time and make its test pass.
- [ ] Never call form submission or click general buttons and links.
- [ ] Connect the Restore page command and return `RestoreReport`.
- [ ] Calculate fixture reliability from all attempted settings.
- [ ] Run focused tests and `npm run check`.
- [ ] Confirm reliability is at least 95% and all safety counters remain zero.
- [ ] Commit as `feat: restore native controls safely`.

**Exit gate:** Native fixtures meet reliability and prohibited-action requirements.

## Phase 8 — URL and Dynamic Restoration

### Task 8A: Resume Apply across navigation and bounded rerendering

**Dependencies:** Task 7  
**Estimated scope:** Medium

**Files:**

- Create: `src/apply/operation.ts`, `src/apply/coordinator.ts`
- Create: `entrypoints/background.ts`
- Modify: `entrypoints/popup/App.tsx`
- Test: `src/apply/coordinator.test.ts`

**Interfaces:**

```ts
export interface ApplyOperation {
  tabId: number;
  viewId: string;
  startedAt: number;
  expectedUrl: string;
}

export async function startApply(tabId: number, view: SavedView): Promise<void>;
export async function resumeApply(tabId: number): Promise<RestoreReport>;
```

**Steps:**

- [ ] Write failing tests for no-navigation Apply, one eligible query navigation, tab completion, popup closure, five-second retry, ten-second total timeout, partial result, and cleanup.
- [ ] Store only the minimal operation record in `chrome.storage.session`.
- [ ] Have the background listener resume after the expected same-origin, same-path navigation.
- [ ] Add a temporary MutationObserver only while unresolved settings remain.
- [ ] Aggregate URL and control outcomes into the three PRD view results.
- [ ] Run focused tests and `npm run check`.
- [ ] Commit as `feat: complete resilient apply flow`.

**Acceptance criteria:** Unit tests prove one-navigation continuation, bounded retries, result aggregation, and unconditional cleanup.

### Task 8B: Verify dynamic Apply in Chrome

**Dependencies:** Task 8A  
**Estimated scope:** Small

**Files:**

- Test: `e2e/extension.spec.ts`
- Create: `tests/fixtures/dynamic-page.html`

**Steps:**

- [ ] Add a fixture that navigates once and renders a delayed control.
- [ ] Extend Playwright with navigation, popup closure, partial-result, timeout, and cleanup workflows.
- [ ] Run the new tests and confirm any missing browser behavior fails.
- [ ] Make the smallest Task 8A correction required by the evidence.
- [ ] Run `npm run check` and `npm run test:e2e`.
- [ ] Commit as `test: verify dynamic apply`.

**Exit gate:** Apply survives popup closure and one navigation, then always cleans up its observer and session record.

## Phase 9 — Product Hardening

### Task 9: Finish status, accessibility, and performance

**Dependencies:** Task 8B  
**Estimated scope:** Medium

**Files:**

- Create: `entrypoints/popup/StatusMessage.tsx`
- Modify: `entrypoints/popup/App.tsx`, `style.css`
- Test: `entrypoints/popup/accessibility.test.tsx`, `src/capture/performance.test.ts`

**Steps:**

- [ ] Write failing tests for all PRD empty/error states, aria-live results, focus movement, labels, and destructive confirmation.
- [ ] Implement a single status component used by Save, Apply, and management flows.
- [ ] Verify primary targets are at least 44 by 44 CSS pixels and status is not color-only.
- [ ] Add a 200-control fixture and measure capture without loosening the 100 ms target.
- [ ] Measure popup interactivity against the 200 ms target in a production build.
- [ ] Run focused tests, `npm run check`, and keyboard-only manual verification.
- [ ] Commit as `feat: harden popup experience`.

**Exit gate:** PRD Sections 8 and 9 pass with documented measurement conditions.

## Phase 10 — Analytics and Privacy

### Task 10A: Add an allowlisted analytics adapter

**Dependencies:** Task 9  
**Estimated scope:** Medium

**Files:**

- Create: `src/analytics.ts`
- Modify: `entrypoints/background.ts`
- Test: `src/analytics.test.ts`

**Produces:**

```ts
export type AnalyticsEvent =
  | "extension_installed"
  | "site_permission_granted"
  | "save_view_started"
  | "view_created"
  | "view_apply_started"
  | "view_apply_full"
  | "view_apply_partial"
  | "view_apply_failed"
  | "view_updated"
  | "view_deleted";

export function track(
  event: AnalyticsEvent,
  properties: Record<string, number | string>,
): Promise<void>;
```

**Steps:**

- [ ] Write failing tests that accept PRD allowlisted properties and reject origins, URLs, query data, labels, values, names, selectors, fingerprints, and page content.
- [ ] Implement a no-op adapter when configuration is absent or analytics is disabled.
- [ ] Route configured delivery through the service worker.
- [ ] Run focused tests and `npm run check`.
- [ ] Inspect a captured request and compare every field with the allowlist.
- [ ] Commit as `feat: add analytics adapter`.

**Acceptance criteria:** Configured events contain only allowlisted properties and disabled analytics performs no delivery.

### Task 10B: Add privacy controls and reporting

**Dependencies:** Task 10A  
**Estimated scope:** Medium

**Files:**

- Create: `entrypoints/popup/ReportIssue.tsx`
- Modify: `entrypoints/popup/App.tsx`
- Test: `entrypoints/popup/privacy.test.tsx`
- Create: `docs/PRIVACY.md`

**Steps:**

- [ ] Write failing tests for the analytics off switch, identity clearing, explicit report confirmation, and prohibited report data.
- [ ] Add the off switch and identity-clearing action to the popup.
- [ ] Add a confirmed compatibility-report preview using the Task 10A validation boundary.
- [ ] Write the privacy policy from the tested storage and payload contracts.
- [ ] Run focused tests and `npm run check`.
- [ ] Commit as `feat: add privacy controls`.

**Exit gate:** Prohibited fields are rejected before analytics or compatibility-report delivery.

## Phase 11 — Release Evidence

### Task 11A: Prove the complete extension workflow

**Dependencies:** Task 10B  
**Estimated scope:** Medium

**Files:**

- Modify: `e2e/extension.spec.ts`, `playwright.config.ts`
- Create: `tests/fixtures/filter-page.html`

**Steps:**

- [ ] Write Playwright flows for permission, Save, popup reopen, Apply, navigation, partial failure, Rename, Update, and Delete.
- [ ] Run the new suite against the production extension and fix only failures inside MVP scope.
- [ ] Verify no required blanket host permission in the production manifest.
- [ ] Run `npm run check` and `npm run test:e2e` from a clean install.
- [ ] Commit as `test: add complete extension workflow`.

**Acceptance criteria:** The production extension passes the full browser workflow and manifest permission assertion.

### Task 11B: Complete release documentation and evidence

**Dependencies:** Task 11A  
**Estimated scope:** Medium

**Files:**

- Create: `entrypoints/popup/Onboarding.tsx`
- Modify: `entrypoints/popup/App.tsx`
- Test: `entrypoints/popup/Onboarding.test.tsx`
- Create: `docs/COMPATIBILITY.md`, `docs/RELEASE_CHECKLIST.md`

**Steps:**

- [ ] Write a failing test for first-run onboarding that explains per-site permission, local saved data, and analytics.
- [ ] Implement onboarding and make the focused test pass.
- [ ] Complete the ten-page real-site matrix with browser version, attempts, restores, failures, and date.
- [ ] Verify the privacy policy matches stored and transmitted data.
- [ ] Walk every item in PRD Section 13 and record evidence in the release checklist.
- [ ] Run `npm run check` and `npm run test:e2e` from a clean install.
- [ ] Commit as `docs: complete MVP release evidence`.

**Exit gate:** The complete PRD Definition of Done has current, reproducible evidence.

## Checkpoints

### Foundation checkpoint — after Phase 0

- Toolchain and popup load from a clean checkout.
- The production manifest requests no blanket host access.

### Capture checkpoint — after Phase 3

- Permission, injection, capture, privacy exclusions, and review work together.
- No persistent user data is required yet.

### Core workflow checkpoint — after Phase 8

- Save, reopen, Apply, Rename, Update, and Delete work.
- Native reliability is at least 95% with zero prohibited actions.

### Release checkpoint — after Phase 11

- Unit, type, build, and browser checks pass.
- Accessibility, performance, privacy, and compatibility evidence is current.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Site controls change often | Restore failures | Multi-signal fingerprints, confidence threshold, safe skip |
| Query navigation closes popup | Lost Apply operation | Background coordinator plus session-scoped operation |
| Framework-controlled inputs ignore assignment | Partial restores | Native setters, standard events, final-value verification |
| Optional permission handling drifts | Excessive access | Manifest assertion and browser permission test |
| UI toolkit grows unchecked | Bundle and maintenance cost | Add only components used in the current phase |
| Analytics leaks saved data | Privacy violation | Property allowlist and negative payload tests |
| Real-site tests become stale | False confidence | Dated matrix; fixtures remain the release gate |

## Authoritative Sources

- Chrome scripting and permissions: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Chrome manifest format: https://developer.chrome.com/docs/extensions/reference/manifest
- WXT installation and Vite build: https://wxt.dev/guide/installation.html and https://wxt.dev/guide/essentials/config/vite.html
- WXT runtime content scripts: https://wxt.dev/guide/essentials/scripting
- shadcn/ui with Vite: https://ui.shadcn.com/docs/installation/vite
- shadcn/ui Base UI default: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- Tailwind Vite plugin: https://tailwindcss.com/docs/installation/using-vite
