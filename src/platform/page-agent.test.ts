import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getActivePage,
  requestOriginAccess,
  ensurePageAgent,
  sendPageCommand,
  PAGE_AGENT_SCRIPT,
} from './page-agent';

describe('platform/page-agent', () => {
  let mockTabs: any;
  let mockPermissions: any;
  let mockScripting: any;

  beforeEach(() => {
    mockTabs = {
      query: vi.fn(),
      sendMessage: vi.fn(),
    };
    mockPermissions = {
      contains: vi.fn(),
      request: vi.fn(),
    };
    mockScripting = {
      executeScript: vi.fn(),
    };

    // @ts-ignore
    globalThis.chrome = {
      tabs: mockTabs,
      permissions: mockPermissions,
      scripting: mockScripting,
    };
  });

  describe('getActivePage', () => {
    it('returns tabId and url for valid http/https pages', async () => {
      mockTabs.query.mockResolvedValue([
        { id: 42, url: 'https://example.com/path?a=1' },
      ]);

      const page = await getActivePage();
      expect(page.tabId).toBe(42);
      expect(page.url.origin).toBe('https://example.com');
      expect(page.url.pathname).toBe('/path');
    });

    it('does not select a tab from another window when the current window has no active tab', async () => {
      mockTabs.query.mockResolvedValue([]);

      await expect(getActivePage()).rejects.toThrow(/no active tab/i);
      expect(mockTabs.query).toHaveBeenCalledTimes(1);
      expect(mockTabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    });

    it('uses pendingUrl if url is missing', async () => {
      mockTabs.query.mockResolvedValue([
        { id: 43, pendingUrl: 'https://example.com/loading' },
      ]);

      const page = await getActivePage();
      expect(page.tabId).toBe(43);
      expect(page.url.pathname).toBe('/loading');
    });

    it('throws descriptive error when active tab URL is inaccessible', async () => {
      mockTabs.query.mockResolvedValue([{ id: 44 }]);
      await expect(getActivePage()).rejects.toThrow(/could not access url/i);
    });

    it('throws when no active tab is found', async () => {
      mockTabs.query.mockResolvedValue([]);
      await expect(getActivePage()).rejects.toThrow(/no active tab/i);
    });

    it('rejects unsupported protocols (chrome://, about:, file:) and never substitutes another tab', async () => {
      mockTabs.query.mockResolvedValue([
        { id: 10, url: 'chrome://settings' },
      ]);
      await expect(getActivePage()).rejects.toThrow(/unsupported page/i);

      mockTabs.query.mockResolvedValue([
        { id: 11, url: 'about:blank' },
      ]);
      await expect(getActivePage()).rejects.toThrow(/unsupported page/i);

      mockTabs.query.mockResolvedValue([
        { id: 12, url: 'file:///Users/test/index.html' },
      ]);
      await expect(getActivePage()).rejects.toThrow(/unsupported page/i);

      // Even if another window has a valid web page, the current active non-web tab must throw.
      mockTabs.query.mockResolvedValue([{ id: 13, url: 'chrome-extension://xyz/popup.html' }]);
      await expect(getActivePage()).rejects.toThrow(/unsupported page/i);
    });
  });

  describe('requestOriginAccess', () => {
    const testUrl = new URL('https://example.com/products');

    it('requests only the active origin pattern', async () => {
      mockPermissions.contains.mockResolvedValue(false);
      mockPermissions.request.mockResolvedValue(true);

      const granted = await requestOriginAccess(testUrl);
      expect(mockPermissions.request).toHaveBeenCalledWith({
        origins: ['https://example.com/*'],
      });
      expect(granted).toBe(true);
    });

    it('returns true immediately if origin permission is already granted', async () => {
      mockPermissions.contains.mockResolvedValue(true);

      const granted = await requestOriginAccess(testUrl);
      expect(mockPermissions.request).not.toHaveBeenCalled();
      expect(granted).toBe(true);
    });

    it('returns false when user denies permission', async () => {
      mockPermissions.contains.mockResolvedValue(false);
      mockPermissions.request.mockResolvedValue(false);

      const granted = await requestOriginAccess(testUrl);
      expect(granted).toBe(false);
    });
  });

  describe('ensurePageAgent', () => {
    it('does not re-inject script if page agent already responds to PING', async () => {
      mockTabs.sendMessage.mockResolvedValue({ status: 'ok', pong: true });

      await ensurePageAgent(42);
      expect(mockTabs.sendMessage).toHaveBeenCalledWith(42, { type: 'PING' });
      expect(mockScripting.executeScript).not.toHaveBeenCalled();
    });

    it('injects page agent content script if PING fails', async () => {
      mockTabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));
      mockScripting.executeScript.mockResolvedValue([]);

      await ensurePageAgent(42);
      expect(mockScripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 42 },
        files: [PAGE_AGENT_SCRIPT],
      });
    });
  });

  describe('sendPageCommand', () => {
    it('sends typed command to tab and returns response', async () => {
      mockTabs.sendMessage.mockResolvedValue({ status: 'ok', data: 'result' });

      const response = await sendPageCommand(42, { type: 'PING' });
      expect(mockTabs.sendMessage).toHaveBeenCalledWith(42, { type: 'PING' });
      expect(response).toEqual({ status: 'ok', data: 'result' });
    });
  });
});
