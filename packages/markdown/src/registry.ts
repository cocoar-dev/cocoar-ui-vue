/**
 * The shared rendering registry. Both `@cocoar/vue-markdown` (viewer) and
 * `@cocoar/vue-markdown-editor` consume this so output is identical.
 *
 * The interface is intentionally split:
 *
 * - {@link MarkdownViewerRenderers} — Vue components used when walking a parsed
 *   {@link MarkdownNode} tree to produce DOM (the viewer path). Every node type
 *   has a slot, including inline marks.
 *
 * - {@link MarkdownEditorNodeViews} — optional ProseMirror NodeView factories
 *   the editor can wire for *block* nodes whose appearance benefits from a
 *   richer render (e.g. a code block that swaps to a Prism-highlighted view
 *   when the cursor leaves it). Inline marks stay PM-native.
 */
import type { Component, InjectionKey, VNode } from 'vue';
import type { MarkdownNode, MarkdownNodeType } from '@cocoar/vue-markdown-core';

/**
 * Props every viewer renderer receives.
 *
 * - `renderChildren()` — sugar for `renderNodes(node.children ?? [])`. Use it
 *   for the common case of rendering the node's direct children in order.
 * - `renderNodes(arr)` — render any list of `MarkdownNode`s through the
 *   registry. Needed for components like `DefaultTable` that emit a non-trivial
 *   DOM structure and want to delegate the inline content of *individual cells*
 *   back to the registry.
 */
export interface MarkdownRendererProps<TNode extends MarkdownNode = MarkdownNode> {
  node: TNode;
  renderChildren: () => VNode[];
  renderNodes: (nodes: readonly MarkdownNode[]) => VNode[];
}

/**
 * Component map: one renderer per `MarkdownNodeType`. Every type listed in
 * `markdown-core`'s `MarkdownNodeType` union has an entry — explicit completeness
 * keeps the registry honest. `unsupported` is the fallback shown when a node
 * type slips through without a renderer.
 */
export interface MarkdownViewerRenderers {
  // Block-level
  frontmatter: Component<MarkdownRendererProps>;
  heading: Component<MarkdownRendererProps>;
  paragraph: Component<MarkdownRendererProps>;
  blockquote: Component<MarkdownRendererProps>;
  list: Component<MarkdownRendererProps>;
  listItem: Component<MarkdownRendererProps>;
  codeBlock: Component<MarkdownRendererProps>;
  table: Component<MarkdownRendererProps>;
  tableRow: Component<MarkdownRendererProps>;
  tableCell: Component<MarkdownRendererProps>;
  thematicBreak: Component<MarkdownRendererProps>;
  // Inline
  text: Component<MarkdownRendererProps>;
  emphasis: Component<MarkdownRendererProps>;
  strong: Component<MarkdownRendererProps>;
  strikethrough: Component<MarkdownRendererProps>;
  inlineCode: Component<MarkdownRendererProps>;
  link: Component<MarkdownRendererProps>;
  image: Component<MarkdownRendererProps>;
  lineBreak: Component<MarkdownRendererProps>;
  colorSpan: Component<MarkdownRendererProps>;
  // Custom embed (`:::key{props}`)
  embed: Component<MarkdownRendererProps>;
  // Fallback
  unsupported: Component<MarkdownRendererProps>;
}

export type MarkdownRendererName = keyof MarkdownViewerRenderers;

/**
 * Map any node `type` string to a known renderer name. Falls back to
 * `'unsupported'` when the type isn't in the registry — happens if
 * `markdown-core` adds a node type before this registry catches up, or if a
 * custom transformer emits a non-standard type. Accepts `string` (not just
 * `MarkdownNodeType`) because `MarkdownNode.type` is widened to allow
 * forward-compatible string literals.
 */
export function rendererNameFor(type: MarkdownNodeType | string): MarkdownRendererName {
  return (type as MarkdownRendererName) in DEFAULT_NODE_TYPES
    ? (type as MarkdownRendererName)
    : 'unsupported';
}

const DEFAULT_NODE_TYPES: Record<MarkdownRendererName, true> = {
  frontmatter: true,
  heading: true, paragraph: true, blockquote: true,
  list: true, listItem: true, codeBlock: true,
  table: true, tableRow: true, tableCell: true,
  thematicBreak: true,
  text: true, emphasis: true, strong: true, strikethrough: true,
  inlineCode: true, link: true, image: true, lineBreak: true,
  colorSpan: true,
  embed: true,
  unsupported: true,
};

/**
 * Vue inject key. Apps that want to globally override renderers can
 * `app.provide(MARKDOWN_RENDERERS_KEY, ...)` once at startup. The viewer and
 * editor both fall back to {@link defaultMarkdownRenderers} when no provider
 * is present.
 *
 * Per-instance overrides flow through the `renderers` prop on the viewer /
 * editor and win over the inject value, which wins over the default.
 */
export const MARKDOWN_RENDERERS_KEY: InjectionKey<MarkdownViewerRenderers> = Symbol.for(
  'coar:markdown-renderers',
);

/**
 * Editor-side counterpart: optional ProseMirror NodeView factories per *PM
 * node name* (note: PM uses snake_case — `code_block`, `table` — not the
 * AST's camelCase). Defined here for completeness; the actual factories live
 * in the editor package because they depend on Milkdown / PM types we don't
 * want to pull into the viewer.
 *
 * Phase-1 scaffolding only — the editor wiring follows in phase 4.
 */
export interface MarkdownEditorNodeViewSpec {
  /** PM node type name as it appears in the schema (e.g. `code_block`). */
  pmNodeName: string;
  /** Brief description for debugging / dev-tools — never user-facing. */
  description: string;
}

export interface MarkdownEditorNodeViews {
  code_block?: MarkdownEditorNodeViewSpec;
  table?: MarkdownEditorNodeViewSpec;
}
