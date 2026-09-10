import { listViews } from '@/storage/views';
import type { SavedView } from '@/domain/view';

export const BADGE_BACKGROUND_COLOR = '#2563EB';
export const BADGE_TEXT_COLOR = '#FFFFFF';

/**
 * Calculates the number of saved views that belong to the same site (origin) as the provided URL.
 * Returns 0 for invalid URLs or URLs with protocols other than http: or https:.
 */
export function getSiteViewCount(views: SavedView[], urlString?: string): number {
  if (!urlString) {
    return 0;
  }
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 0;
    }
    const origin = parsed.origin;
    return views.filter((v) => v.origin === origin).length;
  } catch {
    return 0;
  }
}

/**
 * Formats a count into badge text.
 * Returns an empty string for count <= 0 to clear the badge.
 * Caps at '999+' for counts above 999.
 */
export function formatBadgeText(count: number): string {
  if (count <= 0) {
    return '';
  }
  if (count > 999) {
    return '999+';
  }
  return String(count);
}

/**
 * Updates the action badge for a specific tab based on the site's view count.
 */
export async function updateTabBadge(
  tabId: number,
  url?: string,
  views?: SavedView[]
): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.action) {
    return;
  }

  let tabUrl = url;
  if (!tabUrl && chrome.tabs?.get) {
    try {
      const tab = await chrome.tabs.get(tabId);
      tabUrl = tab?.url;
    } catch {
      // Tab might already be closed or inaccessible
      return;
    }
  }

  const allViews = views ?? (await listViews());
  const count = getSiteViewCount(allViews, tabUrl);
  const text = formatBadgeText(count);

  try {
    await chrome.action.setBadgeText({ text, tabId });
    if (text) {
      await chrome.action.setBadgeBackgroundColor({
        color: BADGE_BACKGROUND_COLOR,
        tabId,
      });
      if (typeof chrome.action.setBadgeTextColor === 'function') {
        await chrome.action.setBadgeTextColor({
          color: BADGE_TEXT_COLOR,
          tabId,
        });
      }
    }
  } catch {
    // Action API might fail if tab was closed during async execution
  }
}

/**
 * Updates the action badges across all open tabs.
 */
export async function updateAllTabsBadges(views?: SavedView[]): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return;
  }

  const allViews = views ?? (await listViews());
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.allSettled(
      tabs
        .filter((tab) => typeof tab.id === 'number')
        .map((tab) => updateTabBadge(tab.id!, tab.url, allViews))
    );
  } catch {
    // Ignore query errors
  }
}
