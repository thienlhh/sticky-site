import type { CapturedSetting, SavedView } from '@/domain/view';
import { normalizePathname } from '@/domain/view';
import { replaceEligibleQuery, verifyQueryParams, type QueryVerificationResult } from '@/domain/url';
import { listViews } from '@/storage/views';
import { track } from '@/analytics';
import { ensurePageAgent, sendPageCommand } from '@/platform/page-agent';
import type { RestoreResponse } from '@/shared/page-messages';
import type { RestoreReport, RestoreOutcome } from '@/restoration/restore';
import {
  setOperation,
  clearOperation,
  getActiveOperation,
  getAnyActiveOperation,
  setLastApplyResult,
  failOperation,
  APPLY_TIMEOUT_MS,
} from './operation';

export type ViewApplyStatus =
  | 'Fully applied view'
  | 'Partially applied view'
  | 'Could not apply'
  | 'Applying view';

export interface ViewApplyResult {
  status: ViewApplyStatus;
  restoredCount: number;
  totalAttempted: number;
  skippedCount: number;
  failedCount: number;
  message: string;
}

export type ResumeApplyResult = ViewApplyResult & {
  outcomes: RestoreOutcome[];
};

class ApplyDeadlineExceeded extends Error {
  constructor() {
    super('Operation timed out.');
  }
}

async function beforeDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) throw new ApplyDeadlineExceeded();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ApplyDeadlineExceeded()), remainingMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function setOperationBeforeDeadline(
  operation: Parameters<typeof setOperation>[0]
): Promise<void> {
  const write = setOperation(operation);
  void write.then(() => {
    if (Date.now() >= operation.deadline) {
      void failOperation(operation.tabId, 'Operation timed out.', operation.startedAt);
    }
  }).catch(() => {});
  await beforeDeadline(write, operation.deadline);
}

async function settleBeforeDeadline(promise: Promise<unknown>, deadline: number): Promise<void> {
  try {
    await beforeDeadline(promise, deadline);
  } catch {
    // Reporting and cleanup cannot extend the operation deadline.
  }
}

function failedResumeResult(view: SavedView, message: string): ResumeApplyResult {
  return failedResumeResultForTotal(
    view.controls.length + Object.keys(view.queryParams).length,
    message
  );
}

function failedResumeResultForTotal(totalAttempted: number, message: string): ResumeApplyResult {
  return {
    status: 'Could not apply',
    restoredCount: 0,
    totalAttempted,
    skippedCount: 0,
    failedCount: totalAttempted,
    message,
    outcomes: [],
  };
}

export function aggregateApplyResult(
  controlsOrView: CapturedSetting[] | SavedView,
  report: RestoreReport,
  queryNavigatedOrReport?: boolean | QueryVerificationResult
): ViewApplyResult {
  const isView = !Array.isArray(controlsOrView);
  const controls = isView ? (controlsOrView as SavedView).controls : (controlsOrView as CapturedSetting[]);

  let queryReport: QueryVerificationResult | undefined;
  if (typeof queryNavigatedOrReport === 'object' && queryNavigatedOrReport !== null) {
    queryReport = queryNavigatedOrReport;
  }

  const queryTotal = queryReport
    ? queryReport.totalAttempted
    : isView
    ? Object.keys((controlsOrView as SavedView).queryParams).length
    : 0;

  const queryRestored = queryReport ? queryReport.restoredCount : 0;
  const queryFailed = queryReport ? queryReport.failedCount : 0;

  const totalControls = controls.length;
  const totalAttempted = totalControls + queryTotal;

  let restoredControls = 0;
  let skippedControls = 0;
  let failedControls = 0;

  for (const outcome of report.outcomes) {
    if (outcome.outcome === 'restored') restoredControls++;
    else if (outcome.outcome === 'skipped') skippedControls++;
    else if (outcome.outcome === 'failed') failedControls++;
  }

  // Missing control reports treated as failed
  const missingControls = totalControls - (restoredControls + skippedControls + failedControls);
  if (missingControls > 0) {
    failedControls += missingControls;
  }

  const restoredCount = restoredControls + queryRestored;
  const skippedCount = skippedControls;
  const failedCount = failedControls + queryFailed;

  if (totalAttempted === 0) {
    return {
      status: 'Fully applied view',
      restoredCount: 0,
      totalAttempted: 0,
      skippedCount: 0,
      failedCount: 0,
      message: 'View has no settings to apply.',
    };
  }

  let status: ViewApplyStatus;
  let message: string;

  if (restoredCount === totalAttempted) {
    status = 'Fully applied view';
    message =
      totalAttempted === 1
        ? '1 setting restored successfully.'
        : `All ${totalAttempted} settings restored successfully.`;
  } else if (restoredCount > 0) {
    status = 'Partially applied view';
    const parts: string[] = [];
    if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
    if (failedCount > 0) parts.push(`${failedCount} failed`);
    const details = parts.length > 0 ? ` (${parts.join(', ')})` : '';
    message = `${restoredCount} of ${totalAttempted} settings restored${details}.`;
  } else {
    status = 'Could not apply';
    message = 'Could not apply settings on this page.';
  }

  return {
    status,
    restoredCount,
    totalAttempted,
    skippedCount,
    failedCount,
    message,
  };
}

