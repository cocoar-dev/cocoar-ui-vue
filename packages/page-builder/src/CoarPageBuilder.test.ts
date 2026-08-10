import { describe, it, expect } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import CoarPageBuilder from './CoarPageBuilder.vue';
import type { PageConfig, PageNode } from './schema';

/**
 * The documented host pattern: bind an initially-empty ref, load the schema
 * asynchronously, save whatever the ref holds. Regression: the builder froze
 * its v-model decision at setup — a late-arriving schema never displayed and
 * edits never emitted, so "save" persisted undefined.
 */
function mountHost() {
  const Host = defineComponent({
    components: { CoarPageBuilder },
    setup() {
      const schema = ref<PageNode | undefined>(undefined);
      return { schema };
    },
    template: '<div style="height: 600px"><CoarPageBuilder v-model="schema" /></div>',
  });
  return mount(Host);
}

describe('CoarPageBuilder — v-model wiring', () => {
  it('seeds an initially-undefined model so the host never saves undefined', async () => {
    const wrapper = mountHost();
    await nextTick();
    expect(wrapper.vm.schema).toBeDefined();
    expect(wrapper.vm.schema!.type).toBe('page');
  });

  it('displays a schema the host loads AFTER mount', async () => {
    const wrapper = mountHost();
    await nextTick();

    wrapper.vm.schema = {
      id: 'r',
      type: 'page',
      children: [{ id: 'h', type: 'heading', props: { text: 'LoadedFromServer', level: 2 } }],
    };
    await nextTick();

    expect(wrapper.text()).toContain('LoadedFromServer');
  });

  it('does not treat the deep-ref proxy echo of its own emit as an external replacement', async () => {
    // Hosts typically hold the schema in a deep ref, which hands the emitted
    // tree back wrapped in a reactive proxy. That echo must NOT round-trip into
    // replaceSchema (it would add a history entry and reset the selection).
    const wrapper = mountHost();
    await nextTick();
    const emitsAfterSeed = wrapper.findComponent(CoarPageBuilder).emitted('update:modelValue')?.length ?? 0;

    wrapper.vm.schema = {
      id: 'r',
      type: 'page',
      children: [{ id: 'h', type: 'heading', props: { text: 'Loaded', level: 2 } }],
    };
    await nextTick();
    await nextTick();

    const emits = wrapper.findComponent(CoarPageBuilder).emitted('update:modelValue')?.length ?? 0;
    // One external assignment → at most one replace + one echo; no ping-pong.
    expect(emits - emitsAfterSeed).toBeLessThanOrEqual(2);
    // And the echo must not have re-replaced the working tree: the builder
    // still reports the SAME tree the host holds (raw-identical).
    expect(wrapper.text()).toContain('Loaded');
  });

  function mountWithConfig(config: PageConfig, authoringMode: 'properties' | 'code' = 'properties') {
    const Host = defineComponent({
      components: { CoarPageBuilder },
      setup() {
        const schema = ref<PageNode | undefined>(undefined);
        return { schema, config, authoringMode };
      },
      template: '<div style="height: 600px"><CoarPageBuilder v-model="schema" :config="config" :authoring-mode="authoringMode" /></div>',
    });
    return mount(Host);
  }

  async function openTool(wrapper: ReturnType<typeof mountWithConfig>, title: 'Insert elements' | 'Structure') {
    await wrapper.get(`button[title="${title}"]`).trigger('click');
    await nextTick();
  }

  it('renders the registry as collapsible Containers / Elements groups', async () => {
    const wrapper = mountWithConfig({});
    await nextTick();
    expect(wrapper.find('[aria-label="Element library"]').exists()).toBe(false);
    await openTool(wrapper, 'Insert elements');

    const cards = (group: string) => wrapper
      .find(`[data-palette-group="${group}"]`)
      .findAll('.pb-library__item')
      .map((card) => card.text());

    expect(cards('containers')).toContain('Card');
    expect(cards('elements')).toContain('Text Input');
    expect(cards('elements')).toContain('Checkbox');
    expect(cards('elements')).toContain('Heading');
    expect(cards('elements')).toContain('Button');

    const elementsGroup = wrapper.find('[data-palette-group="elements"]');
    const toggle = elementsGroup.find('.pb-library__group-toggle');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(elementsGroup.findAll('.pb-library__item')).toHaveLength(0);
  });

  it('hideElementPicker removes free inputs while containers, content, actions and fields stay', async () => {
    const wrapper = mountWithConfig({
      hideElementPicker: true,
      dataContract: [{ name: 'email', valueType: 'string', label: 'Email' }],
    });
    await nextTick();
    await openTool(wrapper, 'Insert elements');

    expect(wrapper.find('[data-palette-group="containers"]').exists()).toBe(true);
    expect(wrapper.find('[data-palette-group="elements"]').exists()).toBe(true);
    expect(wrapper.find('[data-palette-group="fields"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-palette-group]').map((group) => group.attributes('data-palette-group')))
      .toEqual(['fields', 'containers', 'elements']);

    const cards = wrapper.findAll('.pb-library__item').map((c) => c.text());
    expect(cards).toContain('Heading');
    expect(cards).toContain('Button');
    expect(cards).not.toContain('Text Input'); // free inputs come from the contract
  });

  it('offers separate Page State and Page Code entry points for the root', async () => {
    const wrapper = mountWithConfig({}, 'code');
    await nextTick();
    await openTool(wrapper, 'Structure');
    const rootRow = wrapper.find('.pb-tree-row');
    await rootRow.trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('Edit Page State');
    expect(wrapper.text()).toContain('Add Page Code');
  });

  it.each(['button', 'link'] as const)('shows the same action key/value editor for %s elements', async (type) => {
    const wrapper = mountWithConfig({});
    await nextTick();
    wrapper.vm.schema = {
      id: 'r', type: 'page', children: [{
        id: 'action-node', type, name: `${type}Action`,
        props: { label: type === 'button' ? 'Run' : 'Open', action: 'run' },
      }],
    } as PageNode;
    await nextTick();
    await nextTick();
    await openTool(wrapper, 'Structure');

    const rows = wrapper.findAll('.pb-tree-row');
    await rows[1].trigger('click');
    await nextTick();

    const editor = wrapper.find('[data-testid="action-props-editor"]');
    expect(editor.exists()).toBe(true);
    expect(editor.text()).toContain('Static action values');
    expect(editor.text()).toContain('Dynamic action value');

    await editor.find('[data-testid="add-action-value"]').trigger('click');
    await editor.find('[data-testid="action-value-key"] input').setValue('language');
    await editor.find('[data-testid="action-value-json"] input').setValue('"de"');
    await nextTick();

    const actionNode = (wrapper.vm.schema as PageNode & { children: PageNode[] }).children[0] as {
      props: { actionValues?: Record<string, unknown> };
      bindings?: Record<string, unknown>;
    };
    expect(actionNode.props.actionValues).toEqual({ language: 'de' });

    await editor.find('.pb-action-values__row .pb-bindable-property__mode').trigger('click');
    await nextTick();
    const updatedActionNode = (wrapper.vm.schema as PageNode & { children: PageNode[] }).children[0] as {
      bindings?: Record<string, { source?: string; expression?: string }>;
    };
    expect(updatedActionNode.bindings?.['actionValues.language']).toEqual(expect.objectContaining({
      source: 'expression',
      expression: '"de"',
    }));

    await editor.find('[data-testid="action-value-key"] input').setValue('locale');
    await nextTick();
    const renamedActionNode = (wrapper.vm.schema as PageNode & { children: PageNode[] }).children[0] as {
      bindings?: Record<string, { source?: string }>;
    };
    expect(renamedActionNode.bindings?.['actionValues.language']).toBeUndefined();
    expect(renamedActionNode.bindings?.['actionValues.locale']?.source).toBe('expression');
  });

  // Preview inputs are the host's to supply. Without the ones its own config
  // declares, the sandbox would run against invented data, so it stays off and
  // says so rather than showing a page nobody can trust.
  it('refuses to preview until the host supplies the inputs its config declares', async () => {
    const wrapper = mountWithConfig({
      contextFields: [{ path: 'auth.enabled', type: 'boolean' }],
      locales: [{ id: 'en', label: 'English' }],
    });
    await nextTick();
    const previewTab = wrapper.findAll('button').find((button) => button.text().trim() === 'Preview');
    await previewTab!.trigger('click');
    await nextTick();

    expect(wrapper.find('.pb-builder__preview-empty').exists()).toBe(true);
    expect(wrapper.text()).toContain('Preview values are missing');
  });

  it('scopes previewTheme to the embedded renderer canvas', async () => {
    const Host = defineComponent({
      components: { CoarPageBuilder },
      setup() {
        const schema = ref<PageNode>({ id: 'r', type: 'page', children: [] });
        return { schema };
      },
      template: `<div style="height: 600px">
        <CoarPageBuilder
          v-model="schema"
          :preview-theme="{ accent: '#10b981', inputRadius: 14 }"
          preview-theme-mode="dark"
        />
      </div>`,
    });
    const wrapper = mount(Host);
    await nextTick();
    const previewTab = wrapper.findAll('button').find((button) => button.text().trim() === 'Preview');
    await previewTab!.trigger('click');
    await nextTick();

    const scope = wrapper.find('.pb-builder__preview-frame .coar-theme-scope');
    expect(scope.exists()).toBe(true);
    expect(scope.classes()).toContain('dark-mode');
    expect(scope.attributes('style')).toContain('--coar-accent: #10b981');
    expect(wrapper.find('.pb-builder').classes()).not.toContain('dark-mode');
  });

  it('normalizes an externally-assigned schema (legacy types, duplicate ids) before use', async () => {
    const wrapper = mountHost();
    await nextTick();

    wrapper.vm.schema = {
      id: 'r',
      type: 'column',
      children: [
        { id: 'dup', type: 'paragraph', text: 'one' },
        { id: 'dup', type: 'paragraph', text: 'two' },
      ],
    } as unknown as PageNode;
    await nextTick();

    // The host's ref now holds the healed tree: page root (wrapped stack) + unique ids.
    const healed = wrapper.vm.schema!;
    expect(healed.type).toBe('page');
    const stack = (healed as { children: PageNode[] }).children[0] as {
      type: string;
      children: { id: string }[];
    };
    expect(stack.type).toBe('stack');
    expect(stack.children[0].id).not.toBe(stack.children[1].id);
  });
});

