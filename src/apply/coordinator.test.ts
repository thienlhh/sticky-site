import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startApply,
  resumeApply,
  aggregateApplyResult,
} from './coordinator';
import type { SavedView } from '@/domain/view';
import * as storage from '@/storage/views';
import * as pageAgent from '@/platform/page-agent';
import { clearOperation, getActiveOperation } from './operation';

describe('apply/coordinator', () => {
  let mockTab: any;
  let sessionStore: Record<string, unknown> = {};

  const sampleView: SavedView = {
    schemaVersion: 1,
    id: 'view-apply-1',
    name: 'Shoes View',
    origin: 'https://example.com',
    pathname: '/search',
    queryParams: { q: ['shoes'], sort: ['asc'] },
    controls: [
      {
        id: 'c1',
        label: 'In Stock',
        value: true,
        fingerprint: { kind: 'checkbox', tag: 'input', label: 'In Stock', ordinal: 0 },
      },
      {
        id: 'c2',
        label: 'Color',
        value: 'red',
        fingerprint: { kind: 'text', tag: 'input', label: 'Color', ordinal: 0 },
      },
    ],
    createdAt: '2026-09-09T10:00:00.000Z',
    updatedAt: '2026-09-09T10:00:00.000Z',
  };

  beforeEach(() => {
    sessionStore = {};
    mockTab = {
      id: 50,
      url: 'https://example.com/search?q=shoes&sort=asc',
    };

    // @ts-ignore
    globalThis.chrome.storage.session = {
      get: vi.fn(async (k?: string) => (k ? { [k]: sessionStore[k] } : { ...sessionStore })),
      set: vi.fn(async (items) => Object.assign(sessionStore, items)),
      remove: vi.fn(async (k: string) => delete sessionStore[k]),
      clear: vi.fn(async () => { sessionStore = {}; }),
    };

    // @ts-ignore
    globalThis.chrome.tabs = {
      get: vi.fn(async (tabId: number) => mockTab),
      query: vi.fn(async () => [mockTab]),
      update: vi.fn(async (tabId: number, updateProps: any) => {
        Object.assign(mockTab, updateProps);
        return mockTab;
      }),
      sendMessage: vi.fn(),
    } as any;

    vi.spyOn(storage, 'listViews').mockResolvedValue([sampleView]);
    vi.spyOn(pageAgent, 'ensurePageAgent').mockResolvedValue();
  });

  describe('aggregateApplyResult', () => {
    it('aggregates to "Fully applied view" when all controls and query parameters are restored', () => {
      const report = {
        outcomes: [
          { id: 'c1', outcome: 'restored' as const },
          { id: 'c2', outcome: 'restored' as const },
        ],
      };
      const queryReport = { totalAttempted: 2, restoredCount: 2, failedCount: 0 };
      const result = aggregateApplyResult(sampleView, report, queryReport);
      expect(result.status).toBe('Fully applied view');
      expect(result.restoredCount).toBe(4);
      expect(result.totalAttempted).toBe(4);
      expect(result.message).toBe('All 4 settings restored successfully.');
    });

    it('aggregates query-only view to "Fully applied view" with accurate counts', () => {
      const queryOnlyView: SavedView = {
        ...sampleView,
        id: 'view-query-only',
        controls: [],
        queryParams: { q: ['shoes'], sort: ['asc'] },
      };
      const report = { outcomes: [] };
      const queryReport = { totalAttempted: 2, restoredCount: 2, failedCount: 0 };
      const result = aggregateApplyResult(queryOnlyView, report, queryReport);
      expect(result.status).toBe('Fully applied view');
      expect(result.restoredCount).toBe(2);
      expect(result.totalAttempted).toBe(2);
      expect(result.message).toBe('All 2 settings restored successfully.');
    });

    it('aggregates to "Partially applied view" when mixed outcomes occur', () => {
      const report = {
        outcomes: [
          { id: 'c1', outcome: 'restored' as const },
          { id: 'c2', outcome: 'skipped' as const },
        ],
      };
      // 1 query restored, 1 query failed
      const queryReport = { totalAttempted: 2, restoredCount: 1, failedCount: 1 };
      const result = aggregateApplyResult(sampleView, report, queryReport);
      expect(result.status).toBe('Partially applied view');
      expect(result.restoredCount).toBe(2);
      expect(result.skippedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.totalAttempted).toBe(4);
      expect(result.message).toBe('2 of 4 settings restored (1 skipped, 1 failed).');
    });

    it('aggregates to "Could not apply" when 0 settings are restored', () => {
      const report = {
        outcomes: [
          { id: 'c1', outcome: 'failed' as const },
          { id: 'c2', outcome: 'skipped' as const },
        ],
      };
      const queryReport = { totalAttempted: 1, restoredCount: 0, failedCount: 1 };
      const result = aggregateApplyResult(sampleView.controls, report, queryReport);
      expect(result.status).toBe('Could not apply');
      expect(result.restoredCount).toBe(0);
    });
  });

  describe('startApply and navigation resumption', () => {
    it('performs no navigation if current query parameters already match and returns full result', async () => {
      vi.spyOn(pageAgent, 'sendPageCommand').mockResolvedValue({
        status: 'ok',
        data: {
          outcomes: [
            { id: 'c1', outcome: 'restored' },
            { id: 'c2', outcome: 'restored' },
          ],
        },
      });

      const result = await startApply(50, sampleView);
      expect(chrome.tabs.update).not.toHaveBeenCalled();
      expect(result.status).toBe('Fully applied view');
      expect(result.restoredCount).toBe(4); // 2 query params + 2 controls
      expect(result.totalAttempted).toBe(4);
    });

    it('starts a pending operation when query parameters differ, never a fabricated full result', async () => {
      mockTab.url = 'https://example.com/search?q=different';

      const result = await startApply(50, sampleView);
      expect(chrome.tabs.update).toHaveBeenCalledWith(50, {
        url: 'https://example.com/search?q=shoes&sort=asc',
      });

      // Truthful pending status
      expect(result.status).toBe('Applying view');
      expect(result.restoredCount).toBe(0);
      expect(result.totalAttempted).toBe(4);
      expect(result.message).toBe('Navigating to view URL...');

      // Session record should be written with navigated: true
      const op = await getActiveOperation(50);
      expect(op).not.toBeNull();
      expect(op?.viewId).toBe(sampleView.id);
      expect(op?.navigated).toBe(true);
      expect(op?.status).toBe('navigating');
    });

    it('blocks application if page origin or pathname is incompatible', async () => {
      mockTab.url = 'https://otherdomain.com/search';
      const result = await startApply(50, sampleView);

      expect(result.status).toBe('Could not apply');
      expect(result.message).toMatch(/incompatible/i);
      expect(chrome.tabs.update).not.toHaveBeenCalled();
    });


    it('resumes apply, restores controls, and clears session operation unconditionally', async () => {
      // Set active session op
      mockTab.url = 'https://example.com/search?q=shoes&sort=asc';
      await chrome.storage.session.set({
        stickysite_apply_op: {
          tabId: 50,
          viewId: sampleView.id,
          startedAt: Date.now(),
          deadline: Date.now() + 10000,
          expectedUrl: mockTab.url,
        },
      });

      vi.spyOn(pageAgent, 'sendPageCommand').mockResolvedValue({
        status: 'ok',
        data: {
          outcomes: [
            { id: 'c1', outcome: 'restored' },
            { id: 'c2', outcome: 'restored' },
          ],
        },
      });

      const report = await resumeApply(50);
      expect(report.outcomes).toHaveLength(2);
      expect(report.outcomes.every((o) => o.outcome === 'restored')).toBe(true);

      // Verify unconditional cleanup
      const op = await getActiveOperation(50);
      expect(op).toBeNull();
    });

    it('times out with no completion event after 10 seconds and cleans up', async () => {
      const pastTime = Date.now() - 11000;
      await chrome.storage.session.set({
        stickysite_apply_op: {
          tabId: 50,
          viewId: sampleView.id,
          startedAt: pastTime,
          deadline: pastTime + 10000,
          expectedUrl: mockTab.url,
        },
      });

      // getActiveOperation should detect expiry and clear
      const op = await getActiveOperation(50);
      expect(op).toBeNull();
      expect(sessionStore['stickysite_apply_op']).toBeUndefined();
    });

    it('aborts delayed completion after expiry without calling page agent', async () => {
      const pastTime = Date.now() - 12000;
      await chrome.storage.session.set({
        stickysite_apply_op: {
          tabId: 50,
          viewId: sampleView.id,
          startedAt: pastTime,
          deadline: pastTime + 10000,
          expectedUrl: mockTab.url,
        },
      });

      const sendCommandSpy = vi.spyOn(pageAgent, 'sendPageCommand');

      const report = await resumeApply(50);
      expect(report.outcomes).toHaveLength(0);
      expect(sendCommandSpy).not.toHaveBeenCalled();

      // Session storage cleared
      const op = await getActiveOperation(50);
      expect(op).toBeNull();
    });

    it('cleans up session operation on navigation rejection', async () => {
      mockTab.url = 'https://example.com/search?q=different';
      vi.mocked(chrome.tabs.update).mockRejectedValueOnce(new Error('Tab crashed'));

      const result = await startApply(50, sampleView);
      expect(result.status).toBe('Could not apply');
      expect(result.message).toBe('Tab crashed');

      const op = await getActiveOperation(50);
      expect(op).toBeNull();
    });

    it('cleans up session operation on direct restore rejection', async () => {
      vi.spyOn(pageAgent, 'sendPageCommand').mockRejectedValueOnce(new Error('Page agent disconnected'));

      const result = await startApply(50, sampleView);
      expect(result.status).toBe('Could not apply');
      expect(result.message).toBe('Page agent disconnected');

      const op = await getActiveOperation(50);
      expect(op).toBeNull();
    });

    it('rejects overlapping requests with busy state without overwriting existing operation', async () => {
      const originalOp = {
        tabId: 50,
        viewId: sampleView.id,
        startedAt: Date.now(),
        deadline: Date.now() + 10000,
        expectedUrl: mockTab.url,
        navigated: true,
        status: 'navigating' as const,
      };
      await chrome.storage.session.set({ stickysite_apply_op: originalOp });

      const secondView: SavedView = { ...sampleView, id: 'view-apply-2', name: 'Other View' };
      const result = await startApply(50, secondView);

      expect(result.status).toBe('Could not apply');
      expect(result.message).toMatch(/operation is already in progress/i);

      // Verify original operation is preserved and not overwritten or cleared
      const op = await getActiveOperation(50);
      expect(op?.viewId).toBe(sampleView.id);
    });

    it('aborts restoration and cleans up if page url does not match expected view on resumption', async () => {
      mockTab.url = 'https://example.com/wrong-path';
      await chrome.storage.session.set({
        stickysite_apply_op: {
          tabId: 50,
          viewId: sampleView.id,
          startedAt: Date.now(),
          deadline: Date.now() + 10000,
          expectedUrl: 'https://example.com/search?q=shoes',
        },
      });

      const sendCommandSpy = vi.spyOn(pageAgent, 'sendPageCommand');
      const report = await resumeApply(50);

      expect(report.outcomes).toHaveLength(0);
      expect(sendCommandSpy).not.toHaveBeenCalled();

      const op = await getActiveOperation(50);
      expect(op).toBeNull();
    });

    it('cleans up only the matching tab on tab closure', async () => {
      await chrome.storage.session.set({
        stickysite_apply_op: {
          tabId: 50,
          viewId: sampleView.id,
          startedAt: Date.now(),
          deadline: Date.now() + 10000,
          expectedUrl: mockTab.url,
        },
      });

      // Clear non-matching tab 99
      await clearOperation(99);
      let op = await getActiveOperation(50);
      expect(op).not.toBeNull();

      // Clear matching tab 50
      await clearOperation(50);
      op = await getActiveOperation(50);
      expect(op).toBeNull();
    });

    it('records query rejection/redirect when query params are missing on resumed page', async () => {
      // Tab url is missing ?sort=asc (e.g. server stripped it)
      mockTab.url = 'https://example.com/search?q=shoes';
      await chrome.storage.session.set({
        stickysite_apply_op: {
          tabId: 50,
          viewId: sampleView.id,
          startedAt: Date.now(),
          deadline: Date.now() + 10000,
          expectedUrl: 'https://example.com/search?q=shoes&sort=asc',
        },
      });

      vi.spyOn(pageAgent, 'sendPageCommand').mockResolvedValue({
        status: 'ok',
        data: {
          outcomes: [
            { id: 'c1', outcome: 'restored' },
            { id: 'c2', outcome: 'restored' },
          ],
        },
      });

      const result = await resumeApply(50);
      expect(result.status).toBe('Partially applied view');
      expect(result.restoredCount).toBe(3); // 1 query + 2 controls
      expect(result.failedCount).toBe(1); // 1 query missing
      expect(result.totalAttempted).toBe(4);
    });

    it('stores final result in transient result storage and enables recovery with bounded cleanup', async () => {
      mockTab.url = 'https://example.com/search?q=shoes&sort=asc';
      await chrome.storage.session.set({
        stickysite_apply_op: {
          tabId: 50,
          viewId: sampleView.id,
          startedAt: Date.now(),
          deadline: Date.now() + 10000,
          expectedUrl: mockTab.url,
        },
      });

      vi.spyOn(pageAgent, 'sendPageCommand').mockResolvedValue({
        status: 'ok',
        data: {
          outcomes: [
            { id: 'c1', outcome: 'restored' },
            { id: 'c2', outcome: 'restored' },
          ],
        },
      });

      const result = await resumeApply(50);
      expect(result.status).toBe('Fully applied view');

      // Recover from transient storage
      const { getLastApplyResult } = await import('./operation');
      const recovered = await getLastApplyResult(50, false);
      expect(recovered).not.toBeNull();
      expect(recovered?.status).toBe('Fully applied view');
      expect(recovered?.restoredCount).toBe(4);
    });
  });
});


