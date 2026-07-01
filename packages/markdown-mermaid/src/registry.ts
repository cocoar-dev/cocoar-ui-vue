/**
 * A ready-to-spread {@link FenceRegistry} fragment that wires the `mermaid`
 * fence language to {@link CoarMermaidDiagram}. Drop it straight onto the
 * viewer:
 *
 * ```vue
 * <CoarMarkdown :doc="doc" :fence-renderers="mermaidFenceRenderers" />
 * ```
 *
 * or merge it with other fence renderers:
 * `{ ...mermaidFenceRenderers, dot: MyGraphviz }`.
 */
import type { FenceRegistry } from '@cocoar/vue-markdown';
import CoarMermaidDiagram from './CoarMermaidDiagram.vue';

export const mermaidFenceRenderers: FenceRegistry = {
  mermaid: CoarMermaidDiagram,
};
