import type { CapturedSetting, SavedView } from '@/domain/view';
import { normalizePathname } from '@/domain/view';
import { replaceEligibleQuery } from '@/domain/url';
import { listViews } from '@/storage/views';
import { ensurePageAgent, sendPageCommand } from '@/platform/page-agent';
import type { RestoreResponse } from '@/shared/page-messages';
import type { RestoreReport } from '@/restoration/restore';
import {
  setOperation,
  clearOperation,
  getActiveOperation,
  getAnyActiveOperation,
  APPLY_TIMEOUT_MS,
} from './operation';

export type ViewApplyStatus =
  | 'Fully applied view'
  | 'Partially applied view'
  | 'Could not apply';

export interface ViewApplyResult {
  status: ViewApplyStatus;
  restoredCount: number;
  totalAttempted: number;
  skippedCount: number;
  failedCount: number;
  message: string;
}

export function aggregateApplyResult(
  controls: CapturedSetting[],
  report: RestoreReport,
  queryNavigated: boolean
): ViewApplyResult {
  const totalAttempted = controls.length;
  let restoredCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const outcome of report.outcomes) {
    if (outcome.outcome === 'restored') restoredCount++;
    else if (outcome.outcome === 'skipped') skippedCount++;
    else if (outcome.outcome === 'failed') failedCount++;
  }

  // If there are no form controls but query parameters were applied or navigated
  if (totalAttempted === 0) {
    return {
      status: 'Fully applied view',
      restoredCount: 0,
      totalAttempted: 0,
      skippedCount: 0,
      failedCount: 0,
      message: 'View query applied.',
    };
  }

  let status: ViewApplyStatus;
  let message: string;

  if (restoredCount === totalAttempted) {
    status = 'Fully applied view';
    message = `All ${totalAttempted} settings restored successfully.`;
  } else if (restoredCount > 0) {
    status = 'Partially applied view';
    message = `${restoredCount} of ${totalAttempted} settings restored (${skippedCount} skipped, ${failedCount} failed).`;
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
  // Reject overlapping requests to prevent overwriting state
  const existingOp = await getAnyActiveOperation();
  if (existingOp) {
    return {
      status: 'Could not apply',
      restoredCount: 0,
      totalAttempted: view.controls.length,
      skippedCount: view.controls.length,
      failedCount: 0,
      message: 'An operation is already in progress.',
    };
  }

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || !tab.url) {
    return {
      status: 'Could not apply',
      restoredCount: 0,
      totalAttempted: view.controls.length,
      skippedCount: view.controls.length,
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
      totalAttempted: view.controls.length,
      skippedCount: view.controls.length,
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
        status: 'Fully applied view',
        restoredCount: view.controls.length,
        totalAttempted: view.controls.length,
        skippedCount: 0,
        failedCount: 0,
        message: 'Navigating to view URL...',
      };
    } catch (err) {
      await clearOperation(tabId);
      return {
        status: 'Could not apply',
        restoredCount: 0,
        totalAttempted: view.controls.length,
        skippedCount: view.controls.length,
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
    const report = await resumeApply(tabId, view, deadline);
    return aggregateApplyResult(view.controls, report, false);
  } catch (err) {
    await clearOperation(tabId);
    return {
      status: 'Could not apply',
      restoredCount: 0,
      totalAttempted: view.controls.length,
      skippedCount: view.controls.length,
      failedCount: 0,
      message: err instanceof Error ? err.message : 'Apply failed',
    };
  }
}

export async function resumeApply(
  tabId: number,
  viewParam?: SavedView,
  deadlineParam?: number
): Promise<RestoreReport> {
  try {
    let view = viewParam;
    let deadline = deadlineParam;

    if (!view || !deadline) {
      const op = await getActiveOperation(tabId);
      if (!op) {
        return { outcomes: [] };
      }
      deadline = deadline || op.deadline || (op.startedAt + APPLY_TIMEOUT_MS);
      if (Date.now() > deadline) {
        return { outcomes: [] };
      }
      if (!view) {
        const allViews = await listViews();
        view = allViews.find((v) => v.id === op.viewId);
      }
    }

    if (!view) {
      return { outcomes: [] };
    }

    // Verify deadline has not elapsed
    if (Date.now() > deadline) {
      return { outcomes: [] };
    }

    // Verify current page identity before restoration
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !tab.url) {
      return { outcomes: [] };
    }

    const currentUrl = new URL(tab.url);
    if (
      currentUrl.origin !== view.origin ||
      normalizePathname(currentUrl.pathname) !== normalizePathname(view.pathname)
    ) {
      return { outcomes: [] };
    }

    const now = Date.now();
    const remainingMs = deadline - now;
    if (remainingMs <= 0) {
      return { outcomes: [] };
    }
    const timeoutMs = Math.max(100, Math.min(5000, remainingMs));

    await ensurePageAgent(tabId);
    const res = await sendPageCommand<RestoreResponse>(tabId, {
      type: 'RESTORE',
      controls: view.controls,
      timeoutMs,
    });

    return res?.data || { outcomes: [] };
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

