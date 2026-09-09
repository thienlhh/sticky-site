import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  getActivePage,
  requestOriginAccess,
  ensurePageAgent,
  sendPageCommand,
} from '@/platform/page-agent';
import { listViews, renameView, deleteView, replaceView } from '@/storage/views';
import type { PingResponse, CaptureResponse } from '@/shared/page-messages';
import type { CaptureResult } from '@/capture/controls';
import type { CapturedSetting, SavedView } from '@/domain/view';
import { CaptureReview } from './CaptureReview';
import { SaveView } from './SaveView';
import { ViewList } from './ViewList';
import { ViewActions, type ViewAction } from './ViewActions';
import { StatusMessage } from './StatusMessage';
import { ReportIssue } from './ReportIssue';
import { Onboarding, isOnboardingCompleted } from './Onboarding';
import { startApply } from '@/apply/coordinator';
import {
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  clearInstallationId,
  track,
} from '@/analytics';
import { Settings as SettingsIcon } from 'lucide-react';

export type Screen = 'idle' | 'review' | 'save' | 'settings' | 'report' | 'onboarding';

export function App() {
  const [screen, setScreen] = useState<Screen>('idle');
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analyticsOn, setAnalyticsOn] = useState<boolean>(true);
  const [activePageInfo, setActivePageInfo] = useState<{ origin: string; pathname: string } | null>(null);
  const [allViews, setAllViews] = useState<SavedView[]>([]);
  const [activeAction, setActiveAction] = useState<ViewAction | null>(null);

  const [captureData, setCaptureData] = useState<CaptureResult | null>(null);
  const [reviewSelection, setReviewSelection] = useState<{
    controls: CapturedSetting[];
    queryParams: Record<string, string[]>;
  } | null>(null);

  const refreshViews = async () => {
    try {
      const views = await listViews();
      setAllViews(views);
    } catch (err) {
      console.error('Failed to load views', err);
    }
  };

  useEffect(() => {
    isAnalyticsEnabled().then(setAnalyticsOn).catch(() => {});
    isOnboardingCompleted().then((completed) => {
      if (!completed) {
        setScreen('onboarding');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshViews();
    getActivePage()
      .then((p) => {
        setActivePageInfo({
          origin: p.url.origin,
          pathname: p.url.pathname,
        });
      })
      .catch(() => {
        if (typeof window !== 'undefined' && window.location?.origin) {
          setActivePageInfo({
            origin: window.location.origin,
            pathname: window.location.pathname,
          });
        }
      });
  }, []);

  const handleStartCapture = async () => {
    setIsLoading(true);
    setStatus('Connecting to page...');
    try {
      const page = await getActivePage();
      setActivePageInfo({
        origin: page.url.origin,
        pathname: page.url.pathname,
      });

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

  const handleRenameSubmit = async (id: string, newName: string) => {
    try {
      await renameView(id, newName, new Date().toISOString());
      await refreshViews();
      setStatus(`Renamed to "${newName}"`);
      setActiveAction(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await deleteView(id);
      await refreshViews();
      setStatus('View deleted.');
      setActiveAction(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleUpdateConfirm = async (view: SavedView) => {
    setIsLoading(true);
    setStatus('Capturing page settings for update...');
    try {
      const page = await getActivePage();
      const granted = await requestOriginAccess(page.url);
      if (!granted) {
        setStatus('Permission denied.');
        return;
      }
      await ensurePageAgent(page.tabId);
      const captureRes = await sendPageCommand<CaptureResponse>(page.tabId, { type: 'CAPTURE' });
      if (captureRes?.status === 'ok' && captureRes.data) {
        const updatedView: SavedView = {
          ...view,
          queryParams: captureRes.data.queryParams,
          controls: captureRes.data.controls,
          updatedAt: new Date().toISOString(),
        };
        await replaceView(updatedView);
        await refreshViews();
        setStatus(`Updated "${view.name}"`);
        setActiveAction(null);
      } else {
        setStatus('Failed to capture settings for update.');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (screen === 'onboarding') {
    return (
      <main className="w-[360px] min-h-[440px] p-4 bg-white text-slate-900 flex flex-col justify-between">
        <Onboarding onComplete={() => setScreen('idle')} />
      </main>
    );
  }

  if (screen === 'review' && captureData) {
    return (
      <main className="w-[360px] min-h-[440px] p-4 bg-white text-slate-900 flex flex-col justify-between">
        <CaptureReview
          captureResult={captureData}
          onCancel={() => {
            setScreen('idle');
            setCaptureData(null);
          }}
          onContinue={(chosenControls, chosenQueryParams) => {
            setReviewSelection({
              controls: chosenControls,
              queryParams: chosenQueryParams,
            });
            setScreen('save');
          }}
        />
      </main>
    );
  }

  if (screen === 'save' && captureData && reviewSelection) {
    return (
      <main className="w-[360px] min-h-[440px] p-4 bg-white text-slate-900 flex flex-col justify-between">
        <SaveView
          origin={captureData.origin}
          pathname={captureData.pathname}
          queryParams={reviewSelection.queryParams}
          controls={reviewSelection.controls}
          onCancel={() => {
            setScreen('review');
          }}
          onSaved={async (savedView) => {
            await refreshViews();
            setScreen('idle');
            setCaptureData(null);
            setReviewSelection(null);
            setStatus(`Saved "${savedView.name}"`);
            track('view_created', { capturedCount: savedView.controls.length }).catch(() => {});
          }}
        />
      </main>
    );
  }

  if (screen === 'settings') {
    return (
      <main className="w-[360px] min-h-[440px] p-4 bg-white text-slate-900 flex flex-col justify-between">
        <header className="border-b border-slate-200 pb-3 mb-3">
          <h2 className="text-base font-bold text-slate-900">Privacy & Settings</h2>
          <p className="text-xs text-slate-500">Manage anonymous analytics and identity</p>
        </header>

        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
            <div className="pr-2">
              <label htmlFor="analytics-toggle" className="text-sm font-semibold text-slate-900 cursor-pointer">
                Share Anonymous Analytics
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Help improve compatibility. Never sends URLs, labels, or values.
              </p>
            </div>
            <input
              type="checkbox"
              id="analytics-toggle"
              checked={analyticsOn}
              onChange={async (e) => {
                const checked = e.target.checked;
                setAnalyticsOn(checked);
                await setAnalyticsEnabled(checked);
                setStatus(checked ? 'Analytics enabled' : 'Analytics disabled');
              }}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              aria-label="Share Anonymous Analytics"
            />
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={async () => {
                await clearInstallationId();
                setStatus('Anonymous installation identity reset.');
              }}
              className="w-full min-h-[44px] justify-start text-xs font-semibold"
            >
              Reset Anonymous Identity
            </Button>

            <Button
              variant="outline"
              onClick={() => setScreen('report')}
              className="w-full min-h-[44px] justify-start text-xs font-semibold"
            >
              Report Compatibility Issue
            </Button>
          </div>
        </div>

        <footer className="pt-3 border-t border-slate-200 mt-3">
          <Button
            onClick={() => setScreen('idle')}
            className="w-full min-h-[44px]"
          >
            Back
          </Button>
        </footer>
      </main>
    );
  }

  if (screen === 'report') {
    const distinctSites = new Set(allViews.map((v) => v.origin)).size;
    return (
      <main className="w-[360px] min-h-[440px] p-4 bg-white text-slate-900 flex flex-col justify-between">
        <ReportIssue
          reportData={{
            failureCategory: 'user_reported_issue',
            attemptedCount: 0,
            restoredCount: 0,
            skippedCount: 0,
            distinctSitesCount: distinctSites,
          }}
          onCancel={() => setScreen('settings')}
          onSend={async (payload) => {
            try {
              await track('view_apply_failed', payload);
              setStatus('Compatibility report sent. Thank you!');
            } catch {
              setStatus('Failed to send report.');
            }
            setScreen('idle');
          }}
        />
      </main>
    );
  }

  return (
    <main className="w-[360px] min-h-[440px] p-4 bg-white text-slate-900 flex flex-col justify-between">
      <header className="border-b border-slate-200 pb-3 mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">StickySite</h1>
          <p className="text-xs text-slate-500">Save and restore page views</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setScreen('settings')}
          aria-label="Settings and Privacy"
          className="h-9 w-9 p-0 min-h-[36px] text-slate-500 hover:text-slate-900"
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </header>

      <section className="flex-1 flex flex-col min-h-0">
        {activePageInfo ? (
          <ViewList
            currentOrigin={activePageInfo.origin}
            currentPathname={activePageInfo.pathname}
            views={allViews}
            onApply={async (view) => {
              setIsLoading(true);
              setStatus(`Applying "${view.name}"...`);
              try {
                const page = await getActivePage();
                const granted = await requestOriginAccess(page.url);
                if (!granted) {
                  setStatus('Permission denied.');
                  return;
                }
                const res = await startApply(page.tabId, view);
                setStatus(res.message || res.status);
              } catch (err) {
                setStatus(err instanceof Error ? err.message : 'Apply failed');
              } finally {
                setIsLoading(false);
              }
            }}
            onRename={(v) => setActiveAction({ type: 'rename', view: v })}
            onUpdate={(v) => setActiveAction({ type: 'update', view: v })}
            onDelete={(v) => setActiveAction({ type: 'delete', view: v })}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <p className="text-sm text-slate-500">No saved views for this page yet.</p>
          </div>
        )}

        <StatusMessage status={status} />
      </section>

      {activeAction && activePageInfo && (
        <ViewActions
          action={activeAction}
          activeOrigin={activePageInfo.origin}
          activePathname={activePageInfo.pathname}
          allViews={allViews}
          onClose={() => setActiveAction(null)}
          onRenameSubmit={handleRenameSubmit}
          onDeleteConfirm={handleDeleteConfirm}
          onUpdateConfirm={handleUpdateConfirm}
        />
      )}

      <footer className="pt-3 border-t border-slate-200 mt-3">
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
