import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportIssue, generateCompatibilityReport } from './ReportIssue';
import {
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  getInstallationId,
} from '@/analytics';

describe('Privacy Controls & Compatibility Reporting (Task 10B)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await chrome.storage.local.clear();
  });

  describe('Report Issue / Compatibility Report Preview', () => {
    it('generates a report preview that excludes origins, URLs, page content, and setting values', async () => {
      const report = await generateCompatibilityReport({
        failureCategory: 'restore_failed',
        attemptedCount: 3,
        restoredCount: 1,
        skippedCount: 2,
      });

      expect(report.failureCategory).toBe('restore_failed');
      expect(report.attemptedCount).toBe(3);
      expect(report.restoredCount).toBe(1);
      expect(report.skippedCount).toBe(2);
      expect(report.extensionVersion).toBe('1.0.0');
      expect(report.installationId).toBeDefined();

      const reportStr = JSON.stringify(report);
      expect(reportStr).not.toContain('https://');
      expect(reportStr).not.toContain('http://');
      expect(reportStr).not.toContain('url');
      expect(reportStr).not.toContain('origin');
      expect(reportStr).not.toContain('pathname');
    });

    it('requires explicit confirmation before sending compatibility report', async () => {
      const user = userEvent.setup();
      const onSendMock = vi.fn().mockResolvedValue(undefined);
      const onCancelMock = vi.fn();

      render(
        <ReportIssue
          reportData={{
            failureCategory: 'restore_failed',
            attemptedCount: 2,
            restoredCount: 0,
            skippedCount: 2,
          }}
          onSend={onSendMock}
          onCancel={onCancelMock}
        />
      );

      // Verify preview is visible
      expect(screen.getByText(/Preview Technical Metadata/i)).toBeInTheDocument();
      expect(await screen.findByText(/"failureCategory": "restore_failed"/i)).toBeInTheDocument();

      // Ensure send is not called before confirmation
      expect(onSendMock).not.toHaveBeenCalled();

      // Click cancel
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelBtn);
      expect(onCancelMock).toHaveBeenCalledTimes(1);

      // Re-render and click confirm
      render(
        <ReportIssue
          reportData={{
            failureCategory: 'restore_failed',
            attemptedCount: 2,
            restoredCount: 0,
            skippedCount: 2,
          }}
          onSend={onSendMock}
          onCancel={onCancelMock}
        />
      );

      const confirmBtn = await screen.findAllByRole('button', { name: /Confirm & Send/i });
      await user.click(confirmBtn[confirmBtn.length - 1]);
      expect(onSendMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Storage and identity clearing controls', () => {
    it('persists analytics toggle in chrome.storage.local', async () => {
      expect(await isAnalyticsEnabled()).toBe(true);
      await setAnalyticsEnabled(false);
      expect(await isAnalyticsEnabled()).toBe(false);
    });

    it('clears installation identity and reflects new ID in subsequent report', async () => {
      const initialId = await getInstallationId();
      const { clearInstallationId } = await import('@/analytics');
      const newId = await clearInstallationId();
      expect(newId).not.toBe(initialId);

      const report = await generateCompatibilityReport({
        failureCategory: 'restore_failed',
        attemptedCount: 1,
        restoredCount: 0,
        skippedCount: 1,
      });
      expect(report.installationId).toBe(newId);
    });

    it('distinguishes delivered, disabled, and unconfigured delivery outcomes', async () => {
      const { emitAnalyticsEvent, setAnalyticsAdapter, setAnalyticsEnabled } = await import('@/analytics');

      // 1. Disabled
      await setAnalyticsEnabled(false);
      const disabledRes = await emitAnalyticsEvent('view_apply_failed', {
        failureCategory: 'restore_failed',
        attemptedCount: 1,
      });
      expect(disabledRes.delivery).toBe('disabled');

      // 2. Enabled but unconfigured
      await setAnalyticsEnabled(true);
      setAnalyticsAdapter(null);
      const unconfRes = await emitAnalyticsEvent('view_apply_failed', {
        failureCategory: 'restore_failed',
        attemptedCount: 1,
      });
      expect(unconfRes.delivery).toBe('unconfigured');

      // 3. Configured and delivered
      setAnalyticsAdapter({
        send: vi.fn().mockResolvedValue(undefined),
      });
      const deliveredRes = await emitAnalyticsEvent('view_apply_failed', {
        failureCategory: 'restore_failed',
        attemptedCount: 1,
      });
      expect(deliveredRes.delivery).toBe('delivered');
    });
  });
});
