import type { ElementType, PageNode } from '../schema';
export type { ElementType };

let counter = 0;
/**
 * Node ids must stay unique across editing sessions: schemas get saved and
 * re-loaded, so a fresh session must never mint an id a stored schema already
 * contains. A session-local counter did exactly that (duplicate ids after
 * load → broken keys/selection/field names). The counter now only backs the
 * non-secure-context fallback, where the timestamp keeps it out of the old
 * `node_N` namespace.
 */
export function uid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  counter += 1;
  return `node_${Date.now().toString(36)}_${counter}`;
}

/** Short unique-enough field key — readable in the props panel and in ActionValues. */
function fieldName(): string {
  return `field_${uid().replace(/-/g, '').slice(0, 8)}`;
}

/**
 * Deep copy of a subtree with fresh ids on every node — the duplicate
 * operation's core. Field `name`s are kept on purpose: renaming silently would
 * surprise, and the duplicate-name validation flags the collision loudly.
 */
export function cloneWithFreshIds(node: PageNode): PageNode {
  const clone = { ...node, id: uid() } as PageNode;
  if ('children' in clone && Array.isArray(clone.children)) {
    (clone as { children: PageNode[] }).children = clone.children.map(cloneWithFreshIds);
  }
  return clone;
}

const TWO_OPTIONS = () => [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

export function defaultNode(type: ElementType): PageNode {
  switch (type) {
    case 'page':     return { id: uid(), type: 'page', children: [] };
    case 'stack':    return { id: uid(), type: 'stack', props: {}, children: [] };
    case 'card':     return { id: uid(), type: 'card', props: {}, children: [] };
    case 'section':  return { id: uid(), type: 'section', props: { title: 'Section' }, children: [] };
    case 'divider':  return { id: uid(), type: 'divider', props: {} };
    case 'spacer':   return { id: uid(), type: 'spacer', props: {} };
    case 'heading':  return { id: uid(), type: 'heading', props: { text: 'Heading', level: 2 } };
    case 'paragraph': return { id: uid(), type: 'paragraph', props: { text: 'Paragraph text.' } };
    case 'note':     return { id: uid(), type: 'note', props: { text: 'Note text.', variant: 'info' } };
    case 'text-input': return { id: uid(), type: 'text-input', props: { label: 'Label' }, name: fieldName() };
    case 'number-input': return { id: uid(), type: 'number-input', props: { label: 'Number' }, name: fieldName() };
    case 'checkbox':  return { id: uid(), type: 'checkbox', props: { label: 'Checkbox' }, name: fieldName() };
    case 'switch':    return { id: uid(), type: 'switch', props: { label: 'Switch' }, name: fieldName() };
    case 'radio-group': return {
      id: uid(), type: 'radio-group', props: { label: 'Choose one', options: TWO_OPTIONS() }, name: fieldName(),
    };
    case 'select':    return {
      id: uid(), type: 'select', props: { label: 'Select', options: TWO_OPTIONS() }, name: fieldName(),
    };
    case 'multi-select': return {
      id: uid(), type: 'multi-select', props: { label: 'Multi select', options: TWO_OPTIONS() }, name: fieldName(),
    };
    case 'otp-input': return { id: uid(), type: 'otp-input', props: { label: 'Code' }, name: fieldName() };
    case 'date-input': return { id: uid(), type: 'date-input', props: { label: 'Date' }, name: fieldName() };
    case 'datetime-input': return { id: uid(), type: 'datetime-input', props: { label: 'Date & time' }, name: fieldName() };
    case 'button':  return { id: uid(), type: 'button', props: { label: 'Button' } };
    case 'link':    return { id: uid(), type: 'link', props: { label: 'Link' } };
    case 'image':   return { id: uid(), type: 'image', props: { assetId: '' } };
  }
}
