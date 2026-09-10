import { defineBackground } from 'wxt/utils/define-background';
import { resumeApply, startApply } from '@/apply/coordinator';
import { getActiveOperation, clearOperation, failOperation, getLastApplyResult } from '@/apply/operation';
import {
  track,
  validateEvent,
  validatePayload,
  createHttpAdapter,
  setAnalyticsAdapter,
  type AnalyticsEvent,
} from '@/analytics';
import { normalizePathname } from '@/domain/view';
import { updateTabBadge, updateAllTabsBadges } from '@/badge/badge';
import { STORAGE_KEY } from '@/storage/views';

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

  // Initialize badges across open tabs on background worker startup
  updateAllTabsBadges().catch(() => {});

  chrome.runtime.onInstalled.addListener(() => {
    updateAllTabsBadges().catch(() => {});
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

  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    updateTabBadge(tabId).catch(() => {});
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
      updateAllTabsBadges().catch(() => {});
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
      updateTabBadge(tabId, tab?.url).catch(() => {});
    }

    if (changeInfo.status === 'complete' && tab?.url) {
      let startedAt: number | undefined;
      try {
        const op = await getActiveOperation(tabId);
        if (op) {
          startedAt = op.startedAt;
          if (Date.now() >= (op.deadline || 0)) {
            await failOperation(tabId, 'Operation timed out.', startedAt);
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
            await failOperation(tabId, 'Navigation did not reach the saved page.', startedAt);
          }
        }
      } catch (err) {
        console.error('Failed to resume apply in background:', err);
        await failOperation(tabId, 'Could not apply settings after navigation.', startedAt);
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
