/**
 * Recursive dispatcher: looks up the right renderer for `node.type` and
 * instantiates it with `{ node, renderChildren, renderNodes }`. Children are
 * rendered by recursing into `RenderNode` for each child — no renderer needs
 * to know about the dispatcher.
 *
 * Resolution order for the registry:
 * 1. `renderers` prop (per-instance override at the root, e.g. on `CoarMarkdown`)
 * 2. `inject(MARKDOWN_RENDERERS_KEY)` (app-level override via `provide`)
 * 3. `defaultMarkdownRenderers` (built-in Cocoar defaults)
 *
 * When a root passes a `renderers` prop we re-`provide` it so descendants
 * inherit the override naturally — children just call `RenderNode` without
 * needing to repeat the prop.
 *
 * Implemented as a render-function `defineComponent` (not an SFC) because
 * the component is its own recursion target and `<script setup>` doesn't
 * have ergonomic self-reference.
 */
import {
  defineComponent,
  h,
  inject,
  provide,
  type PropType,
  type VNode,
} from 'vue';
import type { MarkdownNode } from '@cocoar/vue-markdown-core';

import { defaultMarkdownRenderers } from './default-renderers';
import {
  MARKDOWN_RENDERERS_KEY,
  rendererNameFor,
  type MarkdownViewerRenderers,
} from './registry';

export const RenderNode = defineComponent({
  name: 'RenderNode',
  props: {
    node: {
      type: Object as PropType<MarkdownNode>,
      required: true,
    },
    /** Override applied at the root; descendants inherit via inject. */
    renderers: {
      type: Object as PropType<MarkdownViewerRenderers>,
      default: undefined,
    },
  },
  setup(props) {
    const injected = inject(MARKDOWN_RENDERERS_KEY, undefined);

    // Effective registry: prop > inject > default. Computed lazily per
    // render so a reactive prop swap re-resolves cleanly.
    const resolveRegistry = (): MarkdownViewerRenderers =>
      props.renderers ?? injected ?? defaultMarkdownRenderers;

    // If we received a prop override, propagate it down so the rest of the
    // subtree inherits without each child needing the same prop.
    if (props.renderers) {
      provide(MARKDOWN_RENDERERS_KEY, props.renderers);
    }

    const renderNodes = (nodes: readonly MarkdownNode[]): VNode[] =>
      nodes.map((child) => h(RenderNode, { node: child, key: child.id }));

    const renderChildren = (): VNode[] => renderNodes(props.node.children ?? []);

    return () => {
      const registry = resolveRegistry();
      const renderer = registry[rendererNameFor(props.node.type)];
      return h(renderer, {
        node: props.node,
        renderChildren,
        renderNodes,
      });
    };
  },
});

/**
 * Convenience helper for the (rare) case where a host wants to render a
 * sequence of nodes without going through the dispatcher's prop interface.
 * Mostly used by the viewer's outer `CoarMarkdown` to render the parsed root.
 */
export function renderMarkdownNodes(
  nodes: readonly MarkdownNode[],
  renderers?: MarkdownViewerRenderers,
): VNode[] {
  return nodes.map((node) =>
    h(RenderNode, { node, renderers, key: node.id }),
  );
}
