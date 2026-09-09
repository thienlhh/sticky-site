import type { CapturedSetting, ControlKind, Fingerprint } from '@/domain/view';
import { normalizePathname } from '@/domain/view';
import { captureQueryParams } from '@/domain/url';
import { resolveLabel } from './labels';

export interface CaptureResult {
  origin: string;
  pathname: string;
  queryParams: Record<string, string[]>;
  controls: (CapturedSetting & { kind: ControlKind })[];
  unsupportedCount: number;
}

import {
  isControlEligible,
  isDisabled,
  EXCLUDED_INPUT_TYPES,
  isSensitiveAutocomplete,
  isRendered,
} from './eligibility';

function getRegion(el: Element, hasLandmarks: boolean): string | undefined {
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

  if (hasLandmarks) {
    const section = el.closest('section[aria-label], nav[aria-label], aside[aria-label]');
    if (section) {
      return section.getAttribute('aria-label')!;
    }
  }

  return undefined;
}

function determineControlKind(tag: string, type: string, role: string | null): ControlKind {
  if (role === 'switch' || role === 'checkbox' || type === 'checkbox') return 'checkbox';
  if (role === 'radio' || type === 'radio') return 'radio';
  if (tag === 'select') return 'select-one';
  if (type === 'number') return 'number';
  if (type === 'range') return 'range';
  if (type === 'date' || type === 'datetime-local' || type === 'month' || type === 'week' || type === 'time') return 'date';
  return 'text';
}

