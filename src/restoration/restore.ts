import type { CapturedSetting } from '@/domain/view';
import { matchControl } from '@/matching/match';
import { applyControlValue } from './apply-control';

export type SettingOutcome = 'restored' | 'skipped' | 'failed';

export interface RestoreReport {
  outcomes: Array<{ id: string; outcome: SettingOutcome }>;
}

export async function restoreControls(
  doc: Document,
  controls: CapturedSetting[]
): Promise<RestoreReport> {
  const candidateElements = Array.from(
    doc.querySelectorAll<HTMLElement>(
      'input, select, textarea, [role="switch"], [role="checkbox"], [role="radio"]'
    )
  );

  const outcomes: Array<{ id: string; outcome: SettingOutcome }> = [];

  for (const control of controls) {
    const matched = matchControl(control.fingerprint, candidateElements);

    if (!matched) {
      outcomes.push({ id: control.id, outcome: 'skipped' });
      continue;
    }

    try {
      const applied = applyControlValue(matched.element, control);
      outcomes.push({
        id: control.id,
        outcome: applied ? 'restored' : 'failed',
      });
    } catch {
      outcomes.push({ id: control.id, outcome: 'failed' });
    }
  }

  return { outcomes };
}
