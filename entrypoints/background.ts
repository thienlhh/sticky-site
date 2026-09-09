import { resumeApply } from '@/apply/coordinator';
import { getActiveOperation } from '@/apply/operation';

export default defineBackground(() => {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const op = await getActiveOperation(tabId);
        if (op) {
          const currentUrl = new URL(tab.url);
          const expectedUrl = new URL(op.expectedUrl);
          if (
            currentUrl.origin === expectedUrl.origin &&
            currentUrl.pathname === expectedUrl.pathname
          ) {
            await resumeApply(tabId);
          }
        }
      } catch (err) {
        console.error('Failed to resume apply in background:', err);
      }
    }
  });
});
