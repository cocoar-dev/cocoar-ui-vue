import { defineComponent, h, type PropType, type VNode } from 'vue';
import type { MarkdownNode } from '@cocoar/vue-markdown-core';
import FieldHost from './FieldHost.vue';
import { parseInlineMarkdownFormFields } from './template-parser';

export default defineComponent({
  name: 'CoarMarkdownFormTextRenderer',
  props: {
    node: { type: Object as PropType<MarkdownNode>, required: true },
    renderChildren: { type: Function as PropType<() => VNode[]>, required: true },
    renderNodes: {
      type: Function as PropType<(nodes: readonly MarkdownNode[]) => VNode[]>,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h(
        'span',
        { class: 'coar-markdown-form-text-fragment' },
        parseInlineMarkdownFormFields(props.node.text ?? '', props.node.id).map((segment, index) =>
          segment.type === 'text'
            ? segment.text
            : h(FieldHost, { key: `${segment.field.occurrenceId}:${index}`, field: segment.field }),
        ),
      );
  },
});