let isStartingApply = false;

function busyResult(view: SavedView): ViewApplyResult {
  const totalAttempted = view.controls.length + Object.keys(view.queryParams).length;
  return {
    status: 'Could not apply',
    restoredCount: 0,
    totalAttempted,
    skippedCount: totalAttempted,
    failedCount: 0,
    message: 'An operation is already in progress.',
  };
}

function trackApplyCompletion(result: ViewApplyResult): void {
  void (async () => {
    try {
      const props: Record<string, number | string> = {
        attemptedCount: result.totalAttempted,
        restoredCount: result.restoredCount,
        skippedCount: result.skippedCount,
      };
      if (result.status === 'Fully applied view') {
        await track('view_apply_full', props);
      } else if (result.status === 'Partially applied view') {
        await track('view_apply_partial', { ...props, failureCategory: 'partial_restore' });
      } else {
        await track('view_apply_failed', { ...props, failureCategory: 'restore_failed' });
      }
    } catch {
      // Analytics errors must not delay the operation result or cleanup.
    }
  })();
}

export async function startApply(tabId: number, view: SavedView): Promise<ViewApplyResult> {
  if (isStartingApply) return busyResult(view);
  isStartingApply = true;
  try {
    return await startApplyInternal(tabId, view);
  } finally {
    isStartingApply = false;
  }
}

