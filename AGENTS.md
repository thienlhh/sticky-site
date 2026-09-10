# AGENTS.md

Context and operational guidelines for AI coding agents working on **StickySite**.

---

## Project Overview

**StickySite** is a privacy-first, local-first Chrome Extension (Manifest V3) that captures filter and view settings on a webpage and restores them later in one click.

### Core Invariants
- **User-triggered:** Executes only when the user explicitly saves, updates, or applies a view.
- **Local-first:** Saved views persist in `chrome.storage.local`. No external account or database.
- **Least-privilege:** No blanket host permissions on install. Origin access is requested per site on-demand.
- **Safe-by-default:** Sensitive inputs and destructive action buttons are strictly excluded and never touched.
- **Compatibility-honest:** Reports accurate full, partial, or failed restoration outcomes without silent fallback.

### Technology Stack
- **Extension Toolchain:** [WXT 0.21](https://wxt.dev/) with Vite 8.2 (Manifest V3)
- **Runtime & Language:** Node.js (ES modules), TypeScript 7 (strict, `@/*` maps to `./src/*`)
- **Frontend UI:** React 19, Tailwind CSS v4 (`@tailwindcss/vite`), `@base-ui/react`, `lucide-react`
- **Testing:** Vitest 5 (`jsdom`), `@testing-library/react`, Playwright 1.63 (E2E)
- **Package Manager:** `npm` with exact dependencies (`save-exact=true` in `.npmrc`, `package-lock.json`)

---

## Key Commands

| Task | Command | Notes |
|---|---|---|
| **Consolidated Check** | `npm run check` | Runs `typecheck`, `test`, and `build`. Run before every commit. |
| **Typecheck** | `npm run typecheck` | `tsc --noEmit` |
| **All Unit Tests** | `npm test` | Runs Vitest across all unit and component suites. |
| **Single Test File** | `npx vitest run <path>` | e.g. `npx vitest run src/domain/view.test.ts` |
| **Test by Pattern** | `npx vitest run -t "<name>"` | Filters tests by description. |
| **Build Extension** | `npm run build` | Builds production artifacts to `.output/chrome-mv3/`. |
| **Development** | `npm run dev` | WXT development runner with hot reloading. |
| **E2E Tests** | `npm run test:e2e` | Playwright browser suite (requires prior `npm run build`). |

---

## Architecture & Codebase Map

- `entrypoints/background.ts`: Service worker handling apply coordinator across navigations, tab events, and analytics transport.
- `entrypoints/page-agent.content.ts`: Runtime content script for DOM capture and value restoration.
- `entrypoints/popup/`: Extension action popup application (React 19).
- `src/domain/`: Pure models and utilities (`view.ts`, `url.ts`).
- `src/capture/`: Control scanning, label heuristics, and safety filtering (`eligibility.ts`, `controls.ts`).
- `src/matching/`: Element fingerprinting and matching engine across DOM re-renders (`match.ts`, `fingerprint.ts`).
- `src/restoration/`: Value restoration, event dispatching, and verification (`restore.ts`, `apply-control.ts`).
- `src/apply/`: Navigation-spanning apply coordination and session tracking (`coordinator.ts`, `operation.ts`).
- `src/storage/`: Typed storage abstraction over `chrome.storage.local` (`views.ts`).
- `src/analytics.ts`: Privacy-preserving event analytics and payload validator.
- `docs/`: Reference documentation — [PRD.md](file:///Users/thienlhh/Workspace/sticky-site/docs/PRD.md), [PRIVACY.md](file:///Users/thienlhh/Workspace/sticky-site/docs/PRIVACY.md).

---

## Critical Rules & Guardrails

### 1. Permissions & Least Privilege
- Manifest permissions in [wxt.config.ts](file:///Users/thienlhh/Workspace/sticky-site/wxt.config.ts) are restricted to `['storage', 'scripting', 'activeTab', 'tabs', 'favicon']`.
- `http://*/*` and `https://*/*` must remain `optional_host_permissions`.
- **NEVER** introduce blanket host permissions. Request host access only for the specific origin (`${origin}/*`) on-demand when the user initiates an action.

### 2. Control Eligibility & Safety
- **Excluded Inputs:** NEVER capture or touch passwords, hidden/file inputs, credit cards, bank details, SSNs, phone numbers, contact/credential inputs, OTP tokens, or query parameters with sensitive names (`token`, `auth`, `jwt`, `secret`, `sig`). See [src/capture/eligibility.ts](file:///Users/thienlhh/Workspace/sticky-site/src/capture/eligibility.ts).
- **Forbidden Actions:** NEVER click submit, buy, pay, delete, search, or confirm buttons.
- **Value Restoration:** Set control values and dispatch both `input` and `change` events (`bubbles: true`). Verify final DOM values post-dispatch; report rejected or overwritten values as `skipped` or `failed`.

### 3. WXT Imports
- Import entrypoint helpers explicitly from `wxt/utils/...` (e.g. `import { defineBackground } from 'wxt/utils/define-background'`) to maintain typecheckability without prior build generation.

### 4. Testing Conventions
- Vitest Chrome APIs are mocked in [vitest.setup.ts](file:///Users/thienlhh/Workspace/sticky-site/vitest.setup.ts). Update setup if new Chrome APIs are called.
- In React component tests, wrap async state updates in `act(...)` or use `@testing-library/react` async helpers (`waitFor`, `findBy*`).

### 5. Analytics Guardrails
- Payloads are strictly validated via `validatePayload()`.
- **NEVER** send URLs, hostnames, search queries, form values, DOM selectors, or freeform text. Only send allowlisted event names and coarse counters/buckets. See [src/analytics.ts](file:///Users/thienlhh/Workspace/sticky-site/src/analytics.ts).
