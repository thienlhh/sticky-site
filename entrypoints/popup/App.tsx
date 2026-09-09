import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  getActivePage,
  requestOriginAccess,
  ensurePageAgent,
  sendPageCommand,
} from '@/platform/page-agent';
import type { PingResponse, CaptureResponse } from '@/shared/page-messages';
import type { CaptureResult } from '@/capture/controls';
import type { CapturedSetting } from '@/domain/view';
import { CaptureReview } from './CaptureReview';

export type Screen = 'idle' | 'review';

export function App() {
  const [screen, setScreen] = useState<Screen>('idle');
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [captureData, setCaptureData] = useState<CaptureResult | null>(null);

  const handleStartCapture = async () => {
    setIsLoading(true);
    setStatus('Connecting to page...');
    try {
      const page = await getActivePage();
      const granted = await requestOriginAccess(page.url);
      if (!granted) {
        setStatus('Permission denied.');
        return;
      }
      await ensurePageAgent(page.tabId);
      const ping = await sendPageCommand<PingResponse>(page.tabId, { type: 'PING' });
      if (!ping?.pong) {
        setStatus('Could not connect to page agent.');
        return;
      }

      setStatus('Capturing page settings...');
      const captureRes = await sendPageCommand<CaptureResponse>(page.tabId, { type: 'CAPTURE' });
      if (captureRes?.status === 'ok' && captureRes.data) {
        setCaptureData(captureRes.data);
        setScreen('review');
        setStatus('');
      } else {
        setStatus('Failed to capture page settings.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setStatus(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (screen === 'review' && captureData) {
    return (
      <main className="w-[360px] min-h-[440px] p-4 bg-white text-slate-900 flex flex-col justify-between">
        <CaptureReview
          captureResult={captureData}
          onCancel={() => {
            setScreen('idle');
            setCaptureData(null);
          }}
          onContinue={(_chosenControls: CapturedSetting[], _chosenQueryParams: Record<string, string[]>) => {
            // Task 4 will transition to naming and saving
            setStatus('Settings reviewed.');
            setScreen('idle');
          }}
        />
      </main>
    );
  }

  return (
    <main className="w-[360px] min-h-[400px] p-4 bg-white text-slate-900 flex flex-col justify-between">
      <header className="border-b border-slate-200 pb-3 mb-4">
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">StickySite</h1>
        <p className="text-xs text-slate-500">Save and restore page views</p>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center py-8">
        <p className="text-sm text-slate-500 mb-2">No saved views for this page yet.</p>
        {status && (
          <p
            id="status-message"
            role="status"
            aria-live="polite"
            className="text-sm font-medium text-blue-600"
          >
            {status}
          </p>
        )}
      </section>

      <footer className="pt-3 border-t border-slate-200">
        <Button
          id="save-current-view-btn"
          disabled={isLoading}
          onClick={handleStartCapture}
          className="w-full"
          aria-label="Save Current View"
        >
          {isLoading ? 'Connecting...' : 'Save Current View'}
        </Button>
      </footer>
    </main>
  );
}

export default App;
