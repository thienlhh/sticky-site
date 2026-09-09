import { describe, it, expect, beforeEach, vi } from 'vitest';
import { restoreControls } from './restore';
import type { CapturedSetting } from '@/domain/view';

describe('restoration/restore', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="test-form">
        <label for="q">Keyword</label>
        <input id="q" name="keyword" type="text" value="old text" />

        <label for="num">Quantity</label>
        <input id="num" name="qty" type="number" value="1" />

        <label for="in-stock">In Stock</label>
        <input id="in-stock" name="in_stock" type="checkbox" />

        <label for="sort">Sort Order</label>
        <select id="sort" name="sort">
          <option value="relevance">Relevance</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>

        <label for="tags">Tags</label>
        <select id="tags" name="tags" multiple>
          <option value="sale">Sale</option>
          <option value="featured">Featured</option>
          <option value="new">New</option>
        </select>

        <fieldset>
          <legend>Shipping</legend>
          <label><input type="radio" name="delivery" value="standard" checked /> Standard</label>
          <label><input type="radio" name="delivery" value="express" /> Express</label>
        </fieldset>

        <button type="submit" id="submit-btn">Submit Order</button>
        <button type="button" id="delete-btn">Delete Account</button>
        <a href="/checkout" id="checkout-link">Go to Checkout</a>
      </form>
    `;
  });

  const sampleControls: CapturedSetting[] = [
    {
      id: 'c1',
      label: 'Keyword',
      value: 'leather jacket',
      fingerprint: {
        kind: 'text',
        tag: 'input',
        type: 'text',
        label: 'Keyword',
        name: 'keyword',
        id: 'q',
        ordinal: 0,
      },
    },
    {
      id: 'c2',
      label: 'Quantity',
      value: '5',
      fingerprint: {
        kind: 'number',
        tag: 'input',
        type: 'number',
        label: 'Quantity',
        name: 'qty',
        id: 'num',
        ordinal: 0,
      },
    },
    {
      id: 'c3',
      label: 'In Stock',
      value: true,
      fingerprint: {
        kind: 'checkbox',
        tag: 'input',
        type: 'checkbox',
        label: 'In Stock',
        name: 'in_stock',
        id: 'in-stock',
        ordinal: 0,
      },
    },
    {
      id: 'c4',
      label: 'Sort Order',
      value: 'price_asc',
      fingerprint: {
        kind: 'select-one',
        tag: 'select',
        label: 'Sort Order',
        name: 'sort',
        id: 'sort',
        options: ['relevance', 'price_asc', 'price_desc'],
        ordinal: 0,
      },
    },
    {
      id: 'c5',
      label: 'Tags',
      value: ['sale', 'new'],
      fingerprint: {
        kind: 'select-multiple',
        tag: 'select',
        label: 'Tags',
        name: 'tags',
        id: 'tags',
        options: ['sale', 'featured', 'new'],
        ordinal: 0,
      },
    },
    {
      id: 'c6',
      label: 'Shipping',
      value: 'express',
      fingerprint: {
        kind: 'radio',
        tag: 'input',
        type: 'radio',
        label: 'Shipping',
        name: 'delivery',
        options: ['standard', 'express'],
        ordinal: 0,
      },
    },
  ];

  it('restores values, dispatches input/change events, and verifies final values', async () => {
    const inputEvents: string[] = [];
    const changeEvents: string[] = [];

    document.getElementById('q')?.addEventListener('input', () => inputEvents.push('q:input'));
    document.getElementById('q')?.addEventListener('change', () => changeEvents.push('q:change'));
    document.getElementById('in-stock')?.addEventListener('change', () => changeEvents.push('in-stock:change'));

    const report = await restoreControls(document, sampleControls);

    expect(report.outcomes).toHaveLength(6);
    expect(report.outcomes.every((o) => o.outcome === 'restored')).toBe(true);

    // Verify observable DOM values
    expect((document.getElementById('q') as HTMLInputElement).value).toBe('leather jacket');
    expect((document.getElementById('num') as HTMLInputElement).value).toBe('5');
    expect((document.getElementById('in-stock') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('sort') as HTMLSelectElement).value).toBe('price_asc');

    const selectedTags = Array.from(
      (document.getElementById('tags') as HTMLSelectElement).selectedOptions
    ).map((o) => o.value);
    expect(selectedTags).toEqual(['sale', 'new']);

    const expressRadio = document.querySelector(
      'input[type="radio"][value="express"]'
    ) as HTMLInputElement;
    expect(expressRadio.checked).toBe(true);

    // Verify events fired
    expect(inputEvents).toContain('q:input');
    expect(changeEvents).toContain('q:change');
    expect(changeEvents).toContain('in-stock:change');
  });

  it('skips controls that cannot be confidently matched', async () => {
    const unmatchedControl: CapturedSetting = {
      id: 'unmatched-1',
      label: 'Completely Missing Control',
      value: 'xyz',
      fingerprint: {
        kind: 'text',
        tag: 'input',
        label: 'Completely Missing Control',
        name: 'missing_name',
        id: 'missing_id',
        ordinal: 99,
      },
    };

    const report = await restoreControls(document, [unmatchedControl]);
    expect(report.outcomes).toHaveLength(1);
    expect(report.outcomes[0].outcome).toBe('skipped');
  });

  it('never submits forms or clicks general buttons/links (safety invariants)', async () => {
    let formSubmitCount = 0;
    let dangerButtonClickCount = 0;
    let dangerLinkClickCount = 0;

    const form = document.getElementById('test-form')!;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      formSubmitCount++;
    });

    document.getElementById('delete-btn')?.addEventListener('click', () => {
      dangerButtonClickCount++;
    });

    document.getElementById('checkout-link')?.addEventListener('click', () => {
      dangerLinkClickCount++;
    });

    await restoreControls(document, sampleControls);

    expect(formSubmitCount).toBe(0);
    expect(dangerButtonClickCount).toBe(0);
    expect(dangerLinkClickCount).toBe(0);
  });

  it('achieves >= 95% reliability on valid fixture controls', async () => {
    const report = await restoreControls(document, sampleControls);
    const restoredCount = report.outcomes.filter((o) => o.outcome === 'restored').length;
    const reliability = restoredCount / sampleControls.length;

    expect(reliability).toBeGreaterThanOrEqual(0.95);
  });

  it('retries unresolved controls via MutationObserver when elements appear dynamically', async () => {
    const delayedControl: CapturedSetting = {
      id: 'delayed-1',
      label: 'Delayed Input',
      value: 'async-value',
      fingerprint: {
        kind: 'text',
        tag: 'input',
        type: 'text',
        label: 'Delayed Input',
        name: 'delayed_field',
        id: 'delayed-field',
        ordinal: 0,
      },
    };

    // Insert input into DOM after 30ms
    setTimeout(() => {
      const input = document.createElement('input');
      input.id = 'delayed-field';
      input.name = 'delayed_field';
      input.placeholder = 'Delayed Input';
      document.body.appendChild(input);
    }, 30);

    const report = await restoreControls(document, [delayedControl], { timeoutMs: 500 });
    expect(report.outcomes[0].outcome).toBe('restored');
    expect((document.getElementById('delayed-field') as HTMLInputElement).value).toBe('async-value');
  });

  it('safely skips controls changed to password, disabled, hidden, or prohibited types', async () => {
    // Modify existing input #q to type="password"
    const qInput = document.getElementById('q') as HTMLInputElement;
    qInput.type = 'password';

    // Modify #num to disabled
    const numInput = document.getElementById('num') as HTMLInputElement;
    numInput.disabled = true;

    // Modify #in-stock to hidden
    const stockInput = document.getElementById('in-stock') as HTMLInputElement;
    stockInput.hidden = true;

    const report = await restoreControls(document, sampleControls.slice(0, 3));
    expect(report.outcomes).toHaveLength(3);
    expect(report.outcomes[0].outcome).toBe('skipped');
    expect(report.outcomes[1].outcome).toBe('skipped');
    expect(report.outcomes[2].outcome).toBe('skipped');

    // Values remain untouched
    expect(qInput.value).toBe('old text');
    expect(numInput.value).toBe('1');
    expect(stockInput.checked).toBe(false);
  });
});
