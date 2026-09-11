import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setOperation,
  getActiveOperation,
  getAnyActiveOperation,
  clearOperation,
  failOperation,
  setLastApplyResult,
  getLastApplyResult,
  getTabOperationKey,
  getTabResultKey,
  SESSION_APPLY_KEY,
  SESSION_LAST_RESULT_KEY,
  type ApplyOperation,
} from './operation';

describe('apply/operation multi-tab session management', () => {
  let sessionStore: Record<string, unknown> = {};

  beforeEach(() => {
    sessionStore = {};
    // @ts-ignore
    globalThis.chrome.storage.session = {
      get: vi.fn(async (k?: string) => (k ? { [k]: sessionStore[k] } : { ...sessionStore })),
      set: vi.fn(async (items) => Object.assign(sessionStore, items)),
      remove: vi.fn(async (k: string) => delete sessionStore[k]),
      clear: vi.fn(async () => { sessionStore = {}; }),
    };
  });

  it('isolates active operations between multiple tabs', async () => {
    const now = Date.now();
    const op1: ApplyOperation = {
      tabId: 101,
      viewId: 'v1',
      startedAt: now,
      deadline: now + 10000,
      expectedUrl: 'https://example.com/page1',
    };
    const op2: ApplyOperation = {
      tabId: 102,
      viewId: 'v2',
      startedAt: now,
      deadline: now + 12000,
      expectedUrl: 'https://example.com/page2',
    };

    await setOperation(op1);
    await setOperation(op2);

    expect(await getActiveOperation(101)).toEqual(op1);
    expect(await getActiveOperation(102)).toEqual(op2);
    expect(await getActiveOperation(999)).toBeNull();

    // Clearing tab 101 does not clear tab 102
    await clearOperation(101);
    expect(await getActiveOperation(101)).toBeNull();
    expect(await getActiveOperation(102)).toEqual(op2);
  });

  it('supports legacy single-key operations for backward compatibility', async () => {
    const legacyOp: ApplyOperation = {
      tabId: 201,
      viewId: 'v-legacy',
      startedAt: Date.now(),
      deadline: Date.now() + 5000,
      expectedUrl: 'https://example.com/legacy',
    };
    sessionStore[SESSION_APPLY_KEY] = legacyOp;

    const retrieved = await getActiveOperation(201);
    expect(retrieved).toEqual(legacyOp);
    expect(await getActiveOperation(999)).toBeNull();
  });

  it('isolates last apply results per tab and clears on consumption', async () => {
    const res1 = {
      status: 'Fully applied view' as const,
      restoredCount: 3,
      totalAttempted: 3,
      skippedCount: 0,
      failedCount: 0,
      message: 'Restored 3 settings.',
    };
    const res2 = {
      status: 'Partially applied view' as const,
      restoredCount: 2,
      totalAttempted: 3,
      skippedCount: 1,
      failedCount: 0,
      message: 'Restored 2 settings, 1 skipped.',
    };

    await setLastApplyResult({
      tabId: 301,
      viewId: 'v1',
      result: res1,
      completedAt: Date.now(),
    });

    await setLastApplyResult({
      tabId: 302,
      viewId: 'v2',
      result: res2,
      completedAt: Date.now(),
    });

    const retrieved1 = await getLastApplyResult(301, true);
    expect(retrieved1).toEqual(res1);

    // Tab 301 is cleared, tab 302 remains
    expect(await getLastApplyResult(301)).toBeNull();
    expect(await getLastApplyResult(302, false)).toEqual(res2);
  });

  it('clears all operations when clearOperation is called without tabId', async () => {
    const now = Date.now();
    await setOperation({
      tabId: 401,
      viewId: 'v1',
      startedAt: now,
      deadline: now + 10000,
      expectedUrl: 'https://example.com/1',
    });
    await setOperation({
      tabId: 402,
      viewId: 'v2',
      startedAt: now,
      deadline: now + 10000,
      expectedUrl: 'https://example.com/2',
    });

    await clearOperation();

    expect(await getActiveOperation(401)).toBeNull();
    expect(await getActiveOperation(402)).toBeNull();
  });
});