/**
 * The builder draws its findings itself, but a host embedding it needs the same
 * list — to gate a save button, to render its own issue panel. Before this the
 * findings were reachable only through an internal provide.
 */
describe('CoarPageBuilder — findings emit', () => {
  function emittedFindings(wrapper: ReturnType<typeof mountHost>) {
    return (wrapper.findComponent(CoarPageBuilder).emitted('findings') ?? []) as Array<[
      Array<{ nodeId: string; field?: string; severity: string; message: string }>,
    ]>;
  }

  it('emits on mount, so a host that never edits still knows the state', async () => {
    const wrapper = mountHost();
    await nextTick();
    expect(emittedFindings(wrapper).length).toBeGreaterThanOrEqual(1);
  });

  it('reports a finding the author introduced', async () => {
    const wrapper = mountHost();
    await nextTick();

    wrapper.vm.schema = {
      id: 'r',
      type: 'page',
      style: { height: '100vh' },
      children: [],
    } as unknown as PageNode;
    await nextTick();
    await nextTick();

    const last = emittedFindings(wrapper).at(-1)![0];
    expect(last.some((issue) => issue.field === 'style' && /host container/.test(issue.message))).toBe(true);
  });

  it('stays quiet when an edit leaves the findings untouched', async () => {
    const wrapper = mountHost();
    await nextTick();

    wrapper.vm.schema = {
      id: 'r',
      type: 'page',
      children: [{ id: 'h', type: 'heading', name: 'title', props: { text: 'One', level: 2 } }],
    } as unknown as PageNode;
    await nextTick();
    await nextTick();
    const before = emittedFindings(wrapper).length;

    // Same findings, different text — a keystroke must not wake the host.
    wrapper.vm.schema = {
      id: 'r',
      type: 'page',
      children: [{ id: 'h', type: 'heading', name: 'title', props: { text: 'Two', level: 2 } }],
    } as unknown as PageNode;
    await nextTick();
    await nextTick();

    expect(emittedFindings(wrapper).length).toBe(before);
  });

  it('hands out a copy — a host mutating the payload cannot corrupt the builder', async () => {
    const wrapper = mountHost();
    await nextTick();

    wrapper.vm.schema = {
      id: 'r',
      type: 'page',
      style: { height: '100vh' },
      children: [],
    } as unknown as PageNode;
    await nextTick();
    await nextTick();

    const payload = emittedFindings(wrapper).at(-1)![0];
    const first = payload[0];
    first.message = 'tampered';

    // Re-emit with a genuinely different finding set, then back again: the
    // builder's own list must still carry the original text.
    wrapper.vm.schema = { id: 'r', type: 'page', children: [] } as unknown as PageNode;
    await nextTick();
    await nextTick();
    wrapper.vm.schema = {
      id: 'r',
      type: 'page',
      style: { height: '100vh' },
      children: [],
    } as unknown as PageNode;
    await nextTick();
    await nextTick();

    expect(emittedFindings(wrapper).at(-1)![0][0].message).not.toBe('tampered');
  });
});

