import React, { useState, useEffect, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getActivePage,
  requestOriginAccess,
  ensurePageAgent,
  sendPageCommand,
} from '@/platform/page-agent';
import { useSavedViews } from './hooks/useSavedViews';
import type { PingResponse, CaptureResponse } from '@/shared/page-messages';
import type { CaptureResult } from '@/capture/controls';
import type { CapturedSetting, SavedView } from '@/domain/view';
import { normalizePathname } from '@/domain/view';
import { CaptureReview } from './CaptureReview';
import { SaveView } from './SaveView';
import { ViewList } from './ViewList';
import { ViewActions, type ViewAction } from './ViewActions';
import { StatusMessage, type StatusState } from './StatusMessage';
import { ReportIssue } from './ReportIssue';
import { Onboarding, isOnboardingCompleted } from './Onboarding';
import { requestApply, type ViewApplyResult } from '@/apply/coordinator';
import {
  getLastApplyResult,
  getActiveOperation,
  getTabOperationKey,
  getTabResultKey,
} from '@/apply/operation';
import {
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  clearInstallationId,
  emitAnalyticsEvent,
} from '@/analytics';
import { Settings as SettingsIcon, ExternalLink } from 'lucide-react';
import { StickySiteLogo } from '@/components/StickySiteLogo';

export type Screen = 'idle' | 'review' | 'save' | 'settings' | 'report' | 'onboarding';

const applyingStatus: StatusState = { type: 'loading', message: 'Applying view...' };

export function statusForApplyResult(result: ViewApplyResult): StatusState {
  switch (result.status) {
    case 'Fully applied view':
      return { type: 'success', message: result.message };
    case 'Partially applied view':
      return {
        type: 'warning',
        message: result.message,
        actionHint: 'Some settings could not be safely restored.',
      };
    case 'Applying view':
      return { type: 'loading', message: result.message };
    case 'Could not apply':
      return {
        type: 'error',
        message: result.message,
        actionHint: 'Ensure the saved page is open, then try again.',
      };
  }
}

