import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { openNativePopup } from '../e2e/native-popup.ts';

const root = process.cwd();
const assetsDir = path.join(root, 'store-assets');
await fs.mkdir(path.join(assetsDir, 'raw'), { recursive: true });

// 1. Start local server serving styled test fixture
const fixtureHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Keyboards & Electronics Catalog</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 32px 40px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; }
    .filters-bar { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 24px; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }
    input[type="text"], select { height: 36px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; font-size: 13px; color: #1e293b; background: #fff; min-width: 180px; }
    .checkbox-group { display: flex; align-items: center; gap: 8px; height: 36px; }
    .checkbox-group input { width: 16px; height: 16px; accent-color: #2563eb; }
    .checkbox-group label { text-transform: none; font-size: 13px; font-weight: 500; cursor: pointer; }
    .catalog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .product-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .badge { align-self: flex-start; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #dbeafe; color: #1e40af; }
    .product-title { font-size: 14px; font-weight: 600; color: #1e293b; }
    .product-price { font-size: 16px; font-weight: 700; color: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Computer Hardware & Keyboards Catalog</h1>
    <span style="font-size: 13px; color: #64748b;">Showing 28 in-stock items</span>
  </div>

  <form id="filter-form" onsubmit="event.preventDefault();">
    <div class="filters-bar">
      <div class="form-group">
        <label for="search-box">Search Catalog</label>
        <input id="search-box" type="text" name="q" value="mechanical keyboard wireless">
      </div>
      <div class="form-group">
        <label for="category-select">Category</label>
        <select id="category-select" name="cat">
          <option value="all">All Categories</option>
          <option value="electronics" selected>Electronics & Keyboards</option>
          <option value="accessories">Accessories</option>
        </select>
      </div>
      <div class="checkbox-group">
        <input id="in-stock" type="checkbox" name="in_stock" checked>
        <label for="in-stock">In Stock Only</label>
      </div>
    </div>
  </form>

  <div class="catalog-grid">
    <div class="product-card">
      <span class="badge">Wireless • RGB</span>
      <div class="product-title">Keychron K2 Pro Mechanical Keyboard</div>
      <div class="product-price">$99.00</div>
    </div>
    <div class="product-card">
      <span class="badge">Hot-Swappable</span>
      <div class="product-title">NuPhy Air75 Low Profile Keyboard</div>
      <div class="product-price">$119.95</div>
    </div>
    <div class="product-card">
      <span class="badge">Bluetooth 5.1</span>
      <div class="product-title">Logitech MX Mechanical Mini</div>
      <div class="product-price">$149.99</div>
    </div>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fixtureHtml);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const pageUrl = `http://127.0.0.1:${port}/catalog?sort=price_asc&brand=keychron`;

// 2. Launch browser with extension
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'ss-assets-'));
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  args: [
    '--headless=new',
    '--enable-unsafe-extension-debugging',
    `--disable-extensions-except=${root}/.output/chrome-mv3`,
    `--load-extension=${root}/.output/chrome-mv3`
  ]
});

const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
const extId = worker.url().split('/')[2];

// Complete onboarding
await worker.evaluate(async () => {
  await chrome.storage.local.set({ stickysite_onboarding_completed: true });
});

const page = await context.newPage();
await page.goto(pageUrl);

// Save first view natively through the popup
let ui = await openNativePopup(context, page, extId);
await ui.evaluate('chrome.permissions.contains = async () => true; chrome.permissions.request = async () => true;');
await ui.click('Save Current View');
await page.waitForTimeout(500);

// Capture SCREEN 2: Capture Review Screen
const shot2 = await ui.screenshot();
await fs.writeFile(path.join(assetsDir, 'raw/popup-2-review.png'), shot2);
console.log('✓ Captured Screen 2: Capture Review');

// Advance to name
await ui.evaluate(`Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Continue") && !b.disabled)?.click()`);
await page.waitForTimeout(500);

