import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSiteViewCount,
  formatBadgeText,
  updateTabBadge,
  updateAllTabsBadges,
  BADGE_BACKGROUND_COLOR,
  BADGE_TEXT_COLOR,
} from './badge';
import type { SavedView } from '@/domain/view';
import * as storageViews from '@/storage/views';

function createMockView(origin: string, pathname: string, name: string): SavedView {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name,
    origin,
    pathname,
    queryParams: {},
    controls: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('badge', () => {
  const sampleViews: SavedView[] = [
    createMockView('https://example.com', '/search', 'Search View'),
    createMockView('https://example.com', '/dashboard', 'Dashboard View'),
    createMockView('https://shop.example.com', '/items', 'Shop Items'),
    createMockView('http://localhost:3000', '/app', 'Local App'),
  ];

  describe('getSiteViewCount', () => {
    it('returns the count of views matching the URL origin', () => {
      expect(getSiteViewCount(sampleViews, 'https://example.com/search?q=1')).toBe(2);
      expect(getSiteViewCount(sampleViews, 'https://example.com/other-page')).toBe(2);
      expect(getSiteViewCount(sampleViews, 'https://shop.example.com/checkout')).toBe(1);
      expect(getSiteViewCount(sampleViews, 'http://localhost:3000/app')).toBe(1);
    });

    it('returns 0 when no views match the origin', () => {
      expect(getSiteViewCount(sampleViews, 'https://unrelated.org')).toBe(0);
    });

    it('returns 0 for empty or missing URL', () => {
      expect(getSiteViewCount(sampleViews, '')).toBe(0);
      expect(getSiteViewCount(sampleViews, undefined)).toBe(0);
    });

    it('returns 0 for non-http(s) protocols such as chrome://, about:blank, or file://', () => {
      expect(getSiteViewCount(sampleViews, 'chrome://extensions/')).toBe(0);
      expect(getSiteViewCount(sampleViews, 'about:blank')).toBe(0);
      expect(getSiteViewCount(sampleViews, 'file:///Users/test/index.html')).toBe(0);
    });

    it('returns 0 for invalid malformed URLs', () => {
      expect(getSiteViewCount(sampleViews, 'not-a-valid-url')).toBe(0);
    });
  });

  describe('formatBadgeText', () => {
    it('returns empty string for 0 or negative counts', () => {
      expect(formatBadgeText(0)).toBe('');
      expect(formatBadgeText(-1)).toBe('');
    });

    it('returns string count for counts between 1 and 999', () => {
      expect(formatBadgeText(1)).toBe('1');
      expect(formatBadgeText(42)).toBe('42');
      expect(formatBadgeText(999)).toBe('999');
    });

    it('returns "999+" for counts greater than 999', () => {
      expect(formatBadgeText(1000)).toBe('999+');
      expect(formatBadgeText(5000)).toBe('999+');
    });
  });

  describe('updateTabBadge', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('sets badge text and colors for tab matching site views', async () => {
      const setBadgeTextSpy = vi.spyOn(chrome.action, 'setBadgeText');
      const setBadgeBackgroundColorSpy = vi.spyOn(chrome.action, 'setBadgeBackgroundColor');
      const setBadgeTextColorSpy = vi.spyOn(chrome.action, 'setBadgeTextColor');

      await updateTabBadge(101, 'https://example.com/items', sampleViews);

      expect(setBadgeTextSpy).toHaveBeenCalledWith({ text: '2', tabId: 101 });
      expect(setBadgeBackgroundColorSpy).toHaveBeenCalledWith({
        color: BADGE_BACKGROUND_COLOR,
        tabId: 101,
      });
      expect(setBadgeTextColorSpy).toHaveBeenCalledWith({
        color: BADGE_TEXT_COLOR,
        tabId: 101,
      });
    });

    it('clears badge text when site has 0 views', async () => {
      const setBadgeTextSpy = vi.spyOn(chrome.action, 'setBadgeText');
      const setBadgeBackgroundColorSpy = vi.spyOn(chrome.action, 'setBadgeBackgroundColor');

      await updateTabBadge(102, 'https://nomatch.com', sampleViews);

      expect(setBadgeTextSpy).toHaveBeenCalledWith({ text: '', tabId: 102 });
      expect(setBadgeBackgroundColorSpy).not.toHaveBeenCalled();
    });

    it('retrieves URL from chrome.tabs.get when URL is omitted', async () => {
      vi.spyOn(chrome.tabs, 'get').mockImplementation(async () => ({
        id: 103,
        url: 'https://shop.example.com/page',
      } as chrome.tabs.Tab));

      const setBadgeTextSpy = vi.spyOn(chrome.action, 'setBadgeText');

      await updateTabBadge(103, undefined, sampleViews);

      expect(chrome.tabs.get).toHaveBeenCalledWith(103);
      expect(setBadgeTextSpy).toHaveBeenCalledWith({ text: '1', tabId: 103 });
    });

    it('retrieves views from listViews when views are omitted', async () => {
      vi.spyOn(storageViews, 'listViews').mockResolvedValueOnce(sampleViews);
      const setBadgeTextSpy = vi.spyOn(chrome.action, 'setBadgeText');

      await updateTabBadge(104, 'https://example.com/page');

      expect(storageViews.listViews).toHaveBeenCalled();
      expect(setBadgeTextSpy).toHaveBeenCalledWith({ text: '2', tabId: 104 });
    });

    it('handles chrome.tabs.get failure gracefully without throwing', async () => {
      vi.spyOn(chrome.tabs, 'get').mockImplementation(async () => {
        throw new Error('Tab not found');
      });
      const setBadgeTextSpy = vi.spyOn(chrome.action, 'setBadgeText');

      await expect(updateTabBadge(999)).resolves.not.toThrow();
      expect(setBadgeTextSpy).not.toHaveBeenCalled();
    });
  });

  describe('updateAllTabsBadges', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('queries open tabs and updates badges for each', async () => {
      vi.spyOn(chrome.tabs, 'query').mockImplementation(async () => [
        { id: 1, url: 'https://example.com/feed' } as chrome.tabs.Tab,
        { id: 2, url: 'https://other.com/feed' } as chrome.tabs.Tab,
        { id: 3, url: 'chrome://settings' } as chrome.tabs.Tab,
      ]);

      const setBadgeTextSpy = vi.spyOn(chrome.action, 'setBadgeText');

      await updateAllTabsBadges(sampleViews);

      expect(setBadgeTextSpy).toHaveBeenCalledWith({ text: '2', tabId: 1 });
      expect(setBadgeTextSpy).toHaveBeenCalledWith({ text: '', tabId: 2 });
      expect(setBadgeTextSpy).toHaveBeenCalledWith({ text: '', tabId: 3 });
    });
  });
});
