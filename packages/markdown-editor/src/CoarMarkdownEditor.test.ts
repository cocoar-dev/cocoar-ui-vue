import { describe, it, expect, vi } from 'vitest';
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

describe('CoarMarkdownEditor — placeholder', () => {
  it('shows the placeholder overlay on an empty editor without writing it to the value', async () => {
    const onUpdate = vi.fn();
    const wrapper = mount(CoarMarkdownEditor, {
      props: {
        modelValue: '',
        placeholder: 'Write something…',
        'onUpdate:modelValue': onUpdate,
      },
      global: globalConfig,
    });
    await waitForEditorReady();

    const overlay = wrapper.element.querySelector('.coar-md-placeholder');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain('Write something…');

    // The hint is overlay-only: the document text stays empty and no model
    // update carrying the placeholder is ever emitted.
    expect(readEditorMarkdown(wrapper.element as HTMLElement).trim()).toBe('');
    const emitted = onUpdate.mock.calls.map((c) => c[0] as string).join('');
    expect(emitted).not.toContain('Write something');
  });

  it('renders the placeholder as real Markdown (not literal text)', async () => {
    const wrapper = mount(CoarMarkdownEditor, {
      props: { modelValue: '', placeholder: '**Bold** and a\n\n- list item' },
      global: globalConfig,
    });
    await waitForEditorReady();

    const overlay = wrapper.element.querySelector('.coar-md-placeholder');
    expect(overlay).not.toBeNull();
    // Markdown is rendered: bold becomes <strong>, the list becomes <li> —
    // and the raw asterisks/dashes do NOT survive as literal text.
    expect(overlay?.querySelector('strong')?.textContent).toBe('Bold');
    expect(overlay?.querySelector('li')).not.toBeNull();
    expect(overlay?.textContent).not.toContain('**');
  });

  it('hides the placeholder once the editor has content', async () => {
    const wrapper = mount(CoarMarkdownEditor, {
      props: { modelValue: 'hello', placeholder: 'Write something…' },
      global: globalConfig,
    });
    await waitForEditorReady();

    expect(wrapper.element.querySelector('.coar-md-placeholder')).toBeNull();
  });

  it('renders no placeholder overlay when none is provided', async () => {
    const wrapper = mount(CoarMarkdownEditor, {
      props: { modelValue: '' },
      global: globalConfig,
    });
    await waitForEditorReady();

    expect(wrapper.element.querySelector('.coar-md-placeholder')).toBeNull();
  });

  it('reacts to a placeholder prop change while empty', async () => {
    const wrapper = mount(CoarMarkdownEditor, {
      props: { modelValue: '', placeholder: 'First hint' },
      global: globalConfig,
    });
    await waitForEditorReady();
    expect(wrapper.element.querySelector('.coar-md-placeholder')?.textContent).toContain('First hint');

    await wrapper.setProps({ placeholder: 'Second hint' });
    await waitForEditorReady();
    const overlay = wrapper.element.querySelector('.coar-md-placeholder');
    expect(overlay?.textContent).toContain('Second hint');
    expect(overlay?.textContent).not.toContain('First hint');
  });
});

describe('CoarMarkdownEditor — frontmatter', () => {
  it('renders a leading YAML frontmatter block as a metadata card, not a collapsed heading', async () => {
    const src = '---\nname: handoff\ndescription: Do a thing\n---\n\n# Heading\n\nBody.';
    const wrapper = mount(CoarMarkdownEditor, {
      props: { modelValue: src },
      global: globalConfig,
    });
    await waitForEditorReady();

    // The frontmatter renders as the metadata card inside the editor…
    const card = wrapper.element.querySelector('.coar-md-area .coar-markdown-frontmatter');
    expect(card).not.toBeNull();
    const keys = [...card!.querySelectorAll('.coar-markdown-frontmatter__key')].map((n) => n.textContent);
    const values = [...card!.querySelectorAll('.coar-markdown-frontmatter__value')].map((n) => n.textContent);
    expect(keys).toEqual(['name', 'description']);
    expect(values).toEqual(['handoff', 'Do a thing']);

    // …and the body heading still renders as real content (the YAML did not get
    // swallowed into one giant heading).
    expect(readEditorMarkdown(wrapper.element as HTMLElement)).toContain('Heading');
  });
});

