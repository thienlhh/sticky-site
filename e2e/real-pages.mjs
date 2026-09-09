// Optional public-site evidence runner; requires network and the production build.
// Run from the repository root: node --experimental-strip-types e2e/real-pages.mjs
import { chromium, expect } from '@playwright/test';
import { openNativePopup } from './native-popup.ts';
import fs from 'node:fs/promises';
import os from 'node:os';
const root=process.cwd();
const profile=await fs.mkdtemp(os.tmpdir() + '/stickysite-public-');
const context=await chromium.launchPersistentContext(profile,{headless:false,args:['--headless=new','--enable-unsafe-extension-debugging',`--disable-extensions-except=${root}/.output/chrome-mv3`,`--load-extension=${root}/.output/chrome-mv3`]});
const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
const extensionId=worker.url().split('/')[2];
const results=[];
for (const [site,url] of [['LinkedIn','https://www.linkedin.com/jobs/search/?keywords=engineer'],['Target','https://www.target.com/c/deals/-/N-0snqs'],['Craigslist','https://sfbay.craigslist.org/search/sss?query=keyboard'],['HN Algolia','https://hn.algolia.com/?q=keyboard']]) {
  const page=await context.newPage();
  let ui;
  const record={site,url,checkedAt:new Date().toISOString(),attempted:0,restored:0};
  try {
    await worker.evaluate(async()=>{await chrome.storage.local.clear();await chrome.storage.session.clear();});
    const response=await page.goto(url,{waitUntil:'load',timeout:20000});
    record.httpStatus=response?.status(); record.title=await page.title(); record.finalUrl=page.url();
    if (!response?.ok()) throw new Error('Site returned HTTP '+response?.status());
    ui=await openNativePopup(context,page,extensionId);
    if ((await ui.text()).includes('Get Started')) await ui.click('Get Started');
    await ui.evaluate('chrome.permissions.contains = async () => true');
    await ui.click('Save Current View');
    await expect.poll(ui.text).toContain('Review Captured Settings');
    record.review=await ui.text();
    await ui.evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.startsWith('Continue')&&!b.disabled)?.click()`);
    await expect.poll(ui.text).toContain('Name Your View');
    await ui.fill('#view-name-input','Public compatibility check'); await ui.click('Save View');
    await expect.poll(ui.text).toContain('Saved "Public compatibility check"');
    const view=await worker.evaluate(async()=> (await chrome.storage.local.get('stickysite_saved_views')).stickysite_saved_views.views[0]);
    record.savedSettings=view.controls.map(c=>({label:c.label,kind:c.fingerprint.kind,value:c.value}));
    record.queryParams=view.queryParams;
    record.inputMetadata=await page.locator('input:visible').evaluateAll(els=>els.map(el=>({type:el.type, inputmode:el.getAttribute('inputmode'),autocomplete:el.autocomplete,id:el.id,name:el.name,placeholder:el.placeholder})));
    await ui.close(); ui=undefined;
    const control=view.controls.find(c=>c.fingerprint.kind==='text');
    if (!control) throw new Error('No captured text control with stable identity available for a safe perturbation');
    const fp=control.fingerprint;
    let locator=page.getByRole('textbox',{name:control.label,exact:true});
    if (await locator.count()!==1) locator=page.getByPlaceholder(control.label,{exact:true});
    if(await locator.count()!==1 && (fp.id || fp.name)) locator=page.locator(fp.id ? `[id=${JSON.stringify(fp.id)}]` : `${fp.tag}[name=${JSON.stringify(fp.name)}]`).filter({visible:true});
    if(await locator.count()!==1) throw new Error('Perturbation target is ambiguous');
    await locator.fill('sticky site test');
    record.perturbedControl=control.label;
    ui=await openNativePopup(context,page,extensionId);
    await ui.evaluate('chrome.permissions.contains = async () => true');
    await ui.click('Apply');
    record.attempted=view.controls.length+Object.keys(view.queryParams).length;
    await expect.poll(async()=>worker.evaluate(async()=>!!(await chrome.storage.session.get('stickysite_last_apply_result')).stickysite_last_apply_result),{timeout:12000}).toBe(true);
    const last=await worker.evaluate(async()=> (await chrome.storage.session.get('stickysite_last_apply_result')).stickysite_last_apply_result);
    record.result=last.result;
    record.restored=last.result.restoredCount;
    record.actualValue=await locator.inputValue(); record.expectedValue=control.value;
    record.changedControlVerified=record.actualValue===control.value;
    record.status=record.changedControlVerified ? 'changed control verified; other settings counted from coordinator' : 'changed control failed independent verification';
  } catch(error) {record.error=error.message.split('\n')[0]; record.status='incomplete';}
  console.log(JSON.stringify(record)); results.push(record);
  await ui?.close().catch(()=>{}); await page.close();
}
await fs.mkdir(`${root}/test-results`, {recursive:true});
await fs.writeFile(`${root}/test-results/real-page-restoration.json`,JSON.stringify({browser:context.browser().version(),machine:`${os.platform()} ${os.arch()} ${os.cpus()[0].model}`,boundary:'Isolated anonymous browser. Real Save/Apply popup. Only permissions.contains is stubbed; native optional permission dialog untested. One text input per page is changed through fill; no buttons on external sites are clicked. Other saved settings may already match. This is partial evidence, not a ten-page reliability gate.',results},null,2)+'\n');
await context.close(); await fs.rm(profile,{recursive:true,force:true});
