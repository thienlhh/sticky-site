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