// Capture SCREEN 3: Name Your View Screen
await ui.fill('#view-name-input', 'Wireless Keyboards (< $120)');
await page.waitForTimeout(400);
const shot3 = await ui.screenshot();
await fs.writeFile(path.join(assetsDir, 'raw/popup-3-save.png'), shot3);
console.log('✓ Captured Screen 3: Name Your View');

// Save the view
await ui.click('Save View');
await page.waitForTimeout(500);
await ui.close();

// Save second view natively
await page.locator('#search-box').fill('keycaps and accessories');
ui = await openNativePopup(context, page, extId);
await ui.evaluate('chrome.permissions.contains = async () => true; chrome.permissions.request = async () => true;');
await ui.click('Save Current View');
await page.waitForTimeout(400);
await ui.evaluate(`Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Continue") && !b.disabled)?.click()`);
await page.waitForTimeout(400);
await ui.fill('#view-name-input', 'All Accessories (In-Stock)');
await ui.click('Save View');
await page.waitForTimeout(500);
await ui.close();

// Reopen popup to capture SCREEN 1: Views List Screen
ui = await openNativePopup(context, page, extId);
await ui.evaluate('chrome.permissions.contains = async () => true; chrome.permissions.request = async () => true;');
await page.waitForTimeout(500);
// Make the Apply button visible on the first card
await ui.evaluate(`(() => {
  const btn = document.querySelector('button[aria-label^="Apply"]');
  if (btn) btn.style.opacity = '1';
})()`);
await page.waitForTimeout(300);
const shot1 = await ui.screenshot();
await fs.writeFile(path.join(assetsDir, 'raw/popup-1-list.png'), shot1);
console.log('✓ Captured Screen 1: Views List');

// Click Apply on the first view to trigger real restoration and capture SCREEN 4: Status Overlay Screen
await ui.evaluate(`(() => {
  const btn = document.querySelector('button[aria-label^="Apply"]');
  if (btn) btn.click();
})()`);
await page.waitForTimeout(800);
const shot4 = await ui.screenshot();
await fs.writeFile(path.join(assetsDir, 'raw/popup-4-status.png'), shot4);
console.log('✓ Captured Screen 4: Status Overlay');

await ui.close();
await context.close();
server.close();
await fs.rm(profile, { recursive: true, force: true });

// 3. Composite into 1280x800 screenshots and 440x280 promo tile
const p1 = (await fs.readFile(path.join(assetsDir, 'raw/popup-1-list.png'))).toString('base64');
const p2 = (await fs.readFile(path.join(assetsDir, 'raw/popup-2-review.png'))).toString('base64');
const p3 = (await fs.readFile(path.join(assetsDir, 'raw/popup-3-save.png'))).toString('base64');
const p4 = (await fs.readFile(path.join(assetsDir, 'raw/popup-4-status.png'))).toString('base64');
const iconBase64 = (await fs.readFile(path.join(root, 'public/icons/icon-128.png'))).toString('base64');

