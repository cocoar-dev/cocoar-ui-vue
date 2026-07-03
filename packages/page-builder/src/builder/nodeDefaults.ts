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
export function resetIdCounter(): void { counter = 0; }

/** Short unique-enough field key — readable in the props panel and in ActionValues. */
function fieldName(): string {
  return `field_${uid().replace(/-/g, '').slice(0, 8)}`;
}

export function defaultNode(type: ElementType): PageNode {
  switch (type) {
    case 'page':     return { id: uid(), type: 'page', children: [] };
    case 'stack':    return { id: uid(), type: 'stack', children: [] };
    case 'card':     return { id: uid(), type: 'card', children: [] };
    case 'section':  return { id: uid(), type: 'section', title: 'Section', children: [] };
    case 'divider':  return { id: uid(), type: 'divider' };
    case 'spacer':   return { id: uid(), type: 'spacer' };
    case 'heading':  return { id: uid(), type: 'heading', text: 'Heading', level: 2 };
    case 'paragraph': return { id: uid(), type: 'paragraph', text: 'Paragraph text.' };
    case 'text-input': return { id: uid(), type: 'text-input', label: 'Label', name: fieldName() };
    case 'checkbox':  return { id: uid(), type: 'checkbox', label: 'Checkbox', name: fieldName() };
    case 'select':    return {
      id: uid(), type: 'select', label: 'Select', name: fieldName(),
      options: [{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }],
    };
    case 'button':  return { id: uid(), type: 'button', label: 'Button' };
    case 'link':    return { id: uid(), type: 'link', label: 'Link' };
    case 'image':   return { id: uid(), type: 'image', assetId: '' };
  }
}

export interface PaletteGroup {
  label: string;
  items: { type: ElementType; label: string; icon: string }[];
}

export const PALETTE_GROUPS: PaletteGroup[] = [
  {
    label: 'Layout',
    items: [
      { type: 'stack',   label: 'Stack',   icon: '⬚' },
      { type: 'card',    label: 'Card',    icon: '▭' },
      { type: 'section', label: 'Section', icon: '§' },
      { type: 'divider', label: 'Divider', icon: '─' },
      { type: 'spacer',  label: 'Spacer',  icon: '↕' },
    ],
  },
  {
    label: 'Typography',
    items: [
      { type: 'heading',   label: 'Heading',   icon: 'H' },
      { type: 'paragraph', label: 'Paragraph', icon: '¶' },
    ],
  },
  {
    label: 'Inputs',
    items: [
      { type: 'text-input', label: 'Text Input', icon: '✏' },
      { type: 'checkbox',   label: 'Checkbox',   icon: '☑' },
      { type: 'select',     label: 'Select',     icon: '▾' },
    ],
  },
  {
    label: 'Actions',
    items: [
      { type: 'button', label: 'Button', icon: '⬛' },
      { type: 'link',   label: 'Link',   icon: '🔗' },
    ],
  },
  {
    label: 'Media',
    items: [
      { type: 'image', label: 'Image', icon: '🖼' },
    ],
  },
];
