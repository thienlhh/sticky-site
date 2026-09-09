import { describe, it, expect, beforeEach } from 'vitest';
import { fingerprintControl } from './fingerprint';

describe('matching/fingerprint', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('generates a full fingerprint for an input element', () => {
    document.body.innerHTML = `
      <form id="search-form">
        <label for="q-input">Search Query</label>
        <input
          id="q-input"
          name="q"
          type="search"
          data-testid="search-box"
          value="shoes"
        />
      </form>
    `;

    const input = document.getElementById('q-input')!;
    const fp = fingerprintControl(input, 'Search Query');

    expect(fp.kind).toBe('text');
    expect(fp.tag).toBe('input');
    expect(fp.type).toBe('search');
    expect(fp.label).toBe('Search Query');
    expect(fp.name).toBe('q');
    expect(fp.id).toBe('q-input');
    expect(fp.semanticAttribute).toBe('search-box');
    expect(fp.region).toBe('search-form');
    expect(fp.ordinal).toBe(0);
  });

  it('generates fingerprint with options for a select element', () => {
    document.body.innerHTML = `
      <label for="sort">Sort</label>
      <select id="sort">
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    `;

    const select = document.getElementById('sort')!;
    const fp = fingerprintControl(select, 'Sort');

    expect(fp.kind).toBe('select-one');
    expect(fp.tag).toBe('select');
    expect(fp.options).toEqual(['asc', 'desc']);
  });

  it('scopes native radio options to the matched form and root', () => {
    document.body.innerHTML = `
      <form><input id="shipping-ground" type="radio" name="mode" value="ground" /><input type="radio" name="mode" value="air" /></form>
      <form><input type="radio" name="mode" value="monthly" /><input type="radio" name="mode" value="yearly" /></form>
    `;

    const input = document.getElementById('shipping-ground')!;

    expect(fingerprintControl(input, 'Shipping').options).toEqual(['ground', 'air']);
  });
});
