import { resolveLabel } from './labels';

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
  const view = el.ownerDocument?.defaultView;
  let curr: Element | null = el;
  while (curr) {
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
      const style = view?.getComputedStyle(curr);
      if (style && (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse')) {
        renderedCache?.set(curr, false);
        renderedCache?.set(el, false);
        return false;
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

  if (tag === 'input' && !['checkbox', 'radio'].includes(type)) {
    const signals = [el.id, el.getAttribute('name'), el.getAttribute('inputmode'), el.getAttribute('autocomplete'), resolveLabel(el)]
      .filter(Boolean).join(' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    // ponytail: explicit contact/credential signals only; extend for observed site markup, not inferred values.
    if (/(^|[^a-z])(e[\s_-]?mail|tel|phone|telephone|password|passcode|otp)([^a-z]|$)/i.test(signals)) return false;
  }

  if (isSensitiveAutocomplete(el)) {
    return false;
  }

  if (isDisabled(el, hasDisabledFieldsets)) {
    return false;
  }

  if (!isRendered(el, renderedCache)) {
    return false;
  }

  return true;
}
