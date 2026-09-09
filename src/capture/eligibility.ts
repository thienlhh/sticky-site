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

export function isRendered(el: Element): boolean {
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (el.closest('[hidden], [aria-hidden="true"]')) return false;

  if (el instanceof HTMLElement) {
    if (el.hidden) return false;
    if (el.style.display === 'none' || el.style.visibility === 'hidden') return false;
  }

  // Check inline styles or closest ancestor with display:none / visibility:hidden
  let curr: Element | null = el;
  while (curr && curr instanceof HTMLElement) {
    if (curr.hidden || curr.style.display === 'none' || curr.style.visibility === 'hidden') {
      return false;
    }
    curr = curr.parentElement;
  }

  return true;
}

export function isControlEligible(el: Element, hasDisabledFieldsets = true): boolean {
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
