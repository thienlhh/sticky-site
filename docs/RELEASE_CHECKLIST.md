# StickySite MVP Release Checklist & DoD Evidence

**Release Target:** MVP Behavioral Cohort Release  
**Evaluation Date:** September 2026 (Remediation active: 2026-09-09)  
**Status:** **BLOCKED / REMEDIATION IN PROGRESS** (Review fixes R0–R13 tracked in [plan.md](../tasks/plan.md#active-work--review-fixes-2026-09-09) and [todo.md](../tasks/todo.md))

---

## PRD Section 13: Definition of Done Audit

### 1. Installation requests no blanket website access
- **Status:** PASS
- **Implementation:** `wxt.config.ts` declares `permissions: ['storage', 'scripting', 'activeTab']` and `optional_host_permissions: ['*://*/*']`.
- **Evidence:** Automated Playwright assertion in `e2e/extension.spec.ts` verifies `.output/chrome-mv3/manifest.json` contains zero blanket host permissions (`<all_urls>`, `*://*/*`, etc.).

### 2. Current-origin access is requested only after a user action
- **Status:** PASS
- **Implementation:** `src/platform/page-agent.ts` invokes `chrome.permissions.request({ origins: [...] })` strictly inside event handlers triggered by user clicks (`handleStartCapture` or `onApply` in `entrypoints/popup/App.tsx`).
- **Evidence:** `src/platform/page-agent.test.ts` validates origin scoping and user-gesture requirement.

### 3. A user can review and save at least one supported setting
- **Status:** PASS
- **Implementation:** `src/capture/controls.ts` filters supported controls; `entrypoints/popup/CaptureReview.tsx` presents granular include/exclude toggles; zero-selection guard prevents empty views.
- **Evidence:** `src/capture/controls.test.ts` (12 tests) and `entrypoints/popup/CaptureReview.test.tsx` (3 tests).

### 4. Saved data survives restarting Chrome
- **Status:** UNVERIFIED (Remediation R11)
- **Implementation:** `src/storage/views.ts` uses versioned `chrome.storage.local` with atomic write guards.
- **Evidence:** Needs true browser relaunch test in R11; popup reopen alone does not prove browser restart survival.

### 5. Only exact-page views can be applied
- **Status:** PASS (Pending active page check in R1)
- **Implementation:** `src/domain/view.ts` path normalization and `entrypoints/popup/ViewList.tsx` exact-page filtering by `origin` and normalized `pathname`.
- **Evidence:** `src/domain/view.test.ts` (15 tests) and `entrypoints/popup/save-flow.test.tsx`.

### 6. Apply restores eligible query parameters and controls, then reports verified results
- **Status:** BLOCKED / REMEDIATION IN PROGRESS (Tasks R2, R4, R5, R6)
- **Implementation:** `src/apply/coordinator.ts` updates eligible URL query parameters without wiping sensitive keys, and `src/restoration/restore.ts` applies settings using native prototype setters with final observable value verification.
- **Evidence:** Status visibility does not prove Apply success; needs verified final values and service-worker lifecycle coordination in R2–R6.

### 7. Rename, Update, and Delete work without data loss
- **Status:** PASS (Update review under remediation in R7)
- **Implementation:** `entrypoints/popup/ViewActions.tsx` and `src/storage/views.ts` validate name lengths (1–60 chars), reject same-page duplicate names case-insensitively, require confirmation for delete, and preserve UUIDs and creation timestamps.
- **Evidence:** `entrypoints/popup/view-actions.test.tsx` (5 tests) and `e2e/extension.spec.ts` test `complete view management lifecycle`.

### 8. Partial and failed restoration produce clear feedback
- **Status:** PASS (Storage-load error handling under remediation in R8)
- **Implementation:** `entrypoints/popup/StatusMessage.tsx` renders non-color indicators (`[Error]`, `[Warning]`, `[Success]`), `role="alert"`, `aria-live="assertive"` for errors, and actionable next-step hints.
- **Evidence:** `entrypoints/popup/accessibility.test.tsx` (8 tests).

### 9. Analytics sends none of the prohibited data in Section 11
- **Status:** PASS (Background delivery under remediation in R9–R10)
- **Implementation:** `src/analytics.ts` enforces a strict property allowlist (`ALLOWED_PROPERTIES`), rejecting origins, URLs, labels, values, selectors, fingerprints, and keystrokes.
- **Evidence:** `src/analytics.test.ts` (11 tests) and `entrypoints/popup/privacy.test.tsx` (4 tests).

### 10. Safety, reliability, performance, accessibility, and automated checks pass
- **Status:** BLOCKED / REMEDIATION IN PROGRESS (Tasks R1–R12)
- **Safety:** Must verify 0 prohibited actions with shared eligibility and safe ARIA clicks (R2, R3).
- **Reliability:** Native control restoration reliability >= 95% pending bounded dynamic restoration and reverification (R4).
- **Performance:** Typical scan under 100ms on 200-control fixture in `src/capture/performance.test.ts`.
- **Accessibility:** 44px minimum target sizes, WCAG AA contrast, keyboard focus order in `entrypoints/popup/accessibility.test.tsx`.
- **Automated Check:** `npm run check` passes. Final browser release checks pending R11–R12.

### 11. The compatibility matrix has at least ten current entries
- **Status:** UNVERIFIED (Remediation R13)
- **Evidence:** `docs/COMPATIBILITY.md` documents 10 historical entries; rows have arithmetic discrepancies and require independent re-verification in R13.

### 12. The privacy policy accurately describes local data, permissions, and analytics
- **Status:** PASS
- **Evidence:** `docs/PRIVACY.md` accurately describes local storage in `chrome.storage.local`, on-demand per-site permissions, and opt-out anonymous technical telemetry.

### 13. The workflow requires no account, product backend, or DevTools
- **Status:** PASS
- **Implementation:** Standalone MV3 browser extension with fully self-contained storage and restoration logic.
- **Evidence:** Operates with zero backend dependencies, no user login required, and full functionality accessible directly through the popup UI.
