import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXTENSION_PATH = path.join(ROOT, '.output/chrome-mv3');
const OUTPUT_DIR = path.join(ROOT, 'store-assets');
const VIEWPORT = { width: 1280, height: 800 };
const RENDER_SCALE = 3;

const pageHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="/favicon.svg">
  <title>Northstar Inventory</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: #172033; background: #f5f7fb; font: 14px Inter, ui-sans-serif, system-ui, sans-serif; }
    header { height: 72px; display: flex; align-items: center; justify-content: space-between; padding: 0 34px; color: white; background: #14213d; }
    .brand { display: flex; align-items: center; gap: 12px; font-size: 19px; font-weight: 750; }
    .brand-mark { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; background: #2563eb; }
    .account { display: flex; align-items: center; gap: 10px; color: #cbd5e1; }
    .avatar { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 50%; color: white; background: #475569; font-weight: 700; }
    .layout { display: grid; grid-template-columns: 220px 1fr; min-height: 728px; }
    nav { padding: 26px 18px; border-right: 1px solid #e2e8f0; background: white; }
    nav strong { display: block; padding: 0 12px 12px; color: #94a3b8; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
    nav a { display: block; margin: 3px 0; padding: 11px 12px; border-radius: 8px; color: #64748b; text-decoration: none; }
    nav a.active { color: #1d4ed8; background: #eff6ff; font-weight: 650; }
    main { padding: 30px 34px; }
    .title-row { display: flex; align-items: flex-start; justify-content: space-between; }
    h1 { margin: 0; font-size: 28px; letter-spacing: -.03em; }
    .muted { margin: 6px 0 0; color: #64748b; }
    .button { padding: 10px 15px; border: 0; border-radius: 8px; color: white; background: #2563eb; font-weight: 650; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 24px 0; }
    .metric, .panel { border: 1px solid #e2e8f0; border-radius: 12px; background: white; box-shadow: 0 1px 2px rgb(15 23 42 / 4%); }
    .metric { padding: 17px; }
    .metric span { color: #64748b; font-size: 12px; }
    .metric b { display: block; margin-top: 5px; font-size: 23px; }
    .panel { padding: 18px; }
    .filters { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 13px; align-items: end; }
    label, legend { color: #475569; font-size: 12px; font-weight: 650; }
    input[type="search"], select { width: 100%; height: 38px; margin-top: 7px; padding: 0 11px; border: 1px solid #cbd5e1; border-radius: 8px; color: #1e293b; background: white; }
    .check { display: flex; align-items: center; gap: 8px; height: 38px; }
    fieldset { display: flex; gap: 14px; margin: 16px 0 0; padding: 0; border: 0; }
    fieldset label { display: flex; align-items: center; gap: 6px; font-weight: 500; }
    table { width: 100%; margin-top: 18px; border-collapse: collapse; overflow: hidden; border-radius: 10px; background: white; }
    th { padding: 12px 14px; color: #64748b; background: #f8fafc; font-size: 11px; letter-spacing: .06em; text-align: left; text-transform: uppercase; }
    td { padding: 14px; border-top: 1px solid #edf2f7; }
    td strong { display: block; }
    td small { color: #94a3b8; }
    .stock { display: inline-block; padding: 4px 8px; border-radius: 999px; color: #047857; background: #ecfdf5; font-size: 11px; font-weight: 700; }
  </style>
</head>
<body>
  <header><div class="brand"><span class="brand-mark">N</span>Northstar</div><div class="account">Acme Operations <span class="avatar">AL</span></div></header>
  <div class="layout">
    <nav><strong>Workspace</strong><a href="#">Overview</a><a class="active" href="#">Inventory</a><a href="#">Orders</a><a href="#">Suppliers</a><a href="#">Reports</a></nav>
    <main>
      <div class="title-row"><div><h1>Inventory</h1><p class="muted">Track products, stock, and pricing across your catalog.</p></div><button class="button">Export report</button></div>
      <div class="metrics"><div class="metric"><span>Products</span><b>2,481</b></div><div class="metric"><span>Low stock</span><b>18</b></div><div class="metric"><span>Inventory value</span><b>$184,920</b></div></div>
      <form id="inventory-filters" class="panel" aria-label="Inventory filters">
        <div class="filters">
          <div><label for="inventory-search">Search inventory</label><input id="inventory-search" name="q" type="search" value="mechanical keyboard"></div>
          <div><label for="category">Category</label><select id="category" name="category"><option>All</option><option selected value="electronics">Electronics</option><option value="office">Office</option></select></div>
          <label class="check" for="in-stock"><input id="in-stock" name="in_stock" type="checkbox" checked> In stock only</label>
        </div>
        <fieldset><legend>Condition</legend><label><input name="condition" type="radio" value="new" checked> New</label><label><input name="condition" type="radio" value="refurbished"> Refurbished</label></fieldset>
      </form>
      <table><thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Price</th></tr></thead><tbody>
        <tr><td><strong>Atlas Mechanical Keyboard</strong><small>SKU KB-1048</small></td><td>Electronics</td><td><span class="stock">82 in stock</span></td><td>$129.00</td></tr>
        <tr><td><strong>Orbit Wireless Keyboard</strong><small>SKU KB-2091</small></td><td>Electronics</td><td><span class="stock">34 in stock</span></td><td>$89.00</td></tr>
        <tr><td><strong>Keystone Compact Keyboard</strong><small>SKU KB-3882</small></td><td>Electronics</td><td><span class="stock">21 in stock</span></td><td>$109.00</td></tr>
      </tbody></table>
    </main>
  </div>
</body>
</html>`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll(check, message, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await wait(25);
  }
  throw new Error(message);
}

async function openPopup(context, webPage, extensionId) {
  await webPage.bringToFront();
  const cdp = await context.browser().newBrowserCDPSession();
  const initialTargets = await cdp.send('Target.getTargets', { filter: [{}] });
  const tab = initialTargets.targetInfos.find((target) => target.type === 'tab' && target.url === webPage.url());
  if (!tab) throw new Error('Active demo tab target missing');
  await cdp.send('Extensions.triggerAction', { id: extensionId, targetId: tab.targetId });

  let targetId = '';
  await poll(async () => {
    const targets = await cdp.send('Target.getTargets', { filter: [{}] });
    targetId = targets.targetInfos.find((target) => target.type === 'page' && target.url === `chrome-extension://${extensionId}/popup.html`)?.targetId || '';
    return Boolean(targetId);
  }, 'Extension popup did not open');

  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: false });
  let nextId = 0;
  async function command(method, params = {}) {
    const id = ++nextId;
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cdp.off('Target.receivedMessageFromTarget', onMessage);
        reject(new Error(`Popup command timed out: ${method}`));
      }, 10_000);
      function onMessage(event) {
        if (event.sessionId !== sessionId) return;
        const message = JSON.parse(event.message);
        if (message.id !== id) return;
        clearTimeout(timer);
        cdp.off('Target.receivedMessageFromTarget', onMessage);
        if (message.error || message.result?.exceptionDetails) reject(new Error(JSON.stringify(message)));
        else resolve(message.result);
      }
      cdp.on('Target.receivedMessageFromTarget', onMessage);
      cdp.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) }).catch(reject);
    });
  }
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    return result.result.value;
  }
  await poll(() => evaluate(`document.querySelector('main')?.dataset.ready === 'true'`), 'Popup did not become ready');

  return {
    evaluate,
    async text() { return await evaluate('document.body?.innerText || ""'); },
    async waitForText(text) { await poll(async () => (await this.text()).includes(text), `Popup text not found: ${text}`); },
    async click(label, partial = false) {
      const match = partial
        ? `item.textContent.trim().includes(${JSON.stringify(label)})`
        : `item.textContent.trim() === ${JSON.stringify(label)} || item.getAttribute('aria-label') === ${JSON.stringify(label)}`;
      const expression = `(() => { const nodes = Array.from(document.querySelectorAll('button,[role="menuitem"]')); const node = nodes.find((item) => ${match}); if (!node || node.disabled) return false; node.click(); return true; })()`;
      await poll(() => evaluate(expression), `Popup control not found: ${label}`);
    },
    async fill(selector, value) {
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', {bubbles:true})); return true; })()`);
    },
    async close() {
      await cdp.send('Target.closeTarget', { targetId });
      await cdp.detach();
    },
  };
}

async function openRenderedPopup(context, extensionId, webTabId, webUrl) {
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 450, height: 625 });
  await popup.addInitScript(({ webTabId, webUrl }) => {
    chrome.tabs.query = async () => [{ id: webTabId, url: webUrl }];
    chrome.permissions.contains = async () => true;
    chrome.permissions.request = async () => true;
  }, { webTabId, webUrl });
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.locator('main[data-ready="true"]').waitFor();
  await popup.addStyleTag({
    content: '*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}html,body{width:450px!important;height:625px!important;overflow:hidden!important}#root{zoom:1.25}',
  });

  return {
    async waitForText(text) { await popup.getByText(text, { exact: false }).first().waitFor(); },
    async click(label, partial = false) {
      await popup.getByRole('button', { name: label, exact: !partial }).click();
    },
    async fill(selector, value) { await popup.locator(selector).fill(value); },
    async focus(label) { await popup.getByRole('button', { name: label }).focus(); },
    async screenshot() {
      await popup.evaluate(() => {
        window.scrollTo(0, 0);
        document.querySelectorAll('.overflow-y-auto').forEach((element) => element.scrollTo(0, 0));
      });
      const png = await popup.screenshot({ type: 'png', scale: 'device' });
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      if (width !== 450 * RENDER_SCALE || height !== 625 * RENDER_SCALE) {
        throw new Error(`Popup capture was ${width}x${height}; expected ${450 * RENDER_SCALE}x${625 * RENDER_SCALE}`);
      }
      return png;
    },
    async close() { await popup.close(); },
  };
}

async function captureListingImage(page, popupPng, filename, copy, iconDataUrl) {
  const popupDataUrl = `data:image/png;base64,${popupPng.toString('base64')}`;
  await page.evaluate(({ popupDataUrl, iconDataUrl, copy }) => {
    const overlay = document.createElement('div');
    overlay.id = 'store-screenshot-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;font-family:Inter,ui-sans-serif,system-ui,sans-serif;';
    const copySurface = document.createElement('div');
    copySurface.style.cssText = 'position:absolute;inset:0 auto 0 0;width:670px;background:rgba(248,250,252,.985);box-shadow:52px 0 72px rgba(248,250,252,.92);';
    const copyBlock = document.createElement('section');
    copyBlock.style.cssText = 'position:absolute;left:64px;top:178px;width:530px;color:#0f172a;';
    const brand = document.createElement('div');
    brand.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:28px;color:#1d4ed8;font-size:18px;font-weight:750;';
    const icon = document.createElement('img');
    icon.src = iconDataUrl;
    icon.width = 44;
    icon.height = 44;
    icon.style.cssText = 'border-radius:11px;box-shadow:0 8px 24px rgba(37,99,235,.18);';
    brand.append(icon, document.createTextNode('StickySite'));
    const eyebrow = document.createElement('p');
    eyebrow.textContent = copy.eyebrow;
    eyebrow.style.cssText = 'margin:0 0 12px;color:#2563eb;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;';
    const heading = document.createElement('h2');
    heading.textContent = copy.title;
    heading.style.cssText = 'margin:0;max-width:535px;color:#0f172a;font-size:46px;line-height:1.08;letter-spacing:-.045em;';
    const body = document.createElement('p');
    body.textContent = copy.body;
    body.style.cssText = 'margin:22px 0 0;max-width:500px;color:#334155;font-size:19px;line-height:1.55;';
    copyBlock.append(brand, eyebrow, heading, body);
    const popupFrame = document.createElement('div');
    popupFrame.style.cssText = 'position:absolute;right:48px;top:88px;width:450px;height:625px;overflow:hidden;border:1px solid rgba(15,23,42,.14);border-radius:12px;background:white;box-shadow:0 30px 76px rgba(15,23,42,.3),0 5px 16px rgba(15,23,42,.16);';
    const popup = document.createElement('img');
    popup.src = popupDataUrl;
    popup.alt = '';
    popup.width = 450;
    popup.height = 625;
    popup.style.cssText = 'display:block;width:450px;height:625px;';
    popupFrame.append(popup);
    overlay.append(copySurface, copyBlock, popupFrame);
    document.body.append(overlay);
  }, { popupDataUrl, iconDataUrl, copy });
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), animations: 'disabled', scale: 'css' });
  await page.locator('#store-screenshot-overlay').evaluate((element) => element.remove());
}

