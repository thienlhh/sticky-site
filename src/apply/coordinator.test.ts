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
    it('aggregates to "Fully applied view" when all controls are restored', () => {
      const report = {
        outcomes: [
          { id: 'c1', outcome: 'restored' as const },
          { id: 'c2', outcome: 'restored' as const },
        ],
      };
      const result = aggregateApplyResult(sampleView.controls, report, false);
      expect(result.status).toBe('Fully applied view');
      expect(result.restoredCount).toBe(2);
      expect(result.totalAttempted).toBe(2);
    });

    it('aggregates to "Partially applied view" when some controls are skipped or failed', () => {
      const report = {
        outcomes: [
          { id: 'c1', outcome: 'restored' as const },
          { id: 'c2', outcome: 'skipped' as const },
        ],
      };
      const result = aggregateApplyResult(sampleView.controls, report, false);
      expect(result.status).toBe('Partially applied view');
      expect(result.restoredCount).toBe(1);
      expect(result.skippedCount).toBe(1);
    });

    it('aggregates to "Could not apply" when 0 controls are restored', () => {
      const report = {
        outcomes: [
          { id: 'c1', outcome: 'failed' as const },
          { id: 'c2', outcome: 'skipped' as const },
        ],
      };
      const result = aggregateApplyResult(sampleView.controls, report, false);
      expect(result.status).toBe('Could not apply');
      expect(result.restoredCount).toBe(0);
    });
  });

  describe('startApply and navigation resumption', () => {
    it('performs no navigation if current query parameters already match', async () => {
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
    });

    it('navigates once and records session operation when query parameters differ', async () => {
      mockTab.url = 'https://example.com/search?q=different';

      const result = await startApply(50, sampleView);
      expect(chrome.tabs.update).toHaveBeenCalledWith(50, {
        url: 'https://example.com/search?q=shoes&sort=asc',
      });

      // Session record should be written
      const op = await getActiveOperation(50);
      expect(op).not.toBeNull();
      expect(op?.viewId).toBe(sampleView.id);
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
  });
});