export function capturePage(doc: Document, url: URL): CaptureResult {
  const controls: (CapturedSetting & { kind: ControlKind })[] = [];
  let unsupportedCount = 0;

  const hasDisabledFieldsets = doc.querySelector('fieldset[disabled]') !== null;
  const hasLandmarks = doc.querySelector('section[aria-label], nav[aria-label], aside[aria-label]') !== null;

  const labelsByFor = new Map<string, string>();
  for (const lbl of Array.from(doc.querySelectorAll('label[for]'))) {
    const htmlFor = lbl.getAttribute('for');
    if (htmlFor && !labelsByFor.has(htmlFor)) {
      const text = lbl.textContent?.replace(/\s+/g, ' ').trim();
      if (text) labelsByFor.set(htmlFor, text);
    }
  }

  const candidateElements = Array.from(
    doc.querySelectorAll<HTMLElement>(
      'input, select, textarea, [role="switch"], [role="checkbox"], [role="radio"]'
    )
  );

  const seenRadioGroups = new Set<HTMLInputElement[]>();
  const ordinalCounters: Record<string, number> = {};

  const radioGroupsByElement = new WeakMap<HTMLInputElement, HTMLInputElement[]>();
  const nativeRadioGroups: HTMLInputElement[][] = [];
  for (const el of candidateElements) {
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'radio') {
      const radio = el as HTMLInputElement;
      const name = radio.name;
      if (name) {
        let list = nativeRadioGroups.find(
          (group) =>
            group[0].name === name &&
            group[0].form === radio.form &&
            group[0].getRootNode() === radio.getRootNode()
        );
        if (!list) {
          list = [];
          nativeRadioGroups.push(list);
        }
        list.push(radio);
        radioGroupsByElement.set(radio, list);
      }
    }
  }

  // Collect ARIA radio groups only if role="radio" exists
  const hasAriaRadios = candidateElements.some((el) => el.getAttribute('role')?.toLowerCase() === 'radio');
  const ariaRadioGroups = new Map<Element, HTMLElement[]>();
  if (hasAriaRadios) {
    for (const el of candidateElements) {
      if (el.getAttribute('role')?.toLowerCase() === 'radio') {
        const group = el.closest('[role="radiogroup"], fieldset') || el.parentElement;
        if (group) {
          let list = ariaRadioGroups.get(group);
          if (!list) {
            list = [];
            ariaRadioGroups.set(group, list);
          }
          list.push(el);
        }
      }
    }
  }

  const seenAriaRadioGroups = new Set<Element>();
  const renderedCache = new WeakMap<Element, boolean>();
  let settingIndex = 0;

  for (const el of candidateElements) {
    const tag = el.tagName.toLowerCase();
    const type = tag === 'input' ? (el as HTMLInputElement).type.toLowerCase() : '';
    const role = el.getAttribute('role')?.toLowerCase() || null;

    // Check exclusions and eligibility
    if (!isControlEligible(el, hasDisabledFieldsets, renderedCache)) {
      unsupportedCount++;
      continue;
    }

    // Native radio group handling
    if (type === 'radio') {
      const name = el.getAttribute('name');
      if (name) {
        const groupRadios = radioGroupsByElement.get(el as HTMLInputElement) || [];
        if (seenRadioGroups.has(groupRadios)) {
          continue;
        }
        seenRadioGroups.add(groupRadios);

        // Check if all radios in group are disabled
        if (groupRadios.every((r) => isDisabled(r, hasDisabledFieldsets))) {
          unsupportedCount++;
          continue;
        }

        const label = resolveLabel(el, labelsByFor);
        if (!label) {
          unsupportedCount++;
          continue;
        }

        const checkedRadio = groupRadios.find((r) => r.checked);
        const selectedValue = checkedRadio ? checkedRadio.value : '';
        const options = groupRadios.map((r) => r.value);

        const counterKey = `radio_input`;
        const ordinal = ordinalCounters[counterKey] || 0;
        ordinalCounters[counterKey] = ordinal + 1;

        settingIndex++;
        const settingId = `setting-${settingIndex}`;

        const fingerprint: Fingerprint = {
          kind: 'radio',
          tag: 'input',
          type: 'radio',
          label,
          name,
          options,
          region: getRegion(el, hasLandmarks),
          ordinal,
        };

        controls.push({
          id: settingId,
          kind: 'radio',
          label,
          value: selectedValue,
          fingerprint,
        });
        continue;
      }
    }

    // ARIA radio group handling
    if (role === 'radio') {
      const group = el.closest('[role="radiogroup"], fieldset') || el.parentElement;
      if (group) {
        if (seenAriaRadioGroups.has(group)) {
          continue;
        }
        seenAriaRadioGroups.add(group);

        const groupRadios = ariaRadioGroups.get(group) || [];
        if (groupRadios.every((r) => isDisabled(r, hasDisabledFieldsets))) {
          unsupportedCount++;
          continue;
        }

        // Group label from radiogroup/fieldset or first radio
        const groupLabel = resolveLabel(group, labelsByFor) || resolveLabel(el, labelsByFor);
        if (!groupLabel) {
          unsupportedCount++;
          continue;
        }

        const checkedRadio = groupRadios.find(
          (r) => r.getAttribute('aria-checked') === 'true'
        );

        const options = groupRadios.map(
          (r) =>
            r.getAttribute('data-value') ||
            r.getAttribute('value') ||
            resolveLabel(r, labelsByFor) ||
            r.id ||
            ''
        ).filter(Boolean);

        const selectedValue = checkedRadio
          ? checkedRadio.getAttribute('data-value') ||
            checkedRadio.getAttribute('value') ||
            resolveLabel(checkedRadio, labelsByFor) ||
            checkedRadio.id ||
            ''
          : '';

        const counterKey = `radio_aria`;
        const ordinal = ordinalCounters[counterKey] || 0;
        ordinalCounters[counterKey] = ordinal + 1;

        settingIndex++;
        const settingId = `setting-${settingIndex}`;

        const fingerprint: Fingerprint = {
          kind: 'radio',
          tag,
          role: 'radio',
          label: groupLabel,
          id: group.id || el.id || undefined,
          semanticAttribute: group.getAttribute('data-testid') || el.getAttribute('data-testid') || undefined,
          options,
          region: getRegion(group, hasLandmarks),
          ordinal,
        };

        controls.push({
          id: settingId,
          kind: 'radio',
          label: groupLabel,
          value: selectedValue,
          fingerprint,
        });
        continue;
      }
    }

    // Label resolution
    const label = resolveLabel(el, labelsByFor);
    if (!label) {
      unsupportedCount++;
      continue;
    }

    // Determine kind & value
    let kind: ControlKind = determineControlKind(tag, type, role);
    let value: string | boolean | string[] = '';
    let options: string[] | undefined = undefined;

    if (tag === 'select') {
      const select = el as HTMLSelectElement;
      options = Array.from(select.options).map((o) => o.value);
      if (select.multiple) {
        kind = 'select-multiple';
        value = Array.from(select.selectedOptions).map((o) => o.value);
      } else {
        kind = 'select-one';
        value = select.value;
      }
    } else if (kind === 'checkbox') {
      if (tag === 'input') {
        value = (el as HTMLInputElement).checked;
      } else {
        value = el.getAttribute('aria-checked') === 'true';
      }
    } else {
      // text, number, range, date, textarea
      value = (el as HTMLInputElement | HTMLTextAreaElement).value;
    }

    const counterKey = `${kind}_${tag}`;
    const ordinal = ordinalCounters[counterKey] || 0;
    ordinalCounters[counterKey] = ordinal + 1;

    settingIndex++;
    const settingId = `setting-${settingIndex}`;

    const fingerprint: Fingerprint = {
      kind,
      tag,
      type: type || undefined,
      role: role || undefined,
      label,
      name: el.getAttribute('name') || undefined,
      id: el.id || undefined,
      semanticAttribute: el.getAttribute('data-testid') || undefined,
      options,
      region: getRegion(el, hasLandmarks),
      ordinal,
    };

    controls.push({
      id: settingId,
      kind,
      label,
      value,
      fingerprint,
    });
  }

  return {
    origin: url.origin,
    pathname: normalizePathname(url.pathname),
    queryParams: captureQueryParams(url),
    controls,
    unsupportedCount,
  };
}
