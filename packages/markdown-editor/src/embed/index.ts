/**
 * Custom-embed support for the editor: `:::key{props}` as a live, atomic block.
 *
 * Three coordinated pieces, mirroring the frontmatter + text-color patterns:
 *
 *  1. **`embedRemark` ($remark)** — a remark plugin that runs on both sides of
 *     Milkdown's shared processor:
 *      - on parse, folds any paragraph that is exactly a `:::key{props}` line
 *        into a custom `embed` mdast node (recognised via the paragraph's raw
 *        source where available, else a single-text-child fallback — an attr
 *        value with markdown specials would otherwise be split into inlines);
 *      - on stringify, registers a `mdast-util-to-markdown` handler that writes
 *        the `embed` node back to `:::key{props}` verbatim.
 *
 *  2. **`embedSchema` ($nodeSchema)** — an atomic `embed` ProseMirror block
 *     holding `{ embedKey, props }`. `parseMarkdown`/`toMarkdown` bridge it to
 *     the `embed` mdast node so it round-trips losslessly.
 *
 *  3. **`EmbedNodeView`** — renders the registered component live (the same
 *     `EmbedRenderer` the viewer uses), so the WYSIWYG surface shows the real
 *     embed instead of raw text. The Vue component is mounted manually with the
 *     editor's app context (no `@prosemirror-adapter/vue` dependency).
 *
 * `createEmbedNode({ resolveRegistry, appContext })` builds the per-instance
 * bundle (the NodeView needs the runtime registry + app context); the remark
 * plugin and schema are stateless module constants.
 */
import { $nodeSchema, $remark, $view } from '@milkdown/utils';
import type { MilkdownPlugin } from '@milkdown/ctx';
import type { Node as PMNode } from '@milkdown/prose/model';
import type { EditorView, NodeView } from '@milkdown/prose/view';
import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import { h, render, type AppContext } from 'vue';
import {
  parseEmbedDirective,
  serializeEmbedDirective,
  toEmbedProps,
} from '@cocoar/vue-markdown-core';
import {
  EmbedRenderer,
  resolveEmbed,
  type EmbedEditorController,
  type EmbedRegistry,
} from '@cocoar/vue-markdown';

/** Loose mdast shape we walk/mutate during the parse-side fold. */
interface MdNode {
  type?: string;
  children?: MdNode[];
  value?: unknown;
  position?: { start?: { offset?: number }; end?: { offset?: number } };
  embedKey?: string;
  props?: Record<string, string>;
}

/**
 * Get the candidate directive text for a paragraph: the raw source slice when
 * the file value + offsets are present (robust against inline tokenization),
 * else the value of a lone text child. Returns null when neither applies.
 */
function paragraphDirectiveText(node: MdNode, source: string): string | null {
  const startOffset = node.position?.start?.offset;
  const endOffset = node.position?.end?.offset;
  if (source && typeof startOffset === 'number' && typeof endOffset === 'number') {
    return source.slice(startOffset, endOffset).trim();
  }
  const kids = node.children;
  if (
    Array.isArray(kids) &&
    kids.length === 1 &&
    kids[0]?.type === 'text' &&
    typeof kids[0].value === 'string'
  ) {
    return kids[0].value.trim();
  }
  return null;
}

/** Replace qualifying paragraphs with `embed` mdast nodes, in place. */
function foldEmbeds(node: MdNode, source: string): void {
  if (!Array.isArray(node.children)) return;
  node.children = node.children.map((child) => {
    if (child.type === 'paragraph') {
      const text = paragraphDirectiveText(child, source);
      if (text) {
        const directive = parseEmbedDirective(text);
        if (directive) {
          return {
            type: 'embed',
            embedKey: directive.key,
            props: directive.props,
            position: child.position,
          } satisfies MdNode;
        }
      }
    }
    foldEmbeds(child, source);
    return child;
  });
}

const embedRemarkPlugin: Plugin<[], Root> = function () {
  // Stringify side — register a to-markdown handler once on this processor.
  const data = this.data() as Record<string, unknown>;
  const extensions =
    (data['toMarkdownExtensions'] as Array<Record<string, unknown>> | undefined) ??
    ((data['toMarkdownExtensions'] = []) as Array<Record<string, unknown>>);
  extensions.push({
    handlers: {
      embed(node: { embedKey?: unknown; props?: unknown }): string {
        const key = typeof node.embedKey === 'string' ? node.embedKey : '';
        if (key.length === 0) return '';
        return serializeEmbedDirective({ key, props: toEmbedProps(node.props) });
      },
    },
  });

  // Parse side — fold standalone directive paragraphs into `embed` nodes.
  return (tree: Root, file: { value?: unknown } | undefined) => {
    const source = typeof file?.value === 'string' ? file.value : '';
    foldEmbeds(tree as unknown as MdNode, source);
  };
};

/** remark plugin (parse fold + stringify handler). Stateless module constant. */
export const embedRemark = $remark('coarEmbed', () => embedRemarkPlugin);

