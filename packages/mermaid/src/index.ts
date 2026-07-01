/**
 * `@cocoar/vue-mermaid` — a standalone Mermaid diagram component for Vue 3.
 *
 * `<CoarMermaidDiagram :code>` takes a Mermaid diagram source string and renders
 * it: lazy-loaded engine, client-only, `securityLevel: 'strict'`, Cocoar-themed,
 * with opt-in zoom/pan. It has **no dependency on — and no knowledge of —
 * markdown** or any embedding layer. To render ` ```mermaid ` fenced code blocks
 * inside `@cocoar/vue-markdown`, use the thin adapter `@cocoar/vue-markdown-mermaid`.
 */
export { default as CoarMermaidDiagram } from './CoarMermaidDiagram.vue';

// The Cocoar-token → Mermaid-theme bridge, exported for consumers who want to
// build their own Mermaid config.
export {
  buildMermaidThemeVariables,
  makeCssColorResolver,
  readCssTokens,
} from './internal/theme-bridge';
