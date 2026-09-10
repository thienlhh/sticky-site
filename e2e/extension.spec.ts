import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import type { SavedView } from '../src/domain/view';
import type { ApplyOperation, LastApplyResultRecord } from '../src/apply/operation';
import { openNativePopup } from './native-popup';

// Chrome's native optional-permission dialog remains a separate manual gate.
// triggerAction grants real activeTab scripting access; only the popup's
// permissions.contains response is stubbed to exercise the already-granted path.
test.describe('Production extension through its native action popup', () => {
  let server: http.Server;
  let origin: string;
  let context: BrowserContext;
  let extensionId: string;
  let profile: string;
  const extensionPath = path.resolve('.output/chrome-mv3');
  let web: Page;
  let stallNavigation = false;

  async function launch() {
    context = await chromium.launchPersistentContext(profile, {
      headless: false,
      args: ['--headless=new', '--enable-unsafe-extension-debugging',
        `--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    extensionId = worker.url().split('/')[2];
  }
  async function popup(granted = true) {
    const ui = await openNativePopup(context, web, extensionId);
    if ((await ui.text()).includes('Get Started')) {
      await ui.click('Get Started');
      await expect.poll(() => ui.evaluate<boolean>(`!Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Get Started')`)).toBe(true);
    }
    if (granted) {
      await ui.evaluate(`chrome.permissions.contains = async ({origins}) => origins.length === 1 && origins[0] === ${JSON.stringify(origin + '/*')}`);
    }
    await expect.poll(() => ui.evaluate<boolean>(`(() => {
      const btn = document.querySelector('#save-current-view-btn');
      return Boolean(btn && !btn.disabled) || !!document.querySelector('#status-message[role="alert"], #page-not-supported');
    })()`)).toBe(true);
    return ui;
  }
  async function save(name: string) {
    const ui = await popup();
    await expect.poll(() => ui.evaluate<boolean>(`(() => {
      const btn = document.querySelector('#save-current-view-btn');
      return Boolean(btn && !btn.disabled);
    })()`)).toBe(true);
    await ui.click('Save Current View');
    await expect.poll(ui.text).toContain('Review Captured Settings');
    const count = await ui.evaluate<number>('document.querySelectorAll(\'input[type="checkbox"]\').length');
    expect(count).toBeGreaterThan(0);
    await expect.poll(() => ui.evaluate<boolean>('Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Continue") && !b.disabled)')).toBe(true);
    await ui.evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue')).click()`);
    await expect.poll(ui.text).toContain('Name Your View');
    await ui.fill('#view-name-input', name);
    await ui.click('Save View');
    await expect.poll(ui.text).toContain(`Saved "${name}"`);
    await ui.close();
  }
  async function storedViews() {
    return context.serviceWorkers()[0].evaluate(async () => {
      const data = await chrome.storage.local.get('stickysite_saved_views');
      return (data.stickysite_saved_views as {views: SavedView[]} | undefined)?.views || [];
    });
  }
  async function sessionState() {
    return context.serviceWorkers()[0].evaluate(() => chrome.storage.session.get(null)) as Promise<{stickysite_apply_op?: ApplyOperation; stickysite_last_apply_result?: LastApplyResultRecord}>;
  }

  test.beforeAll(async () => {
    server = http.createServer(async (req, res) => {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      if (stallNavigation && requestUrl.searchParams.has('hang')) return;
      const name = path.basename(requestUrl.pathname) || 'filter-page.html';
      try {
        const body = await fs.readFile(path.resolve('tests/fixtures', name));
        res.writeHead(200, {'Content-Type': 'text/html'}); res.end(body);
      } catch { res.writeHead(404); res.end(); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
    profile = await fs.mkdtemp(path.join(os.tmpdir(), 'stickysite-e2e-'));
    await launch();
    console.log(`Browser: ${context.browser()!.version()}; machine: ${os.platform()} ${os.arch()} ${os.cpus()[0].model}`);
  });
  test.beforeEach(async () => {
    await context.serviceWorkers()[0].evaluate(async () => {
      await chrome.storage.local.clear(); await chrome.storage.session.clear();
    });
    web = await context.newPage();
    await web.goto(`${origin}/filter-page.html`);
  });
  test.afterEach(async () => { stallNavigation = false; await web?.close(); });
  test.afterAll(async () => {
    await context?.close();
    server?.closeAllConnections();
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    if (profile) await fs.rm(profile, {recursive:true, force:true});
  });

  test('Save UI persists across browser restart; Apply restores real values; reviewed Update and management work', async () => {
    await web.locator('#search-box').fill('saved keyboard');
    await save('Catalog');
    const [original] = await storedViews();
    expect(original.controls).toHaveLength(4);
    await context.close();
    await launch();
    web = await context.newPage();
    await web.goto(`${origin}/filter-page.html`);
    await web.locator('#search-box').fill('changed');
    await web.locator('#in-stock').uncheck();
    await web.locator('#category-select').selectOption('books');
    await web.locator('[value="refurbished"]').check();
    let ui = await popup();
    await ui.click('Apply');
    await expect.poll(ui.text).toContain('All 4 settings restored');
    await expect(web.locator('#search-box')).toHaveValue('saved keyboard');
    await expect(web.locator('#in-stock')).toBeChecked();
    await expect(web.locator('#category-select')).toHaveValue('electronics');
    await expect(web.locator('[value="new"]')).toBeChecked();
    expect((await sessionState()).stickysite_apply_op).toBeUndefined();
    await ui.close();

    await web.locator('#search-box').fill('updated keyboard');
    ui = await popup();
    await ui.click('View options for Catalog');
    await ui.click('Update'); await ui.click('Confirm Update');
    await expect.poll(ui.text).toContain('Review Captured Settings');
    await ui.evaluate(`document.querySelector('input[type="checkbox"]').click()`);
    await ui.click('Continue (3)');
    await expect.poll(ui.text).toContain('Updated "Catalog"');
    const [updated] = await storedViews();
    expect(updated.id).toBe(original.id); expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.controls).toHaveLength(3);
    expect(updated.controls.some((c: {label:string}) => c.label === 'Search Catalog')).toBe(false);
    await ui.close();

    await web.goto(`${origin}/dynamic-page.html`);
    ui = await popup();
    await expect.poll(ui.text).toContain('OTHER VIEWS ON THIS SITE');
    expect(await ui.evaluate<boolean>(`document.querySelector('[aria-label="Apply Catalog"]').disabled`)).toBe(true);
    await ui.click('View options for Catalog');
    expect(await ui.evaluate<boolean>(`document.querySelector('[aria-label="Update Catalog"]').disabled`)).toBe(true);
    await ui.click('Rename'); await ui.fill('#rename-input', 'Renamed'); await ui.click('Save Name');
    await expect.poll(ui.text).toContain('Renamed');
    await ui.click('View options for Renamed');
    await ui.click('Delete'); await ui.click('Cancel');
    expect(await storedViews()).toHaveLength(1);
    await ui.click('View options for Renamed');
    await ui.click('Delete'); await ui.click('Delete View');
    await expect.poll(storedViews).toHaveLength(0);
    await ui.close();
  });

  test('query navigation survives popup closure and delayed controls; partial/failed outcomes are accurate', async () => {
    await web.goto(`${origin}/dynamic-page.html?sort=new&sort=cheap&token=current#keep`);
    await web.locator('#delayed-color').fill('blue');
    await web.locator('#category-input').fill('books');
    await save('Dynamic');
    await web.goto(`${origin}/dynamic-page.html?sort=old&token=current#keep`);
    let ui = await popup(); await ui.click('Apply'); await ui.close();
    await expect(web).toHaveURL(`${origin}/dynamic-page.html?sort=new&sort=cheap&token=current#keep`);
    await expect(web.locator('#delayed-color')).toHaveValue('blue', {timeout:7000});
    await expect(web.locator('#category-input')).toHaveValue('books');
    ui = await popup();
    await expect.poll(ui.text).toContain('All 3 settings restored');
    await ui.close();

    await web.evaluate(() => document.querySelector('#delayed-color')!.remove());
    ui = await popup(); await ui.click('Apply');
    await expect.poll(ui.text, {timeout:7000}).toContain('2 of 3 settings restored');
    await ui.close();
    // A query-less view isolates complete control failure from successful URL settings.
    await web.goto(`${origin}/filter-page.html`); await save('Missing');
    await web.evaluate(() => document.querySelectorAll('input,select').forEach(el => el.remove()));
    ui = await popup(); await ui.click('Apply');
    await expect.poll(ui.text, {timeout:7000}).toContain('Could not apply');
    expect((await sessionState()).stickysite_apply_op).toBeUndefined();
    await ui.close();
  });

  test('stylesheet-hidden and disabled settings are skipped; dangerous actions stay at zero', async () => {
    await web.goto(`${origin}/safety.html`);
    await web.locator('#search-input').fill('saved');
    await web.locator('[value="air"]').check();
    await save('Safety');
    await web.locator('#search-input').fill('changed');
    await web.locator('#quantity-input').fill('9');
    await web.locator('#size-select').selectOption('L');
    await web.locator('#color-multi').selectOption(['blue', 'green']);
    await web.locator('[value="ground"]').check();
    await web.locator('#agree-checkbox').check();
    const full = await popup(); await full.click('Apply');
    await expect.poll(full.text).toContain('All 6 settings restored');
    await expect(web.locator('#search-input')).toHaveValue('saved');
    await expect(web.locator('#quantity-input')).toHaveValue('1');
    await expect(web.locator('#size-select')).toHaveValue('S');
    await expect(web.locator('#color-multi')).toHaveValues([]);
    await expect(web.locator('[value="air"]')).toBeChecked();
    await expect(web.locator('#agree-checkbox')).not.toBeChecked();
    await full.close();
    await web.evaluate(() => {
      (document.querySelector('#search-input') as HTMLInputElement).value = 'untouched';
      const style = document.createElement('style'); style.textContent = '#search-input{display:none}';document.head.append(style);
      (document.querySelector('[value="ground"]') as HTMLInputElement).checked = true;
      (document.querySelector('[value="air"]') as HTMLInputElement).disabled = true;
    });
    const ui = await popup(); await ui.click('Apply');
    await expect.poll(ui.text, {timeout:7000}).toContain('4 of 6 settings restored');
    expect(await web.locator('#search-input').inputValue()).toBe('untouched');
    await expect(web.locator('[value="ground"]')).toBeChecked();
    expect(await web.evaluate(() => (window as any).actionCounts)).toEqual({Submit:0,Buy:0,Send:0,Delete:0,Confirm:0,Pay:0,Checkout:0});
    await ui.close();
  });

  test('permission denial blocks capture; unsupported active page cannot select another tab', async () => {
    let ui = await popup(false);
    await ui.evaluate(`chrome.permissions.contains = async () => false; chrome.permissions.request = async () => false`);
    await ui.click('Save Current View');
    await expect.poll(ui.text).toContain('Permission denied');
    expect(await storedViews()).toHaveLength(0);
    await ui.close();
    const otherWeb = await context.newPage(); await otherWeb.goto(`${origin}/dynamic-page.html`);
    await web.goto('about:blank');
    ui = await popup(false);
    await expect.poll(ui.text).toContain('Page Not Supported');
    expect(await ui.evaluate<boolean>(`document.querySelector('#save-current-view-btn').disabled`)).toBe(true);
    expect(await ui.evaluate<boolean>(`!document.querySelector('#status-message')`)).toBe(true);
    await ui.close(); await otherWeb.close();
  });

  test('navigation deadline persists failure and removes the operation when loading never completes', async () => {
    await web.goto(`${origin}/filter-page.html?hang=yes`);
    await save('Timeout');
    await web.goto(`${origin}/filter-page.html`);
    stallNavigation = true;
    const ui = await popup();
    await ui.click('Apply');
    await ui.close();
    await expect.poll(async () => (await sessionState()).stickysite_last_apply_result?.result.message, {timeout:12000}).toContain('timed out');
    const state = await sessionState();
    expect(state.stickysite_apply_op).toBeUndefined();
    expect(state.stickysite_last_apply_result!.result.totalAttempted).toBe(5);
    expect(state.stickysite_last_apply_result!.result.status).toBe('Could not apply');
  });

  test('delayed website rejection and query changes cannot be reported as full success', async () => {
    await web.goto(`${origin}/filter-page.html?sort=saved`);
    await save('Rejected');
    await web.evaluate(() => {
      const input = document.querySelector('#search-box') as HTMLInputElement;
      input.value = 'current';
      input.addEventListener('change', () => {
        setTimeout(() => { input.value = 'rejected'; }, 25);
        history.replaceState(null, '', '?sort=rejected');
      });
    });
    const ui = await popup(); await ui.click('Apply');
    await expect.poll(ui.text).toContain('3 of 5 settings restored');
    await expect(web.locator('#search-box')).toHaveValue('rejected');
    expect(new URL(web.url()).searchParams.get('sort')).toBe('rejected');
    await ui.close();
  });

  test('200-control capture stays below 100ms including extension message overhead', async () => {
    await web.evaluate(() => {
      document.body.replaceChildren();
      for (let i = 0; i < 200; i++) {
        const input = document.createElement('input');
        input.type = 'text'; input.id = `filter-${i}`; input.name = `filter-${i}`;
        input.setAttribute('aria-label', `Filter ${i}`); input.value = String(i);
        document.body.append(input);
      }
    });
    const ui = await popup(); await ui.click('Save Current View');
    await expect.poll(ui.text).toContain('Continue (200)');
    const times = await context.serviceWorkers()[0].evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({url});
      const samples: number[] = [];
      for (let i = 0; i < 6; i++) {
        const start = performance.now();
        const response = await chrome.tabs.sendMessage(tab.id!, {type:'CAPTURE'});
        const elapsed = performance.now() - start;
        if (response.data?.controls.length !== 200) throw new Error('Capture omitted controls');
        if (i > 0) samples.push(elapsed);
      }
      return samples;
    }, web.url());
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    console.log(`Capture: 200 rendered native text inputs, one warmup, five samples (ms): ${times.map(t => t.toFixed(1)).join(', ')}; mean ${mean.toFixed(1)} ms including messaging`);
    expect(mean).toBeLessThan(100);
    await ui.close();
  });

  test('production manifest requests no required blanket host access', async () => {
    const manifest = JSON.parse(await fs.readFile(path.join(extensionPath,'manifest.json'),'utf8'));
    expect(manifest.host_permissions || []).toEqual([]);
    expect(manifest.permissions).not.toContain('<all_urls>');
    expect(manifest.content_scripts || []).toEqual([]);
  });

  test('keyboard Save and Apply expose visible focus, live results, and compact primary targets', async ({}, testInfo) => {
    const ui = await popup();
    await expect.poll(() => ui.evaluate<boolean>(`Array.from(document.querySelectorAll('p')).some(p => p.textContent.includes('Adjust page settings'))`)).toBe(true);
    async function tabTo(name: string) {
      for (let i = 0; i < 20; i++) {
        const focused = await ui.evaluate<string>(`document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim() || ''`);
        if (focused === name) return;
        await ui.press('Tab');
      }
      throw new Error(`Keyboard cannot reach ${name}`);
    }
    const hintContrast = await ui.evaluate<number>(`(() => {
      const el = Array.from(document.querySelectorAll('p')).find(p => p.textContent.includes('Adjust page settings'));
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.fillStyle = getComputedStyle(el).color;
      ctx.fillRect(0, 0, 1, 1);
      const rgb = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map(c => {
        const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 1.05 / (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] + 0.05);
    })()`);
    console.log(`Empty-state hint contrast against white: ${hintContrast.toFixed(2)}:1`);
    expect(hintContrast).toBeGreaterThanOrEqual(4.5);
    async function primaryTarget() {
      const size = await ui.evaluate<{width:number; height:number}>(`(() => { const r = document.activeElement.getBoundingClientRect(); return {width:r.width,height:r.height}; })()`);
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(32);
    }
    await tabTo('Save Current View');
    await primaryTarget();
    expect(await ui.evaluate<boolean>(`document.activeElement.matches(':focus-visible') && getComputedStyle(document.activeElement).boxShadow !== 'none'`)).toBe(true);
    const screenshot = await ui.screenshot();
    await fs.writeFile(testInfo.outputPath('keyboard-focus.png'), screenshot);
    await testInfo.attach('keyboard-focus', {body: screenshot, contentType:'image/png'});
    await ui.press('Enter');
    await expect.poll(ui.text).toContain('Review Captured Settings');
    await tabTo('Continue (4)'); await primaryTarget(); await ui.press('Enter');
    await expect.poll(() => ui.evaluate<string>('document.activeElement.id')).toBe('view-name-input');
    await ui.insertText('Keyboard');
    await tabTo('Save View'); await primaryTarget(); await ui.press('Enter');
    await expect.poll(ui.text).toContain('Saved "Keyboard"');
    expect(await ui.evaluate<string>(`document.querySelector('#status-message').getAttribute('aria-live')`)).toBe('polite');
    await tabTo('Apply Keyboard'); await primaryTarget(); await ui.press('Enter');
    await expect.poll(ui.text).toContain('All 4 settings restored');
    await ui.close();
  });

  test('native popup is interactive within 200ms', async () => {
    // Measure from the popup document's navigation start, after verifying its
    // action is enabled. Keep orchestration time separately; it includes tab
    // activation and opening/attaching a debugging connection before navigation.
    const times: number[] = [];
    const harnessTimes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const ui = await openNativePopup(context, web, extensionId);
      await expect.poll(() => ui.evaluate<boolean>(`Array.from(document.querySelectorAll('button:not(:disabled)')).some(b => ['Get Started', 'Save Current View'].includes(b.textContent.trim()))`), {intervals: [5, 10, 20]}).toBe(true);
      times.push(await ui.evaluate<number>('performance.now()'));
      harnessTimes.push(performance.now() - start);
      if ((await ui.text()).includes('Get Started')) await ui.click('Get Started');
      await ui.evaluate(`chrome.permissions.contains = async () => true`);
      await ui.click('Save Current View');
      await expect.poll(ui.text).toContain('Review Captured Settings');
      await ui.close();
    }
    console.log(`Popup document startup upper bounds (ms), five openings: ${times.map(t => t.toFixed(1)).join(', ')}; including harness setup: ${harnessTimes.map(t => t.toFixed(1)).join(', ')}`);
    expect(Math.max(...times)).toBeLessThan(200);
  });
});
