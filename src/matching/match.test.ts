import { describe, it, expect, beforeEach } from 'vitest';
import { scoreCandidate, matchControl } from './match';
import type { Fingerprint } from '@/domain/view';

describe('matching/match', () => {
  const baseSaved: Fingerprint = {
    kind: 'text',
    tag: 'input',
    type: 'search',
    label: 'Search Query',
    name: 'q',
    id: 'search-box',
    semanticAttribute: 'test-search',
    region: 'header-form',
    ordinal: 0,
  };

  describe('scoreCandidate', () => {
    it('awards 100 points for an exact matching fingerprint', () => {
      const candidate = { ...baseSaved };
      expect(scoreCandidate(baseSaved, candidate)).toBe(100);
    });

    it('returns 0 for incompatible control family', () => {
      const candidate: Fingerprint = {
        ...baseSaved,
        kind: 'checkbox',
        tag: 'input',
        type: 'checkbox',
      };
      expect(scoreCandidate(baseSaved, candidate)).toBe(0);
    });

    it('awards 35 points for matching accessible label', () => {
      const candidate: Fingerprint = {
        kind: 'text',
        tag: 'input',
        type: 'search',
        label: 'Search Query', // 35
        ordinal: 99,
      };
      // 35 (label) + 20 (kind text/input/search) = 55
      expect(scoreCandidate(baseSaved, candidate)).toBe(55);
    });

    it('tolerates changed ID and classes while maintaining high score', () => {
      const candidate: Fingerprint = {
        ...baseSaved,
        id: 'new-generated-id-1234', // -15 points for changed id
        semanticAttribute: undefined,
      };
      // 100 - 15 = 85
      expect(scoreCandidate(baseSaved, candidate)).toBe(85);
    });
  });

  describe('matchControl', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('matches candidate when score >= 70 and lead >= 10', () => {
      document.body.innerHTML = `
        <input id="search-box" name="q" type="search" placeholder="Search Query" />
        <input id="other-input" name="other" type="text" placeholder="Other" />
      `;

      const candidates = Array.from(document.querySelectorAll('input'));
      const match = matchControl(baseSaved, candidates);

      expect(match).not.toBeNull();
      expect(match?.element.id).toBe('search-box');
      expect(match?.score).toBeGreaterThanOrEqual(70);
    });

    it('returns null when best candidate score is below 70', () => {
      document.body.innerHTML = `
        <input id="unrelated" name="unrelated" type="text" placeholder="Something else" />
      `;

      const candidates = Array.from(document.querySelectorAll('input'));
      const match = matchControl(baseSaved, candidates);
      expect(match).toBeNull();
    });

    it('returns null when candidates are ambiguous (lead < 10 points)', () => {
      // Two inputs with very similar signals (e.g. duplicate labels)
      document.body.innerHTML = `
        <input id="box-1" name="q" type="search" placeholder="Search Query" />
        <input id="box-2" name="q" type="search" placeholder="Search Query" />
      `;

      const candidates = Array.from(document.querySelectorAll('input'));
      const match = matchControl(baseSaved, candidates);

      // Both score almost identical points; lead < 10 points -> skip/reject
      expect(match).toBeNull();
    });
  });
});
