import { expect, type BrowserContext, type Page } from '@playwright/test';

// Native action popups are CDP targets but are not exposed as Playwright Pages.
// Attach directly rather than changing production active-tab selection for tests.
export async function openNativePopup(context: BrowserContext, webPage: Page, extensionId: string) {
  await webPage.bringToFront();
  const cdp = await context.browser()!.newBrowserCDPSession();
  const { targetInfos } = await cdp.send('Target.getTargets', { filter: [{}] });
  const tab = targetInfos.find(t => t.type === 'tab' && t.url === webPage.url());
  if (!tab) throw new Error('Active fixture tab target missing');
  await cdp.send('Extensions.triggerAction', { id: extensionId, targetId: tab.targetId });
  let targetId = '';
  await expect.poll(async () => {
    const { targetInfos } = await cdp.send('Target.getTargets', { filter: [{}] });
    targetId = targetInfos.find(t => t.type === 'page' && t.url === `chrome-extension://${extensionId}/popup.html`)?.targetId || '';
    return targetId;
  }, {intervals: [5, 10, 20]}).not.toBe('');
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: false });
  let nextId = 0;
  async function command(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cdp.off('Target.receivedMessageFromTarget', onMessage); reject(new Error('Popup evaluation timed out')); }, 10000);
      const onMessage = (event: {sessionId: string; message: string}) => {
        if (event.sessionId !== sessionId) return;
        const msg = JSON.parse(event.message);
        if (msg.id !== id) return;
        clearTimeout(timer); cdp.off('Target.receivedMessageFromTarget', onMessage);
        if (msg.error || msg.result?.exceptionDetails) reject(new Error(JSON.stringify(msg)));
        else resolve(msg.result);
      };
      cdp.on('Target.receivedMessageFromTarget', onMessage);
      cdp.send('Target.sendMessageToTarget', {sessionId, message: JSON.stringify({id, method, params})}).catch(err => {
        clearTimeout(timer); cdp.off('Target.receivedMessageFromTarget', onMessage); reject(err);
      });
    });
  }
  async function evaluate<T>(expression: string): Promise<T> {
    return (await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true, userGesture: true})).result.value;
  }
  await expect.poll(() => evaluate<string>('document.body?.innerText || ""'), {intervals: [5, 10, 20]}).toContain('StickySite');
  await expect.poll(() => evaluate<boolean>(`!!document.querySelector('#save-current-view-btn:not(:disabled), #status-message[role="alert"]') || Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Get Started')`), {intervals: [5, 10, 20]}).toBe(true);
  return {
    evaluate,
    async press(key: 'Tab' | 'Enter' | ' ' | 'Escape') {
      const code = {Tab: 9, Enter: 13, ' ': 32, Escape: 27}[key];
      await command('Input.dispatchKeyEvent', {type: 'keyDown', key, windowsVirtualKeyCode: code, text: key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined});
      await command('Input.dispatchKeyEvent', {type: 'keyUp', key, windowsVirtualKeyCode: code});
    },
    insertText: (text: string) => command('Input.insertText', {text}),
    async screenshot() {
      return Buffer.from((await command('Page.captureScreenshot', {format: 'png'})).data, 'base64');
    },
    text: () => evaluate<string>('document.body?.innerText || ""'),
    async click(text: string) {
      await expect.poll(() => evaluate<boolean>(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === ${JSON.stringify(text)} && !b.disabled)`)).toBe(true);
      await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`);
    },
    async fill(selector: string, value: string) {
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', {bubbles:true})); })()`);
    },
    async close() {
      await cdp.send('Target.closeTarget', {targetId}).catch(() => {});
      await cdp.detach();
    },
  };
}
