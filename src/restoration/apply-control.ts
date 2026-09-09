import type { CapturedSetting } from '@/domain/view';

function dispatchEvents(element: Element): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
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
        input.checked = targetBoolean;
        dispatchEvents(input);
        if (input.checked !== targetBoolean) {
          input.click();
        }
      }
      return input.checked === targetBoolean;
    } else {
      // ARIA switch / checkbox
      const current = element.getAttribute('aria-checked') === 'true';
      if (current !== targetBoolean) {
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        element.setAttribute('aria-checked', String(targetBoolean));
      }
      return (element.getAttribute('aria-checked') === 'true') === targetBoolean;
    }
  }

  // 2. Radio group
  if (kind === 'radio') {
    const targetValue = String(setting.value);
    const doc = element.ownerDocument;
    const name = (element as HTMLInputElement).name;

    if (!doc || !name) {
      if ((element as HTMLInputElement).value === targetValue) {
        (element as HTMLInputElement).checked = true;
        dispatchEvents(element);
        return (element as HTMLInputElement).checked;
      }
      return false;
    }

    try {
      const escapedName = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(name) : name;
      const radios = Array.from(
        doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${escapedName}"]`)
      );

      const targetRadio = radios.find((r) => r.value === targetValue);
      if (targetRadio) {
        if (!targetRadio.checked) {
          targetRadio.click();
          targetRadio.checked = true;
          dispatchEvents(targetRadio);
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
