# StickySite Task Checklist

## Feature: View Card Context Menu & Hover Apply Button

### Task 1: Add Three-Dot Trigger and Context Menu in ViewList
**Description:** Replace the bottom action row in `ViewList.tsx` with a three-dot icon button (`MoreVertical`) per card that toggles a floating accessible context menu containing Rename, Update, and Delete actions.
**Acceptance criteria:**
- [x] Three-dot button rendered for each view card with `aria-label="View options for {name}"`, `aria-haspopup="menu"`, and `aria-expanded`.
- [x] Clicking the three-dot button toggles an accessible floating context menu (`role="menu"`).
- [x] Menu contains "Rename" (`role="menuitem"`), "Update" (`role="menuitem"`, disabled if `!compatible`), and "Delete" (`role="menuitem"`, destructive styling).
- [x] Clicking outside or pressing `Escape` closes the menu.
- [x] Selecting an action triggers the corresponding handler (`onRename`, `onUpdate`, `onDelete`) and closes the menu.
**Verification:**
- [x] Focused tests pass: `npx vitest run entrypoints/popup/save-flow.test.tsx`
- [x] Manual/visual check: Context menu opens smoothly, aligns to card, and closes on outside click or selection.
**Dependencies:** None
**Files likely touched:**
- `entrypoints/popup/ViewList.tsx`
**Estimated scope:** S (1 file)

---

### Task 2: Convert Apply Button to Text Button with Hover Visibility
**Description:** Refactor the Apply button in `ViewList.tsx` to a text button that remains hidden until the card is hovered or focused via keyboard.
**Acceptance criteria:**
- [x] Apply button uses text button styling (`variant="ghost"` with blue text and hover state, no solid filled container).
- [x] Apply button is hidden by default and becomes visible on card hover (`group-hover:opacity-100`).
- [x] Apply button becomes visible on keyboard focus (`focus:opacity-100 group-focus-within:opacity-100`) to preserve WCAG accessibility.
- [x] When `!compatible`, button is disabled with appropriate muted styling.
**Verification:**
- [x] Focused tests pass: `npx vitest run entrypoints/popup/accessibility.test.tsx`
**Dependencies:** Task 1
**Files likely touched:**
- `entrypoints/popup/ViewList.tsx`
**Estimated scope:** S (1 file)

---

### Checkpoint: ViewList Component Complete
- [x] Component renders without runtime or DOM errors.
- [x] Hover and context menu interactions function as expected.

---

### Task 3: Update Unit & Accessibility Tests
**Description:** Update test cases in `save-flow.test.tsx` and `accessibility.test.tsx` that previously expected static bottom-row action buttons to open the context menu or interact with the hover text button.
**Acceptance criteria:**
- [x] `save-flow.test.tsx` tests open the three-dot menu before asserting/clicking Rename, Update, or Delete.
- [x] `accessibility.test.tsx` assertions match the updated Apply text button and menu trigger.
**Verification:**
- [x] Tests pass: `npm test`
**Dependencies:** Tasks 1 and 2
**Files likely touched:**
- `entrypoints/popup/save-flow.test.tsx`
- `entrypoints/popup/accessibility.test.tsx`
**Estimated scope:** S (2 files)

---

### Task 4: Update Playwright E2E Tests
**Description:** Update Playwright browser tests in `e2e/extension.spec.ts` to click the three-dot trigger to access Rename and Delete actions.
**Acceptance criteria:**
- [x] `e2e/extension.spec.ts` opens the context menu prior to clicking `Rename` and `Delete`.
- [x] Keyboard navigation test continues to tab and trigger `Apply` cleanly.
**Verification:**
- [x] E2E tests pass: `npm run test:e2e`
**Dependencies:** Task 3
**Files likely touched:**
- `e2e/extension.spec.ts`
**Estimated scope:** S (1 file)

---

### Task 5: Site Favicon Integration (Option 1)
**Description:** Show site icon (favicon) on view cards using Chrome's built-in favicon cache API (`chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(view.origin)}&size=16`) with `<Globe />` fallback.
**Acceptance criteria:**
- [x] Manifest includes `"favicon"` permission without blanket host permissions.
- [x] `ViewList.tsx` renders `SiteIcon` for each view card.
- [x] Fallback to `<Globe />` icon when favicon is missing or fails to load.
- [x] `AGENTS.md` and tests updated.

---

### Checkpoint: Verification Complete
- [x] `npm run typecheck` passes with 0 errors.
- [x] `npm test` passes (18/18 test files, 190/190 tests).
- [x] `npm run build` succeeds into `.output/chrome-mv3`.
- [x] `npm run test:e2e` passes (10/10 tests in Chromium).
- [x] `npm run check` passes.

