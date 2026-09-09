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
  const tab = await chrome.tabs.get(tabId);
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

  // Calculate target URL with eligible query parameters
  const targetUrl = replaceEligibleQuery(tabUrl, view.queryParams, new URL(view.origin + view.pathname));
  const queryDiffers = targetUrl.search !== tabUrl.search;

  if (queryDiffers) {
    // Record session operation before navigation
    await setOperation({
      tabId,
      viewId: view.id,
      startedAt: Date.now(),
      expectedUrl: targetUrl.toString(),
    });

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
  }

  // If query did not change, apply controls directly
  const report = await resumeApply(tabId, view);
  return aggregateApplyResult(view.controls, report, false);
}

export async function resumeApply(
  tabId: number,
  viewParam?: SavedView
): Promise<RestoreReport> {
  try {
    let view = viewParam;

    if (!view) {
      const op = await getActiveOperation(tabId);
      if (op) {
        const allViews = await listViews();
        view = allViews.find((v) => v.id === op.viewId);
      }
    }

    if (!view) {
      return { outcomes: [] };
    }

    await ensurePageAgent(tabId);
    const res = await sendPageCommand<RestoreResponse>(tabId, {
      type: 'RESTORE',
      controls: view.controls,
    });

    return res?.data || { outcomes: [] };
  } finally {
    // Unconditional cleanup of session operation
    await clearOperation(tabId);
  }
}
