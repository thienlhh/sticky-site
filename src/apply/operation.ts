export interface ApplyOperation {
  tabId: number;
  viewId: string;
  startedAt: number;
  expectedUrl: string;
}

export const SESSION_APPLY_KEY = 'stickysite_apply_op';

export async function getActiveOperation(tabId: number): Promise<ApplyOperation | null> {
  try {
    const result = await chrome.storage.session.get(SESSION_APPLY_KEY);
    const op = result[SESSION_APPLY_KEY] as ApplyOperation | undefined;
    if (op && op.tabId === tabId) {
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

export async function clearOperation(tabId: number): Promise<void> {
  try {
    const current = await getActiveOperation(tabId);
    if (current) {
      await chrome.storage.session.remove(SESSION_APPLY_KEY);
    }
  } catch {
    // Ignore cleanup error
  }
}
