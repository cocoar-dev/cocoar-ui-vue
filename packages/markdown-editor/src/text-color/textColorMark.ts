/**
 * Inline text-color mark for the Cocoar markdown editor.
 *
 * Wire format on disk: `<span style="color: <value>">…</span>`. Round-trip is
 * implemented as three coordinated pieces:
 *
 * 1. **`textColorMark` ($markSchema)** — the ProseMirror mark itself. Stores
 *    a sanitized `color` attr; `parseDOM` accepts only `<span>` tags whose
 *    style passes `sanitizeColorStyle` (see core), so HTML-clipboard paste of
 *    foreign content can't smuggle other styles in. `toDOM` re-emits the
 *    same tight form.
 *
 * 2. **`textColorRemark` ($remark)** — a remark plugin that runs on both
 *    parse and stringify:
 *    - On parse, it walks every node with inline children and folds matched
 *      `<span style="color:X">` … `</span>` raw-HTML mdast pairs into a
 *      single `colorTextSpan` mdast node carrying the sanitized color and the
 *      enclosed inlines as children.
 *    - On stringify, it registers a `mdast-util-to-markdown` handler that
 *      writes a `colorTextSpan` back as `<span style="color:X">…</span>`.
 *    The custom mdast type is the bridge: Milkdown's parser/serializer treats
 *    it as a single container the mark can open/close around, while remark
 *    knows how to read and write it.
 *
 * 3. **`text_color` parseMarkdown / toMarkdown wiring** — inside the
 *    `$markSchema` definition. `parseMarkdown` matches `colorTextSpan` and
 *    opens the mark around its children; `toMarkdown` opens an mdast
 *    `colorTextSpan` wrapping the text run with the mark.
 *
 * Defence in depth: the color attr is re-validated through `sanitizeColor`
 * at every entry point (parseDOM, parseMarkdown, the remark fold) so a
 * malformed value in any one path fails closed instead of leaking inline
 * style.
 */
import type { Mark, MarkType } from '@milkdown/prose/model';
import { $markSchema, $remark } from '@milkdown/utils';
import {
  isColorSpanClose,
  parseColorSpanOpen,
  sanitizeColor,
  serializeColorSpanClose,
  serializeColorSpanOpen,
} from '@cocoar/vue-markdown-core';
import type { Plugin } from 'unified';
import type { Root } from 'mdast';

interface ColorTextSpanNode {
  type: 'colorTextSpan';
  color: string;
  children: unknown[];
  data?: { color: string };
}

type Walkable = { type?: string; value?: unknown; children?: Walkable[] };

/**
 * remark plugin that folds matched `<span style="color:…">` HTML pairs in
 * inline children into a single `colorTextSpan` mdast node, and registers
 * the matching stringify handler so the node round-trips.
 */
const textColorRemarkPlugin: Plugin<[unknown?], Root> = function () {
  // Stringify side — register a handler with mdast-util-to-markdown via the
  // unified processor's data extension list. Setting it once during plugin
  // attach is enough; the same processor instance is reused for every doc.
  const data = this.data() as Record<string, unknown>;
  const extensions =
    (data.toMarkdownExtensions as Array<Record<string, unknown>> | undefined) ??
    ((data.toMarkdownExtensions = []) as Array<Record<string, unknown>>);
  extensions.push({
    handlers: {
      colorTextSpan(node: ColorTextSpanNode, _parent: unknown, state: {
        containerPhrasing: (node: ColorTextSpanNode, ctx: { before: string; after: string }) => string;
      }): string {
        const color = sanitizeColor(node.color ?? '') ?? '';
        if (color.length === 0) {
          // Defensive: drop the wrapper, keep the text content.
          return state.containerPhrasing(node, { before: '', after: '' });
        }
        const inner = state.containerPhrasing(node, {
          before: '>',
          after: '<',
        });
        return `${serializeColorSpanOpen(color)}${inner}${serializeColorSpanClose()}`;
      },
    },
  });

  // Parse side — fold matched span pairs in every inline-bearing parent.
  return (tree: Walkable) => {
    visit(tree);
  };

  function visit(node: Walkable): void {
    if (Array.isArray(node.children)) {
      const folded = foldChildren(node.children);
      node.children = folded;
      for (const child of folded) visit(child);
    }
  }
};

function isHtmlSpanLiteral(node: Walkable | undefined): node is Walkable & { value: string } {
  return !!node && node.type === 'html' && typeof node.value === 'string';
}

function findMatchingClose(nodes: readonly Walkable[], openIdx: number): number | null {
  let depth = 1;
  for (let j = openIdx + 1; j < nodes.length; j++) {
    const cand = nodes[j];
    if (!isHtmlSpanLiteral(cand)) continue;
    if (parseColorSpanOpen(cand.value)) {
      depth++;
      continue;
    }
    if (isColorSpanClose(cand.value)) {
      depth--;
      if (depth === 0) return j;
    }
  }
  return null;
}

