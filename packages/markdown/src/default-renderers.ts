/**
 * Default Cocoar renderers for every `MarkdownNodeType`. These are the
 * components both the viewer and the editor fall back to when no override
 * has been provided.
 *
 * Every renderer receives `{ node, renderChildren, renderNodes }` via props.
 * - Most blocks call `renderChildren()` to recurse on direct children.
 * - Leaf nodes (text, codeBlock, image, lineBreak, thematicBreak) ignore the
 *   render callbacks and read straight from the node's own attrs/text.
 * - `DefaultTable` emits a raw `<table class="coar-markdown-table">` with the
 *   `<thead>/<tbody>` structure and calls `renderNodes(cell.children ?? [])`
 *   for each cell so the inline content goes back through the registry.
 *   The table styling lives in the shared CSS so the editor's PM-managed
 *   table matches without needing a NodeView wrapper.
 *
 * Kept as render-function components (`defineComponent({ render })`) instead
 * of SFCs — the logic is tiny and a single TS file keeps the full default
 * registry in one place, easy to skim when debugging.
 */
import { defineComponent, h, type PropType, type VNode } from 'vue';
import type { MarkdownNode } from '@cocoar/vue-markdown-core';
import { CoarCodeBlock } from '@cocoar/vue-ui';

import {
  codeBlockLanguage,
  colorSpanColor,
  headingAnchor,
  headingDepth,
  imageAlt,
  imageSrc,
  imageTitle,
  isOrderedList,
  isTableColumnCenterAligned,
  isTableColumnRightAligned,
  isTaskListItem,
  linkHref,
  linkRel,
  linkTarget,
  listStart,
  taskChecked,
  unsupportedType,
} from './helpers';
import type { MarkdownViewerRenderers } from './registry';

// Shared prop spec — every default renderer uses it.
const rendererProps = {
  node: { type: Object as PropType<MarkdownNode>, required: true as const },
  renderChildren: {
    type: Function as PropType<() => VNode[]>,
    required: true as const,
  },
  renderNodes: {
    type: Function as PropType<(nodes: readonly MarkdownNode[]) => VNode[]>,
    required: true as const,
  },
};

export const DefaultHeading = defineComponent({
  name: 'DefaultHeading',
  props: rendererProps,
  setup(props) {
    return () => {
      const depth = headingDepth(props.node);
      const anchor = headingAnchor(props.node);
      return h(
        `h${depth}`,
        { id: anchor ?? undefined, class: 'coar-markdown-heading' },
        props.renderChildren(),
      );
    };
  },
});

export const DefaultParagraph = defineComponent({
  name: 'DefaultParagraph',
  props: rendererProps,
  setup(props) {
    return () => h('p', { class: 'coar-markdown-paragraph' }, props.renderChildren());
  },
});

export const DefaultBlockquote = defineComponent({
  name: 'DefaultBlockquote',
  props: rendererProps,
  setup(props) {
    return () => h('blockquote', { class: 'coar-markdown-blockquote' }, props.renderChildren());
  },
});

export const DefaultList = defineComponent({
  name: 'DefaultList',
  props: rendererProps,
  setup(props) {
    return () => {
      const ordered = isOrderedList(props.node);
      const tag = ordered ? 'ol' : 'ul';
      const start = ordered ? listStart(props.node) : null;
      return h(
        tag,
        {
          class: [
            'coar-markdown-list',
            ordered ? 'coar-markdown-list--ordered' : 'coar-markdown-list--unordered',
          ],
          start: start ?? undefined,
        },
        props.renderChildren(),
      );
    };
  },
});

export const DefaultListItem = defineComponent({
  name: 'DefaultListItem',
  props: rendererProps,
  setup(props) {
    return () => {
      const task = isTaskListItem(props.node);
      const checked = task && taskChecked(props.node);
      // Mirror the editor's PM-emitted attributes so the shared task-list CSS
      // (pseudo-element checkbox + checked-state strikethrough) lights up the
      // same way in viewer and editor. We deliberately do *not* render an
      // `<input>` — the visual checkbox is the `::before` pseudo-element on
      // the `<li>` itself, just like in the editor.
      return h(
        'li',
        {
          class: [
            'coar-markdown-list-item',
            task ? 'coar-markdown-list-item--task' : null,
          ],
          'data-item-type': task ? 'task' : undefined,
          'data-checked': task ? (checked ? 'true' : 'false') : undefined,
        },
        props.renderChildren(),
      );
    };
  },
});

