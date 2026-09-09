import { capturePage } from '@/capture/controls';

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
    });
  },
});
