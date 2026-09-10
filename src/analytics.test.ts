import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  track,
  validatePayload,
  setAnalyticsAdapter,
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  getInstallationId,
  clearInstallationId,
  type AnalyticsEvent,
  type AnalyticsAdapter,
} from './analytics';

describe('Analytics & Privacy Engine (Task 10A)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    // Default to clean state
    await chrome.storage.local.clear();
    setAnalyticsAdapter(null); // Reset to no-op
  });

  describe('Strict Payload Allowlist & Prohibited Property Rejection', () => {
    it('rejects private text and invalid values hidden inside allowlisted keys', () => {
      const invalid: Record<string, string | number>[] = [
        { attemptedCount: -1 },
        { restoredCount: 1.5 },
        { skippedCount: Infinity },
        { failureCategory: 'user@example.com' },
        { installationId: 'private identifier' },
        { extensionVersion: 'page contents' },
        { timestamp: 'search query' },
      ];
      for (const payload of invalid) expect(() => validatePayload(payload)).toThrow();
    });

    it('accepts strictly allowlisted numerical counts and failure category', () => {
      const valid = {
        attemptedCount: 5,
        restoredCount: 4,
        skippedCount: 1,
        failureCategory: 'no_match',
      };
      const result = validatePayload(valid);
      expect(result).toEqual(valid);
    });

    it('rejects removed KPI properties: distinctSiteBucket, capturedCount', () => {
      expect(() => validatePayload({ distinctSiteBucket: '2-5' })).toThrow(/prohibited analytics property/i);
      expect(() => validatePayload({ capturedCount: 5 })).toThrow(/prohibited analytics property/i);
    });

    it('rejects prohibited fields: url, origin, pathname', () => {
      expect(() => {
        validatePayload({ url: 'https://example.com' });
      }).toThrow(/prohibited analytics property/i);

      expect(() => {
        validatePayload({ origin: 'https://example.com' });
      }).toThrow(/prohibited analytics property/i);

      expect(() => {
        validatePayload({ pathname: '/checkout' });
      }).toThrow(/prohibited analytics property/i);
    });

    it('rejects prohibited fields: label, value, name, selector, fingerprint, content, keystrokes', () => {
      const prohibitedKeys = [
        'label',
        'value',
        'name',
        'selector',
        'fingerprint',
        'pageContent',
        'keystrokes',
        'viewName',
        'queryData',
      ];

      for (const key of prohibitedKeys) {
        expect(() => {
          validatePayload({ [key]: 'prohibited_value' });
        }).toThrow(/prohibited analytics property/i);
      }
    });

    it('rejects values that look like full URLs or sensitive queries', () => {
      expect(() => {
        validatePayload({ failureCategory: 'https://example.com/sensitive' });
      }).toThrow(/prohibited url content/i);
    });
  });

  describe('Installation Identity & Off-Switch', () => {
    it('generates a stable UUID for installation identity', async () => {
      const id1 = await getInstallationId();
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      const id2 = await getInstallationId();
      expect(id2).toBe(id1);
    });

    it('clears installation identity and assigns a new random UUID', async () => {
      const id1 = await getInstallationId();
      const id2 = await clearInstallationId();
      expect(id2).not.toBe(id1);
      expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('defaults to enabled and respects the analytics off-switch', async () => {
      expect(await isAnalyticsEnabled()).toBe(true);

      await setAnalyticsEnabled(false);
      expect(await isAnalyticsEnabled()).toBe(false);

      await setAnalyticsEnabled(true);
      expect(await isAnalyticsEnabled()).toBe(true);
    });
  });

  describe('Delivery via Adapter', () => {
    it('uses no-op adapter by default and does not throw', async () => {
      await expect(
        track('view_apply_full', {
          attemptedCount: 3,
          restoredCount: 3,
        })
      ).resolves.toBeUndefined();
    });

    it('delivers allowlisted payload to configured adapter when enabled', async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      const testAdapter: AnalyticsAdapter = {
        send: sendMock,
      };
      setAnalyticsAdapter(testAdapter);

      await track('view_apply_full', {
        attemptedCount: 4,
        restoredCount: 4,
        skippedCount: 0,
      });

      expect(sendMock).toHaveBeenCalledTimes(1);
      const [event, props] = sendMock.mock.calls[0];
      expect(event).toBe('view_apply_full');
      expect(props.attemptedCount).toBe(4);
      expect(props.restoredCount).toBe(4);
      expect(props.skippedCount).toBe(0);
      expect(props.installationId).toBeDefined();
      expect(props.extensionVersion).toBe('1.0.0');
      expect(typeof props.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(props.timestamp as string))).toBe(false);
    });

    it('delivers exact payload to local HTTP collector via createHttpAdapter', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });
      const adapter = (await import('./analytics')).createHttpAdapter(
        'http://127.0.0.1:9876/collector',
        fetchMock as unknown as typeof fetch
      );
      setAnalyticsAdapter(adapter);

      await track('view_apply_full', {
        attemptedCount: 3,
        restoredCount: 3,
        skippedCount: 0,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://127.0.0.1:9876/collector');
      expect(init?.method).toBe('POST');
      expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });

      const parsedBody = JSON.parse(init?.body as string);
      expect(parsedBody.event).toBe('view_apply_full');
      expect(parsedBody.attemptedCount).toBe(3);
      expect(parsedBody.restoredCount).toBe(3);
      expect(parsedBody.skippedCount).toBe(0);
      expect(parsedBody.installationId).toBeDefined();
      expect(parsedBody.extensionVersion).toBe('1.0.0');
      expect(parsedBody.timestamp).toBeDefined();
    });

    it('rejects an HTTP error response instead of reporting delivery', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });
      const adapter = (await import('./analytics')).createHttpAdapter(
        'http://127.0.0.1:9876/collector',
        fetchMock as unknown as typeof fetch
      );

      await expect(adapter.send('view_apply_failed', {})).rejects.toThrow(/analytics request failed: 500/i);
    });

    it('does NOT make any network request when analytics is disabled even with HTTP adapter configured', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      const adapter = (await import('./analytics')).createHttpAdapter(
        'http://127.0.0.1:9876/collector',
        fetchMock as unknown as typeof fetch
      );
      setAnalyticsAdapter(adapter);

      await setAnalyticsEnabled(false);

      await track('view_apply_full', {
        attemptedCount: 2,
        restoredCount: 2,
        skippedCount: 0,
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does NOT deliver anything when analytics is disabled', async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      setAnalyticsAdapter({ send: sendMock });

      await setAnalyticsEnabled(false);

      await track('view_apply_full', {
        attemptedCount: 2,
        restoredCount: 2,
        skippedCount: 0,
      });

      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe('Event Name Validation & emitAnalyticsEvent', () => {
    it('validates allowed PRD event names and rejects unknown events', async () => {
      const { validateEvent } = await import('./analytics');
      const validEvents = [
        'view_apply_started',
        'view_apply_full',
        'view_apply_partial',
        'view_apply_failed',
      ];

      for (const ev of validEvents) {
        expect(() => validateEvent(ev)).not.toThrow();
      }

      const removedEvents = [
        'extension_installed',
        'site_permission_granted',
        'save_view_started',
        'view_created',
        'view_updated',
        'view_deleted',
      ];
      for (const ev of removedEvents) {
        expect(() => validateEvent(ev)).toThrow(/prohibited or unknown analytics event/i);
      }

      expect(() => validateEvent('random_event')).toThrow(/prohibited or unknown analytics event/i);
      expect(() => validateEvent('')).toThrow(/prohibited or unknown analytics event/i);
      expect(() => validateEvent(null)).toThrow(/prohibited or unknown analytics event/i);
    });

    it('delivers UI event via chrome.runtime.sendMessage', async () => {
      const { emitAnalyticsEvent } = await import('./analytics');
      const sendMock = vi.fn((_msg, cb) => cb?.({ status: 'ok' }));
      chrome.runtime.sendMessage = sendMock;

      await emitAnalyticsEvent('view_apply_failed', {
        attemptedCount: 3,
        restoredCount: 0,
        skippedCount: 3,
        failureCategory: 'user_reported_issue',
      });

      expect(sendMock).toHaveBeenCalledWith(
        {
          type: 'TRACK_ANALYTICS',
          event: 'view_apply_failed',
          properties: {
            attemptedCount: 3,
            restoredCount: 0,
            skippedCount: 3,
            failureCategory: 'user_reported_issue',
          },
        },
        expect.any(Function)
      );
    });

    it('rejects emitAnalyticsEvent on unknown event name before message delivery', async () => {
      const { emitAnalyticsEvent } = await import('./analytics');
      const sendMock = vi.fn();
      chrome.runtime.sendMessage = sendMock;

      // @ts-expect-error test invalid event name at runtime
      await expect(emitAnalyticsEvent('invalid_event', {})).rejects.toThrow(
        /prohibited or unknown analytics event/i
      );
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle Event Ordering and Integrity (R10)', () => {
    it('emits view_apply_started before view_apply_full and prevents duplicate events', async () => {
      const delivered: string[] = [];
      setAnalyticsAdapter({
        send: async (event) => {
          delivered.push(event);
        },
      });

      const { startApply } = await import('@/apply/coordinator');
      const sampleView: import('@/domain/view').SavedView = {
        schemaVersion: 1,
        id: 'test-v1',
        name: 'Test View',
        origin: 'https://example.com',
        pathname: '/search',
        queryParams: { q: ['test'] },
        controls: [],
        createdAt: '2026-09-09T00:00:00.000Z',
        updatedAt: '2026-09-09T00:00:00.000Z',
      };

      // @ts-ignore
      chrome.tabs = {
        get: vi.fn(async () => ({
          id: 101,
          url: 'https://example.com/search?q=test',
        })),
        update: vi.fn(async () => {}),
      } as any;

      await startApply(101, sampleView);

      expect(delivered).toEqual(['view_apply_started', 'view_apply_full']);
    });

    it('emits view_apply_failed and never emits view_apply_full when restoration fails', async () => {
      const delivered: string[] = [];
      setAnalyticsAdapter({
        send: async (event) => {
          delivered.push(event);
        },
      });

      const { startApply } = await import('@/apply/coordinator');
      const pageAgent = await import('@/platform/page-agent');
      vi.spyOn(pageAgent, 'ensurePageAgent').mockResolvedValue(undefined as any);
      vi.spyOn(pageAgent, 'sendPageCommand').mockResolvedValue({
        status: 'ok',
        data: {
          outcomes: [{ index: 0, outcome: 'failed', reason: 'control not found' }],
        },
      } as any);

      const sampleView: import('@/domain/view').SavedView = {
        schemaVersion: 1,
        id: 'test-v2',
        name: 'Failed View',
        origin: 'https://example.com',
        pathname: '/search',
        queryParams: {},
        controls: [
          {
            id: 'c1',
            fingerprint: { kind: 'text', tag: 'input', label: 'Search', ordinal: 0 },
            label: 'Search',
            value: 'foo',
          },
        ],
        createdAt: '2026-09-09T00:00:00.000Z',
        updatedAt: '2026-09-09T00:00:00.000Z',
      };

      // @ts-ignore
      chrome.tabs = {
        get: vi.fn(async () => ({
          id: 102,
          url: 'https://example.com/search',
        })),
        update: vi.fn(async () => {}),
      } as any;

      await startApply(102, sampleView);

      expect(delivered).toEqual(['view_apply_started', 'view_apply_failed']);
      expect(delivered).not.toContain('view_apply_full');
      expect(delivered).not.toContain('view_apply_partial');
    });
  });
});
