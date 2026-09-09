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
  options?: { timeoutMs?: number }
): Promise<RestoreReport> {
  const candidateQuery =
    'input, select, textarea, [role="switch"], [role="checkbox"], [role="radio"]';

  const outcomesMap = new Map<string, SettingOutcome>();

  const reverifyAll = () => {
    const rawCandidates = Array.from(doc.querySelectorAll<HTMLElement>(candidateQuery));
    const candidates = rawCandidates.filter((el) => isControlEligible(el));

    for (const control of controls) {
      const currentOutcome = outcomesMap.get(control.id);
      if (currentOutcome === 'restored') {
        const matched = matchControl(control.fingerprint, candidates);
        if (!matched || !isControlEligible(matched.element) || !verifyControlValue(matched.element, control)) {
          // Setting was disturbed, reset, or rejected by framework/subsequent control
          outcomesMap.set(control.id, 'failed');
        }
      }
    }
  };

  const attemptRestoration = (remaining: CapturedSetting[]): CapturedSetting[] => {
    const rawCandidates = Array.from(doc.querySelectorAll<HTMLElement>(candidateQuery));
    const candidates = rawCandidates.filter((el) => isControlEligible(el));
    const stillUnresolved: CapturedSetting[] = [];

    for (const control of remaining) {
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

  // If all restored or no observer available or timeout is 0, return immediately after reverification
  const timeoutMs = options?.timeoutMs ?? 0;

  if (
    unresolved.length === 0 ||
    timeoutMs <= 0 ||
    typeof MutationObserver === 'undefined' ||
    !doc.body
  ) {
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

    observer = new MutationObserver(() => {
      unresolved = attemptRestoration(unresolved);
      if (unresolved.length === 0) {
        done();
      }
    });

    try {
      observer.observe(doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    } catch {
      done();
      return;
    }

    timer = setTimeout(done, timeoutMs);
  });
}
