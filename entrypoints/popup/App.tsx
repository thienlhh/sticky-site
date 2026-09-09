import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  getActivePage,
  requestOriginAccess,
  ensurePageAgent,
  sendPageCommand,
} from '@/platform/page-agent';
import type { PingResponse } from '@/shared/page-messages';

export function App() {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAction = async () => {
    setIsLoading(true);
    setStatus('Checking access...');
    try {
      const page = await getActivePage();
      const granted = await requestOriginAccess(page.url);
      if (!granted) {
        setStatus('Permission denied.');
        return;
      }
      await ensurePageAgent(page.tabId);
      const res = await sendPageCommand<PingResponse>(page.tabId, { type: 'PING' });
      if (res?.pong) {
        setStatus('Page access ready.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setStatus(msg);
    } finally {
      setIsLoading(false);
    }
  };

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
          onClick={handleAction}
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
