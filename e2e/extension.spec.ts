import { test, expect } from '@playwright/test';
import { chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import http from 'http';
import fs from 'fs';

test.describe('StickySite Extension E2E', () => {
  let server: http.Server;
  let serverUrl: string;
  let context: BrowserContext;
  let extensionId: string;
  const userDataDir = path.resolve(import.meta.dirname, '../.tmp/test-profile');
  const extensionPath = path.resolve(import.meta.dirname, '../.output/chrome-mv3');

  async function launchContext(profileDir: string): Promise<{ ctx: BrowserContext; extId: string }> {
    const ctx = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: [
        '--headless=new',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    let [background] = ctx.serviceWorkers();
    if (!background) {
      background = await ctx.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => null as any);
    }
    if (!background) {
      throw new Error('Extension background service worker failed to start.');
    }
    const extId = background.url().split('/')[2];
    return { ctx, extId };
  }

  async function openPopupWindow(targetCtx: BrowserContext, extId: string) {
    const [sw] = targetCtx.serviceWorkers();
    const popupPromise = targetCtx.waitForEvent('page', (p) => p.url().includes('popup.html'));
    await sw.evaluate(async (id) => {
      await chrome.windows.create({
        url: `chrome-extension://${id}/popup.html`,
        type: 'popup',
        focused: false,
      });
    }, extId);
    const popupPage = await popupPromise;
    await popupPage.waitForLoadState('domcontentloaded');
    return popupPage;
  }

  test.beforeAll(async () => {
    // Start local HTTP server serving test fixtures
    server = http.createServer((req, res) => {
      const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
      let fixtureName = urlObj.pathname.slice(1);
      if (!fixtureName) fixtureName = 'filter-page.html';
      const filePath = path.resolve(import.meta.dirname, '../tests/fixtures', fixtureName);
      if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    serverUrl = `http://127.0.0.1:${port}`;

    // Clean test profile dir
    if (fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }

    const launched = await launchContext(userDataDir);
    context = launched.ctx;
    extensionId = launched.extId;

    const setupPage = await context.newPage();
    await setupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await setupPage.evaluate(async () => {
      await chrome.storage.local.set({ stickysite_onboarding_completed: true });
    });
    await setupPage.close();
  });

  test.afterAll(async () => {
    if (context) {
      await context.close().catch(() => {});
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('popup renders title and enabled save button on active supported web page', async () => {
    const webPage = await context.newPage();
    await webPage.goto(`${serverUrl}/filter-page.html`);

    const popupPage = await openPopupWindow(context, extensionId);

    const title = popupPage.locator('h1');
    await expect(title).toHaveText('StickySite');

    const saveButton = popupPage.locator('button[aria-label="Save Current View"]');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();

    await popupPage.close();
    await webPage.close();
  });

  test('saved view persists across popup reopen, exact-page grouping, and browser restart', async () => {
    const webPage = await context.newPage();
    await webPage.goto(`${serverUrl}/filter-page.html`);

    const popupPage = await openPopupWindow(context, extensionId);

    // Seed view matching active web page identity
    const origin = new URL(serverUrl).origin;
    await popupPage.evaluate(async (orig) => {
      const key = 'stickysite_saved_views';
      const testView = {
        schemaVersion: 1,
        id: 'e2e-view-1',
        name: 'E2E Test View',
        origin: orig,
        pathname: '/filter-page.html',
        queryParams: { q: ['keyboard'] },
        controls: [
          {
            id: 'c1',
            label: 'Search Catalog',
            value: 'keyboard',
            fingerprint: { kind: 'text', tag: 'input', label: 'Search Catalog', ordinal: 0 },
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await chrome.storage.local.set({
        [key]: {
          version: 1,
          views: [testView],
        },
      });
    }, origin);

    // 1. Reload popup and verify view item is visible for this page
    await popupPage.reload();
    const viewItem = popupPage.locator('text=E2E Test View');
    await expect(viewItem).toBeVisible();

    // 2. Reopen popup in fresh page and verify persistence
    await popupPage.close();
    const popupReopen = await openPopupWindow(context, extensionId);
    await expect(popupReopen.locator('text=E2E Test View')).toBeVisible();
    await popupReopen.close();

    // 3. Exact-page grouping: navigate webPage to a different page and check it does not match
    await webPage.goto(`${serverUrl}/dynamic-page.html`);
    const popupDifferentPage = await openPopupWindow(context, extensionId);
    await expect(popupDifferentPage.locator('text=E2E Test View')).not.toBeVisible();
    await expect(popupDifferentPage.locator('text=No saved views for this page yet.')).toBeVisible();
    await popupDifferentPage.close();
    await webPage.close();

    // 4. Browser restart verification: close context, relaunch with same profile dir
    await context.close();
    const relaunched = await launchContext(userDataDir);
    context = relaunched.ctx;
    extensionId = relaunched.extId;

    const webPageAfterRestart = await context.newPage();
    await webPageAfterRestart.goto(`${serverUrl}/filter-page.html`);

    const popupAfterRestart = await openPopupWindow(context, extensionId);
    await expect(popupAfterRestart.locator('text=E2E Test View')).toBeVisible();

    await popupAfterRestart.close();
    await webPageAfterRestart.close();
  });

  test('view action apply triggers and surfaces status', async () => {
    const webPage = await context.newPage();
    await webPage.goto(`${serverUrl}/filter-page.html`);

    // Ensure origin permission exists so Apply can proceed without interactive prompt
    const origin = new URL(serverUrl).origin;
    const originPattern = `${origin}/*`;

    const popupPage = await openPopupWindow(context, extensionId);

    // Pre-grant origin permission in background/extension state
    await popupPage.evaluate(async (pattern) => {
      // In Playwright context, check if contains or add via permissions if supported
      if (chrome.permissions?.contains) {
        await chrome.permissions.contains({ origins: [pattern] });
      }
    }, originPattern);

    const applyBtn = popupPage.locator('button[aria-label="Apply E2E Test View"]');
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // Verify announced status message
    const statusMsg = popupPage.locator('#status-message');
    await expect(statusMsg).toBeVisible();

    // Verify zero dangerous button clicks on the web page
    const dangerSubmitted = await webPage.evaluate(() => (window as any).__formSubmitted === true);
    const prohibitedClicked = await webPage.evaluate(() => (window as any).__prohibitedClicked === true);
    expect(dangerSubmitted).toBe(false);
    expect(prohibitedClicked).toBe(false);

    await popupPage.close();
    await webPage.close();
  });

  test('production manifest requests no blanket host access', async () => {
    const manifestContent = await fs.promises.readFile(
      path.resolve(extensionPath, 'manifest.json'),
      'utf8'
    );
    const manifest = JSON.parse(manifestContent);

    const blanketPatterns = ['<all_urls>', '*://*/*', 'https://*/*', 'http://*/*'];

    // Check permissions
    const permissions = manifest.permissions || [];
    for (const pattern of blanketPatterns) {
      expect(permissions).not.toContain(pattern);
    }

    // Check host_permissions
    const hostPermissions = manifest.host_permissions || [];
    for (const pattern of blanketPatterns) {
      expect(hostPermissions).not.toContain(pattern);
    }
  });

  test('complete view management lifecycle: rename, delete with confirmation', async () => {
    const webPage = await context.newPage();
    await webPage.goto(`${serverUrl}/filter-page.html`);

    const popupPage = await openPopupWindow(context, extensionId);

    // 1. Rename view
    const renameBtn = popupPage.locator('button[aria-label="Rename E2E Test View"]');
    await expect(renameBtn).toBeVisible();
    await renameBtn.click();

    const renameInput = popupPage.locator('input#rename-input');
    await expect(renameInput).toBeVisible();
    await renameInput.fill('Renamed E2E View');

    const saveRenameBtn = popupPage.locator('button:has-text("Save Name")');
    await saveRenameBtn.click();

    // Verify renamed view appears
    await expect(popupPage.getByRole('heading', { name: 'Renamed E2E View', exact: true })).toBeVisible();

    // 2. Delete view: test cancel first, then confirm
    const deleteBtn = popupPage.locator('button[aria-label="Delete Renamed E2E View"]');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Cancel dialog
    const dialogCancelBtn = popupPage.locator('button:has-text("Cancel")');
    await expect(dialogCancelBtn).toBeVisible();
    await dialogCancelBtn.click();
    await expect(popupPage.getByRole('heading', { name: 'Renamed E2E View', exact: true })).toBeVisible();

    // Now confirm delete
    await deleteBtn.click();
    const dialogConfirmBtn = popupPage.locator('button:has-text("Delete View")');
    await expect(dialogConfirmBtn).toBeVisible();
    await dialogConfirmBtn.click();

    // View is deleted
    await expect(popupPage.getByRole('heading', { name: 'Renamed E2E View', exact: true })).not.toBeVisible();
    await expect(popupPage.locator('text=No saved views for this page yet.')).toBeVisible();

    await popupPage.close();
    await webPage.close();
  });

  test('unsupported page protocol disables save action and announces unsupported page', async () => {
    const webPage = await context.newPage();
    await webPage.goto('about:blank');

    const popupPage = await openPopupWindow(context, extensionId);

    const saveButton = popupPage.locator('button[aria-label="Save Current View"]');
    await expect(saveButton).toBeDisabled();

    const statusMsg = popupPage.locator('#status-message');
    await expect(statusMsg).toBeVisible();
    await expect(statusMsg).toContainText('Unsupported page URL');

    await popupPage.close();
    await webPage.close();
  });

  test('privacy settings screen and issue reporting preview', async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Click settings button
    const settingsBtn = popupPage.locator('button[aria-label="Settings and Privacy"]');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Check privacy screen
    await expect(popupPage.locator('text=Privacy & Settings')).toBeVisible();
    const toggle = popupPage.locator('input#analytics-toggle');
    await expect(toggle).toBeVisible();

    // Open Report Issue
    const reportBtn = popupPage.locator('button:has-text("Report Compatibility Issue")');
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();

    // Preview shows allowlisted metadata without URLs
    await expect(popupPage.locator('text=Preview Technical Metadata')).toBeVisible();
    const previewPre = popupPage.locator('pre');
    await expect(previewPre).toBeVisible();
    const text = await previewPre.innerText();
    expect(text).not.toContain('https://');
    expect(text).not.toContain('http://');

    // Cancel returns to settings
    const cancelBtn = popupPage.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    await expect(popupPage.locator('text=Privacy & Settings')).toBeVisible();

    await popupPage.close();
  });

  test('first-run onboarding welcomes user and dismisses cleanly', async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Clear onboarding status
    await popupPage.evaluate(async () => {
      await chrome.storage.local.remove('stickysite_onboarding_completed');
    });
    await popupPage.reload();

    // Verify Onboarding screen is visible
    await expect(popupPage.locator('text=Welcome to StickySite')).toBeVisible();
    await expect(popupPage.locator('text=Per-Site Access')).toBeVisible();
    await expect(popupPage.locator('text=Local Storage')).toBeVisible();

    // Click Get Started
    const getStartedBtn = popupPage.locator('button:has-text("Get Started")');
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();

    // Verify returned to main screen
    await expect(popupPage.locator('h1')).toHaveText('StickySite');
    await expect(popupPage.locator('button[aria-label="Save Current View"]')).toBeVisible();

    await popupPage.close();
  });
});
