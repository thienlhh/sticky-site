import type { Fingerprint } from '@/domain/view';
import { resolveLabel } from '@/capture/labels';
import { fingerprintControl } from './fingerprint';

export const SCORE_THRESHOLD = 70;
export const LEAD_THRESHOLD = 10;

function normalizeLabel(str: string): string {
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isSameControlFamily(saved: Fingerprint, candidate: Fingerprint): boolean {
  if (saved.kind === candidate.kind) return true;

  const textFamily = new Set(['text', 'number', 'range', 'date']);
  if (textFamily.has(saved.kind) && textFamily.has(candidate.kind)) {
    return true;
  }

  return false;
}

export function scoreCandidate(saved: Fingerprint, candidate: Fingerprint): number {
  if (!isSameControlFamily(saved, candidate)) {
    return 0;
  }

  let score = 0;

  // 1. Accessible label (up to 35)
  const normSavedLabel = normalizeLabel(saved.label);
  const normCandLabel = normalizeLabel(candidate.label);

  if (normSavedLabel && normCandLabel && normSavedLabel === normCandLabel) {
    score += 35;
  } else if (
    normSavedLabel &&
    normCandLabel &&
    (normSavedLabel.includes(normCandLabel) || normCandLabel.includes(normSavedLabel))
  ) {
    score += 20;
  }

  // 2. Kind, type, and role (up to 20)
  if (saved.tag === candidate.tag) {
    score += 12;
  }
  if (saved.kind === candidate.kind) {
    score += 4;
  }
  if (saved.type === candidate.type) {
    score += 2;
  }
  if (saved.role === candidate.role) {
    score += 2;
  }

  // 3. Name (up to 15)
  if (saved.name && candidate.name && saved.name === candidate.name) {
    score += 15;
  } else if (!saved.name && !candidate.name) {
    score += 8;
  }

  // 4. ID or stable semantic attribute (up to 15)
  if (
    saved.semanticAttribute &&
    candidate.semanticAttribute &&
    saved.semanticAttribute === candidate.semanticAttribute
  ) {
    score += 15;
  } else if (saved.id && candidate.id && saved.id === candidate.id) {
    score += 15;
  } else if (!saved.id && !candidate.id && !saved.semanticAttribute && !candidate.semanticAttribute) {
    score += 5;
  }

  // 5. Parent region or option set (up to 10)
  if (saved.options && candidate.options) {
    const savedSet = new Set(saved.options);
    const candSet = new Set(candidate.options);
    if (saved.options.length === candidate.options.length && saved.options.every((o) => candSet.has(o))) {
      score += 10;
    } else {
      let matches = 0;
      for (const o of candidate.options) {
        if (savedSet.has(o)) matches++;
      }
      if (matches > 0) {
        score += Math.round((matches / Math.max(saved.options.length, 1)) * 8);
      }
    }
  } else if (saved.region && candidate.region && saved.region === candidate.region) {
    score += 10;
  } else if (!saved.region && !candidate.region && !saved.options && !candidate.options) {
    score += 5;
  }

  // 6. Ordinal (up to 5)
  if (saved.ordinal === candidate.ordinal) {
    score += 5;
  } else if (Math.abs(saved.ordinal - candidate.ordinal) === 1) {
    score += 2;
  }

  return Math.min(score, 100);
}

export function matchControl(
  saved: Fingerprint,
  candidates: Element[]
): { element: Element; score: number } | null {
  const scored = candidates
    .map((element) => {
      const label = resolveLabel(element) || '';
      const candidateFp = fingerprintControl(element, label);
      const score = scoreCandidate(saved, candidateFp);
      return { element, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return null;
  }

  const best = scored[0];

  // Must score at least SCORE_THRESHOLD (70)
  if (best.score < SCORE_THRESHOLD) {
    return null;
  }

  // Must lead next candidate by at least LEAD_THRESHOLD (10)
  if (scored.length > 1) {
    const second = scored[1];
    if (best.score - second.score < LEAD_THRESHOLD) {
      return null; // Ambiguous match rejected
    }
  }

  return best;
}