function foldChildren(children: readonly Walkable[]): Walkable[] {
  const out: Walkable[] = [];
  let i = 0;
  while (i < children.length) {
    const node = children[i]!;
    if (isHtmlSpanLiteral(node)) {
      const open = parseColorSpanOpen(node.value);
      if (open) {
        const closeIdx = findMatchingClose(children, i);
        if (closeIdx !== null) {
          const innerRaw = children.slice(i + 1, closeIdx);
          const inner = foldChildren(innerRaw);
          const folded: ColorTextSpanNode = {
            type: 'colorTextSpan',
            color: open.color,
            children: inner,
            data: { color: open.color },
          };
          out.push(folded as unknown as Walkable);
          i = closeIdx + 1;
          continue;
        }
      }
    }
    out.push(node);
    i++;
  }
  return out;
}

export const textColorRemark = $remark('textColor', () => textColorRemarkPlugin);

// The shape returned here matches Milkdown's `MarkSchema` structurally; we
// cast at the `$markSchema` call site instead of importing the type so dts
// generation doesn't have to traverse the pnpm-virtualized
// `@milkdown/transformer` path.
const textColorSchema = () => ({
  attrs: { color: { default: '' } },
  inclusive: true,
  parseDOM: [
    {
      tag: 'span[style*="color"]',
      // Filter: accept only `<span>` whose style is exactly `color: <value>`
      // and whose value passes the whitelist. Anything else (extra attrs,
      // multi-decl style, foreign property) returns `false` to skip the mark.
      getAttrs(domOrAttrs: HTMLElement | string) {
        if (typeof domOrAttrs === 'string') return false;
        const dom = domOrAttrs;
        // Must be the only attribute that influences appearance. We allow
        // `class` (PM/Milkdown may stamp internal classes) but reject
        // everything else.
        for (const attr of Array.from(dom.attributes)) {
          if (attr.name === 'style' || attr.name === 'class') continue;
          return false;
        }
        const style = dom.getAttribute('style') ?? '';
        // Allow either a single `color: …` declaration or a multi-decl style
        // where exactly one declaration is `color: …` and the rest are
        // empty / whitespace. This matches what browsers produce when the
        // user copies styled text.
        const decls = style
          .split(';')
          .map((d) => d.trim())
          .filter((d) => d.length > 0);
        if (decls.length !== 1) return false;
        const decl = decls[0]!;
        const colon = decl.indexOf(':');
        if (colon < 0) return false;
        const prop = decl.slice(0, colon).trim().toLowerCase();
        if (prop !== 'color') return false;
        const value = decl.slice(colon + 1);
        const color = sanitizeColor(value);
        return color === null ? false : { color };
      },
    },
  ],
  toDOM: (mark: Mark) => {
    const color = sanitizeColor(String(mark.attrs['color'] ?? '')) ?? '';
    if (color.length === 0) {
      // Defensive fallback — render unstyled rather than leaking the raw
      // unsanitized value into the DOM.
      return ['span', {}, 0];
    }
    return ['span', { style: `color: ${color}` }, 0];
  },
  parseMarkdown: {
    match: (node: { type?: unknown }) => node.type === 'colorTextSpan',
    runner: (
      state: { openMark: (t: MarkType, attrs?: Record<string, unknown>) => unknown; closeMark: (t: MarkType) => unknown; next: (children: unknown) => unknown },
      node: { color?: unknown; data?: { color?: unknown }; children?: unknown },
      markType: MarkType,
    ) => {
      const candidate =
        typeof node.color === 'string'
          ? node.color
          : typeof node.data?.color === 'string'
            ? node.data.color
            : '';
      const color = sanitizeColor(candidate) ?? '';
      if (color.length === 0) {
        // Sanitization failed — drop the mark wrapper but keep the children.
        state.next(node.children);
        return;
      }
      state.openMark(markType, { color });
      state.next(node.children);
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark: Mark) => mark.type.name === 'text_color',
    runner: (
      state: { withMark: (mark: Mark, type: string, value?: string, props?: Record<string, unknown>) => unknown },
      mark: Mark,
    ) => {
      const color = sanitizeColor(String(mark.attrs['color'] ?? '')) ?? '';
      // Skip serializing when color is invalid — emits children unwrapped
      // and avoids round-tripping bad data back to disk.
      if (color.length === 0) return;
      state.withMark(mark, 'colorTextSpan', undefined, { color });
    },
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const textColorMark = $markSchema('text_color', textColorSchema as any);

export const textColor = [textColorRemark, textColorMark].flat();
