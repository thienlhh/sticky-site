import { test, expect } from '@playwright/test';
import { chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

test.describe('StickySite Extension E2E', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    const extensionPath = path.resolve(import.meta.dirname, '../.output/chrome-mv3');
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        '--headless=new',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => null as any);
    }
    if (background) {
      extensionId = background.url().split('/')[2];
      const setupPage = await context.newPage();
      await setupPage.goto(`chrome-extension://${extensionId}/popup.html`);
      await setupPage.evaluate(async () => {
        await chrome.storage.local.set({ stickysite_onboarding_completed: true });
      });
      await setupPage.close();
    }
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('popup renders title and enabled save button', async () => {
    const page = await context.newPage();
    const url = extensionId
      ? `chrome-extension://${extensionId}/popup.html`
      : `file://${path.resolve(import.meta.dirname, '../.output/chrome-mv3/popup.html')}`;
    await page.goto(url);

    const title = page.locator('h1');
    await expect(title).toHaveText('StickySite');

    const saveButton = page.locator('button[aria-label="Save Current View"]');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    await page.close();
  });

  test('saved view persists across popup reopen and browser pages', async () => {
    const page = await context.newPage();
    const url = extensionId
      ? `chrome-extension://${extensionId}/popup.html`
      : `file://${path.resolve(import.meta.dirname, '../.output/chrome-mv3/popup.html')}`;
    await page.goto(url);

    // Seed storage with a view for the popup page's key
    await page.evaluate(async () => {
      const key = 'stickysite_saved_views';
      const testView = {
        schemaVersion: 1,
        id: 'e2e-view-1',
        name: 'E2E Test View',
        origin: window.location.origin,
        pathname: window.location.pathname,
        queryParams: { test: ['1'] },
        controls: [
          {
            id: 'c1',
            label: 'Test Setting',
            value: 'hello',
            fingerprint: { kind: 'text', tag: 'input', label: 'Test Setting', ordinal: 0 },
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
    });

    // Reload popup
    await page.reload();

    const viewItem = page.locator('text=E2E Test View');
    await expect(viewItem).toBeVisible();

    // Close popup and open fresh page
    await page.close();

    const freshPage = await context.newPage();
    await freshPage.goto(url);
    await expect(freshPage.locator('text=E2E Test View')).toBeVisible();
    await freshPage.close();
  });

  test('view action apply triggers and surfaces status', async () => {
    const page = await context.newPage();
    const url = extensionId
      ? `chrome-extension://${extensionId}/popup.html`
      : `file://${path.resolve(import.meta.dirname, '../.output/chrome-mv3/popup.html')}`;
    await page.goto(url);

    // Apply button for E2E Test View is visible
    const applyBtn = page.locator('button[aria-label="Apply E2E Test View"]');
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // Verify status message is displayed
    const statusMsg = page.locator('#status-message');
    await expect(statusMsg).toBeVisible();

    await page.close();
  });

  test('production manifest requests no blanket host access', async () => {
    const fs = await import('fs/promises');
    const manifestPath = path.resolve(import.meta.dirname, '../.output/chrome-mv3/manifest.json');
    const content = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

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
    const page = await context.newPage();
    const url = extensionId
      ? `chrome-extension://${extensionId}/popup.html`
      : `file://${path.resolve(import.meta.dirname, '../.output/chrome-mv3/popup.html')}`;
    await page.goto(url);

    // Seed storage with a view for lifecycle testing
    await page.evaluate(async () => {
      const key = 'stickysite_saved_views';
      const testView = {
        schemaVersion: 1,
        id: 'e2e-view-lifecycle',
        name: 'E2E Test View',
        origin: window.location.origin,
        pathname: window.location.pathname,
        queryParams: {},
        controls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await chrome.storage.local.set({
        [key]: {
          version: 1,
          views: [testView],
        },
      });
    });
    await page.reload();

    // 1. Rename view
    const renameBtn = page.locator('button[aria-label="Rename E2E Test View"]');
    await expect(renameBtn).toBeVisible();
    await renameBtn.click();

    const renameInput = page.locator('input#rename-input');
    await expect(renameInput).toBeVisible();
    await renameInput.fill('Renamed E2E View');

    const saveRenameBtn = page.locator('button:has-text("Save Name")');
    await saveRenameBtn.click();

    // Verify renamed view appears
    await expect(page.getByRole('heading', { name: 'Renamed E2E View', exact: true })).toBeVisible();

    // 2. Delete view with confirmation dialog
    const deleteBtn = page.locator('button[aria-label="Delete Renamed E2E View"]');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Confirm dialog is open
    const dialogConfirmBtn = page.locator('button:has-text("Delete View")');
    await expect(dialogConfirmBtn).toBeVisible();
    await dialogConfirmBtn.click();

    // View is gone
    await expect(page.getByRole('heading', { name: 'Renamed E2E View', exact: true })).not.toBeVisible();
    await expect(page.locator('text=No saved views for this page yet.')).toBeVisible();

    await page.close();
  });

  test('privacy settings screen and issue reporting preview', async () => {
    const page = await context.newPage();
    const url = extensionId
      ? `chrome-extension://${extensionId}/popup.html`
      : `file://${path.resolve(import.meta.dirname, '../.output/chrome-mv3/popup.html')}`;
    await page.goto(url);

    // Click settings button
    const settingsBtn = page.locator('button[aria-label="Settings and Privacy"]');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Check privacy screen
    await expect(page.locator('text=Privacy & Settings')).toBeVisible();
    const toggle = page.locator('input#analytics-toggle');
    await expect(toggle).toBeVisible();

    // Open Report Issue
    const reportBtn = page.locator('button:has-text("Report Compatibility Issue")');
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();

    // Preview shows allowlisted metadata without URLs
    await expect(page.locator('text=Preview Technical Metadata')).toBeVisible();
    const previewPre = page.locator('pre');
    await expect(previewPre).toBeVisible();
    const text = await previewPre.innerText();
    expect(text).not.toContain('https://');

    // Cancel returns to settings
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    await expect(page.locator('text=Privacy & Settings')).toBeVisible();

    await page.close();
  });

  test('first-run onboarding welcomes user and dismisses cleanly', async () => {
    const page = await context.newPage();
    const url = extensionId
      ? `chrome-extension://${extensionId}/popup.html`
      : `file://${path.resolve(import.meta.dirname, '../.output/chrome-mv3/popup.html')}`;
    await page.goto(url);

    // Clear onboarding status
    await page.evaluate(async () => {
      await chrome.storage.local.remove('stickysite_onboarding_completed');
    });
    await page.reload();

    // Verify Onboarding screen is visible
    await expect(page.locator('text=Welcome to StickySite')).toBeVisible();
    await expect(page.locator('text=Per-Site Access')).toBeVisible();
    await expect(page.locator('text=Local Storage')).toBeVisible();

    // Click Get Started
    const getStartedBtn = page.locator('button:has-text("Get Started")');
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();

    // Verify returned to main screen
    await expect(page.locator('h1')).toHaveText('StickySite');
    await expect(page.locator('button[aria-label="Save Current View"]')).toBeVisible();

    await page.close();
  });
});
