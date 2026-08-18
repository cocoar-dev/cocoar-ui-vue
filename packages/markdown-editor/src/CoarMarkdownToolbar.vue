<script lang="ts">
import { defineComponent, h, inject, watch, type PropType } from 'vue';
import {
  MARKDOWN_EDITOR_GROUP_KEY,
  type MarkdownEditorGroupToolbarPosition,
} from './editor-group';

export default defineComponent({
  name: 'CoarMarkdownToolbar',
  props: {
    position: {
      type: String as PropType<MarkdownEditorGroupToolbarPosition>,
      default: 'top',
    },
    label: { type: String, default: 'Markdown formatting' },
  },
  setup(props) {
    const group = inject(MARKDOWN_EDITOR_GROUP_KEY, undefined);
    watch(() => props.position, (position) => {
      if (group) group.position.value = position;
    }, { immediate: true });

    return () => {
      const toolbar = group?.activeController.value?.render();
      const disabled = group?.activeId.value == null;
      return h('div', {
        class: [
          'coar-md-external-toolbar',
          `coar-md-external-toolbar--${props.position}`,
          { 'coar-md-external-toolbar--disabled': disabled },
        ],
        role: 'toolbar',
        'aria-label': props.label,
        'aria-disabled': disabled ? 'true' : undefined,
        inert: disabled ? '' : undefined,
        'data-active-editor': group?.activeId.value ?? undefined,
      }, toolbar == null ? [] : [toolbar]);
    };
  },
});
</script>

<style>
.coar-md-external-toolbar {
  display: flex;
  min-width: 0;
  min-height: 2.25rem;
  overflow: visible;
  background: var(--coar-background-neutral-secondary);
}

.coar-md-external-toolbar--disabled {
  cursor: not-allowed;
  filter: saturate(0.35);
  opacity: 0.42;
}

.coar-md-external-toolbar--disabled > * {
  pointer-events: none;
}

.coar-md-external-toolbar--left,
.coar-md-external-toolbar--right {
  width: 2.25rem;
  min-height: 0;
}
</style>
