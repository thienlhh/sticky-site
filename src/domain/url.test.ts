import { describe, it, expect } from 'vitest';
import {
  captureQueryParams,
  replaceEligibleQuery,
  verifyQueryParams,
  isSensitiveQueryParam,
} from './url';

describe('domain/url', () => {
  describe('isSensitiveQueryParam', () => {
    it('identifies exact sensitive credential parameters case-insensitively', () => {
      expect(isSensitiveQueryParam('token')).toBe(true);
      expect(isSensitiveQueryParam('TOKEN')).toBe(true);
      expect(isSensitiveQueryParam('access_token')).toBe(true);
      expect(isSensitiveQueryParam('accessToken')).toBe(true);
      expect(isSensitiveQueryParam('refresh_token')).toBe(true);
      expect(isSensitiveQueryParam('refreshToken')).toBe(true);
      expect(isSensitiveQueryParam('auth')).toBe(true);
      expect(isSensitiveQueryParam('authorization')).toBe(true);
      expect(isSensitiveQueryParam('session')).toBe(true);
      expect(isSensitiveQueryParam('sessionId')).toBe(true);
      expect(isSensitiveQueryParam('sid')).toBe(true);
      expect(isSensitiveQueryParam('jwt')).toBe(true);
      expect(isSensitiveQueryParam('secret')).toBe(true);
      expect(isSensitiveQueryParam('signature')).toBe(true);
      expect(isSensitiveQueryParam('sig')).toBe(true);
      expect(isSensitiveQueryParam('password')).toBe(true);
      expect(isSensitiveQueryParam('passcode')).toBe(true);
      expect(isSensitiveQueryParam('otp')).toBe(true);
      expect(isSensitiveQueryParam('code')).toBe(true);
    });

    it('does NOT flag benign parameters like zipcode as sensitive', () => {
      expect(isSensitiveQueryParam('zipcode')).toBe(false);
      expect(isSensitiveQueryParam('postalCode')).toBe(false);
      expect(isSensitiveQueryParam('q')).toBe(false);
      expect(isSensitiveQueryParam('category')).toBe(false);
      expect(isSensitiveQueryParam('product_code')).toBe(false);
    });
  });

  describe('captureQueryParams', () => {
    it('captures eligible parameters preserving repeated values', () => {
      const url = new URL('https://example.com/search?category=shoes&category=boots&sort=asc');
      const params = captureQueryParams(url);
      expect(params).toEqual({
        category: ['shoes', 'boots'],
        sort: ['asc'],
      });
    });

    it('excludes sensitive credential parameters', () => {
      const url = new URL(
        'https://example.com/search?q=phone&token=abc123secret&sessionId=xyz&zipcode=94103'
      );
      const params = captureQueryParams(url);
      expect(params).toEqual({
        q: ['phone'],
        zipcode: ['94103'],
      });
      expect(params.token).toBeUndefined();
      expect(params.sessionId).toBeUndefined();
    });
  });

  describe('replaceEligibleQuery', () => {
    it('replaces current eligible query parameters while preserving current sensitive parameters and fragment', () => {
      const currentUrl = new URL(
        'https://example.com/search?q=old&category=shoes&token=secretToken#results-section'
      );
      const savedParams = {
        q: ['new_query'],
        color: ['blue', 'red'],
      };

      const result = replaceEligibleQuery(currentUrl, savedParams);

      expect(result.origin).toBe('https://example.com');
      expect(result.pathname).toBe('/search');
      expect(result.hash).toBe('#results-section');
      expect(result.searchParams.getAll('q')).toEqual(['new_query']);
      expect(result.searchParams.getAll('color')).toEqual(['blue', 'red']);
      expect(result.searchParams.get('category')).toBeNull();
      // Sensitive token on currentUrl must remain untouched
      expect(result.searchParams.get('token')).toBe('secretToken');
    });

    it('throws if attempting cross-origin replacement', () => {
      const currentUrl = new URL('https://example.com/search');
      expect(() =>
        replaceEligibleQuery(currentUrl, {}, new URL('https://other.com/search'))
      ).toThrow(/cross-origin/i);
    });
  });

  describe('verifyQueryParams', () => {
    it('verifies exact query parameters matching including repeated values and sensitive tokens', () => {
      const currentUrl = new URL(
        'https://example.com/search?category=shoes&category=boots&sort=asc&token=secret'
      );
      const saved = {
        category: ['shoes', 'boots'],
        sort: ['asc'],
      };

      const result = verifyQueryParams(currentUrl, saved);
      expect(result.totalAttempted).toBe(2);
      expect(result.restoredCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('reports failure when an eligible parameter value is different or missing', () => {
      const currentUrl = new URL('https://example.com/search?category=shoes');
      const saved = {
        category: ['shoes'],
        sort: ['asc'],
      };

      const result = verifyQueryParams(currentUrl, saved);
      expect(result.totalAttempted).toBe(2);
      expect(result.restoredCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });

    it('reports failure when extra non-sensitive parameters were not removed', () => {
      const currentUrl = new URL('https://example.com/search?sort=asc&extra_filter=unwanted');
      const saved = {
        sort: ['asc'],
      };

      const result = verifyQueryParams(currentUrl, saved);
      expect(result.failedCount).toBeGreaterThan(0);
    });
  });
});

