/**
 * Public surface for `@cocoar/vue-markdown`.
 *
 * The package contains both:
 * - The user-facing `<CoarMarkdown>` viewer component.
 * - The shared **rendering registry** (`MarkdownViewerRenderers`,
 *   `defaultMarkdownRenderers`, `RenderNode`, …) — same registry the editor
 *   (`@cocoar/vue-markdown-editor`) consumes so a code block, table, etc.
 *   looks identical whether the user is reading or writing.
 *
 * Apps overriding renderers can either:
 * - Pass a `renderers` prop to `<CoarMarkdown>` for a per-instance override.
 * - Call `app.provide(MARKDOWN_RENDERERS_KEY, ...)` for an app-wide default.
 */

// User-facing viewer component
export { default as CoarMarkdown } from './CoarMarkdown.vue';
export type { CoarMarkdownProps } from './CoarMarkdown.vue';

// Registry interface + provide/inject key + name resolver
export { MARKDOWN_RENDERERS_KEY, rendererNameFor } from './registry';
export type {
  MarkdownEditorNodeViewSpec,
  MarkdownEditorNodeViews,
  MarkdownRendererName,
  MarkdownRendererProps,
  MarkdownViewerRenderers,
} from './registry';

// Default renderer components — exported individually so consumers can swap
// just one slot (`{ ...defaultMarkdownRenderers, codeBlock: MyCustom }`).
export {
  defaultMarkdownRenderers,
  DefaultBlockquote,
  DefaultCodeBlock,
  DefaultColorSpan,
  DefaultEmbed,
  DefaultEmphasis,
  DefaultFrontmatter,
  DefaultHeading,
  DefaultImage,
  DefaultInlineCode,
  DefaultLineBreak,
  DefaultLink,
  DefaultList,
  DefaultListItem,
  DefaultParagraph,
  DefaultStrikethrough,
  DefaultStrong,
  DefaultTable,
  DefaultTableCell,
  DefaultTableRow,
  DefaultText,
  DefaultThematicBreak,
  DefaultUnsupported,
} from './default-renderers';

// Recursive dispatcher. The viewer wraps it; the editor uses it directly
// inside NodeViews when rendering markdown sub-trees outside of PM control.
export { RenderNode, renderMarkdownNodes } from './RenderNode';

// Custom-embed registry — the open `:::key{props}` → Vue component map shared
// by the viewer and the editor. `DefaultEmbed` is exported via the renderer
// block above.
export {
  EmbedRenderer,
  MARKDOWN_EMBEDS_KEY,
  resolveEmbed,
  toEmbedProps,
} from './embeds';
export type {
  EmbedDefinition,
  EmbedEditorController,
  EmbedEditorProps,
  EmbedInsertIntegration,
  EmbedRegistry,
} from './embeds';

// Node-attribute helpers — re-exported so consumers writing custom renderers
// can reuse the same parsing logic instead of re-inventing it.
export * from './helpers';
