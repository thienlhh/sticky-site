import { defineContentScript } from 'wxt/utils/define-content-script';
import { capturePage } from '@/capture/controls';
import { restoreControls } from '@/restoration/restore';

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'PING') {
        sendResponse({ status: 'ok', pong: true });
        return true;
      }
      if (message?.type === 'CAPTURE') {
        try {
          const result = capturePage(document, new URL(window.location.href));
          sendResponse({ status: 'ok', data: result });
        } catch (err) {
          sendResponse({
            status: 'error',
            error: err instanceof Error ? err.message : 'Capture failed',
          });
        }
        return true;
      }
      if (message?.type === 'RESTORE') {
        const deadlineAt = message.deadlineAt ?? Date.now() + 5000;
        const remainingMs = deadlineAt - Date.now();
        if (remainingMs <= 0) {
          sendResponse({
            status: 'ok',
            data: { outcomes: (message.controls || []).map((control: { id: string }) => ({ id: control.id, outcome: 'skipped' })) },
          });
          return true;
        }
        const timeoutMs = Math.max(0, Math.min(message.timeoutMs ?? 5000, remainingMs, 5000));
        restoreControls(document, message.controls || [], { timeoutMs, deadlineAt })
          .then((report) => {
            sendResponse({ status: 'ok', data: report });
          })
          .catch((err) => {
            sendResponse({
              status: 'error',
              error: err instanceof Error ? err.message : 'Restore failed',
            });
          });
        return true;
      }
    });
  },
});
