import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { CoarOverlayPlugin } from '@cocoar/vue-ui';
import CoarMarkdownEditor from './CoarMarkdownEditor.vue';

const globalConfig = {
  plugins: [CoarOverlayPlugin],
};

// Wait for Milkdown's async init to settle. happy-dom + ProseMirror need a
// few microtasks: useEditor schedules `Editor.make().create()` lazily,
// `loading` flips false, then our flush watcher runs replaceAll.
async function waitForEditorReady(maxFrames = 20) {
  for (let i = 0; i < maxFrames; i++) {
    await flushPromises();
    await nextTick();
  }
}

function readEditorMarkdown(rootEl: HTMLElement): string {
  // Read the rendered Milkdown DOM as a rough markdown approximation. We
  // don't round-trip through Milkdown's serializer here — we just check the
  // editor's visible text content reflects the latest model value.
  const pm = rootEl.querySelector('.ProseMirror');
  return pm?.textContent ?? '';
}

describe('CoarMarkdownEditor — external v-model sync', () => {
  it('reflects an external modelValue update that arrives before Milkdown finishes init (Bug 1)', async () => {
    const model = ref('# placeholder\n\ntype here…');
    const wrapper = mount(CoarMarkdownEditor, {
      props: { modelValue: model.value, 'onUpdate:modelValue': (v: string) => { model.value = v; } },
      global: globalConfig,
    });

    // Simulate the consumer pattern from the bug report: assign the real value
    // *before* Milkdown finishes initialising. Without the buffer-and-flush
    // fix, this update would be dropped because `getInstance()` is null and
    // `defaultValueCtx` was already captured at setup.
    model.value = '# Real content\n\nfetched from API';
    await wrapper.setProps({ modelValue: model.value });

    await waitForEditorReady();

    const text = readEditorMarkdown(wrapper.element as HTMLElement);
    expect(text).toContain('Real content');
    expect(text).toContain('fetched from API');
    expect(text).not.toContain('placeholder');
  });

  it('still applies external updates after the editor is ready', async () => {
    const wrapper = mount(CoarMarkdownEditor, { props: { modelValue: 'initial' }, global: globalConfig });
    await waitForEditorReady();

    expect(readEditorMarkdown(wrapper.element as HTMLElement)).toContain('initial');

    await wrapper.setProps({ modelValue: 'updated content' });
    await waitForEditorReady();

    const text = readEditorMarkdown(wrapper.element as HTMLElement);
    expect(text).toContain('updated content');
    expect(text).not.toContain('initial');
  });
});
