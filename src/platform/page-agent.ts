import type { PageCommand } from '@/shared/page-messages';

export const PAGE_AGENT_SCRIPT = 'content-scripts/page-agent.js';

export async function getActivePage(): Promise<{ tabId: number; url: URL }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || tab.id == null) {
    throw new Error('No active tab found');
  }

  const rawUrl = tab.url || tab.pendingUrl;
  if (!rawUrl) {
    throw new Error('Could not access URL for the active tab. Please click the extension icon again on the web page.');
  }

  const parsedUrl = new URL(rawUrl);

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(
      `Unsupported page URL: ${parsedUrl.protocol}//. StickySite only supports web pages (HTTP and HTTPS).`
    );
  }

  return {
    tabId: tab.id,
    url: parsedUrl,
  };
}

export async function requestOriginAccess(url: URL): Promise<boolean> {
  const originPattern = `${url.origin}/*`;

  const alreadyGranted = await chrome.permissions.contains({
    origins: [originPattern],
  });

  if (alreadyGranted) {
    return true;
  }

  return await chrome.permissions.request({
    origins: [originPattern],
  });
}

export async function ensurePageAgent(tabId: number): Promise<void> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    if (response?.pong) {
      return;
    }
  } catch {
    // Content script not yet injected into this tab
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: [PAGE_AGENT_SCRIPT],
  });
}

export async function sendPageCommand<T>(
  tabId: number,
  command: PageCommand
): Promise<T> {
  return await chrome.tabs.sendMessage(tabId, command);
}
