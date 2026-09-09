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
    }
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('popup renders title and enabled save button', async () => {
    const page = await context.newPage();
    if (extensionId) {
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
    } else {
      const popupPath = path.resolve(import.meta.dirname, '../.output/chrome-mv3/popup.html');
      await page.goto(`file://${popupPath}`);
    }

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
});
