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
}

export const SESSION_APPLY_KEY = 'stickysite_apply_op';
export const APPLY_TIMEOUT_MS = 10000;

export async function getActiveOperation(tabId: number): Promise<ApplyOperation | null> {
  try {
    const result = await chrome.storage.session.get(SESSION_APPLY_KEY);
    const op = result[SESSION_APPLY_KEY] as ApplyOperation | undefined;
    if (op && op.tabId === tabId) {
      const deadline = op.deadline || (op.startedAt + APPLY_TIMEOUT_MS);
      if (Date.now() > deadline) {
        await clearOperation(tabId);
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
    const result = await chrome.storage.session.get(SESSION_APPLY_KEY);
    const op = result[SESSION_APPLY_KEY] as ApplyOperation | undefined;
    if (op) {
      const deadline = op.deadline || (op.startedAt + APPLY_TIMEOUT_MS);
      if (Date.now() > deadline) {
        await chrome.storage.session.remove(SESSION_APPLY_KEY);
        return null;
      }
      return op;
    }
  } catch {
    // Session storage may be unavailable in some contexts
  }
  return null;
}

export async function setOperation(op: ApplyOperation): Promise<void> {
  await chrome.storage.session.set({ [SESSION_APPLY_KEY]: op });
}

export async function clearOperation(tabId?: number): Promise<void> {
  try {
    if (tabId !== undefined) {
      const result = await chrome.storage.session.get(SESSION_APPLY_KEY);
      const op = result[SESSION_APPLY_KEY] as ApplyOperation | undefined;
      if (op && op.tabId !== tabId) {
        return;
      }
    }
    await chrome.storage.session.remove(SESSION_APPLY_KEY);
  } catch {
    // Ignore cleanup error
  }
}

export const SESSION_LAST_RESULT_KEY = 'stickysite_last_apply_result';
export const RESULT_TTL_MS = 60000;

export interface LastApplyResultRecord {
  tabId: number;
  viewId: string;
  result: ViewApplyResult;
  completedAt: number;
}

export async function setLastApplyResult(record: LastApplyResultRecord): Promise<void> {
  try {
    await chrome.storage.session.set({ [SESSION_LAST_RESULT_KEY]: record });
  } catch {}
}

export async function getLastApplyResult(tabId: number, clear = true): Promise<ViewApplyResult | null> {
  try {
    const data = await chrome.storage.session.get(SESSION_LAST_RESULT_KEY);
    const record = data[SESSION_LAST_RESULT_KEY] as LastApplyResultRecord | undefined;
    if (record && record.tabId === tabId) {
      if (Date.now() - record.completedAt > RESULT_TTL_MS) {
        await chrome.storage.session.remove(SESSION_LAST_RESULT_KEY);
        return null;
      }
      if (clear) {
        await chrome.storage.session.remove(SESSION_LAST_RESULT_KEY);
      }
      return record.result;
    }
  } catch {}
  return null;
}


