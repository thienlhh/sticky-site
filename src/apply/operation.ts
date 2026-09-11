import type { ViewApplyResult } from './coordinator';

export type ApplyOperationStatus =
  | 'navigating'
  | 'restoring'
  | 'completed'
  | 'failed';

export interface ApplyOperation {
  tabId: number;
  viewId: string;
  startedAt: number;
  deadline: number;
  expectedUrl: string;
  navigated?: boolean;
  status?: ApplyOperationStatus;
  result?: ViewApplyResult;
  error?: string;
  totalAttempted?: number;
}

export const SESSION_APPLY_KEY = 'stickysite_apply_op';
export const SESSION_LAST_RESULT_KEY = 'stickysite_last_apply_result';
export const APPLY_TIMEOUT_MS = 10000;

export function getTabOperationKey(tabId: number): string {
  return `${SESSION_APPLY_KEY}_${tabId}`;
}

export function getTabResultKey(tabId: number): string {
  return `${SESSION_LAST_RESULT_KEY}_${tabId}`;
}

export async function getActiveOperation(tabId: number): Promise<ApplyOperation | null> {
  try {
    const tabKey = getTabOperationKey(tabId);
    const tabResult = await chrome.storage.session.get(tabKey);
    let op = tabResult[tabKey] as ApplyOperation | undefined;

    if (!op) {
      const legacyResult = await chrome.storage.session.get(SESSION_APPLY_KEY);
      const legacyOp = legacyResult[SESSION_APPLY_KEY] as ApplyOperation | undefined;
      if (legacyOp && legacyOp.tabId === tabId) {
        op = legacyOp;
      }
    }

    if (op && op.tabId === tabId) {
      const deadline = op.deadline || (op.startedAt + APPLY_TIMEOUT_MS);
      if (Date.now() >= deadline) {
        await setLastApplyResult({
          tabId: op.tabId,
          viewId: op.viewId,
          result: timeoutResult(op),
          completedAt: Date.now(),
        });
        await clearOperation(tabId, op.startedAt);
        return null;
      }
      return op;
    }
  } catch {
    // Session storage may be unavailable in some contexts
  }
  return null;
}

export async function getAnyActiveOperation(): Promise<ApplyOperation | null> {
  try {
    const all = await chrome.storage.session.get();
    for (const [key, value] of Object.entries(all)) {
      if (key === SESSION_APPLY_KEY || key.startsWith(`${SESSION_APPLY_KEY}_`)) {
        const op = value as ApplyOperation | undefined;
        if (op && typeof op === 'object' && 'tabId' in op && 'startedAt' in op) {
          const deadline = op.deadline || (op.startedAt + APPLY_TIMEOUT_MS);
          if (Date.now() >= deadline) {
            await setLastApplyResult({
              tabId: op.tabId,
              viewId: op.viewId,
              result: timeoutResult(op),
              completedAt: Date.now(),
            });
            await clearOperation(op.tabId, op.startedAt);
          } else {
            return op;
          }
        }
      }
    }
  } catch {
    // Session storage may be unavailable in some contexts
  }
  return null;
}

function timeoutResult(op: ApplyOperation): ViewApplyResult {
  const totalAttempted = op.totalAttempted ?? 0;
  return {
    status: 'Could not apply',
    restoredCount: 0,
    totalAttempted,
    skippedCount: 0,
    failedCount: totalAttempted,
    message: 'Operation timed out.',
  };
}

export async function failOperation(tabId: number, message: string, startedAt?: number): Promise<void> {
  try {
    const op = await getActiveOperation(tabId);
    if (!op || op.tabId !== tabId || (startedAt !== undefined && op.startedAt !== startedAt)) return;
    await setLastApplyResult({
      tabId,
      viewId: op.viewId,
      result: { ...timeoutResult(op), message },
      completedAt: Date.now(),
    });
    await clearOperation(tabId, op.startedAt);
  } catch {
    // Ignore result-storage failures during cleanup.
  }
}

export async function setOperation(op: ApplyOperation): Promise<void> {
  const tabKey = getTabOperationKey(op.tabId);
  await chrome.storage.session.set({
    [tabKey]: op,
    [SESSION_APPLY_KEY]: op,
  });
}

export async function clearOperation(tabId?: number, startedAt?: number): Promise<void> {
  try {
    if (tabId !== undefined) {
      const tabKey = getTabOperationKey(tabId);
      const tabData = await chrome.storage.session.get(tabKey);
      const tabOp = tabData[tabKey] as ApplyOperation | undefined;

      const legacyData = await chrome.storage.session.get(SESSION_APPLY_KEY);
      const legacyOp = legacyData[SESSION_APPLY_KEY] as ApplyOperation | undefined;

      if (!tabOp && !legacyOp) return;

      const matchesStarted = (op?: ApplyOperation) =>
        startedAt === undefined || op?.startedAt === startedAt;

      if (tabOp && matchesStarted(tabOp)) {
        await chrome.storage.session.remove(tabKey);
      }
      if (legacyOp && legacyOp.tabId === tabId && matchesStarted(legacyOp)) {
        await chrome.storage.session.remove(SESSION_APPLY_KEY);
      }
      return;
    }

    // Clear all operations
    const all = await chrome.storage.session.get();
    const toRemove: string[] = [];
    for (const key of Object.keys(all)) {
      if (key === SESSION_APPLY_KEY || key.startsWith(`${SESSION_APPLY_KEY}_`)) {
        toRemove.push(key);
      }
    }
    if (toRemove.length > 0) {
      for (const k of toRemove) {
        await chrome.storage.session.remove(k);
      }
    }
  } catch {
    // Ignore cleanup error
  }
}

export const RESULT_TTL_MS = 60000;

export interface LastApplyResultRecord {
  tabId: number;
  viewId: string;
  result: ViewApplyResult;
  completedAt: number;
}

export async function setLastApplyResult(record: LastApplyResultRecord): Promise<void> {
  try {
    const tabKey = getTabResultKey(record.tabId);
    await chrome.storage.session.set({
      [tabKey]: record,
      [SESSION_LAST_RESULT_KEY]: record,
    });
  } catch {}
}

export async function getLastApplyResult(tabId: number, clear = true): Promise<ViewApplyResult | null> {
  try {
    const tabKey = getTabResultKey(tabId);
    const tabData = await chrome.storage.session.get(tabKey);
    let record = tabData[tabKey] as LastApplyResultRecord | undefined;

    if (!record) {
      const legacyData = await chrome.storage.session.get(SESSION_LAST_RESULT_KEY);
      const legacyRecord = legacyData[SESSION_LAST_RESULT_KEY] as LastApplyResultRecord | undefined;
      if (legacyRecord && legacyRecord.tabId === tabId) {
        record = legacyRecord;
      }
    }

    if (record && record.tabId === tabId) {
      if (Date.now() - record.completedAt > RESULT_TTL_MS) {
        await chrome.storage.session.remove(tabKey);
        await chrome.storage.session.remove(SESSION_LAST_RESULT_KEY);
        return null;
      }
      if (clear) {
        await chrome.storage.session.remove(tabKey);
        await chrome.storage.session.remove(SESSION_LAST_RESULT_KEY);
      }
      return record.result;
    }
  } catch {}
  return null;
}