export const DefaultCodeBlock = defineComponent({
  name: 'DefaultCodeBlock',
  props: rendererProps,
  setup(props) {
    // Leaf node — children are ignored; the text lives in node.text.
    return () =>
      h(CoarCodeBlock, {
        class: 'coar-markdown-code-block',
        code: props.node.text ?? '',
        language: codeBlockLanguage(props.node),
        collapsible: false,
        showCopy: true,
      });
  },
});

/**
 * Table renderer emits a plain `<table class="coar-markdown-table">` with the
 * `<thead>/<tbody>` structure split on the AST's first row (header) vs. the
 * rest. Each cell's inline content is rendered via `renderNodes(cell.children)`
 * so any registry override (custom emphasis, custom inlineCode, …) still
 * applies inside cells.
 *
 * No `CoarTable` wrapper here on purpose — the editor's PM-managed table also
 * lands in `.coar-markdown` scope, and the shared stylesheet styles raw
 * `<table>` consistently in both. Wrapping in `CoarTable` (which is itself a
 * `<table>`) would either nest tables or rely on `:deep()` scoped CSS that
 * doesn't reach the editor's contenteditable.
 */
export const DefaultTable = defineComponent({
  name: 'DefaultTable',
  props: rendererProps,
  setup(props) {
    return () => {
      const rows = props.node.children ?? [];
      if (rows.length === 0) {
        return h('table', { class: 'coar-markdown-table' });
      }
      const [headerRow, ...bodyRows] = rows;
      const headerCells = headerRow.children ?? [];

      return h('table', { class: 'coar-markdown-table' }, [
        h('thead', null, [
          h(
            'tr',
            null,
            headerCells.map((cell, colIndex) =>
              h(
                'th',
                {
                  key: cell.id,
                  class: [
                    isTableColumnRightAligned(props.node, colIndex) ? 'text-right' : null,
                    isTableColumnCenterAligned(props.node, colIndex) ? 'text-center' : null,
                  ],
                },
                props.renderNodes(cell.children ?? []),
              ),
            ),
          ),
        ]),
        h(
          'tbody',
          null,
          bodyRows.map((row) =>
            h(
              'tr',
              { key: row.id },
              (row.children ?? []).map((cell, colIndex) =>
                h(
                  'td',
                  {
                    key: cell.id,
                    class: [
                      isTableColumnRightAligned(props.node, colIndex) ? 'text-right' : null,
                      isTableColumnCenterAligned(props.node, colIndex) ? 'text-center' : null,
                    ],
                  },
                  props.renderNodes(cell.children ?? []),
                ),
              ),
            ),
          ),
        ),
      ]);
    };
  },
});

// Standalone fallbacks for tableRow / tableCell when they appear outside a
// full table tree (rare, but kept for safety).
export const DefaultTableRow = defineComponent({
  name: 'DefaultTableRow',
  props: rendererProps,
  setup(props) {
    return () => h('tr', null, props.renderChildren());
  },
});

export const DefaultTableCell = defineComponent({
  name: 'DefaultTableCell',
  props: rendererProps,
  setup(props) {
    return () => h('td', { class: 'coar-markdown-table-cell' }, props.renderChildren());
  },
});

export const DefaultThematicBreak = defineComponent({
  name: 'DefaultThematicBreak',
  props: rendererProps,
  setup() {
    return () => h('hr', { class: 'coar-markdown-hr' });
  },
});

/* ── Inline ─────────────────────────────────────────────────────────── */

export const DefaultText = defineComponent({
  name: 'DefaultText',
  props: rendererProps,
  setup(props) {
    return () => props.node.text ?? '';
  },
});

