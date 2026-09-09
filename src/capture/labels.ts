function cleanText(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}

function getTextWithoutControls(container: Element): string | null {
  let text = '';
  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === 3) {
      // TEXT_NODE
      text += ' ' + (node.textContent || '');
    } else if (node.nodeType === 1) {
      // ELEMENT_NODE
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (tag !== 'input' && tag !== 'select' && tag !== 'textarea' && tag !== 'button') {
        text += ' ' + (el.textContent || '');
      }
    }
  }
  return cleanText(text);
}

export function resolveLabel(element: Element): string | null {
  const doc = element.ownerDocument;

  // 1. Associated label
  // 1a. Native HTML element.labels
  const formControl = element as HTMLInputElement;
  if (formControl.labels && formControl.labels.length > 0) {
    const text = cleanText(formControl.labels[0].textContent);
    if (text) return text;
  }

  // 1b. label[for="id"] fallback
  if (element.id) {
    try {
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(element.id) : element.id;
      const forLabel = doc?.querySelector(`label[for="${escapedId}"]`);
      if (forLabel) {
        const text = cleanText(forLabel.textContent);
        if (text) return text;
      }
    } catch {
      // Ignore CSS escape selector errors
    }
  }

  // 1c. Enclosing <label> ancestor
  const enclosingLabel = element.closest('label');
  if (enclosingLabel) {
    const text = getTextWithoutControls(enclosingLabel);
    if (text) return text;
  }

  // 2. aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy && doc) {
    const ids = labelledBy.trim().split(/\s+/);
    const texts: string[] = [];
    for (const id of ids) {
      const target = doc.getElementById(id);
      if (target) {
        const t = cleanText(target.textContent);
        if (t) texts.push(t);
      }
    }
    if (texts.length > 0) {
      return texts.join(' ');
    }
  }

  // 3. aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    const text = cleanText(ariaLabel);
    if (text) return text;
  }

  // 4. placeholder or name
  const placeholder = element.getAttribute('placeholder');
  if (placeholder) {
    const text = cleanText(placeholder);
    if (text) return text;
  }

  const nameAttr = element.getAttribute('name');
  if (nameAttr) {
    const text = cleanText(nameAttr);
    if (text) return text;
  }

  // 5. Concise text in same field container / fieldset legend
  const fieldset = element.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) {
      const text = cleanText(legend.textContent);
      if (text && text.length <= 80) return text;
    }
  }

  const parent = element.parentElement;
  if (parent && parent.tagName.toLowerCase() !== 'body' && parent.tagName.toLowerCase() !== 'form') {
    const text = getTextWithoutControls(parent);
    if (text && text.length > 0 && text.length <= 60) {
      return text;
    }
  }

  return null;
}
