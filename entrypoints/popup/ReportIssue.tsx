import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StickySiteLogo } from '@/components/StickySiteLogo';
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
      <header className="border-b border-slate-200 pb-2 mb-2.5 flex items-center gap-2">
        <StickySiteLogo className="h-7 w-7 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-900">Report Compatibility Issue</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review the exact metadata to be submitted. StickySite never transmits URLs, page content, or saved values.
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Preview Technical Metadata
          </label>
          <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-md text-[11px] font-mono whitespace-pre-wrap overflow-x-auto max-h-[190px]">
            {report ? JSON.stringify(report, null, 2) : 'Generating preview...'}
          </pre>
        </div>
      </div>

      <footer className="pt-2.5 border-t border-slate-200 mt-2.5 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSending}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!report || isSending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSending ? 'Sending...' : 'Confirm & Send'}
        </Button>
      </footer>
    </div>
  );
}
