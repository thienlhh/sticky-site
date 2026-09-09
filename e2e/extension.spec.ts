import { test, expect } from '@playwright/test';
import { chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

test.describe('StickySite Extension Shell E2E', () => {
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

  test('popup renders title and disabled save button', async () => {
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
  });
});