async function startApplyInternal(
  tabId: number,
  view: SavedView
): Promise<ViewApplyResult> {
  const queryEntryCount = Object.keys(view.queryParams).length;
  const totalAttempted = view.controls.length + queryEntryCount;
  const startedAt = Date.now();
  const deadline = startedAt + APPLY_TIMEOUT_MS;

  // Reject overlapping requests to prevent overwriting state
  const existingOp = await beforeDeadline(getAnyActiveOperation(), deadline).catch(() => null);
  if (existingOp) {
    return {
      status: 'Could not apply',
      restoredCount: 0,
      totalAttempted,
      skippedCount: totalAttempted,
      failedCount: 0,
      message: 'An operation is already in progress.',
    };
  }

  let tab: chrome.tabs.Tab | null = null;
  try {
    tab = await beforeDeadline(chrome.tabs.get(tabId), deadline);
  } catch (error) {
    if (error instanceof ApplyDeadlineExceeded) {
      const result = failedResumeResult(view, 'Operation timed out.');
      await settleBeforeDeadline(
        setLastApplyResult({ tabId, viewId: view.id, result, completedAt: Date.now() }),
        deadline
      );
      return result;
    }
  }
  if (!tab || !tab.url) {
    return {
      status: 'Could not apply',
      restoredCount: 0,
      totalAttempted,
      skippedCount: totalAttempted,
      failedCount: 0,
      message: 'Active tab not accessible.',
    };
  }

  const tabUrl = new URL(tab.url);

  // Origin and pathname check
  if (
    tabUrl.origin !== view.origin ||
    normalizePathname(tabUrl.pathname) !== normalizePathname(view.pathname)
  ) {
    return {
      status: 'Could not apply',
      restoredCount: 0,
      totalAttempted,
      skippedCount: totalAttempted,
      failedCount: 0,
      message: `Incompatible page: view belongs to ${view.origin}${view.pathname}`,
    };
  }

  void track('view_apply_started', { attemptedCount: totalAttempted }).catch(() => {});

  // Calculate target URL with eligible query parameters
  const targetUrl = replaceEligibleQuery(tabUrl, view.queryParams, new URL(view.origin + view.pathname));
  const queryDiffers = targetUrl.search !== tabUrl.search;

  if (queryDiffers) {
    try {
      // Record session operation before navigation (allowing at most one navigation).
      await setOperationBeforeDeadline({
        tabId,
        viewId: view.id,
        startedAt,
        deadline,
        expectedUrl: targetUrl.toString(),
        navigated: true,
        status: 'navigating',
        totalAttempted,
      });

      // Schedule cleanup for the remaining operation lifetime, not another ten seconds.
      setTimeout(
        () => void failOperation(tabId, 'Operation timed out.', startedAt),
        Math.max(0, deadline - Date.now())
      );

      // Navigate tab once
      await beforeDeadline(chrome.tabs.update(tabId, { url: targetUrl.toString() }), deadline);

      return {
        status: 'Applying view',
        restoredCount: 0,
        totalAttempted,
        skippedCount: 0,
        failedCount: 0,
        message: 'Navigating to view URL...',
      };
    } catch (err) {
      const message = err instanceof ApplyDeadlineExceeded
        ? 'Operation timed out.'
        : err instanceof Error
          ? err.message
          : 'Navigation failed';
      await settleBeforeDeadline(failOperation(tabId, message, startedAt), deadline);
      void track('view_apply_failed', {
        attemptedCount: totalAttempted,
        restoredCount: 0,
        skippedCount: totalAttempted,
        failureCategory: 'navigation_failed',
      }).catch(() => {});
      return {
        status: 'Could not apply',
        restoredCount: 0,
        totalAttempted,
        skippedCount: totalAttempted,
        failedCount: 0,
        message,
      };
    }
  }

  // Direct Apply (no query navigation needed)
  try {
    await setOperationBeforeDeadline({
      tabId,
      viewId: view.id,
      startedAt,
      deadline,
      expectedUrl: tabUrl.toString(),
      navigated: false,
      status: 'restoring',
      totalAttempted,
    });
  } catch (err) {
    const result = failedResumeResult(
      view,
      err instanceof ApplyDeadlineExceeded ? 'Operation timed out.' : 'Could not start apply.'
    );
    await settleBeforeDeadline(
      setLastApplyResult({ tabId, viewId: view.id, result, completedAt: Date.now() }),
      deadline
    );
    return result;
  }

  try {
    const result = await resumeApply(tabId, view, deadline, startedAt);
    return result;
  } catch (err) {
    await settleBeforeDeadline(clearOperation(tabId, startedAt), deadline);
    void track('view_apply_failed', {
      attemptedCount: totalAttempted,
      restoredCount: 0,
      skippedCount: totalAttempted,
      failureCategory: 'restore_failed',
    }).catch(() => {});
    return {
      status: 'Could not apply',
      restoredCount: 0,
      totalAttempted,
      skippedCount: totalAttempted,
      failedCount: 0,
      message: err instanceof Error ? err.message : 'Apply failed',
    };
  }
}

const resumingTabs = new Set<number>();

export async function resumeApply(
  tabId: number,
  viewParam?: SavedView,
  deadlineParam?: number,
  startedAtParam?: number
): Promise<ResumeApplyResult> {
  if (resumingTabs.has(tabId)) {
    return {
      status: 'Applying view',
      restoredCount: 0,
      totalAttempted: 0,
      skippedCount: 0,
      failedCount: 0,
      message: 'Apply is already in progress.',
      outcomes: [],
    };
  }
  resumingTabs.add(tabId);
  try {
    return await resumeApplyInternal(tabId, viewParam, deadlineParam, startedAtParam);
  } finally {
    resumingTabs.delete(tabId);
  }
}

