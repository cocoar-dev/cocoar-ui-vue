import { describe, it, expect } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import CoarPageBuilder from '../CoarPageBuilder.vue';
import type { PageConfig, PageNode } from '../schema';

/**
 * A context field with a closed `values` set is what replaced the separate
 * view-state mechanism: the condition editor offers the allowed values as a
 * dropdown, so a host state stays authorable without a second concept for it.
 */
function mountBuilder(config: PageConfig) {
  const Host = defineComponent({
    components: { CoarPageBuilder },
    setup() {
      const schema = ref<PageNode | undefined>({
        id: 'r',
        type: 'page',
        children: [{ id: 'h', type: 'heading', name: 'title', props: { text: 'Hi', level: 2 } }],
      } as PageNode);
      return { schema, config };
    },
    template: '<div style="height: 600px"><CoarPageBuilder v-model="schema" :config="config" /></div>',
  });
  return mount(Host);
}

async function selectHeadingAndPickContext(wrapper: ReturnType<typeof mountBuilder>) {
  await wrapper.get('button[title="Structure"]').trigger('click');
  await nextTick();
  const rows = wrapper.findAll('.pb-tree-row');
  await rows[rows.length - 1].trigger('click');
  await nextTick();

  const visibility = wrapper.findAll('.pb-props__section')
    .find((section) => section.text().includes('Visible when'))!;
  const sourceSelect = visibility.findAllComponents({ name: 'CoarSelect' })[0];
  await sourceSelect.vm.$emit('update:modelValue', 'context');
  await nextTick();
  await nextTick();
  return visibility;
}

const FIELD_WITH_VALUES: PageConfig = {
  contextFields: [{ path: 'runtime.viewState', type: 'string', allowedValues: ['prompt', 'denied', 'expired'] }],
};

const FIELD_WITHOUT_VALUES: PageConfig = {
  contextFields: [{ path: 'runtime.viewState', type: 'string' }],
};

describe('condition value editor', () => {
  it('offers the declared values as a dropdown', async () => {
    const wrapper = mountBuilder(FIELD_WITH_VALUES);
    await nextTick();
    const visibility = await selectHeadingAndPickContext(wrapper);

    const operator = visibility.findAllComponents({ name: 'CoarSelect' })
      .find((select) => (select.props('options') as { value: string }[])?.some((o) => o.value === 'notEquals'))!;
    await operator.vm.$emit('update:modelValue', 'equals');
    await nextTick();

    const valueSelect = visibility.findAllComponents({ name: 'CoarSelect' })
      .find((select) => (select.props('options') as { value: string }[] | undefined)
        ?.every((o) => ['prompt', 'denied', 'expired'].includes(o.value)) && (select.props('options') as unknown[]).length === 3);
    expect(valueSelect).toBeDefined();
    expect((valueSelect!.props('options') as { value: string }[]).map((o) => o.value))
      .toEqual(['prompt', 'denied', 'expired']);
  });

  it('falls back to free text when the field declares no values', async () => {
    const wrapper = mountBuilder(FIELD_WITHOUT_VALUES);
    await nextTick();
    const visibility = await selectHeadingAndPickContext(wrapper);

    const operator = visibility.findAllComponents({ name: 'CoarSelect' })
      .find((select) => (select.props('options') as { value: string }[])?.some((o) => o.value === 'notEquals'))!;
    await operator.vm.$emit('update:modelValue', 'equals');
    await nextTick();

    expect(visibility.text()).toContain('Value');
    expect(visibility.findAll('input[type="text"]').length).toBeGreaterThan(0);
  });
});
