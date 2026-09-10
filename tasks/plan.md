# Implementation Plan: View Card Context Menu & Hover Apply Button

## Overview
Update the saved view cards in `entrypoints/popup/ViewList.tsx`:
1. Move the secondary actions (Rename, Update, Delete) from the bottom row into a floating context menu triggered by a three-dot icon button (`MoreVertical`).
2. Update the Apply button to a text button that only displays when hovering over the card (while remaining accessible via keyboard focus).

## Architecture & Design Decisions
- **Context Menu vs Bottom Row:**
  - Previously, view cards rendered a secondary action row at the bottom with Rename, Update, and Delete buttons separated by a border.
  - Moving these into a floating context menu triggered by a three-dot icon button (`MoreVertical` from `lucide-react`) significantly reduces card height and visual clutter.
  - The menu will be positioned absolutely relative to the view card/three-dot trigger (`absolute right-0 top-8 z-30`).
  - Accessibility: `aria-haspopup="menu"`, `aria-expanded={isOpen}`, `role="menu"`, and `role="menuitem"` for each action. Keyboard support includes `Escape` to dismiss and click-outside listeners to close automatically.
- **Hover Apply Button:**
  - View card receives `group relative`.
  - Apply button receives `opacity-0 group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100 transition-opacity`.
  - Styled as a text button: `variant="ghost"` with `text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2.5 min-w-[48px] text-xs font-semibold`.
  - Maintaining `focus:opacity-100` ensures WCAG 2.1 keyboard navigability and tab navigation (required by Playwright E2E and accessibility checks) remain uncompromised.
- **Testing Alignment:**
  - `entrypoints/popup/save-flow.test.tsx`: Update tests to interact with the three-dot menu to access Rename, Update, and Delete actions.
  - `entrypoints/popup/accessibility.test.tsx`: Ensure accessible labels and target requirements remain verified.
  - `e2e/extension.spec.ts`: Update the management step to open the context menu before clicking "Rename" and "Delete".

## Task List

### Phase 1: View Card Redesign in `ViewList.tsx`
- [ ] **Task 1:** Implement three-dot icon button and accessible floating context menu for Rename, Update, and Delete.
- [ ] **Task 2:** Update Apply button to a text button with hover visibility (`opacity-0 group-hover:opacity-100 focus:opacity-100`).

### Checkpoint: Component & Unit Verification
- [ ] `npx vitest run entrypoints/popup/save-flow.test.tsx entrypoints/popup/accessibility.test.tsx` passes.

### Phase 2: Test Updates & E2E Verification
- [ ] **Task 3:** Update unit tests in `save-flow.test.tsx` and `accessibility.test.tsx` to reflect the menu trigger interaction.
- [ ] **Task 4:** Update E2E test in `e2e/extension.spec.ts` for context menu interaction on Rename/Delete.
- [ ] **Task 5:** Run full suite verification (`npm run check` and `npm run test:e2e`).

### Checkpoint: Feature Complete
- [ ] 190/190 Vitest tests pass across all 18 files.
- [ ] 10/10 Playwright E2E browser tests pass.
- [ ] Production extension build succeeds cleanly.

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Hover-only Apply button breaks keyboard-only navigation | High | Include `focus:opacity-100 group-focus-within:opacity-100` so tabbing immediately reveals the button |
| Context menu clips outside extension popup scroll container | Medium | Render with `z-30` and ensure right-aligned positioning within view cards |
| E2E test failures on `Rename` or `Apply` clicks | Medium | Update Playwright selectors in `e2e/extension.spec.ts` to click the three-dot trigger when accessing secondary actions |
