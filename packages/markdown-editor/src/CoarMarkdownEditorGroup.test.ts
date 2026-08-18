import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import {
  defineComponent, h, inject, nextTick, onBeforeUnmount, onMounted,
} from 'vue';
import CoarMarkdownEditorGroup from './CoarMarkdownEditorGroup.vue';
import CoarMarkdownToolbar from './CoarMarkdownToolbar.vue';
import { MARKDOWN_EDITOR_GROUP_KEY } from './editor-group';

const FakeEditor = defineComponent({
  props: {
    editorId: { type: String, required: true },
    tools: { type: String, required: true },
  },
  setup(props) {
    const group = inject(MARKDOWN_EDITOR_GROUP_KEY)!;
    let unregister: (() => void) | undefined;

    onMounted(() => {
      unregister = group.register({
        id: props.editorId,
        render: () => h('button', { class: 'fake-tool' }, props.tools),
      });
    });
    onBeforeUnmount(() => unregister?.());

    return () => h('div', {
      class: 'fake-editor',
      'data-editor-id': props.editorId,
      tabindex: 0,
      onFocusin: () => group.activate(props.editorId),
      onFocusout: () => group.deactivate(props.editorId),
    });
  },
});

describe('CoarMarkdownEditorGroup', () => {
  it('keeps one toolbar host and switches only its active controller on focus', async () => {
    const wrapper = mount(defineComponent({
      setup: () => () => h(CoarMarkdownEditorGroup, null, {
        default: () => [
          h(CoarMarkdownToolbar, { position: 'top' }),
          h(FakeEditor, { editorId: 'root', tools: 'Bold · Page' }),
          h(FakeEditor, { editorId: 'nested', tools: 'Bold · List' }),
        ],
      }),
    }));
    await nextTick();

    const toolbarBefore = wrapper.get('.coar-md-external-toolbar').element;
    expect(wrapper.findAll('.coar-md-external-toolbar')).toHaveLength(1);
    expect(toolbarBefore.getAttribute('data-active-editor')).toBeNull();
    expect(toolbarBefore.getAttribute('aria-disabled')).toBe('true');
    expect(toolbarBefore.hasAttribute('inert')).toBe(true);
    expect(toolbarBefore.textContent).toContain('Page');

    await wrapper.get('[data-editor-id="nested"]').trigger('focusin');
    await nextTick();

    const toolbarAfter = wrapper.get('.coar-md-external-toolbar').element;
    expect(toolbarAfter).toBe(toolbarBefore);
    expect(toolbarAfter.getAttribute('data-active-editor')).toBe('nested');
    expect(toolbarAfter.getAttribute('aria-disabled')).toBeNull();
    expect(toolbarAfter.hasAttribute('inert')).toBe(false);
    expect(toolbarAfter.textContent).toContain('List');
    expect(toolbarAfter.textContent).not.toContain('Page');

    await wrapper.get('[data-editor-id="nested"]').trigger('focusout');
    await nextTick();

    const toolbarInactive = wrapper.get('.coar-md-external-toolbar').element;
    expect(toolbarInactive).toBe(toolbarBefore);
    expect(toolbarInactive.getAttribute('data-active-editor')).toBeNull();
    expect(toolbarInactive.getAttribute('aria-disabled')).toBe('true');
    expect(toolbarInactive.hasAttribute('inert')).toBe(true);
    expect(toolbarInactive.textContent).toContain('List');
  });
});
