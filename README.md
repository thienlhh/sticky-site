# StickySite

> Save this view. Reapply it later in one click.

StickySite is a privacy-first, local-first Chrome Extension (Manifest V3) that captures filter and view configurations on any webpage and restores them reliably whenever you return.

---

## Overview

Complex web applications and dashboards frequently lack direct deep links or reset user filters across sessions. StickySite bridges that gap by capturing current query parameters and interactive form controls, storing them locally, and providing single-click restoration.

### Core Guarantees

- **Local-First:** All saved views are persisted strictly in your browser (`chrome.storage.local`). No cloud accounts, external databases, or remote syncing.
- **Least-Privilege:** Zero blanket host permissions requested on install. Permission to read or interact with a page is requested on-demand only for the specific origin (`https://example.com/*`).
- **Safe-by-Default:** Sensitive inputs are proactively excluded and never captured or touched:
  - Passwords, credit cards, CVVs, and banking details.
  - Government IDs (SSN, national IDs), phone numbers, and street addresses.
  - OTPs, authentication tokens, session secrets, and query parameters matching sensitive patterns.
  - Destructive action buttons (Submit, Buy, Pay, Delete, Confirm) are strictly forbidden from interaction.
- **User-Triggered:** Runs only when explicitly invoked by the user to save, review, update, or apply a view.
- **Compatibility-Honest:** Accurately reports full, partial, or failed restorations without silent fallbacks.

---

## Key Features

- **Selective Capture Review:** Inspect every detected query parameter and form control before saving. Easily uncheck individual controls or parameters you do not wish to capture.
- **Multi-Heuristic Matching Engine:** Robust element fingerprinting matches form inputs across dynamic DOM re-renders, client-side SPA routing, and markup changes.
- **Coordinated Restoration:** Handles both direct URL query navigation and dynamic DOM hydration, dispatching native input and change events with post-verification checks.
- **View Management:** Organize multiple views per site, update active views as page states evolve, rename views, or clear data per origin at any time.

---

## Installation & Setup

### Prerequisites

- Node.js 20+
- Google Chrome (or Chromium-based browser supporting Manifest V3)

### 1. Build the Extension

```bash
npm install
npm run build
```

This compiles the extension bundle to `.output/chrome-mv3/`.

### 2. Load into Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` folder inside the project directory.
5. StickySite will now appear in your extensions toolbar. Pin it for quick access.

---

## Development

| Command | Description |
|---|---|
| `npm run dev` | Starts the WXT development runner with hot reload enabled |
| `npm run build` | Builds production-ready MV3 artifacts to `.output/chrome-mv3/` |
| `npm run check` | Runs full verification pipeline: typechecking, unit tests, and production build |
| `npm run typecheck` | Validates TypeScript types across the project (`tsc --noEmit`) |
| `npm test` | Runs the Vitest unit and component test suites |
| `npm run test:e2e` | Runs Playwright E2E browser tests against the built extension |

---

## Architecture & Technology Stack

- **Extension Framework:** [WXT](https://wxt.dev/) (Manifest V3) with Vite
- **UI Framework:** React 19, Tailwind CSS v4, `@base-ui/react`, `lucide-react`
- **Testing:** Vitest, `@testing-library/react`, Playwright
- **Storage:** `chrome.storage.local` with typed schema abstraction