export const DefaultEmphasis = defineComponent({
  name: 'DefaultEmphasis',
  props: rendererProps,
  setup(props) {
    return () => h('em', null, props.renderChildren());
  },
});

export const DefaultStrong = defineComponent({
  name: 'DefaultStrong',
  props: rendererProps,
  setup(props) {
    return () => h('strong', null, props.renderChildren());
  },
});

export const DefaultStrikethrough = defineComponent({
  name: 'DefaultStrikethrough',
  props: rendererProps,
  setup(props) {
    return () => h('del', null, props.renderChildren());
  },
});

export const DefaultInlineCode = defineComponent({
  name: 'DefaultInlineCode',
  props: rendererProps,
  setup(props) {
    return () =>
      h('code', { class: 'coar-markdown-inline-code' }, props.node.text ?? '');
  },
});

export const DefaultLink = defineComponent({
  name: 'DefaultLink',
  props: rendererProps,
  setup(props) {
    return () => {
      const href = linkHref(props.node);
      if (!href) {
        // Malformed link — render the inner content only.
        return props.renderChildren();
      }
      return h(
        'a',
        {
          class: 'coar-markdown-link',
          href,
          target: linkTarget(props.node) ?? undefined,
          rel: linkRel(props.node) ?? undefined,
        },
        props.renderChildren(),
      );
    };
  },
});

export const DefaultImage = defineComponent({
  name: 'DefaultImage',
  props: rendererProps,
  setup(props) {
    return () => {
      const src = imageSrc(props.node);
      if (!src) return null;
      return h('img', {
        class: 'coar-markdown-image',
        src,
        alt: imageAlt(props.node),
        title: imageTitle(props.node) ?? undefined,
        loading: 'lazy',
      });
    };
  },
});

export const DefaultLineBreak = defineComponent({
  name: 'DefaultLineBreak',
  props: rendererProps,
  setup() {
    return () => h('br');
  },
});

/**
 * Inline color mark — renders children inside a `<span>` with a single
 * sanitized `color: …` inline style. The color is re-validated through
 * `sanitizeColor` here so a malformed attr can't slip an arbitrary style
 * through the renderer.
 */
export const DefaultColorSpan = defineComponent({
  name: 'DefaultColorSpan',
  props: rendererProps,
  setup(props) {
    return () => {
      const color = colorSpanColor(props.node);
      return h(
        'span',
        {
          class: 'coar-markdown-color',
          style: color ? { color } : undefined,
        },
        props.renderChildren(),
      );
    };
  },
});

/**
 * Block-style fallback for unknown node types. Most "unsupported" nodes that
 * reach the registry are block-level (custom remark plugins emitting embeds,
 * directives, etc.), so we default to the block presentation. Consumers who
 * need an inline fallback for a specific custom mark can override this slot
 * — or, more cleanly, register a dedicated renderer for that mark's type
 * before it falls through to here.
 */
export const DefaultUnsupported = defineComponent({
  name: 'DefaultUnsupported',
  props: rendererProps,
  setup(props) {
    return () =>
      h(
        'div',
        { class: 'coar-markdown-unsupported' },
        `Unsupported markdown node: ${unsupportedType(props.node)}`,
      );
  },
});

/**
 * The default registry — what the viewer and editor fall back to when no
 * provide/inject override or prop override has been set.
 */
export const defaultMarkdownRenderers: MarkdownViewerRenderers = {
  heading: DefaultHeading,
  paragraph: DefaultParagraph,
  blockquote: DefaultBlockquote,
  list: DefaultList,
  listItem: DefaultListItem,
  codeBlock: DefaultCodeBlock,
  table: DefaultTable,
  tableRow: DefaultTableRow,
  tableCell: DefaultTableCell,
  thematicBreak: DefaultThematicBreak,
  text: DefaultText,
  emphasis: DefaultEmphasis,
  strong: DefaultStrong,
  strikethrough: DefaultStrikethrough,
  inlineCode: DefaultInlineCode,
  link: DefaultLink,
  image: DefaultImage,
  lineBreak: DefaultLineBreak,
  colorSpan: DefaultColorSpan,
  unsupported: DefaultUnsupported,
};
