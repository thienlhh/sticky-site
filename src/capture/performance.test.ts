import { describe, it, expect, beforeEach } from 'vitest';
import { capturePage } from './controls';

describe('capture performance', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('scans 200 controls in under 100ms meeting PRD section 8 target', () => {
    // Build 200 diverse supported controls
    const container = document.createElement('form');
    container.id = 'filter-form';

    for (let i = 0; i < 50; i++) {
      // 1. Text input with associated label
      const textWrap = document.createElement('div');
      const textLabel = document.createElement('label');
      textLabel.htmlFor = `text-${i}`;
      textLabel.textContent = `Text Input ${i}`;
      const textInput = document.createElement('input');
      textInput.id = `text-${i}`;
      textInput.name = `text_${i}`;
      textInput.type = 'text';
      textInput.value = `Sample query ${i}`;
      textWrap.appendChild(textLabel);
      textWrap.appendChild(textInput);
      container.appendChild(textWrap);

      // 2. Checkbox with aria-label
      const checkWrap = document.createElement('div');
      const checkInput = document.createElement('input');
      checkInput.id = `check-${i}`;
      checkInput.name = `check_${i}`;
      checkInput.type = 'checkbox';
      checkInput.setAttribute('aria-label', `Checkbox Option ${i}`);
      checkInput.checked = i % 2 === 0;
      checkWrap.appendChild(checkInput);
      container.appendChild(checkWrap);

      // 3. Select with options
      const selectWrap = document.createElement('div');
      const selectLabel = document.createElement('label');
      selectLabel.htmlFor = `select-${i}`;
      selectLabel.textContent = `Select Option ${i}`;
      const select = document.createElement('select');
      select.id = `select-${i}`;
      select.name = `select_${i}`;
      for (let o = 0; o < 4; o++) {
        const opt = document.createElement('option');
        opt.value = `val_${o}`;
        opt.textContent = `Option ${o}`;
        if (o === 1) opt.selected = true;
        select.appendChild(opt);
      }
      selectWrap.appendChild(selectLabel);
      selectWrap.appendChild(select);
      container.appendChild(selectWrap);

      // 4. Radio group
      const radioWrap = document.createElement('div');
      radioWrap.setAttribute('role', 'radiogroup');
      radioWrap.setAttribute('aria-label', `Radio Group ${i}`);
      const r1 = document.createElement('input');
      r1.type = 'radio';
      r1.name = `radio_grp_${i}`;
      r1.id = `radio_${i}_a`;
      r1.value = 'a';
      r1.setAttribute('aria-label', `Radio ${i} A`);
      const r2 = document.createElement('input');
      r2.type = 'radio';
      r2.name = `radio_grp_${i}`;
      r2.id = `radio_${i}_b`;
      r2.value = 'b';
      r2.checked = true;
      r2.setAttribute('aria-label', `Radio ${i} B`);
      radioWrap.appendChild(r1);
      radioWrap.appendChild(r2);
      container.appendChild(radioWrap);
    }

    document.body.appendChild(container);

    const testUrl = new URL('https://example.com/products?category=apparel');

    // Warm-up run to allow JIT compilation and caches to settle
    for (let w = 0; w < 3; w++) {
      capturePage(document, testUrl);
    }

    // Timed runs
    const iterations = 5;
    const times: number[] = [];

    for (let run = 0; run < iterations; run++) {
      const start = performance.now();
      const res = capturePage(document, testUrl);
      const elapsed = performance.now() - start;
      times.push(elapsed);
      expect(res.controls.length).toBeGreaterThanOrEqual(150);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    // Target from PRD Section 8: Typical scan under 100 ms on fixture with up to 200 controls
    expect(avgTime).toBeLessThan(100);
    expect(maxTime).toBeLessThan(150);
  });
});
