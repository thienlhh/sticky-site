export const EXCLUDED_INPUT_TYPES = new Set<string>([
  'password',
  'email',
  'tel',
  'file',
  'hidden',
  'color',
  'button',
  'submit',
  'reset',
  'image',
]);

export const SENSITIVE_AUTOCOMPLETE_TOKENS = [
  'password',
  'current-password',
  'new-password',
  'one-time-code',
  'cc-number',
  'cc-exp',
  'cc-csc',
  'cc-type',
  'cc-name',
  'transaction-amount',
  'transaction-currency',
];

export function isSensitiveAutocomplete(el: Element): boolean {
  if (!el.hasAttribute('autocomplete')) return false;
  const ac = el.getAttribute('autocomplete')?.toLowerCase().trim();
  if (!ac) return false;
  return SENSITIVE_AUTOCOMPLETE_TOKENS.some((sens) => ac.includes(sens));
}

export function isDisabled(el: Element, hasDisabledFieldsets = true): boolean {
  if (el.hasAttribute('disabled')) return true;
  if (el.getAttribute('aria-disabled') === 'true') return true;
  if (!hasDisabledFieldsets) return false;
  return el.closest('fieldset[disabled]') !== null;
}

export function isRendered(el: Element, renderedCache?: WeakMap<Element, boolean>): boolean {
  if (renderedCache && renderedCache.has(el)) {
    return renderedCache.get(el)!;
  }
  if (el instanceof HTMLElement) {
    if (el.hidden) {
      renderedCache?.set(el, false);
      return false;
    }
    if (el.hasAttribute('style')) {
      const s = el.style;
      if (s.display === 'none' || s.visibility === 'hidden') {
        renderedCache?.set(el, false);
        return false;
      }
    }
  }
  if (el.getAttribute('aria-hidden') === 'true') {
    renderedCache?.set(el, false);
    return false;
  }

  let curr = el.parentElement;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (renderedCache && renderedCache.has(curr)) {
      const parentRendered = renderedCache.get(curr)!;
      if (!parentRendered) {
        renderedCache.set(el, false);
        return false;
      }
      break;
    }
    if (curr instanceof HTMLElement) {
      if (curr.hidden) {
        renderedCache?.set(curr, false);
        renderedCache?.set(el, false);
        return false;
      }
      if (curr.hasAttribute('style')) {
        const s = curr.style;
        if (s.display === 'none' || s.visibility === 'hidden') {
          renderedCache?.set(curr, false);
          renderedCache?.set(el, false);
          return false;
        }
      }
    }
    if (curr.getAttribute('aria-hidden') === 'true') {
      renderedCache?.set(curr, false);
      renderedCache?.set(el, false);
      return false;
    }
    curr = curr.parentElement;
  }
  renderedCache?.set(el, true);
  return true;
}

export function isControlEligible(
  el: Element,
  hasDisabledFieldsets = true,
  renderedCache?: WeakMap<Element, boolean>
): boolean {
  const tag = el.tagName.toLowerCase();
  const type = tag === 'input' ? (el as HTMLInputElement).type.toLowerCase() : '';

  if (EXCLUDED_INPUT_TYPES.has(type)) {
    return false;
  }

  if (isSensitiveAutocomplete(el)) {
    return false;
  }

  if (isDisabled(el, hasDisabledFieldsets)) {
    return false;
  }

  if (!isRendered(el)) {
    return false;
  }

  return true;
}