/**
 * `defaultValue` is what the author wrote; `initialValues` is what the host
 * computed — a per-tenant setting, a record loaded for editing. The runtime
 * merges the second over the first, and the preview has to show the same thing
 * or it is showing a page that never exists.
 */
describe('CoarPageBuilder — preview initial values', () => {
  function mountWithValues(initialValues?: Record<string, unknown>) {
    const Host = defineComponent({
      components: { CoarPageBuilder },
      setup() {
        const schema = ref<PageNode | undefined>({
          id: 'r',
          type: 'page',
          children: [
            { id: 'u', type: 'text-input', name: 'username', props: { label: 'User' }, defaultValue: 'authored' },
            { id: 'r2', type: 'checkbox', name: 'rememberMe', props: { label: 'Remember me' }, defaultValue: false },
          ],
        } as unknown as PageNode);
        // A plain setup return is not reactive — the swap test needs a ref.
        return { schema, initialValues: ref(initialValues) };
      },
      template: '<div style="height: 600px"><CoarPageBuilder v-model="schema" :preview-initial-values="initialValues" /></div>',
    });
    return mount(Host);
  }

  async function openPreview(wrapper: ReturnType<typeof mountWithValues>) {
    const tab = wrapper.findAll('button').find((button) => button.text().trim() === 'Preview');
    await tab!.trigger('click');
    await nextTick();
    await nextTick();
    // Scoped to the rendered page: the preview toolbar carries its own text
    // input (the zoom percentage), which an unscoped lookup finds first.
    const page = wrapper.find('.pb-builder__preview-pane .pb-page');
    return {
      text: (page.find('input[type="text"]').element as HTMLInputElement | undefined)?.value,
      checked: (page.find('input[type="checkbox"]').element as HTMLInputElement | undefined)?.checked,
    };
  }

  it('starts the preview from the authored defaults when the host supplies none', async () => {
    const wrapper = mountWithValues();
    await nextTick();
    expect(await openPreview(wrapper)).toEqual({ text: 'authored', checked: false });
  });

  it('lets host values win, the same way the runtime resolves them', async () => {
    const wrapper = mountWithValues({ username: 'from-backend', rememberMe: true });
    await nextTick();
    expect(await openPreview(wrapper)).toEqual({ text: 'from-backend', checked: true });
  });

  it('re-seeds the preview when the host swaps the values', async () => {
    const wrapper = mountWithValues({ username: 'first', rememberMe: false });
    await nextTick();
    expect((await openPreview(wrapper)).text).toBe('first');

    wrapper.vm.initialValues = { username: 'second', rememberMe: true };
    await nextTick();
    await nextTick();

    const page = wrapper.find('.pb-builder__preview-pane .pb-page');
    expect((page.find('input[type="text"]').element as HTMLInputElement).value).toBe('second');
    expect((page.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true);
  });
});