describe('CoarMarkdownEditor — source toggle', () => {
  // The floating-mode fallback toggle is a plain button — easiest to drive.
  function corner(wrapper: ReturnType<typeof mount>) {
    return wrapper.find('button.coar-md-source-corner');
  }
  // The sidebar toggle is a CoarSidebarItem (`.coar-sidebar-item` with a label).
  function sidebarToggle(wrapper: ReturnType<typeof mount>) {
    return wrapper
      .findAll('.coar-sidebar-item')
      .find((i) => /Source|Rendered/.test(i.text()));
  }

  it('is off by default — no toggle, no source textarea', async () => {
    const wrapper = mount(CoarMarkdownEditor, { props: { modelValue: '# Hi' }, global: globalConfig });
    await waitForEditorReady();
    expect(corner(wrapper).exists()).toBe(false);
    expect(wrapper.find('.coar-md-source-area').exists()).toBe(false);
    expect(wrapper.find('.coar-md-area').exists()).toBe(true);
  });

  it('floating mode: a corner toggle swaps the area to the full raw markdown (incl. frontmatter)', async () => {
    const src = '---\ntitle: T\n---\n\n# Heading\n\nBody.';
    const wrapper = mount(CoarMarkdownEditor, {
      props: { modelValue: src, sourceToggle: true },
      global: globalConfig,
    });
    await waitForEditorReady();

    expect(corner(wrapper).exists()).toBe(true);
    expect(wrapper.find('.coar-md-source-area').exists()).toBe(false);

    await corner(wrapper).trigger('mousedown');
    await waitForEditorReady();

    const textarea = wrapper.find('textarea.coar-md-source-area');
    expect(textarea.exists()).toBe(true);
    expect((textarea.element as HTMLTextAreaElement).value).toBe(src);
    // Milkdown stays mounted (the area is still there, just flagged --source).
    expect(wrapper.find('.coar-md-area--source').exists()).toBe(true);
  });

  it('fixed mode: the toggle lives in the sidebar (no corner button)', async () => {
    const wrapper = mount(CoarMarkdownEditor, {
      props: { modelValue: '# Hi', sourceToggle: true, toolbarMode: 'fixed' },
      global: globalConfig,
    });
    await waitForEditorReady();

    expect(corner(wrapper).exists()).toBe(false);
    const toggle = sidebarToggle(wrapper);
    expect(toggle).toBeTruthy();
    expect(toggle!.text()).toContain('Source');

    // Clicking it enters source mode; the sidebar then offers the way back.
    await toggle!.trigger('click');
    await waitForEditorReady();
    expect(wrapper.find('textarea.coar-md-source-area').exists()).toBe(true);
    expect(sidebarToggle(wrapper)!.text()).toContain('Rendered');
  });

  it('round-trips Source edits back to v-model and re-renders on switch back', async () => {
    let model = '---\ntitle: Old\n---\n\n# Heading\n';
    const wrapper = mount(CoarMarkdownEditor, {
      props: { modelValue: model, sourceToggle: true, 'onUpdate:modelValue': (v: string) => { model = v; } },
      global: globalConfig,
    });
    await waitForEditorReady();

    await corner(wrapper).trigger('mousedown');
    await waitForEditorReady();

    const textarea = wrapper.find('textarea.coar-md-source-area');
    (textarea.element as HTMLTextAreaElement).value = '---\ntitle: New\n---\n\n# Edited heading\n';
    await textarea.trigger('input');
    expect(model).toContain('title: New');
    expect(model).toContain('# Edited heading');

    // Switch back to Rendered → the editor re-parses the edited source.
    await wrapper.setProps({ modelValue: model });
    await corner(wrapper).trigger('mousedown');
    await waitForEditorReady();

    const values = wrapper.findAll('.coar-markdown-frontmatter__value').map((n) => n.text());
    expect(values).toContain('New');
    expect(readEditorMarkdown(wrapper.element as HTMLElement)).toContain('Edited heading');
  });
});
