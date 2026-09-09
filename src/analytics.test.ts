import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  track,
  validatePayload,
  setAnalyticsAdapter,
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  getInstallationId,
  clearInstallationId,
  calculateDistinctSiteBucket,
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
    it('accepts strictly allowlisted numerical counts and coarse buckets', () => {
      const valid = {
        capturedCount: 5,
        attemptedCount: 5,
        restoredCount: 4,
        skippedCount: 1,
        distinctSiteBucket: '2-5',
        failureCategory: 'no_match',
      };
      const result = validatePayload(valid);
      expect(result).toEqual(valid);
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

    it('calculates distinct site buckets without revealing domain names', () => {
      expect(calculateDistinctSiteBucket(0)).toBe('0');
      expect(calculateDistinctSiteBucket(1)).toBe('1');
      expect(calculateDistinctSiteBucket(3)).toBe('2-5');
      expect(calculateDistinctSiteBucket(7)).toBe('6-10');
      expect(calculateDistinctSiteBucket(15)).toBe('10+');
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

      await track('view_created', {
        capturedCount: 4,
      });

      expect(sendMock).toHaveBeenCalledTimes(1);
      const [event, props] = sendMock.mock.calls[0];
      expect(event).toBe('view_created');
      expect(props.capturedCount).toBe(4);
      expect(props.installationId).toBeDefined();
    });

    it('does NOT deliver anything when analytics is disabled', async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      setAnalyticsAdapter({ send: sendMock });

      await setAnalyticsEnabled(false);

      await track('view_created', {
        capturedCount: 2,
      });

      expect(sendMock).not.toHaveBeenCalled();
    });
  });
});