async function resumeApplyInternal(
  tabId: number,
  viewParam?: SavedView,
  deadlineParam?: number,
  startedAtParam?: number
): Promise<ResumeApplyResult> {
  let view = viewParam;
  let deadline = deadlineParam;
  let startedAt = startedAtParam;
  let viewId = viewParam?.id;
  let totalAttempted = 0;

  const persist = async (result: ViewApplyResult): Promise<void> => {
    if (viewId && deadline) {
      await settleBeforeDeadline(
        setLastApplyResult({ tabId, viewId, result, completedAt: Date.now() }),
        deadline
      );
    }
  };

  try {
    if (!view || !deadline) {
      const lookupDeadline = Date.now() + APPLY_TIMEOUT_MS;
      const op = await beforeDeadline(getActiveOperation(tabId), lookupDeadline);
      if (!op) {
        return {
          status: 'Could not apply',
          restoredCount: 0,
          totalAttempted: 0,
          skippedCount: 0,
          failedCount: 0,
          message: 'No active operation.',
          outcomes: [],
        };
      }
      startedAt = op.startedAt;
      viewId = op.viewId;
      totalAttempted = op.totalAttempted ?? 0;
      deadline = deadline || op.deadline || (op.startedAt + APPLY_TIMEOUT_MS);
      if (Date.now() >= deadline) {
        const result = failedResumeResultForTotal(op.totalAttempted ?? 0, 'Operation timed out.');
        await persist(result);
        return result;
      }
      if (!view) {
        const allViews = await beforeDeadline(listViews(), deadline);
        view = allViews.find((v) => v.id === op.viewId);
      }
    }

    if (!view) {
      const result = failedResumeResultForTotal(totalAttempted, 'View not found.');
      await persist(result);
      return result;
    }

    totalAttempted = view.controls.length + Object.keys(view.queryParams).length;

    // Verify deadline has not elapsed
    if (Date.now() >= deadline) {
      const result = failedResumeResult(view, 'Operation timed out.');
      await persist(result);
      return result;
    }

    // Verify current page identity before restoration
    const tab = await beforeDeadline(chrome.tabs.get(tabId), deadline).catch(() => null);
    if (!tab || !tab.url) {
      const result = failedResumeResult(view, 'Active tab not accessible.');
      await persist(result);
      return result;
    }

    const currentUrl = new URL(tab.url);
    if (
      currentUrl.origin !== view.origin ||
      normalizePathname(currentUrl.pathname) !== normalizePathname(view.pathname)
    ) {
      const result = failedResumeResult(
        view,
        `Incompatible page: view belongs to ${view.origin}${view.pathname}`
      );
      await persist(result);
      return result;
    }

    if (deadline - Date.now() <= 0) {
      const result = failedResumeResult(view, 'Operation timed out.');
      await persist(result);
      return result;
    }

    let restoreReport: RestoreReport = { outcomes: [] };
    if (view.controls.length > 0) {
      await beforeDeadline(ensurePageAgent(tabId), deadline);
      const timeoutMs = Math.min(5000, Math.max(1, deadline - Date.now()));
      const res = await beforeDeadline(sendPageCommand<RestoreResponse>(tabId, {
        type: 'RESTORE',
        controls: view.controls,
        timeoutMs,
        deadlineAt: deadline,
      }), deadline);
      if (res?.data) {
        restoreReport = res.data;
      }
    }

    // Controls can change the URL, so only the URL observed after restoration is final.
    const finalTab = await beforeDeadline(chrome.tabs.get(tabId), deadline).catch(() => null);
    let aggregated: ViewApplyResult;
    if (!finalTab?.url) {
      aggregated = failedResumeResult(view, 'Active tab not accessible after restoration.');
    } else {
      const finalUrl = new URL(finalTab.url);
      aggregated =
        finalUrl.origin === view.origin &&
        normalizePathname(finalUrl.pathname) === normalizePathname(view.pathname)
          ? aggregateApplyResult(view, restoreReport, verifyQueryParams(finalUrl, view.queryParams))
          : failedResumeResult(view, 'Page changed while applying this view.');
    }
    const fullResult: ResumeApplyResult = {
      ...aggregated,
      outcomes: restoreReport.outcomes,
    };

    await persist(aggregated);
    trackApplyCompletion(aggregated);

    return fullResult;
  } catch (err) {
    if (err instanceof ApplyDeadlineExceeded) {
      const timeoutResult = view
        ? failedResumeResult(view, 'Operation timed out.')
        : failedResumeResultForTotal(totalAttempted, 'Operation timed out.');
      await persist(timeoutResult);
      return timeoutResult;
    }
    if (view) {
      const failureResult = failedResumeResult(
        view,
        err instanceof Error ? err.message : 'Apply failed'
      );
      await persist(failureResult);
    } else if (viewId) {
      await persist(failedResumeResultForTotal(totalAttempted, err instanceof Error ? err.message : 'Apply failed'));
    }
    throw err;
  } finally {
    // Unconditional cleanup of session operation
    if (startedAt !== undefined) {
      await settleBeforeDeadline(clearOperation(tabId, startedAt), deadline ?? Date.now());
    }
  }
}


export async function requestApply(
  tabId: number,
  view: SavedView
): Promise<ViewApplyResult> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw new Error('Apply service is unavailable.');
  }
  const response = await chrome.runtime.sendMessage({ type: 'START_APPLY', tabId, view });
  if (response?.status === 'ok' && response.data) return response.data;
  throw new Error(response?.error || 'Apply service is unavailable.');
}