export function App() {
  const [screen, setScreen] = useState<Screen>('idle');
  const [status, setStatus] = useState<string | StatusState>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analyticsOn, setAnalyticsOn] = useState<boolean>(true);
  const [activePageInfo, setActivePageInfo] = useState<{ origin: string; pathname: string } | null>(null);
  const [activeAction, setActiveAction] = useState<ViewAction | null>(null);

  const {
    allViews,
    storageError,
    refreshViews,
    updateViewItem,
    renameViewItem,
    deleteViewItem,
  } = useSavedViews((msg) => setStatus(`Storage error: ${msg}`));

  const [captureData, setCaptureData] = useState<CaptureResult | null>(null);
  const [updatingView, setUpdatingView] = useState<SavedView | null>(null);
  const [reviewSelection, setReviewSelection] = useState<{
    controls: CapturedSetting[];
    queryParams: Record<string, string[]>;
  } | null>(null);
  const statusRevision = useRef(0);

  const [onboardingChecked, setOnboardingChecked] = useState<boolean>(false);

  useEffect(() => {
    isAnalyticsEnabled().then(setAnalyticsOn).catch(() => { });
    isOnboardingCompleted()
      .then((completed) => {
        if (!completed) {
          setScreen('onboarding');
        }
        setOnboardingChecked(true);
      })
      .catch(() => {
        setOnboardingChecked(true);
      });
  }, []);

  const [isPageUnavailable, setIsPageUnavailable] = useState<boolean>(false);

  useEffect(() => {
    let activeTabId: number | null = null;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'session' || activeTabId === null) return;

      const tabOpKey = getTabOperationKey(activeTabId);
      const tabResKey = getTabResultKey(activeTabId);

      const operation = (changes[tabOpKey]?.newValue || changes.stickysite_apply_op?.newValue) as
        | { tabId?: number }
        | undefined;
      if (operation?.tabId === activeTabId) {
        statusRevision.current++;
        setStatus(applyingStatus);
      }

      const result = (changes[tabResKey]?.newValue || changes.stickysite_last_apply_result?.newValue) as
        | { tabId?: number; result?: ViewApplyResult }
        | undefined;
      if (result?.tabId === activeTabId && result.result) {
        statusRevision.current++;
        setStatus(statusForApplyResult(result.result));
      }
    };
    chrome.storage.onChanged?.addListener(handleStorageChange);

    getActivePage()
      .then(async (p) => {
        activeTabId = p.tabId;
        setIsPageUnavailable(false);
        setActivePageInfo({
          origin: p.url.origin,
          pathname: p.url.pathname,
        });

        // Check if an apply is actively running or recently completed for this tab
        try {
          const recoveryRevision = statusRevision.current;
          // A result can be written while an operation is being cleared.
          await getActiveOperation(p.tabId);
          const lastRes = await getLastApplyResult(p.tabId);
          const activeOp = await getActiveOperation(p.tabId);
          if (statusRevision.current !== recoveryRevision) return;
          if (activeOp) {
            setStatus(applyingStatus);
          } else if (lastRes) {
            setStatus(statusForApplyResult(lastRes));
          }
        } catch {
          // Ignore session recovery failure
        }
      })
      .catch((err) => {
        setIsPageUnavailable(true);
        setActivePageInfo(null);
        const msg = err instanceof Error ? err.message : 'Active page is unavailable or unsupported.';
        if (!msg.toLowerCase().includes('unsupported')) {
          setStatus(msg);
        }
      });

    return () => chrome.storage.onChanged?.removeListener(handleStorageChange);
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
      await renameViewItem(id, newName);
      setStatus(`Renamed to "${newName}"`);
      setActiveAction(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await deleteViewItem(id);
      setStatus('View deleted.');
      setActiveAction(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleUpdateConfirm = async (view: SavedView) => {
    setIsLoading(true);
    setStatus('Connecting to page for update...');
    try {
      const page = await getActivePage();
      const normPage = normalizePathname(page.url.pathname);
      const normView = normalizePathname(view.pathname);
      if (page.url.origin !== view.origin || normPage !== normView) {
        setStatus(`Cannot update view: current page does not match view page (${view.origin}${view.pathname}).`);
        setActiveAction(null);
        return;
      }

      const granted = await requestOriginAccess(page.url);
      if (!granted) {
        setStatus('Permission denied.');
        setActiveAction(null);
        return;
      }

      await ensurePageAgent(page.tabId);
      setStatus('Capturing page settings for update...');
      const captureRes = await sendPageCommand<CaptureResponse>(page.tabId, { type: 'CAPTURE' });
      if (captureRes?.status === 'ok' && captureRes.data) {
        if (
          captureRes.data.origin !== view.origin ||
          normalizePathname(captureRes.data.pathname) !== normView
        ) {
          setStatus('Cannot update view: captured page does not match view page.');
          setActiveAction(null);
          return;
        }

        setUpdatingView(view);
        setCaptureData(captureRes.data);
        setActiveAction(null);
        setScreen('review');
        setStatus('');
      } else {
        setStatus('Failed to capture settings for update.');
        setActiveAction(null);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed');
      setActiveAction(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (screen === 'onboarding') {
    return (
      <main data-ready={onboardingChecked ? 'true' : 'false'} className="w-[360px] h-[500px] p-3 bg-white text-slate-900 flex flex-col justify-between overflow-hidden">
        <Onboarding
          onComplete={() => {
            setScreen('idle');
            setOnboardingChecked(true);
          }}
        />
      </main>
    );
  }

  if (screen === 'review' && captureData) {
    return (
      <main data-ready={onboardingChecked ? 'true' : 'false'} className="w-[360px] h-[500px] p-3 bg-white text-slate-900 flex flex-col justify-between overflow-hidden">
        <CaptureReview
          captureResult={captureData}
          onCancel={() => {
            setScreen('idle');
            setCaptureData(null);
            setUpdatingView(null);
          }}
          onContinue={async (chosenControls, chosenQueryParams) => {
            const totalSelected = chosenControls.length + Object.keys(chosenQueryParams).length;
            if (totalSelected === 0) {
              setScreen('idle');
              setCaptureData(null);
              setUpdatingView(null);
              return;
            }

            if (updatingView) {
              const updatedView: SavedView = {
                ...updatingView,
                id: updatingView.id,
                name: updatingView.name,
                createdAt: updatingView.createdAt,
                queryParams: chosenQueryParams,
                controls: chosenControls,
                updatedAt: new Date().toISOString(),
              };

              try {
                await updateViewItem(updatedView);
                setStatus(`Updated "${updatingView.name}"`);
              } catch (err) {
                setStatus(err instanceof Error ? err.message : 'Update failed');
              } finally {
                setUpdatingView(null);
                setCaptureData(null);
                setScreen('idle');
              }
            } else {
              setReviewSelection({
                controls: chosenControls,
                queryParams: chosenQueryParams,
              });
              setScreen('save');
            }
          }}
        />
      </main>
    );
  }

  if (screen === 'save' && captureData && reviewSelection) {
    return (
      <main data-ready={onboardingChecked ? 'true' : 'false'} className="w-[360px] h-[500px] p-3 bg-white text-slate-900 flex flex-col justify-between overflow-hidden">
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
          }}
        />
      </main>
    );
  }

  if (screen === 'settings') {
    return (
      <main data-ready={onboardingChecked ? 'true' : 'false'} className="w-[360px] h-[500px] p-3 bg-white text-slate-900 flex flex-col justify-between overflow-hidden">
        <header className="border-b border-slate-200 pb-2 mb-2.5 flex items-center gap-2">
          <StickySiteLogo className="h-7 w-7 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Privacy & Settings</h2>
            <p className="text-xs text-slate-500">Manage anonymous analytics and identity</p>
          </div>
        </header>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 bg-slate-50">
            <div className="pr-2">
              <label htmlFor="analytics-toggle" className="text-xs font-semibold text-slate-900 cursor-pointer">
                Share anonymous analytics
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
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
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
              aria-label="Share anonymous analytics"
            />
          </div>

          <div className="flex flex-col items-start space-y-2 pt-1">
            <Button
              variant="link"
              size="sm"
              onClick={async () => {
                await clearInstallationId();
                setStatus('Anonymous installation identity reset.');
              }}
              className="h-auto p-0 text-xs font-medium"
            >
              Reset anonymous identity
            </Button>

            <Button
              variant="link"
              size="sm"
              onClick={() => setScreen('report')}
              className="h-auto p-0 text-xs font-medium"
            >
              Report compatibility issue
            </Button>

            <a
              href="https://github.com/thienlhh/sticky-site/issues"
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: 'link', size: 'sm' }),
                'h-auto p-0 text-xs font-medium'
              )}
            >
              <span>Report a bug</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <a
              href="https://chromewebstore.google.com/detail/stickysite/pfmjhojnaboahgnffghlfaafnfokfich"
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: 'link', size: 'sm' }),
                'h-auto p-0 text-xs font-medium'
              )}
            >
              <span>Rate the extension</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <footer className="pt-2.5 border-t border-slate-200 mt-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setScreen('idle')}
            className="w-full"
          >
            Back
          </Button>
        </footer>

        <StatusMessage status={status} onDismiss={() => setStatus('')} />
      </main>
    );
  }

  if (screen === 'report') {
    return (
      <main data-ready={onboardingChecked ? 'true' : 'false'} className="w-[360px] h-[500px] p-3 bg-white text-slate-900 flex flex-col justify-between overflow-hidden">
        <ReportIssue
          reportData={{
            failureCategory: 'user_reported_issue',
            attemptedCount: 0,
            restoredCount: 0,
            skippedCount: 0,
          }}
          onCancel={() => setScreen('settings')}
          onSend={async (payload) => {
            try {
              const res = await emitAnalyticsEvent('view_apply_failed', payload);
              if (res.delivery === 'disabled') {
                setStatus('Analytics is disabled. Report was not sent.');
              } else if (res.delivery === 'unconfigured') {
                setStatus('Analytics delivery is unconfigured. Report was recorded locally.');
              } else {
                setStatus('Compatibility report delivered. Thank you!');
              }
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
    <main data-ready={onboardingChecked ? 'true' : 'false'} className="w-[360px] h-[500px] p-3 bg-white text-slate-900 flex flex-col justify-between overflow-hidden">
      <header className="border-b border-slate-200 pb-2 mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickySiteLogo className="h-7 w-7 shrink-0" />
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">StickySite</h1>
            <p className="text-xs text-slate-500">Save and restore page views</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setScreen('settings')}
          aria-label="Settings and Privacy"
          className="h-8 w-8 p-0 min-h-[32px] text-slate-500 hover:text-slate-900"
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </header>

      <section className="flex-1 flex flex-col min-h-0">
        {storageError && allViews.length === 0 ? (
          <div
            role="alert"
            aria-live="assertive"
            className="flex-1 flex flex-col items-center justify-center text-center py-6 px-2"
          >
            <p className="text-sm font-semibold text-red-600">Storage Load Error</p>
            <p className="text-xs text-slate-600 mt-1 max-w-[280px]">{storageError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshViews()}
              className="mt-2.5 min-h-[32px]"
              aria-label="Retry loading saved views"
            >
              Retry Loading
            </Button>
          </div>
        ) : activePageInfo ? (
          <>
            {storageError && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-1.5 p-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center justify-between"
              >
                <span className="truncate flex-1 mr-2">{storageError}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshViews()}
                  className="h-6 px-1.5 text-xs"
                  aria-label="Retry loading saved views"
                >
                  Retry
                </Button>
              </div>
            )}
            <ViewList
              currentOrigin={activePageInfo.origin}
              currentPathname={activePageInfo.pathname}
              views={allViews}
              onApply={async (view) => {
                setIsLoading(true);
                setStatus({ type: 'loading', message: `Applying "${view.name}"...` });
                try {
                  const page = await getActivePage();
                  const granted = await requestOriginAccess(page.url);
                  if (!granted) {
                    setStatus('Permission denied.');
                    return;
                  }
                  const applyRevision = statusRevision.current;
                  const res = await requestApply(page.tabId, view);
                  if (statusRevision.current === applyRevision) {
                    setStatus(statusForApplyResult(res));
                  }
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Apply failed');
                } finally {
                  setIsLoading(false);
                }
              }}
              onNavigate={async (url) => {
                try {
                  const page = await getActivePage();
                  await chrome.tabs.update(page.tabId, { url });
                  window.close();
                } catch {
                  window.open(url, '_blank');
                }
              }}
              onRename={(v) => setActiveAction({ type: 'rename', view: v })}
              onUpdate={(v) => setActiveAction({ type: 'update', view: v })}
              onDelete={(v) => setActiveAction({ type: 'delete', view: v })}
            />
          </>
        ) : isPageUnavailable ? (
          <div
            id="page-not-supported"
            className="flex-1 flex flex-col items-center justify-center text-center py-6 px-2"
          >
            <p className="text-sm font-medium text-slate-700">Page Not Supported</p>
            <p className="text-xs text-slate-500 mt-1">
              StickySite only works on standard web pages (HTTP/HTTPS). Open a web page and try again.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <p className="text-sm text-slate-500">No saved views for this page yet.</p>
          </div>
        )}
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

      <footer className="pt-2.5 border-t border-slate-200 mt-2.5">
        <Button
          id="save-current-view-btn"
          disabled={isLoading || isPageUnavailable}
          onClick={handleStartCapture}
          className="w-full"
          aria-label="Save Current View"
        >
          {isLoading ? 'Connecting...' : 'Save Current View'}
        </Button>
      </footer>

      <StatusMessage status={status} onDismiss={() => setStatus('')} />
    </main>
  );
}

export default App;
