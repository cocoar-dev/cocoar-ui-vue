/**
 * `@cocoar/vue-markdown-mermaid` — opt-in Mermaid diagram renderer for
 * `@cocoar/vue-markdown`.
 *
 * The markdown packages know nothing about Mermaid; installing this package and
 * passing {@link mermaidFenceRenderers} to `<CoarMarkdown :fence-renderers>` is
 * the opt-in that turns ` ```mermaid ` fenced code blocks into diagrams. A
 * consumer that doesn't opt in still gets a readable, syntax-highlighted code
 * block — the markdown stays portable.
 */
export { default as CoarMermaidDiagram } from './CoarMermaidDiagram.vue';
export {
  createMermaidFenceRenderers,
  mermaidFenceRenderers,
  type MermaidFenceOptions,
} from './registry';

// The Cocoar-token → Mermaid-theme bridge, exported for consumers who want to
// build their own Mermaid config (e.g. a bespoke registration).
export {
  buildMermaidThemeVariables,
  makeCssColorResolver,
  readCssTokens,
} from './internal/theme-bridge';
