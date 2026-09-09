import { describe, it, expect } from 'vitest';
import {
  normalizePathname,
  parseSavedView,
  validateUniqueViewName,
  type SavedView,
} from './view';

describe('domain/view', () => {
  describe('normalizePathname', () => {
    it('normalizes empty and root pathnames to /', () => {
      expect(normalizePathname('')).toBe('/');
      expect(normalizePathname('/')).toBe('/');
    });

    it('strips trailing slashes from paths', () => {
      expect(normalizePathname('/products/')).toBe('/products');
      expect(normalizePathname('/products/shoes/')).toBe('/products/shoes');
    });

    it('preserves paths without trailing slashes', () => {
      expect(normalizePathname('/products')).toBe('/products');
      expect(normalizePathname('/products/shoes')).toBe('/products/shoes');
    });

    it('ensures leading slash', () => {
      expect(normalizePathname('search')).toBe('/search');
    });
  });

  describe('parseSavedView', () => {
    const validView: SavedView = {
      schemaVersion: 1,
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Default Filter',
      origin: 'https://example.com',
      pathname: '/search',
      queryParams: {
        category: ['shoes', 'boots'],
        sort: ['price_asc'],
      },
      controls: [
        {
          id: 'setting-1',
          label: 'In Stock Only',
          value: true,
          fingerprint: {
            kind: 'checkbox',
            tag: 'input',
            type: 'checkbox',
            label: 'In Stock Only',
            name: 'in_stock',
            id: 'in-stock-checkbox',
            ordinal: 0,
          },
        },
      ],
      createdAt: '2026-09-09T10:00:00.000Z',
      updatedAt: '2026-09-09T10:00:00.000Z',
    };

    it('accepts a valid SavedView and returns a normalized copy', () => {
      const parsed = parseSavedView(validView);
      expect(parsed).toEqual(validView);
    });

    it('preserves repeated query parameter values', () => {
      const parsed = parseSavedView(validView);
      expect(parsed.queryParams.category).toEqual(['shoes', 'boots']);
    });

    it('normalizes the pathname on valid view', () => {
      const viewWithTrailingSlash = { ...validView, pathname: '/search/' };
      const parsed = parseSavedView(viewWithTrailingSlash);
      expect(parsed.pathname).toBe('/search');
    });

    it('rejects unsupported or unknown schema version', () => {
      expect(() => parseSavedView({ ...validView, schemaVersion: 2 })).toThrow(/schema/i);
      expect(() => parseSavedView({ ...validView, schemaVersion: 0 })).toThrow(/schema/i);
    });

    it('rejects missing or empty required fields', () => {
      expect(() => parseSavedView(null)).toThrow();
      expect(() => parseSavedView({})).toThrow();
      expect(() => parseSavedView({ ...validView, id: '' })).toThrow(/id/i);
      expect(() => parseSavedView({ ...validView, name: '   ' })).toThrow(/name/i);
      expect(() => parseSavedView({ ...validView, origin: '' })).toThrow(/origin/i);
    });

    it('rejects invalid ISO timestamps', () => {
      expect(() => parseSavedView({ ...validView, createdAt: 'not-a-date' })).toThrow(/timestamp/i);
      expect(() => parseSavedView({ ...validView, updatedAt: '2026-02-31' })).toThrow(/timestamp/i);
    });

    it('rejects invalid control kinds or missing fingerprints', () => {
      const invalidControl = {
        ...validView,
        controls: [
          {
            id: 'c1',
            label: 'Test',
            value: 'val',
            fingerprint: { kind: 'unknown_kind', tag: 'div', label: 'Test', ordinal: 0 } as any,
          },
        ],
      };
      expect(() => parseSavedView(invalidControl)).toThrow(/kind/i);
    });
  });

  describe('validateUniqueViewName', () => {
    const existingViews: SavedView[] = [
      {
        schemaVersion: 1,
        id: 'id-1',
        name: 'My View',
        origin: 'https://example.com',
        pathname: '/search',
        queryParams: {},
        controls: [],
        createdAt: '2026-09-09T10:00:00.000Z',
        updatedAt: '2026-09-09T10:00:00.000Z',
      },
    ];

    it('allows a unique name on the same page', () => {
      expect(() =>
        validateUniqueViewName(existingViews, 'Other View', 'https://example.com', '/search')
      ).not.toThrow();
    });

    it('rejects a duplicate name case-insensitively on the same page', () => {
      expect(() =>
        validateUniqueViewName(existingViews, 'my view', 'https://example.com', '/search')
      ).toThrow(/already exists/i);
      expect(() =>
        validateUniqueViewName(existingViews, 'MY VIEW', 'https://example.com', '/search/')
      ).toThrow(/already exists/i);
    });

    it('allows the same name on a different page or origin', () => {
      expect(() =>
        validateUniqueViewName(existingViews, 'My View', 'https://other.com', '/search')
      ).not.toThrow();
      expect(() =>
        validateUniqueViewName(existingViews, 'My View', 'https://example.com', '/other')
      ).not.toThrow();
    });

    it('allows keeping current name when updating the same view ID', () => {
      expect(() =>
        validateUniqueViewName(existingViews, 'my view', 'https://example.com', '/search', 'id-1')
      ).not.toThrow();
    });
  });
});
