import { describe, it, expect, beforeEach } from 'vitest';
import { capturePage } from './controls';
import { resolveLabel } from './labels';

describe('capture/controls', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('label precedence', () => {
    it('prefers associated label over aria-labelledby, aria-label, and placeholder', () => {
      document.body.innerHTML = `
        <div id="lbl-aria">Aria By Label</div>
        <label for="test-input">Associated Label</label>
        <input
          id="test-input"
          type="text"
          aria-labelledby="lbl-aria"
          aria-label="Aria Label"
          placeholder="Placeholder Text"
        />
      `;
      const input = document.getElementById('test-input')!;
      expect(resolveLabel(input)).toBe('Associated Label');
    });

    it('prefers aria-labelledby over aria-label and placeholder', () => {
      document.body.innerHTML = `
        <span id="label-part1">Part 1</span>
        <span id="label-part2">Part 2</span>
        <input
          id="test-input"
          type="text"
          aria-labelledby="label-part1 label-part2"
          aria-label="Aria Label"
          placeholder="Placeholder Text"
        />
      `;
      const input = document.getElementById('test-input')!;
      expect(resolveLabel(input)).toBe('Part 1 Part 2');
    });

    it('prefers aria-label over placeholder and name', () => {
      document.body.innerHTML = `
        <input
          id="test-input"
          name="input_name"
          type="text"
          aria-label="Aria Label"
          placeholder="Placeholder Text"
        />
      `;
      const input = document.getElementById('test-input')!;
      expect(resolveLabel(input)).toBe('Aria Label');
    });

    it('falls back to placeholder or name when no ARIA or label', () => {
      document.body.innerHTML = `
        <input id="test-input" type="text" placeholder="Search products..." />
      `;
      const input = document.getElementById('test-input')!;
      expect(resolveLabel(input)).toBe('Search products...');
    });
  });

  describe('supported controls capture', () => {
    it('captures text, number, range, date, and textarea inputs', () => {
      document.body.innerHTML = `
        <form id="filter-form">
          <label for="search">Keyword</label>
          <input id="search" type="search" value="leather shoes" />

          <label for="price">Max Price</label>
          <input id="price" type="number" value="150" />

          <label for="rating">Min Rating</label>
          <input id="rating" type="range" value="4" />

          <label for="date">Delivery Date</label>
          <input id="date" type="date" value="2026-10-15" />

          <label for="notes">Special Instructions</label>
          <textarea id="notes">Leave at door</textarea>
        </form>
      `;

      const result = capturePage(document, new URL('https://example.com/shop'));
      expect(result.controls).toHaveLength(5);
      expect(result.controls[0].value).toBe('leather shoes');
      expect(result.controls[1].value).toBe('150');
      expect(result.controls[2].value).toBe('4');
      expect(result.controls[3].value).toBe('2026-10-15');
      expect(result.controls[4].value).toBe('Leave at door');
      expect(result.unsupportedCount).toBe(0);
    });

    it('captures checkbox and switch states as booleans', () => {
      document.body.innerHTML = `
        <label><input id="c1" type="checkbox" checked /> In Stock</label>
        <label><input id="c2" type="checkbox" /> Free Shipping</label>
        <button id="sw1" role="switch" aria-checked="true" aria-label="Dark Mode">Toggle</button>
      `;

      const result = capturePage(document, new URL('https://example.com/settings'));
      expect(result.controls).toHaveLength(3);
      expect(result.controls[0].value).toBe(true);
      expect(result.controls[1].value).toBe(false);
      expect(result.controls[2].value).toBe(true);
    });

    it('captures single select and multi-select options properly', () => {
      document.body.innerHTML = `
        <label for="sort-select">Sort By</label>
        <select id="sort-select">
          <option value="pop">Popularity</option>
          <option value="price_asc" selected>Price Low-High</option>
          <option value="new">Newest</option>
        </select>

        <label for="colors-select">Colors</label>
        <select id="colors-select" multiple>
          <option value="red" selected>Red</option>
          <option value="green">Green</option>
          <option value="blue" selected>Blue</option>
        </select>
      `;

      const result = capturePage(document, new URL('https://example.com/items'));
      expect(result.controls).toHaveLength(2);
      expect(result.controls[0].kind).toBe('select-one');
      expect(result.controls[0].value).toBe('price_asc');

      expect(result.controls[1].kind).toBe('select-multiple');
      expect(result.controls[1].value).toEqual(['red', 'blue']);
    });

    it('groups radio buttons with same name into a single setting', () => {
      document.body.innerHTML = `
        <fieldset>
          <legend>Shipping Speed</legend>
          <label><input type="radio" name="shipping" value="standard" /> Standard</label>
          <label><input type="radio" name="shipping" value="express" checked /> Express</label>
          <label><input type="radio" name="shipping" value="overnight" /> Overnight</label>
        </fieldset>
      `;

      const result = capturePage(document, new URL('https://example.com/checkout'));
      expect(result.controls).toHaveLength(1);
      expect(result.controls[0].kind).toBe('radio');
      expect(result.controls[0].value).toBe('express');
      expect(result.controls[0].fingerprint.options).toEqual(['standard', 'express', 'overnight']);
    });
  });

  describe('exclusions and security checks', () => {
    it('excludes password, email, tel, file, hidden, button inputs and updates unsupportedCount', () => {
      document.body.innerHTML = `
        <label for="pwd">Password</label>
        <input id="pwd" type="password" value="secret123" />

        <label for="email">Email</label>
        <input id="email" type="email" value="user@example.com" />

        <label for="phone">Phone</label>
        <input id="phone" type="tel" value="555-1234" />

        <label for="file">Avatar</label>
        <input id="file" type="file" />

        <input type="hidden" name="csrf" value="token123" />
        <button type="submit">Submit Form</button>
      `;

      const result = capturePage(document, new URL('https://example.com/login'));
      expect(result.controls).toHaveLength(0);
      expect(result.unsupportedCount).toBeGreaterThanOrEqual(4);
    });

    it('excludes sensitive autocomplete fields (passwords, one-time-codes, credit cards)', () => {
      document.body.innerHTML = `
        <label for="otp">Enter OTP</label>
        <input id="otp" type="text" autocomplete="one-time-code" value="123456" />

        <label for="cc">Card Number</label>
        <input id="cc" type="text" autocomplete="cc-number" value="4111222233334444" />

        <label for="card-cvc">CVC</label>
        <input id="card-cvc" type="text" autocomplete="cc-csc" value="123" />
      `;

      const result = capturePage(document, new URL('https://example.com/pay'));
      expect(result.controls).toHaveLength(0);
      expect(result.unsupportedCount).toBe(3);
    });

    it('excludes disabled controls and unlabeled controls', () => {
      document.body.innerHTML = `
        <label for="dis">Disabled</label>
        <input id="dis" type="text" disabled value="disabled val" />

        <!-- completely unlabeled input -->
        <input type="text" value="unlabeled val" />
      `;

      const result = capturePage(document, new URL('https://example.com/test'));
      expect(result.controls).toHaveLength(0);
      expect(result.unsupportedCount).toBe(2);
    });

    it('excludes non-rendered and hidden controls', () => {
      document.body.innerHTML = `
        <label for="hid">Hidden Input</label>
        <input id="hid" type="text" hidden value="secret" />

        <div style="display: none">
          <label for="none">Display None Input</label>
          <input id="none" type="text" value="hidden" />
        </div>

        <label for="aria-hid">Aria Hidden</label>
        <input id="aria-hid" type="text" aria-hidden="true" value="invisible" />
      `;

      const result = capturePage(document, new URL('https://example.com/hidden'));
      expect(result.controls).toHaveLength(0);
      expect(result.unsupportedCount).toBe(3);
    });
  });
});