function promoHtml(iconDataUrl, compact) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden}body{position:relative;color:white;background:linear-gradient(135deg,#071a3b 0%,#123c8c 52%,#2168f5 100%);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    body:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 76% 24%,rgba(93,180,255,.42),transparent 30%),radial-gradient(circle at 16% 92%,rgba(39,211,184,.25),transparent 34%)}
    .grid{position:absolute;inset:0;opacity:.16;background-image:linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px);background-size:${compact ? 28 : 48}px ${compact ? 28 : 48}px;mask-image:linear-gradient(90deg,transparent,#000 45%,#000)}
    .brand{position:absolute;display:flex;align-items:center;gap:${compact ? 14 : 24}px;left:${compact ? 28 : 110}px;top:${compact ? 74 : 148}px}
    .logo{width:${compact ? 82 : 122}px;height:${compact ? 82 : 122}px;filter:drop-shadow(0 18px 30px rgba(1,11,32,.35))}
    .name{font-size:${compact ? 35 : 62}px;font-weight:800;letter-spacing:-.045em;text-shadow:0 3px 18px rgba(1,11,32,.25)}
    .tagline{position:absolute;left:256px;top:290px;margin:0;color:#dbeafe;font-size:25px;font-weight:520;letter-spacing:-.01em}
    .visual{position:absolute;right:${compact ? 24 : 100}px;top:${compact ? 34 : 62}px;width:${compact ? 150 : 450}px;height:${compact ? 212 : 436}px;border:1px solid rgba(255,255,255,.24);border-radius:${compact ? 18 : 30}px;background:rgba(255,255,255,.13);box-shadow:0 28px 64px rgba(1,11,32,.35);backdrop-filter:blur(18px);transform:rotate(${compact ? 3 : 2}deg)}
    .window{position:absolute;inset:${compact ? 10 : 22}px;border-radius:${compact ? 13 : 22}px;background:#fff;box-shadow:0 14px 36px rgba(3,17,46,.28);overflow:hidden}
    .top{height:${compact ? 28 : 58}px;background:#eff6ff;border-bottom:1px solid #dbeafe;display:flex;align-items:center;gap:${compact ? 5 : 9}px;padding:0 ${compact ? 10 : 20}px}.dot{width:${compact ? 5 : 9}px;height:${compact ? 5 : 9}px;border-radius:50%;background:#93c5fd}
    .rows{padding:${compact ? 10 : 20}px}.row{height:${compact ? 36 : 72}px;margin-bottom:${compact ? 8 : 14}px;padding:0 ${compact ? 9 : 17}px;border:1px solid #dbeafe;border-radius:${compact ? 9 : 15}px;display:flex;align-items:center;gap:${compact ? 8 : 14}px}.check{display:grid;place-items:center;width:${compact ? 17 : 30}px;height:${compact ? 17 : 30}px;border-radius:50%;color:white;background:#16a085;font-size:${compact ? 11 : 20}px;font-weight:900}.lines{flex:1}.line{height:${compact ? 5 : 10}px;border-radius:999px;background:#1e3a5f}.line.short{width:62%;margin-top:${compact ? 5 : 9}px;background:#bfdbfe}.action{height:${compact ? 30 : 54}px;border-radius:${compact ? 8 : 13}px;background:#2168f5;box-shadow:0 8px 16px rgba(33,104,245,.28)}
    ${compact ? '.tagline{display:none}.brand{flex-direction:column;align-items:flex-start;gap:8px}.visual{opacity:.96}' : ''}
  </style></head><body><div class="grid"></div><div class="brand"><img class="logo" src="${iconDataUrl}" alt=""><div class="name">StickySite</div></div><p class="tagline">Save your filters. Restore them in one click.</p><div class="visual"><div class="window"><div class="top"><i class="dot"></i><i class="dot"></i><i class="dot"></i></div><div class="rows"><div class="row"><span class="check">✓</span><div class="lines"><div class="line"></div><div class="line short"></div></div></div><div class="row"><span class="check">✓</span><div class="lines"><div class="line"></div><div class="line short"></div></div></div><div class="action"></div></div></div></div></body></html>`;
}

async function capturePromoImages(context, iconDataUrl) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 440, height: 280 });
  await page.setContent(promoHtml(iconDataUrl, true));
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'promo-440x280.png'), scale: 'css' });
  await page.setViewportSize({ width: 1400, height: 560 });
  await page.setContent(promoHtml(iconDataUrl, false));
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'marquee-1400x560.png'), scale: 'css' });
  await page.close();
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const favicon = await fs.readFile(path.join(ROOT, 'public/icons/icon-32.svg'));
  const iconSvg = await fs.readFile(path.join(ROOT, 'public/icons/icon-128.svg'));
  const iconDataUrl = `data:image/svg+xml;base64,${iconSvg.toString('base64')}`;
  const server = http.createServer((request, response) => {
    if (request.url === '/favicon.svg') {
      response.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      response.end(favicon);
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(pageHtml);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'stickysite-store-'));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      headless: false,
      viewport: VIEWPORT,
      deviceScaleFactor: RENDER_SCALE,
      args: [
        '--headless=new',
        '--enable-unsafe-extension-debugging',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const extensionId = worker.url().split('/')[2];
    const page = await context.newPage();
    await page.goto(`${origin}/inventory?status=in-stock&sort=price`);
    await page.waitForLoadState('networkidle');
    await worker.evaluate(async () => chrome.storage.local.set({ stickysite_onboarding_completed: true }));

    let popup = await openPopup(context, page, extensionId);
    await popup.evaluate('chrome.permissions.contains = async () => true');
    await popup.click('Save Current View');
    await popup.waitForText('Review Captured Settings');
    await popup.click('Continue', true);
    await popup.waitForText('Name Your View');
    await popup.fill('#view-name-input', 'In-stock keyboards');
    await popup.click('Save View');
    await popup.waitForText('Saved "In-stock keyboards"');
    await popup.close();

    await worker.evaluate(async () => {
      const key = 'stickysite_saved_views';
      const container = (await chrome.storage.local.get(key))[key];
      const captured = container.views[0];
      await chrome.storage.local.set({
        [key]: {
          version: 1,
          views: [
            captured,
            { ...captured, id: 'weekly-price-check', name: 'Weekly price check' },
            { ...captured, id: 'clearance-stock', name: 'Clearance stock', pathname: '/clearance' },
          ],
        },
      });
    });

    const webTabId = await worker.evaluate(async (url) => {
      const tabs = await chrome.tabs.query({});
      return tabs.find((tab) => tab.url === url)?.id;
    }, page.url());
    if (webTabId == null) throw new Error('Demo tab ID missing');

    popup = await openRenderedPopup(context, extensionId, webTabId, page.url());
    await popup.focus('Apply In-stock keyboards');
    await captureListingImage(page, await popup.screenshot(), 'screenshot-1-saved-views.png', {
      eyebrow: 'Saved views',
      title: 'Your filters, ready in one click.',
      body: 'Keep useful setups for the pages you revisit and restore them without rebuilding every filter.',
    }, iconDataUrl);
    await popup.close();

    popup = await openRenderedPopup(context, extensionId, webTabId, page.url());
    await popup.click('Save Current View');
    await popup.waitForText('Review Captured Settings');
    await captureListingImage(page, await popup.screenshot(), 'screenshot-2-capture-review.png', {
      eyebrow: 'Selective capture',
      title: 'Save only the settings you want.',
      body: 'Review every detected filter before saving. Sensitive and unsupported controls stay excluded.',
    }, iconDataUrl);

    await popup.click('Continue', true);
    await popup.waitForText('Name Your View');
    await popup.fill('#view-name-input', 'Q3 keyboard shortlist');
    await captureListingImage(page, await popup.screenshot(), 'screenshot-3-name-view.png', {
      eyebrow: 'Organized presets',
      title: 'Name views so they stay easy to find.',
      body: 'Create clear, reusable presets for recurring searches, dashboards, and operational workflows.',
    }, iconDataUrl);
    await popup.close();

    await page.locator('#inventory-search').fill('changed search');
    await page.locator('#in-stock').uncheck();
    await page.locator('#category').selectOption('office');
    await page.locator('input[value="refurbished"]').check();
    popup = await openRenderedPopup(context, extensionId, webTabId, page.url());
    await popup.click('Apply In-stock keyboards');
    await popup.waitForText('All 6 settings restored successfully.');
    await captureListingImage(page, await popup.screenshot(), 'screenshot-4-restoration-status.png', {
      eyebrow: 'Honest feedback',
      title: 'Know exactly what was restored.',
      body: 'StickySite reports full, partial, or failed results instead of silently guessing when a page changes.',
    }, iconDataUrl);
    await popup.close();
    await capturePromoImages(context, iconDataUrl);

    const screenshots = [
      'screenshot-1-saved-views.png',
      'screenshot-2-capture-review.png',
      'screenshot-3-name-view.png',
      'screenshot-4-restoration-status.png',
    ];
    for (const screenshot of screenshots) {
      const png = await fs.readFile(path.join(OUTPUT_DIR, screenshot));
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      if (width !== VIEWPORT.width || height !== VIEWPORT.height) {
        throw new Error(`${screenshot} is ${width}x${height}; expected ${VIEWPORT.width}x${VIEWPORT.height}`);
      }
    }
    for (const [file, width, height] of [['promo-440x280.png', 440, 280], ['marquee-1400x560.png', 1400, 560]]) {
      const png = await fs.readFile(path.join(OUTPUT_DIR, file));
      if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height) {
        throw new Error(`${file} has incorrect dimensions`);
      }
    }
    console.log(`Created and verified ${screenshots.length} screenshots and 2 promotional images`);
  } finally {
    await context?.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(profile, { recursive: true, force: true });
  }
}

await main();
