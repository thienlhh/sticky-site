# StickySite

> Privacy-first, local-first Chrome Extension (Manifest V3) that captures filter and view configurations on any webpage and restores them later in one click.

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
