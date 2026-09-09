import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  validatePayload,
  getInstallationId,
  calculateDistinctSiteBucket,
} from '@/analytics';

export interface ReportInput {
  failureCategory: string;
  attemptedCount: number;
  restoredCount: number;
  skippedCount: number;
  distinctSitesCount: number;
}

export interface ReportIssueProps {
  reportData: ReportInput;
  onSend: (payload: Record<string, string | number>) => Promise<void> | void;
  onCancel: () => void;
}

export async function generateCompatibilityReport(
  input: ReportInput
): Promise<Record<string, string | number>> {
  const installationId = await getInstallationId();
  const distinctSiteBucket = calculateDistinctSiteBucket(input.distinctSitesCount);

  const rawPayload = {
    installationId,
    extensionVersion: '1.0.0',
    failureCategory: input.failureCategory,
    attemptedCount: input.attemptedCount,
    restoredCount: input.restoredCount,
    skippedCount: input.skippedCount,
    distinctSiteBucket,
  };

  // Run through strict allowlist validation
  return validatePayload(rawPayload);
}

export function ReportIssue({ reportData, onSend, onCancel }: ReportIssueProps) {
  const [report, setReport] = useState<Record<string, string | number> | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    generateCompatibilityReport(reportData).then(setReport);
  }, [reportData]);

  const handleConfirm = async () => {
    if (!report) return;
    setIsSending(true);
    try {
      await onSend(report);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <header className="border-b border-slate-200 pb-3 mb-3">
        <h2 className="text-base font-bold text-slate-900">Report Compatibility Issue</h2>
        <p className="text-xs text-slate-500 mt-1">
          Review the exact metadata to be submitted. StickySite never transmits URLs, page content, or saved values.
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Preview Technical Metadata
          </label>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded-md text-[11px] font-mono whitespace-pre-wrap overflow-x-auto max-h-[220px]">
            {report ? JSON.stringify(report, null, 2) : 'Generating preview...'}
          </pre>
        </div>
      </div>

      <footer className="pt-3 border-t border-slate-200 mt-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSending}
          className="flex-1 min-h-[44px]"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!report || isSending}
          className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSending ? 'Sending...' : 'Confirm & Send'}
        </Button>
      </footer>
    </div>
  );
}
