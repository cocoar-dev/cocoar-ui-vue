/**
 * Frontmatter support for the editor.
 *
 * Milkdown's commonmark parser would otherwise mis-read a leading `---\n…\n---`
 * YAML block as a thematic break + setext heading (collapsing the whole block
 * onto one line). This bundle teaches Milkdown to:
 *
 *  1. parse it as a `yaml` mdast node — `remark-frontmatter` on the shared
 *     remark instance, which also handles the *serialize* side so it round-trips;
 *  2. represent it as an atomic `frontmatter` ProseMirror node that holds the
 *     raw YAML in a `value` attr; and
 *  3. render it through a NodeView as the same metadata card the viewer shows
 *     (shared `.coar-markdown-frontmatter` markup + CSS from
 *     `@cocoar/vue-markdown/styles`).
 *
 * The node is an atom: display-only, selectable/deletable as a unit, and it
 * never loses its content on save.
 *
 * Register the whole bundle with one `.use(frontmatter)` call.
 */
import remarkFrontmatter from 'remark-frontmatter';
import { $nodeSchema, $remark, $view } from '@milkdown/utils';
import type { MilkdownPlugin } from '@milkdown/ctx';
import type { Node as PMNode } from '@milkdown/prose/model';
import type { NodeView } from '@milkdown/prose/view';
import { parseFrontmatter } from '@cocoar/vue-markdown-core';

// These are kept module-local (not exported): their inferred Milkdown types
// transitively reference `micromark-extension-frontmatter`'s internals, which
// TS can't name in a portable `.d.ts` (TS2742). Only the explicitly-typed
// `frontmatter` bundle below is exported.

/** Adds `remark-frontmatter` (yaml flavour) to Milkdown's shared remark instance. */
const remarkFrontmatterPlugin = $remark(
  'coarRemarkFrontmatter',
  () => remarkFrontmatter,
  ['yaml'],
);

/** The `frontmatter` ProseMirror node — an atomic block holding the raw YAML.
 *  `selectable: false` + `draggable: false` make it inert read-only text: a
 *  click can't node-select it (and therefore can't drag it around). Editing
 *  the YAML happens via the Source view, not by manipulating this node. */
const frontmatterSchema = $nodeSchema('frontmatter', () => ({
  group: 'block',
  atom: true,
  marks: '',
  selectable: false,
  draggable: false,
  attrs: { value: { default: '' } },
  parseDOM: [
    {
      tag: 'div[data-type="frontmatter"]',
      getAttrs: (dom) => ({ value: (dom as HTMLElement).getAttribute('data-value') ?? '' }),
    },
  ],
  toDOM: (node) => [
    'div',
    { 'data-type': 'frontmatter', 'data-value': (node.attrs['value'] as string) ?? '' },
  ],
  parseMarkdown: {
    match: (node) => node.type === 'yaml',
    runner: (state, node, type) => {
      state.addNode(type, { value: typeof node['value'] === 'string' ? node['value'] : '' });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'frontmatter',
    runner: (state, node) => {
      state.addNode('yaml', undefined, (node.attrs['value'] as string) ?? '');
    },
  },
}));

/**
 * Populate `el` (the `.coar-markdown-frontmatter` element) with the rendered
 * frontmatter — plain `key: value` lines, muted + italic via the shared CSS
 * (`@cocoar/vue-markdown/styles`), so editor and viewer look identical.
 */
function populateFrontmatter(el: HTMLElement, raw: string): void {
  const { entries } = parseFrontmatter(raw);
  el.replaceChildren();

  if (entries.length === 0) {
    // Malformed YAML — show the raw text readably instead of an empty block.
    const pre = document.createElement('pre');
    pre.className = 'coar-markdown-frontmatter__raw';
    pre.textContent = raw;
    el.appendChild(pre);
    return;
  }

  for (const entry of entries) {
    const line = document.createElement('div');
    line.className = 'coar-markdown-frontmatter__entry';
    const key = document.createElement('span');
    key.className = 'coar-markdown-frontmatter__key';
    key.textContent = entry.key;
    const value = document.createElement('span');
    value.className = 'coar-markdown-frontmatter__value';
    value.textContent = entry.value;
    line.append(key, document.createTextNode(': '), value);
    el.appendChild(line);
  }
}

/** Display-only NodeView: renders the frontmatter, re-renders when `value` changes. */
class FrontmatterView implements NodeView {
  dom: HTMLElement;
  private node: PMNode;

  constructor(node: PMNode) {
    this.node = node;
    // `dom` IS the `.coar-markdown-frontmatter` block (a direct child of the
    // ProseMirror root) so the shared block-rhythm margin applies.
    this.dom = document.createElement('div');
    this.dom.className = 'coar-markdown-frontmatter';
    this.dom.setAttribute('data-type', 'frontmatter');
    this.dom.setAttribute('aria-label', 'Document metadata');
    this.dom.contentEditable = 'false';
    this.dom.draggable = false;
    this.renderCard();
  }

  private renderCard() {
    populateFrontmatter(this.dom, (this.node.attrs['value'] as string) ?? '');
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    const changed = node.attrs['value'] !== this.node.attrs['value'];
    this.node = node;
    if (changed) this.renderCard();
    return true;
  }

  // Display-only: keep PM from treating the block's internal DOM as editable
  // content or re-parsing it on mutation.
  ignoreMutation(): boolean {
    return true;
  }

  stopEvent(): boolean {
    return false;
  }
}

/** Wires `FrontmatterView` as the NodeView for the `frontmatter` node. */
const frontmatterNodeView = $view(
  frontmatterSchema.node,
  () => (node) => new FrontmatterView(node),
);

/**
 * Combined bundle — register all three with one `.use(frontmatter)` call.
 * Explicitly typed `MilkdownPlugin[]` so the public type doesn't leak
 * `micromark-extension-frontmatter`'s un-nameable internals (TS2742).
 */
export const frontmatter: MilkdownPlugin[] = [
  remarkFrontmatterPlugin,
  frontmatterSchema,
  frontmatterNodeView,
].flat();
