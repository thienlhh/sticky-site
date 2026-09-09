import type { CapturedSetting } from '@/domain/view';
import { isControlEligible } from '@/capture/eligibility';

function dispatchEvents(element: Element): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function nativeRadioGroup(element: HTMLInputElement): HTMLInputElement[] {
  const doc = element.ownerDocument;
  if (!doc || !element.name) return [element];

  const root = element.getRootNode();
  return Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter(
    (radio) =>
      radio.name === element.name &&
      radio.form === element.form &&
      radio.getRootNode() === root
  );
}

export function applyControlValue(element: Element, setting: CapturedSetting): boolean {
  const tag = element.tagName.toLowerCase();
  const kind = setting.fingerprint.kind;

  // 1. Checkbox / switch
  if (kind === 'checkbox') {
    const targetBoolean = Boolean(setting.value);
    if (tag === 'input') {
      const input = element as HTMLInputElement;
      if (input.checked !== targetBoolean) {
        // Native click is required for framework checkbox change handlers.
        input.click();
      }
      return input.checked === targetBoolean;
    } else {
      // ARIA switch / checkbox
      const current = element.getAttribute('aria-checked') === 'true';
      if (current !== targetBoolean) {
        element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        dispatchEvents(element);
      }
      // Never force aria-checked; report actual observable state
      return (element.getAttribute('aria-checked') === 'true') === targetBoolean;
    }
  }

  // 2. Radio group (native or ARIA)
  if (kind === 'radio') {
    const targetValue = String(setting.value);
    const doc = element.ownerDocument;

    // ARIA radio group
    if (element.getAttribute('role')?.toLowerCase() === 'radio' || !tag.includes('input')) {
      const group = element.closest('[role="radiogroup"], fieldset') || element.parentElement;
      const radios = group
        ? Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'))
        : [element as HTMLElement];

      const targetRadio = radios.find((r) => {
        const val =
          r.getAttribute('data-value') ||
          r.getAttribute('value') ||
          r.getAttribute('aria-label') ||
          r.textContent?.trim() ||
          r.id;
        return val === targetValue;
      });

      if (targetRadio && isControlEligible(targetRadio)) {
        if (targetRadio.getAttribute('aria-checked') !== 'true') {
          targetRadio.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          dispatchEvents(targetRadio);
        }
        return targetRadio.getAttribute('aria-checked') === 'true';
      }

      if (!targetValue) return true;
      return false;
    }

    // Native radio input
    const input = element as HTMLInputElement;
    const name = input.name;
    if (!doc || !name) {
      if (input.value === targetValue && isControlEligible(input)) {
        if (!input.checked) {
          input.click();
        }
        return input.checked;
      }
      return false;
    }

    try {
      const radios = nativeRadioGroup(input);

      const targetRadio = radios.find((r) => r.value === targetValue);
      if (targetRadio && isControlEligible(targetRadio)) {
        if (!targetRadio.checked) {
          targetRadio.click();
        }
        return targetRadio.checked;
      }
      // If target was empty string (no radio selected)
      if (!targetValue) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  // 3. Select single
  if (kind === 'select-one' && tag === 'select') {
    const select = element as HTMLSelectElement;
    const targetValue = String(setting.value);

    // First match by option value
    let targetOption = Array.from(select.options).find((o) => o.value === targetValue);

    // Fallback: match by normalized option text
    if (!targetOption) {
      const normTarget = targetValue.trim().toLowerCase();
      targetOption = Array.from(select.options).find(
        (o) => o.text.trim().toLowerCase() === normTarget
      );
    }

    if (targetOption) {
      select.value = targetOption.value;
      dispatchEvents(select);
      return select.value === targetOption.value;
    }
    return false;
  }

  // 4. Select multiple
  if (kind === 'select-multiple' && tag === 'select') {
    const select = element as HTMLSelectElement;
    const targetValues = Array.isArray(setting.value)
      ? setting.value.map(String)
      : [String(setting.value)];
    const targetSet = new Set(targetValues);
    const targetLowerSet = new Set(targetValues.map((v) => v.trim().toLowerCase()));

    for (const option of Array.from(select.options)) {
      const match =
        targetSet.has(option.value) ||
        targetLowerSet.has(option.text.trim().toLowerCase());
      option.selected = match;
    }

    dispatchEvents(select);

    const observableSelected = Array.from(select.selectedOptions).map((o) => o.value);
    const matchesAll =
      targetValues.length === observableSelected.length &&
      targetValues.every((v) => observableSelected.includes(v));

    return matchesAll;
  }

  // 5. Text-like, numeric, range, date/time inputs and textarea
  const targetString = String(setting.value);
  const inputEl = element as HTMLInputElement | HTMLTextAreaElement;

  try {
    const prototype =
      tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (setter) {
      setter.call(inputEl, targetString);
    } else {
      inputEl.value = targetString;
    }

    dispatchEvents(inputEl);
    return inputEl.value === targetString;
  } catch {
    inputEl.value = targetString;
    dispatchEvents(inputEl);
    return inputEl.value === targetString;
  }
}

export function verifyControlValue(element: Element, setting: CapturedSetting): boolean {
  const tag = element.tagName.toLowerCase();
  const kind = setting.fingerprint.kind;

  if (kind === 'checkbox') {
    const targetBoolean = Boolean(setting.value);
    if (tag === 'input') {
      return (element as HTMLInputElement).checked === targetBoolean;
    }
    return (element.getAttribute('aria-checked') === 'true') === targetBoolean;
  }

  if (kind === 'radio') {
    const targetValue = String(setting.value);
    if (element.getAttribute('role')?.toLowerCase() === 'radio' || !tag.includes('input')) {
      const group = element.closest('[role="radiogroup"], fieldset') || element.parentElement;
      const radios = group
        ? Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'))
        : [element as HTMLElement];

      const checkedRadio = radios.find((r) => r.getAttribute('aria-checked') === 'true');
      const val = checkedRadio
        ? checkedRadio.getAttribute('data-value') ||
          checkedRadio.getAttribute('value') ||
          checkedRadio.getAttribute('aria-label') ||
          checkedRadio.textContent?.trim() ||
          checkedRadio.id ||
          ''
        : '';
      return val === targetValue;
    }

    const doc = element.ownerDocument;
    const input = element as HTMLInputElement;
    const name = input.name;
    if (!doc || !name) {
      return input.checked && input.value === targetValue;
    }

    try {
      const radios = nativeRadioGroup(input);
      const checked = radios.find((r) => r.checked);
      return checked ? checked.value === targetValue : !targetValue;
    } catch {
      return false;
    }
  }

  if (kind === 'select-one' && tag === 'select') {
    const select = element as HTMLSelectElement;
    const targetValue = String(setting.value);
    if (select.value === targetValue) return true;
    const normTarget = targetValue.trim().toLowerCase();
    const opt = select.selectedOptions[0];
    return opt ? opt.text.trim().toLowerCase() === normTarget : false;
  }

  if (kind === 'select-multiple' && tag === 'select') {
    const select = element as HTMLSelectElement;
    const targetValues = Array.isArray(setting.value)
      ? setting.value.map(String)
      : [String(setting.value)];
    const observableSelected = Array.from(select.selectedOptions).map((o) => o.value);
    return (
      targetValues.length === observableSelected.length &&
      targetValues.every((v) => observableSelected.includes(v))
    );
  }

  const targetString = String(setting.value);
  const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
  return inputEl.value === targetString;
}
