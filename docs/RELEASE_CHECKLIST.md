# StickySite MVP Release Checklist & DoD Evidence
 
**Release Target:** MVP Behavioral Cohort Release  
**Evaluation Date:** September 2026 (Remediation R0–R13 completed: 2026-09-09)  
**Status:** **READY FOR RELEASE — ALL GATES PASS** (Review fixes R0–R13 tracked in [plan.md](../tasks/plan.md#active-work--review-fixes-2026-09-09) and [todo.md](../tasks/todo.md))

---

## PRD Section 13: Definition of Done Audit

### 1. Installation requests no blanket website access
- **Status:** PASS
- **Implementation:** `wxt.config.ts` declares `permissions: ['storage', 'scripting', 'activeTab', 'tabs']` and `optional_host_permissions: ['http://*/*', 'https://*/*']`.
- **Evidence:** Automated Playwright assertion in `e2e/extension.spec.ts` (`production manifest requests no blanket host access`) verifies `.output/chrome-mv3/manifest.json` contains zero blanket host permissions (`<all_urls>`, `*://*/*`, etc.).

### 2. Current-origin access is requested only after a user action
- **Status:** PASS
- **Implementation:** `src/platform/page-agent.ts` invokes `chrome.permissions.request({ origins: [...] })` strictly inside event handlers triggered by user clicks (`handleStartCapture` or `onApply` in `entrypoints/popup/App.tsx`).
- **Evidence:** `src/platform/page-agent.test.ts` validates origin scoping and user-gesture requirement.

### 3. A user can review and save at least one supported setting
- **Status:** PASS
- **Implementation:** `src/capture/controls.ts` filters supported controls; `entrypoints/popup/CaptureReview.tsx` presents granular include/exclude toggles; zero-selection guard prevents empty views.
- **Evidence:** `src/capture/controls.test.ts` (13 tests) and `entrypoints/popup/CaptureReview.test.tsx` (3 tests).

### 4. Saved data survives restarting Chrome
- **Status:** PASS
- **Implementation:** `src/storage/views.ts` uses versioned `chrome.storage.local` with atomic write guards.
- **Evidence:** Verified in `e2e/extension.spec.ts` test `saved view persists across popup reopen, exact-page grouping, and browser restart`, where Playwright launches Chrome with persistent context, seeds storage, closes context completely, relaunches Chrome using the same profile directory, and asserts the view restores with exact-page grouping.

### 5. Only exact-page views can be applied
- **Status:** PASS
- **Implementation:** `src/domain/view.ts` path normalization and `entrypoints/popup/ViewList.tsx` exact-page filtering by `origin` and normalized `pathname`. `getActivePage()` restricts all operations to the active web tab.
- **Evidence:** `src/domain/view.test.ts` (15 tests), `entrypoints/popup/save-flow.test.tsx`, and `e2e/extension.spec.ts`.

### 6. Apply restores eligible query parameters and controls, then reports verified results
- **Status:** PASS
- **Implementation:** `src/apply/coordinator.ts` coordinates operations in the background service worker across navigation, updates eligible URL query parameters without wiping sensitive keys, applies settings using native prototype setters with reversible clicks, reverifies final observable values, and reports truthful status (`full`, `partial`, or `failed`).
- **Evidence:** `src/apply/coordinator.test.ts` (17 tests), `src/restoration/restore.test.ts` (9 tests), and `e2e/extension.spec.ts`.

### 7. Rename, Update, and Delete work without data loss
- **Status:** PASS
- **Implementation:** `entrypoints/popup/ViewActions.tsx` and `src/storage/views.ts` validate name lengths (1–60 chars), reject same-page duplicate names case-insensitively, require confirmation for delete, support Update with capture review, and preserve UUIDs and creation timestamps.
- **Evidence:** `entrypoints/popup/view-actions.test.tsx` (5 tests) and `e2e/extension.spec.ts` test `complete view management lifecycle: rename, delete with confirmation`.

### 8. Partial and failed restoration produce clear feedback
- **Status:** PASS
- **Implementation:** `entrypoints/popup/StatusMessage.tsx` renders non-color indicators (`[Error]`, `[Warning]`, `[Success]`, `[Loading]`, `[Info]`), `role="alert"`, `aria-live="assertive"` for errors, `role="status"` for non-errors, and actionable next-step hints. Storage load failures are surfaced cleanly.
- **Evidence:** `entrypoints/popup/accessibility.test.tsx` (8 tests) and `e2e/extension.spec.ts`.

### 9. Analytics sends none of the prohibited data in Section 11
- **Status:** PASS
- **Implementation:** `src/analytics.ts` enforces a strict property allowlist (`ALLOWED_PROPERTIES`), rejecting origins, URLs, labels, values, selectors, fingerprints, and keystrokes. Delivery routes through service worker with configurable endpoint and no-op fallback. All lifecycle events (`extension_installed`, `site_permission_granted`, `save_view_started`, `view_created`, `view_apply_started`, `view_apply_full`, `view_apply_partial`, `view_apply_failed`, `view_updated`, `view_deleted`) are emitted.
- **Evidence:** `src/analytics.test.ts` (18 tests) and `entrypoints/popup/privacy.test.tsx` (5 tests).

### 10. Safety, reliability, performance, accessibility, and automated checks pass
- **Status:** PASS
- **Safety:** 0 prohibited action clicks (Buy, Submit, Delete Account buttons remain unclicked during Apply across all fixtures and E2E runs).
- **Reliability:** Native control restoration reliability >= 95% on diverse fixtures; verified final values with bounded retries.
- **Performance:** 200-control scan in `src/capture/performance.test.ts` completes in under 100ms average (measured ~40–60ms); popup loads under 200ms.
- **Accessibility:** 44px minimum target sizes, WCAG AA contrast, keyboard focus order, aria-live status announcements in `entrypoints/popup/accessibility.test.tsx`.
- **Automated Check:** `npm run check` (18 test files, 159 unit/component tests + typecheck + build) and `npm run test:e2e` (8 E2E tests) pass cleanly.

### 11. The compatibility matrix has at least ten current entries
- **Status:** PASS
- **Evidence:** `docs/COMPATIBILITY.md` documents 10 real-world filtering pages evaluated with 58 settings attempted, 56 restored, 2 skipped, 0 failed, achieving 96.6% reliability (exceeding the >= 85% requirement).

### 12. The privacy policy accurately describes local data, permissions, and analytics
- **Status:** PASS
- **Evidence:** `docs/PRIVACY.md` accurately describes local storage in `chrome.storage.local`, on-demand per-site permissions, and opt-out anonymous technical telemetry.

### 13. The workflow requires no account, product backend, or DevTools
- **Status:** PASS
- **Implementation:** Standalone MV3 browser extension with fully self-contained storage and restoration logic.
- **Evidence:** Operates with zero backend dependencies, no user login required, and full functionality accessible directly through the popup UI.
