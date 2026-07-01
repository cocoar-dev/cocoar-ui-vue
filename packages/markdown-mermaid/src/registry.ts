/**
 * Fence-registry fragments for Mermaid.
 *
 * {@link mermaidFenceRenderers} is the ready-to-spread default. Drop it onto the
 * viewer:
 *
 * ```vue
 * <CoarMarkdown :doc="doc" :fence-renderers="mermaidFenceRenderers" />
 * ```
 *
 * The fence-renderer contract only passes `{ code, language }` to a registered
 * component, so per-diagram options (like zoom) can't be threaded through it.
 * {@link createMermaidFenceRenderers} solves that: it bakes options into the
 * registered component via a thin wrapper, so
 * `createMermaidFenceRenderers({ zoomable: true })` makes every ```mermaid block
 * pan/zoom-enabled. Merge with other fence renderers as usual:
 * `{ ...createMermaidFenceRenderers({ zoomable: true }), dot: MyGraphviz }`.
 */
import { defineComponent, h } from 'vue';
import type { FenceRegistry } from '@cocoar/vue-markdown';
import { CoarMermaidDiagram } from '@cocoar/vue-mermaid';

export interface MermaidFenceOptions {
  /** Enable wheel-zoom + drag-pan + double-click-reset on every diagram. */
  zoomable?: boolean;
}

/**
 * Build a `FenceRegistry` mapping the `mermaid` language to a diagram renderer
 * configured with `options`. The wrapper forwards the fence's `{ code, language }`
 * and applies the baked-in options.
 */
export function createMermaidFenceRenderers(options: MermaidFenceOptions = {}): FenceRegistry {
  const Renderer = defineComponent({
    name: 'CoarMermaidFence',
    props: {
      code: { type: String, required: true },
      language: { type: String, default: 'mermaid' },
    },
    setup(props) {
      return () =>
        h(CoarMermaidDiagram, {
          code: props.code,
          language: props.language,
          zoomable: options.zoomable ?? false,
        });
    },
  });

  return { mermaid: Renderer };
}

/** Zero-config default: renders ```mermaid blocks, no pan/zoom. */
export const mermaidFenceRenderers: FenceRegistry = createMermaidFenceRenderers();
