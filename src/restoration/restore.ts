import type { CapturedSetting } from '@/domain/view';
import { matchControl } from '@/matching/match';
import { applyControlValue } from './apply-control';

export type SettingOutcome = 'restored' | 'skipped' | 'failed';

export interface RestoreReport {
  outcomes: Array<{ id: string; outcome: SettingOutcome }>;
}

export async function restoreControls(
  doc: Document,
  controls: CapturedSetting[],
  options?: { timeoutMs?: number }
): Promise<RestoreReport> {
  const candidateQuery =
    'input, select, textarea, [role="switch"], [role="checkbox"], [role="radio"]';

  const outcomesMap = new Map<string, SettingOutcome>();

  const attemptRestoration = (remaining: CapturedSetting[]): CapturedSetting[] => {
    const candidates = Array.from(doc.querySelectorAll<HTMLElement>(candidateQuery));
    const stillUnresolved: CapturedSetting[] = [];

    for (const control of remaining) {
      const matched = matchControl(control.fingerprint, candidates);
      if (!matched) {
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

  // If all restored or no observer available or timeout is 0, return immediately
  const timeoutMs = options?.timeoutMs ?? 0;

  if (
    unresolved.length === 0 ||
    timeoutMs <= 0 ||
    typeof MutationObserver === 'undefined' ||
    !doc.body
  ) {
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
