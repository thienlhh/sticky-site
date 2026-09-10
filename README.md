# StickySite

> Privacy-first, local-first Chrome Extension (Manifest V3) that captures filter and view configurations on any webpage and restores them later in one click.

---

## Architecture & Overview

StickySite is built with **WXT**, **React 19**, **Tailwind CSS v4**, and **TypeScript**. It captures form controls and URL query parameters, saves them locally in `chrome.storage.local`, and provides dynamic restoration across direct navigations and client-rendered SPA DOM re-renders.

### Core Invariants

- **User-Triggered:** Executes only when the user explicitly saves, updates, or applies a view.
- **Local-First:** Views persist solely in `chrome.storage.local`. No cloud accounts, external databases, or remote syncing.
- **Least-Privilege:** No blanket host permissions on install. Origin access (`${origin}/*`) is requested on-demand per site.
- **Safe-by-Default:** Sensitive inputs (passwords, credit cards, SSNs, OTPs, auth tokens) and destructive action buttons (Submit, Buy, Pay, Delete) are strictly excluded and never touched.
- **Compatibility-Honest:** Accurately reports full, partial, or failed restoration outcomes without silent fallback.

---

## Codebase Map

```
sticky-site/
├── entrypoints/
│   ├── background.ts             # Service worker handling navigation-spanning apply coordination
│   ├── page-agent.content.ts     # Content script executing DOM capture and value restoration
│   └── popup/                    # React 19 popup UI application
│       ├── App.tsx               # Main state machine and screen router
│       ├── SaveView.tsx          # View naming and initial save interface
│       ├── CaptureReview.tsx     # Selective parameter & form control review
│       ├── ViewActions.tsx       # Context menu for rename, update, and delete
│       └── PrivacySettings.tsx   # Origin permission and data management
├── src/
│   ├── domain/                   # Pure models and utilities (view.ts, url.ts)
│   ├── capture/                  # Scanning engine, label heuristics, safety filters (eligibility.ts, controls.ts)
│   ├── matching/                 # Element fingerprinting & matching across DOM re-renders (fingerprint.ts, match.ts)
│   ├── restoration/              # Event dispatching, value restoration, and verification (restore.ts, apply-control.ts)
│   ├── apply/                    # Multi-step apply session coordinator (coordinator.ts, operation.ts)
│   ├── storage/                  # Typed abstraction over chrome.storage.local (views.ts)
│   ├── badge/                    # Extension action badge controller
│   └── analytics.ts              # Privacy-preserving event analytics and payload validator
├── docs/                         # Specifications & policies (PRD.md, PRIVACY.md)
└── tests/                        # E2E test suites (Playwright)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm (`save-exact=true` configured via `.npmrc`)
- Google Chrome or Chromium-based browser

### Installation

```bash
npm install
```

---

## Development & Commands

| Task | Command | Description |
|---|---|---|
| **Consolidated Check** | `npm run check` | Runs `typecheck`, `test`, and `build`. Run before every commit. |
| **Development Runner** | `npm run dev` | Starts WXT development runner with hot reload enabled. |
| **Build Production** | `npm run build` | Builds production MV3 bundle to `.output/chrome-mv3/`. |
| **Typecheck** | `npm run typecheck` | Validates TypeScript with `tsc --noEmit`. |
| **Unit Tests** | `npm test` | Runs Vitest across all unit and component suites. |
| **Single Test File** | `npx vitest run <path>` | e.g. `npx vitest run src/domain/view.test.ts` |
| **Filter Tests** | `npx vitest run -t "<pattern>"` | Runs tests matching a specific description pattern. |
| **E2E Tests** | `npm run test:e2e` | Runs Playwright E2E browser tests (requires `npm run build` first). |

---

## Loading Unpacked Extension

1. Build the extension:
   ```bash
   npm run build
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** via the top-right toggle.
4. Click **Load unpacked** and select `.output/chrome-mv3`.
5. Pin **StickySite** from the extension toolbar.

---

## Developer Guardrails & Guidelines

### 1. Permissions & Least Privilege
- Manifest permissions in `wxt.config.ts` are strictly limited to `['storage', 'scripting', 'activeTab', 'tabs', 'favicon']`.
- `http://*/*` and `https://*/*` must remain `optional_host_permissions`.
- **Never** add blanket host permissions. Request host access only for the specific origin (`${origin}/*`) on-demand when the user initiates an action.

### 2. Control Eligibility & Safety
- **Excluded Inputs:** Never capture or touch passwords, hidden/file inputs, credit cards, bank accounts, SSNs, phone numbers, contact/credential inputs, OTP tokens, or query parameters with sensitive names (`token`, `auth`, `jwt`, `secret`, `sig`). See `src/capture/eligibility.ts`.
- **Forbidden Actions:** Never click submit, buy, pay, delete, search, or confirm buttons.
- **Value Restoration:** Set values via native property descriptors and dispatch both `input` and `change` events (`bubbles: true`). Verify final values post-dispatch; report rejected or overwritten values accurately.

### 3. WXT Imports
- Import entrypoint helpers explicitly from `wxt/utils/...` (e.g. `import { defineBackground } from 'wxt/utils/define-background'`) to maintain typecheckability without prior build generation.

### 4. Testing Conventions
- Vitest Chrome APIs are mocked in `vitest.setup.ts`.
- In React component tests, wrap asynchronous state updates in `act(...)` or use `@testing-library/react` async helpers (`waitFor`, `findBy*`).

### 5. Privacy & Analytics Guardrails
- Payloads are strictly validated via `validatePayload()` in `src/analytics.ts`.
- **Never** transmit URLs, hostnames, query strings, form values, DOM selectors, or freeform text. Only send allowlisted event names and coarse counters/buckets.