/** The atomic `embed` ProseMirror node. Holds `{ embedKey, props }`. */
const embedSchema = $nodeSchema('embed', () => ({
  group: 'block',
  atom: true,
  marks: '',
  selectable: true,
  draggable: false,
  isolating: true,
  attrs: {
    embedKey: { default: '' },
    props: { default: {} as Record<string, string> },
  },
  parseDOM: [
    {
      tag: 'div[data-type="embed"]',
      getAttrs: (dom) => {
        const el = dom as HTMLElement;
        let props: Record<string, string>;
        try {
          props = JSON.parse(el.getAttribute('data-embed-props') ?? '{}');
        } catch {
          props = {};
        }
        return { embedKey: el.getAttribute('data-embed-key') ?? '', props };
      },
    },
  ],
  toDOM: (node) => [
    'div',
    {
      'data-type': 'embed',
      'data-embed-key': (node.attrs['embedKey'] as string) ?? '',
      'data-embed-props': JSON.stringify(node.attrs['props'] ?? {}),
    },
  ],
  parseMarkdown: {
    match: (node) => node.type === 'embed',
    runner: (state, node, type) => {
      state.addNode(type, {
        embedKey: typeof node['embedKey'] === 'string' ? node['embedKey'] : '',
        props:
          node['props'] && typeof node['props'] === 'object'
            ? (node['props'] as Record<string, string>)
            : {},
      });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'embed',
    runner: (state, node) => {
      state.addNode('embed', undefined, undefined, {
        embedKey: (node.attrs['embedKey'] as string) ?? '',
        props: (node.attrs['props'] as Record<string, string>) ?? {},
      });
    },
  },
}));

export interface EmbedNodeOptions {
  /** Resolve the embed registry at render time (reads the editor's prop). */
  resolveRegistry: () => EmbedRegistry | undefined;
  /** The editor's Vue app context, so the mounted preview inherits provides/globals. */
  appContext: AppContext | null;
}

/**
 * NodeView that mounts the registered embed in the editor. When the registry
 * entry supplies an editable `editor` component, it's mounted as a
 * `v-model:embedProps` component and its changes are written back into the PM
 * node (→ round-trip to the `:::key{props}` markdown). Otherwise the read-only
 * `viewer` (via `EmbedRenderer`) is shown — same as the viewer.
 *
 * Events are stopped at the PM boundary so the embedded component owns its
 * clicks/inputs; mutations are ignored so PM never re-parses the mounted DOM.
 */
class EmbedNodeView implements NodeView {
  dom: HTMLElement;
  private node: PMNode;
  private readonly view: EditorView;
  private readonly getPos: () => number | undefined;
  private readonly options: EmbedNodeOptions;

  constructor(
    node: PMNode,
    view: EditorView,
    getPos: () => number | undefined,
    options: EmbedNodeOptions,
  ) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.options = options;
    this.dom = document.createElement('div');
    this.dom.className = 'coar-markdown-embed-host';
    this.dom.setAttribute('data-type', 'embed');
    this.dom.contentEditable = 'false';
    this.dom.draggable = false;
    this.renderPreview();
  }

  /** Write changed directive attributes back into the PM node. */
  private updateProps(next: Record<string, string>): void {
    const pos = this.getPos();
    if (pos == null) return;
    const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
      embedKey: (this.node.attrs['embedKey'] as string) ?? '',
      props: next,
    });
    this.view.dispatch(tr);
  }

  private renderPreview(): void {
    const embedKey = (this.node.attrs['embedKey'] as string) ?? '';
    const embedProps = (this.node.attrs['props'] as Record<string, string>) ?? {};
    const registry = this.options.resolveRegistry();
    const def = resolveEmbed(registry, embedKey);

    // Editable variant when the registry provides one; else read-only viewer.
    // The editor gets ONE typed `controller` prop — the explicit write channel.
    const vnode = def?.editor
      ? h(def.editor, {
          controller: {
            props: embedProps,
            update: (next: Record<string, string>) => this.updateProps(next),
            patch: (partial: Record<string, string>) =>
              this.updateProps({ ...embedProps, ...partial }),
          } satisfies EmbedEditorController,
        })
      : h(EmbedRenderer, { embedKey, embedProps, registry });

    if (this.options.appContext) vnode.appContext = this.options.appContext;
    render(vnode, this.dom);
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.renderPreview();
    return true;
  }

  selectNode(): void {
    this.dom.classList.add('coar-markdown-embed-host--selected');
  }

  deselectNode(): void {
    this.dom.classList.remove('coar-markdown-embed-host--selected');
  }

  // Interactive preview: let the embedded component own its events, and keep PM
  // from re-parsing the manually-mounted subtree.
  stopEvent(): boolean {
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy(): void {
    render(null, this.dom);
  }
}

const embedNodeView = (options: EmbedNodeOptions) =>
  $view(
    embedSchema.node,
    () => (node, view, getPos) => new EmbedNodeView(node, view, getPos as () => number | undefined, options),
  );

/**
 * Build the per-instance embed bundle. Register with one `.use(...)` call.
 * Typed `MilkdownPlugin[]` so the public type doesn't leak un-nameable
 * transformer internals (TS2742), matching the frontmatter bundle.
 */
export function createEmbedNode(options: EmbedNodeOptions): MilkdownPlugin[] {
  return [embedRemark, embedSchema, embedNodeView(options)].flat();
}
