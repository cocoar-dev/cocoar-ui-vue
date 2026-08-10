import { describe, it, expect } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import CoarPageBuilder from '../CoarPageBuilder.vue';
import type { PageNode } from '../schema';
import { DEFAULT_ELEMENT_CODE, setElementQuickProperty } from '../pageCode';

/**
 * Quick Properties sit next to the canvas and are read as a description of what
 * the canvas shows. Reading the BASE style instead of the resolved one made
 * them contradict it: a node hidden on Compact and revealed on Desktop read
 * "Hidden = on" while sitting plainly visible in front of the author.
 */
function mountBuilder(schema: PageNode) {
  const Host = defineComponent({
    components: { CoarPageBuilder },
    setup() {
      const model = ref<PageNode | undefined>(schema);
      return { model };
    },
    template: '<div style="height: 600px"><CoarPageBuilder v-model="model" authoring-mode="code" /></div>',
  });
  return mount(Host);
}

async function selectLastNode(wrapper: ReturnType<typeof mountBuilder>) {
  await wrapper.get('button[title="Structure"]').trigger('click');
  await nextTick();
  const rows = wrapper.findAll('.pb-tree-row');
  await rows[rows.length - 1].trigger('click');
  await nextTick();
  await nextTick();
}

async function pickViewport(wrapper: ReturnType<typeof mountBuilder>, title: string) {
  await wrapper.get(`button[title="${title}"]`).trigger('click');
  await nextTick();
  await nextTick();
}

/** The quick-property row carrying a given label. */
function quickRow(wrapper: ReturnType<typeof mountBuilder>, label: string) {
  return wrapper.findAll('.pb-props__quick-property').find((row) => row.text().includes(label));
}

const RESPONSIVE_HEADING: PageNode = {
  id: 'r',
  type: 'page',
  children: [{
    id: 'h',
    type: 'heading',
    name: 'title',
    props: { text: 'Hello', level: 2 },
    style: { hidden: true, width: '100%' },
    responsive: { desktop: { hidden: false, width: '480px' } },
  }],
} as unknown as PageNode;

describe('Quick Properties — responsive resolution', () => {
  it('shows the value that applies at the authored breakpoint, not the base', async () => {
    const wrapper = mountBuilder(RESPONSIVE_HEADING);
    await nextTick();
    await selectLastNode(wrapper);

    // Desktop is the builder's initial breakpoint, and the Desktop override wins.
    const desktopRow = quickRow(wrapper, 'Hidden')!;
    expect((desktopRow.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false);

    await pickViewport(wrapper, '320 × 568');
    const compactRow = quickRow(wrapper, 'Hidden')!;
    expect((compactRow.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true);
  });

  it('resolves text-valued style properties the same way', async () => {
    const wrapper = mountBuilder(RESPONSIVE_HEADING);
    await nextTick();
    await selectLastNode(wrapper);

    const value = () => (quickRow(wrapper, 'Width')!.get('input[type="text"]').element as HTMLInputElement).value;
    expect(value()).toBe('480px');

    await pickViewport(wrapper, '768 × 1024');
    // No Tablet override — the cascade falls back to the base.
    expect(value()).toBe('100%');
  });

  it('marks a value that came from an override, so flattening it is a choice', async () => {
    const wrapper = mountBuilder(RESPONSIVE_HEADING);
    await nextTick();
    await selectLastNode(wrapper);

    expect(quickRow(wrapper, 'Hidden')!.find('.pb-props__quick-from').text()).toBe('Desktop');

    await pickViewport(wrapper, '320 × 568');
    expect(quickRow(wrapper, 'Hidden')!.find('.pb-props__quick-from').exists()).toBe(false);
  });

  it('leaves a node without overrides unmarked and unchanged', async () => {
    const wrapper = mountBuilder({
      id: 'r',
      type: 'page',
      children: [{
        id: 'h',
        type: 'heading',
        name: 'title',
        props: { text: 'Hello', level: 2 },
        style: { hidden: true },
      }],
    } as unknown as PageNode);
    await nextTick();
    await selectLastNode(wrapper);

    const row = quickRow(wrapper, 'Hidden')!;
    expect((row.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true);
    expect(row.find('.pb-props__quick-from').exists()).toBe(false);
  });

  it('an explicit Quick Property assignment still wins over the cascade', async () => {
    const wrapper = mountBuilder({
      id: 'r',
      type: 'page',
      children: [{
        id: 'h',
        type: 'heading',
        name: 'title',
        props: { text: 'Hello', level: 2 },
        style: { hidden: true },
        responsive: { desktop: { hidden: false } },
        elementCode: setElementQuickProperty(DEFAULT_ELEMENT_CODE, 'style.hidden', true),
      }],
    } as unknown as PageNode);
    await nextTick();
    await selectLastNode(wrapper);

    const row = quickRow(wrapper, 'Hidden')!;
    expect((row.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true);
    // The assignment applies everywhere, so there is no override to point at.
    expect(row.find('.pb-props__quick-from').exists()).toBe(false);
  });
});
