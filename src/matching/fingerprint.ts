import type { ControlKind, Fingerprint } from '@/domain/view';

function determineKind(tag: string, type: string, role: string | null): ControlKind {
  if (role === 'switch' || role === 'checkbox' || type === 'checkbox') return 'checkbox';
  if (role === 'radio' || type === 'radio') return 'radio';
  if (tag === 'select') return 'select-one';
  if (type === 'number') return 'number';
  if (type === 'range') return 'range';
  if (type === 'date' || type === 'datetime-local' || type === 'month' || type === 'week' || type === 'time') return 'date';
  return 'text';
}

function getRegion(el: Element): string | undefined {
  const fieldset = el.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend?.textContent?.trim()) {
      return legend.textContent.trim().slice(0, 60);
    }
  }

  const form = el.closest('form');
  if (form) {
    if (form.getAttribute('aria-label')) return form.getAttribute('aria-label')!;
    if (form.getAttribute('name')) return form.getAttribute('name')!;
    if (form.id) return form.id;
  }

  const section = el.closest('section[aria-label], nav[aria-label], aside[aria-label]');
  if (section) {
    return section.getAttribute('aria-label')!;
  }

  return undefined;
}

export function fingerprintControl(element: Element, label: string): Fingerprint {
  const tag = element.tagName.toLowerCase();
  const type = (element.getAttribute('type') || '').toLowerCase();
  const role = element.getAttribute('role')?.toLowerCase() || null;

  let kind = determineKind(tag, type, role);
  let options: string[] | undefined;

  if (tag === 'select') {
    const select = element as HTMLSelectElement;
    options = Array.from(select.options).map((o) => o.value);
    if (select.multiple) {
      kind = 'select-multiple';
    } else {
      kind = 'select-one';
    }
  } else if (kind === 'radio' && element.ownerDocument) {
    const name = element.getAttribute('name');
    if (name) {
      try {
        const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(name) : name;
        const radios = Array.from(
          element.ownerDocument.querySelectorAll<HTMLInputElement>(
            `input[type="radio"][name="${escaped}"]`
          )
        );
        options = radios.map((r) => r.value);
      } catch {
        // ignore selector errors
      }
    }
  }

  // Calculate ordinal among similar elements in doc
  let ordinal = 0;
  if (element.ownerDocument) {
    const selector = type ? `${tag}[type="${type}"]` : tag;
    try {
      const similars = Array.from(element.ownerDocument.querySelectorAll(selector));
      const idx = similars.indexOf(element);
      if (idx >= 0) ordinal = idx;
    } catch {
      ordinal = 0;
    }
  }

  const semanticAttribute =
    element.getAttribute('data-testid') ||
    element.getAttribute('data-test') ||
    element.getAttribute('data-qa') ||
    undefined;

  return {
    kind,
    tag,
    type: type || undefined,
    role: role || undefined,
    label: label.trim(),
    name: element.getAttribute('name') || undefined,
    id: element.id || undefined,
    semanticAttribute,
    options,
    region: getRegion(element),
    ordinal,
  };
}
