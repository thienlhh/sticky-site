import type { CapturedSetting } from '@/domain/view';
import { matchControl } from '@/matching/match';
import { applyControlValue, verifyControlValue } from './apply-control';

import { isControlEligible } from '@/capture/eligibility';

export type SettingOutcome = 'restored' | 'skipped' | 'failed';

export interface RestoreOutcome {
  id: string;
  outcome: SettingOutcome;
}

export interface RestoreReport {
  outcomes: RestoreOutcome[];
}

export async function restoreControls(
  doc: Document,
  controls: CapturedSetting[],
  options?: { timeoutMs?: number; deadlineAt?: number }
): Promise<RestoreReport> {
  const candidateQuery =
    'input, select, textarea, [role="switch"], [role="checkbox"], [role="radio"]';

  const outcomesMap = new Map<string, SettingOutcome>();
  const timeoutMs = Math.min(Math.max(options?.timeoutMs ?? 0, 0), 5000);
  const startedAt = Date.now();
  const suppliedDeadline = options?.deadlineAt;
  const operationDeadlineAt =
    typeof suppliedDeadline === 'number' && Number.isFinite(suppliedDeadline)
      ? Math.min(suppliedDeadline, startedAt + 5000)
      : startedAt + 5000;
  const retryDeadlineAt = timeoutMs > 0
    ? Math.min(operationDeadlineAt, startedAt + timeoutMs)
    : operationDeadlineAt;
  const expired = (deadlineAt: number) => Date.now() >= deadlineAt;

  const reverifyAll = () => {
    const rawCandidates = Array.from(doc.querySelectorAll<HTMLElement>(candidateQuery));
    const candidates = rawCandidates.filter((el) => isControlEligible(el));

    for (const control of controls) {
      const currentOutcome = outcomesMap.get(control.id);
      const matched = matchControl(control.fingerprint, candidates);
      if (matched && isControlEligible(matched.element) && verifyControlValue(matched.element, control)) {
        outcomesMap.set(control.id, 'restored');
      } else if (currentOutcome === 'restored') {
        // Setting was disturbed, reset, or rejected by framework/subsequent control.
        outcomesMap.set(control.id, 'failed');
      }
    }
  };

  const attemptRestoration = (
    remaining: CapturedSetting[],
    deadlineAt = operationDeadlineAt
  ): CapturedSetting[] => {
    const rawCandidates = Array.from(doc.querySelectorAll<HTMLElement>(candidateQuery));
    const candidates = rawCandidates.filter((el) => isControlEligible(el));
    const stillUnresolved: CapturedSetting[] = [];

    for (let index = 0; index < remaining.length; index++) {
      if (expired(deadlineAt)) return remaining.slice(index);

      const control = remaining[index];
      const matched = matchControl(control.fingerprint, candidates);
      if (!matched) {
        outcomesMap.set(control.id, 'skipped');
        stillUnresolved.push(control);
        continue;
      }

      // Recheck eligibility immediately before mutation
      if (!isControlEligible(matched.element)) {
        outcomesMap.set(control.id, 'skipped');
        stillUnresolved.push(control);
        continue;
      }

      try {
        const applied = applyControlValue(matched.element, control);
        if (applied) {
          outcomesMap.set(control.id, 'restored');
        } else {
          outcomesMap.set(control.id, 'failed');
          stillUnresolved.push(control);
        }
      } catch {
        outcomesMap.set(control.id, 'failed');
        stillUnresolved.push(control);
      }
    }

    return stillUnresolved;
  };

  // Initial pass
  let unresolved = attemptRestoration(controls);
  const settleMs = (deadlineAt: number) => Math.min(100, Math.max(0, deadlineAt - Date.now()));
  const settleDeadlineAt = timeoutMs > 0 ? retryDeadlineAt : operationDeadlineAt;

  if (
    unresolved.length === 0 ||
    timeoutMs <= 0 ||
    typeof MutationObserver === 'undefined' ||
    !doc.body ||
    expired(operationDeadlineAt)
  ) {
    if (!expired(operationDeadlineAt)) {
      await new Promise<void>((resolve) => setTimeout(resolve, settleMs(settleDeadlineAt)));
    }
    reverifyAll();
    return {
      outcomes: controls.map((c) => ({
        id: c.id,
        outcome: outcomesMap.get(c.id) || 'skipped',
      })),
    };
  }

  // Bounded retry window with MutationObserver
  return new Promise<RestoreReport>((resolve) => {
    let timer: any = null;
    let settleTimer: any = null;
    let retryTimer: any = null;
    let observer: MutationObserver | null = null;

    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const done = () => {
      cleanup();
      reverifyAll();
      resolve({
        outcomes: controls.map((c) => ({
          id: c.id,
          outcome: outcomesMap.get(c.id) || 'skipped',
        })),
      });
    };

    const settle = () => {
      if (!settleTimer) {
        settleTimer = setTimeout(done, settleMs(retryDeadlineAt));
      }
    };

    const observe = () => {
      observer?.observe(doc.body!, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-checked', 'aria-disabled', 'class', 'disabled', 'hidden', 'style'],
      });
    };

    const retry = () => {
      retryTimer = null;
      if (expired(retryDeadlineAt)) {
        done();
        return;
      }

      // Ignore mutations caused by our own dispatched control events.
      observer?.disconnect();
      unresolved = attemptRestoration(unresolved, retryDeadlineAt);
      if (expired(retryDeadlineAt)) {
        done();
      } else if (unresolved.length === 0) {
        settle();
      } else {
        observe();
      }
    };

    observer = new MutationObserver(() => {
      if (unresolved.length === 0 || retryTimer || expired(retryDeadlineAt)) return;
      retryTimer = setTimeout(retry, 0);
    });

    try {
      observe();
    } catch {
      done();
      return;
    }

    timer = setTimeout(done, Math.max(0, retryDeadlineAt - Date.now()));
  });
}
