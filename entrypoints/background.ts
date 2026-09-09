import { resumeApply } from '@/apply/coordinator';
import { getActiveOperation } from '@/apply/operation';
import { track, type AnalyticsEvent } from '@/analytics';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    track('extension_installed').catch((err) => {
      console.error('Failed to track install:', err);
    });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'TRACK_ANALYTICS') {
      track(message.event as AnalyticsEvent, message.properties || {})
        .then(() => sendResponse({ status: 'ok' }))
        .catch((err) => sendResponse({ status: 'error', error: err.message }));
      return true;
    }
  });

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
