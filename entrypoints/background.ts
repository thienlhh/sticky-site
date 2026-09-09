import { resumeApply, startApply } from '@/apply/coordinator';
import { getActiveOperation, clearOperation, getLastApplyResult } from '@/apply/operation';
import {
  track,
  validateEvent,
  validatePayload,
  createHttpAdapter,
  setAnalyticsAdapter,
  type AnalyticsEvent,
} from '@/analytics';
import { normalizePathname } from '@/domain/view';

export default defineBackground(() => {
  // Initialize configured analytics adapter in the background worker; missing config = no-op
  const analyticsEndpoint =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ANALYTICS_ENDPOINT) ||
    (typeof process !== 'undefined' && process.env?.VITE_ANALYTICS_ENDPOINT) ||
    undefined;

  if (analyticsEndpoint) {
    setAnalyticsAdapter(createHttpAdapter(analyticsEndpoint));
  } else {
    setAnalyticsAdapter(null);
  }

  chrome.runtime.onInstalled.addListener(() => {
    track('extension_installed').catch((err) => {
      console.error('Failed to track install:', err);
    });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'TRACK_ANALYTICS') {
      (async () => {
        try {
          validateEvent(message.event);
          const props = validatePayload(message.properties || {});
          const { isAnalyticsEnabled, isAdapterConfigured } = await import('@/analytics');
          const enabled = await isAnalyticsEnabled();
          if (!enabled) {
            sendResponse({ status: 'ok', delivery: 'disabled' });
            return;
          }
          if (!isAdapterConfigured()) {
            sendResponse({ status: 'ok', delivery: 'unconfigured' });
            return;
          }
          await track(message.event, props);
          sendResponse({ status: 'ok', delivery: 'delivered' });
        } catch (err) {
          sendResponse({
            status: 'error',
            delivery: 'failed',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })();
      return true;
    }

    if (message?.type === 'START_APPLY') {
      startApply(message.tabId, message.view)
        .then((res) => sendResponse({ status: 'ok', data: res }))
        .catch((err) => sendResponse({ status: 'error', error: err.message }));
      return true;
    }

    if (message?.type === 'GET_LAST_APPLY_RESULT') {
      getLastApplyResult(message.tabId)
        .then((res) => sendResponse({ status: 'ok', data: res }))
        .catch((err) => sendResponse({ status: 'error', error: err.message }));
      return true;
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab?.url) {
      try {
        const op = await getActiveOperation(tabId);
        if (op) {
          if (Date.now() > (op.deadline || 0)) {
            await clearOperation(tabId);
            return;
          }
          const currentUrl = new URL(tab.url);
          const expectedUrl = new URL(op.expectedUrl);
          if (
            currentUrl.origin === expectedUrl.origin &&
            normalizePathname(currentUrl.pathname) === normalizePathname(expectedUrl.pathname)
          ) {
            await resumeApply(tabId);
          } else {
            // Mismatched navigation URL: clean up safely without restoring
            await clearOperation(tabId);
          }
        }
      } catch (err) {
        console.error('Failed to resume apply in background:', err);
        await clearOperation(tabId);
      }
    }
  });

  chrome.tabs.onRemoved.addListener(async (tabId) => {
    try {
      await clearOperation(tabId);
    } catch {
      // Ignore
    }
  });
});

