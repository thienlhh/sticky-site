import type { CapturedSetting, SavedView } from '@/domain/view';
import { normalizePathname } from '@/domain/view';
import { replaceEligibleQuery, verifyQueryParams, type QueryVerificationResult } from '@/domain/url';
import { listViews } from '@/storage/views';
import { ensurePageAgent, sendPageCommand } from '@/platform/page-agent';
import type { RestoreResponse } from '@/shared/page-messages';
import type { RestoreReport, RestoreOutcome } from '@/restoration/restore';
import {
  setOperation,
  clearOperation,
  getActiveOperation,
  getAnyActiveOperation,
  setLastApplyResult,
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

export async function startApply(
  tabId: number,
  view: SavedView
): Promise<ViewApplyResult> {
  const queryEntryCount = Object.keys(view.queryParams).length;
  const totalAttempted = view.controls.length + queryEntryCount;

  // Reject overlapping requests to prevent overwriting state
  const existingOp = await getAnyActiveOperation();
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

  const tab = await chrome.tabs.get(tabId).catch(() => null);
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

  const startedAt = Date.now();
  const deadline = startedAt + APPLY_TIMEOUT_MS;

  // Calculate target URL with eligible query parameters
  const targetUrl = replaceEligibleQuery(tabUrl, view.queryParams, new URL(view.origin + view.pathname));
  const queryDiffers = targetUrl.search !== tabUrl.search;

  if (queryDiffers) {
    // Record session operation before navigation (allowing at most one navigation)
    await setOperation({
      tabId,
      viewId: view.id,
      startedAt,
      deadline,
      expectedUrl: targetUrl.toString(),
      navigated: true,
      status: 'navigating',
    });

    // Schedule automatic cleanup at deadline if no completion event occurs
    setTimeout(async () => {
      try {
        const op = await getActiveOperation(tabId);
        if (op && Date.now() >= (op.deadline || 0)) {
          await clearOperation(tabId);
        }
      } catch {
        // Ignore timer cleanup failure
      }
    }, APPLY_TIMEOUT_MS);

    try {
      // Navigate tab once
      await chrome.tabs.update(tabId, { url: targetUrl.toString() });

      return {
        status: 'Applying view',
        restoredCount: 0,
        totalAttempted,
        skippedCount: 0,
        failedCount: 0,
        message: 'Navigating to view URL...',
      };
    } catch (err) {
      await clearOperation(tabId);
      return {
        status: 'Could not apply',
        restoredCount: 0,
        totalAttempted,
        skippedCount: totalAttempted,
        failedCount: 0,
        message: err instanceof Error ? err.message : 'Navigation failed',
      };
    }
  }

  // Direct Apply (no query navigation needed)
  await setOperation({
    tabId,
    viewId: view.id,
    startedAt,
    deadline,
    expectedUrl: tabUrl.toString(),
    navigated: false,
    status: 'restoring',
  });

  try {
    const result = await resumeApply(tabId, view, deadline);
    return result;
  } catch (err) {
    await clearOperation(tabId);
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

export async function resumeApply(
  tabId: number,
  viewParam?: SavedView,
  deadlineParam?: number
): Promise<ResumeApplyResult> {
  let view = viewParam;
  let deadline = deadlineParam;

  try {
    if (!view || !deadline) {
      const op = await getActiveOperation(tabId);
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
      deadline = deadline || op.deadline || (op.startedAt + APPLY_TIMEOUT_MS);
      if (Date.now() > deadline) {
        return {
          status: 'Could not apply',
          restoredCount: 0,
          totalAttempted: 0,
          skippedCount: 0,
          failedCount: 0,
          message: 'Operation expired.',
          outcomes: [],
        };
      }
      if (!view) {
        const allViews = await listViews();
        view = allViews.find((v) => v.id === op.viewId);
      }
    }

    if (!view) {
      return {
        status: 'Could not apply',
        restoredCount: 0,
        totalAttempted: 0,
        skippedCount: 0,
        failedCount: 0,
        message: 'View not found.',
        outcomes: [],
      };
    }

    const totalAttempted = view.controls.length + Object.keys(view.queryParams).length;

    // Verify deadline has not elapsed
    if (Date.now() > deadline) {
      return {
        status: 'Could not apply',
        restoredCount: 0,
        totalAttempted,
        skippedCount: 0,
        failedCount: totalAttempted,
        message: 'Operation expired.',
        outcomes: [],
      };
    }

    // Verify current page identity before restoration
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !tab.url) {
      return {
        status: 'Could not apply',
        restoredCount: 0,
        totalAttempted,
        skippedCount: totalAttempted,
        failedCount: 0,
        message: 'Active tab not accessible.',
        outcomes: [],
      };
    }

    const currentUrl = new URL(tab.url);
    if (
      currentUrl.origin !== view.origin ||
      normalizePathname(currentUrl.pathname) !== normalizePathname(view.pathname)
    ) {
      return {
        status: 'Could not apply',
        restoredCount: 0,
        totalAttempted,
        skippedCount: totalAttempted,
        failedCount: 0,
        message: `Incompatible page: view belongs to ${view.origin}${view.pathname}`,
        outcomes: [],
      };
    }

    // Verify query parameters on current URL
    const queryReport = verifyQueryParams(currentUrl, view.queryParams);

    const now = Date.now();
    const remainingMs = deadline - now;
    if (remainingMs <= 0) {
      return {
        status: 'Could not apply',
        restoredCount: queryReport.restoredCount,
        totalAttempted,
        skippedCount: 0,
        failedCount: view.controls.length + queryReport.failedCount,
        message: 'Operation timed out.',
        outcomes: [],
      };
    }
    const timeoutMs = Math.max(100, Math.min(5000, remainingMs));

    let restoreReport: RestoreReport = { outcomes: [] };
    if (view.controls.length > 0) {
      await ensurePageAgent(tabId);
      const res = await sendPageCommand<RestoreResponse>(tabId, {
        type: 'RESTORE',
        controls: view.controls,
        timeoutMs,
      });
      if (res?.data) {
        restoreReport = res.data;
      }
    }

    const aggregated = aggregateApplyResult(view, restoreReport, queryReport);
    const fullResult: ResumeApplyResult = {
      ...aggregated,
      outcomes: restoreReport.outcomes,
    };

    // Store in transient result storage for popup recovery after reopen
    await setLastApplyResult({
      tabId,
      viewId: view.id,
      result: aggregated,
      completedAt: Date.now(),
    });

    return fullResult;
  } finally {
    // Unconditional cleanup of session operation
    await clearOperation(tabId);
  }
}


export async function requestApply(
  tabId: number,
  view: SavedView
): Promise<ViewApplyResult> {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'START_APPLY',
        tabId,
        view,
      });
      if (response?.status === 'ok' && response.data) {
        return response.data;
      }
      if (response?.status === 'error') {
        throw new Error(response.error);
      }
    } catch {
      // Fall back to direct execution if background handler unavailable
      return startApply(tabId, view);
    }
  }
  return startApply(tabId, view);
}

