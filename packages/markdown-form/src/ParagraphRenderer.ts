import { defineComponent, h, type PropType, type VNode } from 'vue';
import type { MarkdownNode } from '@cocoar/vue-markdown-core';
import type { MarkdownFormFieldLayout } from './types';
import { parseInlineMarkdownFormFields } from './template-parser';

function fieldLayout(node: MarkdownNode): MarkdownFormFieldLayout | null {
  if (node.type === 'text' && node.text) {
    for (const segment of parseInlineMarkdownFormFields(node.text, node.id)) {
      if (segment.type === 'field' && segment.field.layout !== 'inline')
        return segment.field.layout;
    }
  }
  for (const child of node.children ?? []) {
    const layout = fieldLayout(child);
    if (layout) return layout;
  }
  return null;
}

export default defineComponent({
  name: 'CoarMarkdownFormParagraphRenderer',
  props: {
    node: { type: Object as PropType<MarkdownNode>, required: true },
    renderChildren: { type: Function as PropType<() => VNode[]>, required: true },
    renderNodes: {
      type: Function as PropType<(nodes: readonly MarkdownNode[]) => VNode[]>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const layout = fieldLayout(props.node);
      return h(
        'p',
        {
          class: [
            'coar-markdown-paragraph',
            layout === 'row' || layout === 'stacked'
              ? `coar-markdown-form-paragraph--${layout}`
              : undefined,
          ],
        },
        props.renderChildren(),
      );
    };
  },
});
