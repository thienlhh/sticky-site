import React from 'react';
import { Button } from '@/components/ui/button';

export function App() {
  return (
    <main className="w-[360px] min-h-[400px] p-4 bg-white text-slate-900 flex flex-col justify-between">
      <header className="border-b border-slate-200 pb-3 mb-4">
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">StickySite</h1>
        <p className="text-xs text-slate-500">Save and restore page views</p>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center py-8">
        <p className="text-sm text-slate-500">No saved views for this page yet.</p>
      </section>

      <footer className="pt-3 border-t border-slate-200">
        <Button
          id="save-current-view-btn"
          disabled
          className="w-full"
          aria-label="Save Current View"
        >
          Save Current View
        </Button>
      </footer>
    </main>
  );
}

export default App;