function buildScreenshotHtml({ badge, title, subtitle, popupBase64, callout }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px;
    height: 800px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%);
    color: #f8fafc;
    display: flex;
    flex-direction: column;
    padding: 36px 48px 0 48px;
    position: relative;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }
  .header-left { max-width: 820px; }
  .badge-tag {
    display: inline-flex;
    align-items: center;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(129, 140, 248, 0.4);
    color: #a5b4fc;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 9999px;
    margin-bottom: 10px;
  }
  .title {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #ffffff;
    line-height: 1.2;
    margin-bottom: 6px;
  }
  .subtitle {
    font-size: 15px;
    color: #94a3b8;
    font-weight: 400;
  }
  .brand-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 8px 16px;
    border-radius: 9999px;
  }
  .brand-pill img { width: 24px; height: 24px; border-radius: 6px; }
  .brand-pill span { font-weight: 700; font-size: 14px; color: #f1f5f9; }

  .browser-window {
    flex: 1;
    background: #ffffff;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }
  .browser-chrome {
    height: 44px;
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 16px;
  }
  .window-dots { display: flex; gap: 8px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; }
  .dot-red { background: #ef4444; }
  .dot-yellow { background: #f59e0b; }
  .dot-green { background: #10b981; }

  .address-bar {
    flex: 1;
    height: 28px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 12px;
    color: #334155;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    gap: 8px;
  }
  .address-icon { color: #10b981; font-size: 11px; }

  .browser-actions { display: flex; align-items: center; gap: 12px; }
  .ext-icon-wrapper {
    position: relative;
    padding: 4px;
    background: #e2e8f0;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ext-icon-wrapper img { width: 18px; height: 18px; }
  .active-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    background: #4f46e5;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 6px;
    border: 1px solid #fff;
  }

  .page-viewport {
    flex: 1;
    background: #f8fafc;
    position: relative;
    padding: 28px 36px;
    overflow: hidden;
  }
  .mock-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .mock-title { font-size: 18px; font-weight: 700; color: #0f172a; }
  .mock-filters-bar {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 20px;
    display: flex;
    gap: 16px;
    align-items: flex-end;
    max-width: 780px;
  }
  .mock-group { display: flex; flex-direction: column; gap: 4px; }
  .mock-group label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; }
  .mock-input {
    height: 34px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 0 10px;
    font-size: 12px;
    color: #1e293b;
    background: #fff;
  }
  .mock-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    max-width: 780px;
  }
  .card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .card-badge {
    align-self: flex-start;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    background: #dbeafe;
    color: #1e40af;
  }
  .card-title { font-size: 13px; font-weight: 600; color: #1e293b; }
  .card-price { font-size: 15px; font-weight: 700; color: #0f172a; }

  .popup-frame {
    position: absolute;
    top: 10px;
    right: 28px;
    width: 375px;
    height: 498px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    z-index: 50;
  }
  .popup-frame img { width: 100%; height: 100%; display: block; }

  .callout-box {
    position: absolute;
    bottom: 24px;
    left: 36px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
    z-index: 60;
  }
  .callout-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #4f46e5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 800;
    font-size: 16px;
  }
  .callout-text h4 { font-size: 13px; font-weight: 700; color: #f8fafc; margin-bottom: 2px; }
  .callout-text p { font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div class="badge-tag">${badge}</div>
    <div class="title">${title}</div>
    <div class="subtitle">${subtitle}</div>
  </div>
  <div class="brand-pill">
    <img src="data:image/png;base64,${iconBase64}" alt="StickySite logo" />
    <span>StickySite</span>
  </div>
</div>

<div class="browser-window">
  <div class="browser-chrome">
    <div class="window-dots">
      <div class="dot dot-red"></div>
      <div class="dot dot-yellow"></div>
      <div class="dot dot-green"></div>
    </div>
    <div class="address-bar">
      <span class="address-icon">🔒</span>
      <span>https://shop.hardware-deals.io/catalog?sort=price_asc&brand=keychron</span>
    </div>
    <div class="browser-actions">
      <div class="ext-icon-wrapper">
        <img src="data:image/png;base64,${iconBase64}" alt="Extension" />
        <div class="active-badge">2</div>
      </div>
    </div>
  </div>

  <div class="page-viewport">
    <div class="mock-header">
      <div class="mock-title">Computer Hardware & Keyboards</div>
      <div style="font-size: 12px; color: #64748b;">Showing 28 in-stock items matching filters</div>
    </div>

    <div class="mock-filters-bar">
      <div class="mock-group">
        <label>Search Query</label>
        <input class="mock-input" type="text" value="mechanical keyboard wireless" style="width: 200px;" readonly>
      </div>
      <div class="mock-group">
        <label>Category</label>
        <input class="mock-input" type="text" value="Electronics & Keyboards" style="width: 170px;" readonly>
      </div>
      <div class="mock-group">
        <label>Status</label>
        <input class="mock-input" type="text" value="✓ In Stock Only" style="width: 120px;" readonly>
      </div>
    </div>

    <div class="mock-cards">
      <div class="card">
        <span class="card-badge">Wireless • RGB</span>
        <div class="card-title">Keychron K2 Pro Mechanical Keyboard</div>
        <div class="card-price">$99.00</div>
      </div>
      <div class="card">
        <span class="card-badge">Hot-Swappable</span>
        <div class="card-title">NuPhy Air75 Low Profile Keyboard</div>
        <div class="card-price">$119.95</div>
      </div>
      <div class="card">
        <span class="card-badge">Bluetooth 5.1</span>
        <div class="card-title">Logitech MX Mechanical Mini</div>
        <div class="card-price">$149.99</div>
      </div>
    </div>

    <div class="popup-frame">
      <div style="position: absolute; top: 0; right: 12px; width: 140px; height: 24px; background: #ffffff; z-index: 10;"></div>
      <img src="data:image/png;base64,${popupBase64}" alt="StickySite Extension Popup" />
    </div>

    <div class="callout-box">
      <div class="callout-icon">✓</div>
      <div class="callout-text">
        <h4>${callout.title}</h4>
        <p>${callout.description}</p>
      </div>
    </div>
  </div>
</div>

</body>
</html>`;
}

function buildPromoTileHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 440px;
    height: 280px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 100%);
    color: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 24px;
    position: relative;
  }
  .logo-box {
    width: 64px;
    height: 64px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
  }
  .logo-box img { width: 44px; height: 44px; border-radius: 10px; }
  h1 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 6px;
    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  p {
    font-size: 13px;
    color: #94a3b8;
    max-width: 340px;
    line-height: 1.4;
    margin-bottom: 16px;
  }
  .tags { display: flex; gap: 8px; }
  .tag-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 9999px;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(129, 140, 248, 0.35);
    color: #c7d2fe;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
</style>
</head>
<body>
  <div class="logo-box">
    <img src="data:image/png;base64,${iconBase64}" alt="StickySite" />
  </div>
  <h1>StickySite</h1>
  <p>Save this view. Reapply your filters and form state anytime in one click.</p>
  <div class="tags">
    <div class="tag-pill">1-Click Apply</div>
    <div class="tag-pill">Local-First</div>
    <div class="tag-pill">Safe & Private</div>
  </div>
</body>
</html>`;
}

function buildMarqueeTileHtml(popupBase64) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1400px;
    height: 560px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: radial-gradient(circle at 75% 30%, #1e1b4b 0%, #0b0f19 70%, #020617 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 60px 80px;
    position: relative;
  }
  .bg-glow {
    position: absolute;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(79, 70, 229, 0.25) 0%, transparent 70%);
    top: -100px;
    right: 200px;
    pointer-events: none;
  }
  .left-content {
    max-width: 680px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    z-index: 10;
  }
  .brand-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .logo-box {
    width: 56px;
    height: 56px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
  }
  .logo-box img { width: 38px; height: 38px; border-radius: 8px; }
  .brand-name {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  h1 {
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.15;
    color: #f8fafc;
  }
  .highlight {
    background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  p {
    font-size: 17px;
    color: #94a3b8;
    line-height: 1.5;
    max-width: 600px;
  }
  .tags {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }
  .tag-pill {
    font-size: 12px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 9999px;
    background: rgba(99, 102, 241, 0.18);
    border: 1px solid rgba(129, 140, 248, 0.35);
    color: #c7d2fe;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .right-preview {
    position: relative;
    z-index: 10;
    margin-right: 20px;
  }
  .popup-card {
    width: 375px;
    height: 440px;
    overflow: hidden;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15);
    position: relative;
    background: #ffffff;
    transform: perspective(1000px) rotateY(-4deg) rotateX(2deg);
  }
  .popup-card img {
    width: 375px;
    display: block;
  }
</style>
</head>
<body>
  <div class="bg-glow"></div>
  <div class="left-content">
    <div class="brand-row">
      <div class="logo-box">
        <img src="data:image/png;base64,${iconBase64}" alt="StickySite" />
      </div>
      <div class="brand-name">StickySite</div>
    </div>
    <h1>Save your view.<br><span class="highlight">Restore anytime in one click.</span></h1>
    <p>Capture complex search filters, dropdowns, and form selections across visits. Privacy-first, local-first, and safe by default.</p>
    <div class="tags">
      <div class="tag-pill">⚡ 1-Click Restore</div>
      <div class="tag-pill">🔒 Local-First</div>
      <div class="tag-pill">🛡️ Safe by Default</div>
    </div>
  </div>
  <div class="right-preview">
    <div class="popup-card">
      <div style="position: absolute; top: 0; right: 12px; width: 140px; height: 24px; background: #ffffff; z-index: 10;"></div>
      <img src="data:image/png;base64,${popupBase64}" alt="StickySite View Restoration" />
    </div>
  </div>
</body>
</html>`;
}

// 4. Render and save all assets using Playwright
const renderer = await chromium.launch({ headless: true });
const renderPage = await renderer.newPage();

const screenshots = [
  {
    filename: 'screenshot-1-views-list.png',
    badge: '01 / Saved Views & 1-Click Restore',
    title: 'Instant One-Click View Restoration',
    subtitle: 'Reapply complex search filters, dropdowns, and form selections across visits.',
    popupBase64: p1,
    callout: {
      title: 'One-Click Apply',
      description: 'Automatically restores saved filters and navigates to the page if needed.'
    }
  },
  {
    filename: 'screenshot-2-capture-review.png',
    badge: '02 / Selective Capture & Review',
    title: 'Inspect & Select Captured Settings',
    subtitle: 'Review detected query parameters and interactive inputs before saving. Keep only what you want.',
    popupBase64: p2,
    callout: {
      title: 'Full User Control',
      description: 'Toggle individual filters or inputs on or off with checkboxes.'
    }
  },
  {
    filename: 'screenshot-3-save-view.png',
    badge: '03 / Named Custom Presets',
    title: 'Organize Named Views Per Website',
    subtitle: 'Save multiple custom filter presets for sprint reviews, product searches, and reports.',
    popupBase64: p3,
    callout: {
      title: 'Custom Presets',
      description: 'Easily rename, update, or delete views whenever your workflows change.'
    }
  },
  {
    filename: 'screenshot-4-restoration-status.png',
    badge: '04 / Truthful Status & Verification',
    title: 'Transparent Restoration Feedback',
    subtitle: 'Verify restored settings with instant visual confirmation and zero silent fallbacks.',
    popupBase64: p4,
    callout: {
      title: 'Verified Results',
      description: 'Confirms exactly how many settings were successfully restored on the page.'
    }
  }
];

await renderPage.setViewportSize({ width: 1280, height: 800 });
for (const s of screenshots) {
  const html = buildScreenshotHtml(s);
  await renderPage.setContent(html);
  await renderPage.screenshot({ path: path.join(assetsDir, s.filename) });
  console.log(`Generated: store-assets/${s.filename} (1280x800)`);
}

await renderPage.setViewportSize({ width: 440, height: 280 });
await renderPage.setContent(buildPromoTileHtml());
await renderPage.screenshot({ path: path.join(assetsDir, 'promo-440x280.png') });
console.log('Generated: store-assets/promo-440x280.png (440x280)');

await renderPage.setViewportSize({ width: 1400, height: 560 });
await renderPage.setContent(buildMarqueeTileHtml(p1));
await renderPage.screenshot({ path: path.join(assetsDir, 'marquee-1400x560.png') });
console.log('Generated: store-assets/marquee-1400x560.png (1400x560)');

await renderer.close();
console.log('All store assets successfully created!');
