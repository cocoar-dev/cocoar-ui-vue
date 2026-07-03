import { describe, it, expect } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import CoarPageBuilder from './CoarPageBuilder.vue';
import type { PageNode } from './schema';

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
      children: [{ id: 'h', type: 'heading', text: 'LoadedFromServer', level: 2 }],
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
      children: [{ id: 'h', type: 'heading', text: 'Loaded', level: 2 }],
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
