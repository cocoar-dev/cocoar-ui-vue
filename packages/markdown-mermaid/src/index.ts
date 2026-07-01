/**
 * `@cocoar/vue-markdown-mermaid` — the thin adapter that plugs
 * `@cocoar/vue-mermaid`'s diagram renderer into `@cocoar/vue-markdown` as a
 * fenced-code-block renderer, so ` ```mermaid ` blocks render as diagrams.
 *
 * This package is ONLY the markdown integration (the fence registry). The
 * diagram component itself, its theming and zoom/pan live in the standalone,
 * markdown-free `@cocoar/vue-mermaid` — import `CoarMermaidDiagram` from there to
 * render diagrams outside of markdown.
 *
 * Registering it is the opt-in; a fence with no registered renderer stays a
 * readable code block, so the markdown stays portable.
 */
export {
  createMermaidFenceRenderers,
  mermaidFenceRenderers,
  type MermaidFenceOptions,
} from './registry';
