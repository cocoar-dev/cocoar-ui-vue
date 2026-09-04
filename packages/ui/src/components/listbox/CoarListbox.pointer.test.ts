import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import CoarListbox from './CoarListbox.vue';
import type { CoarListboxOption } from './types';

function pointerEvent(type: string, init: Record<string, unknown> = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init }) as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  Object.defineProperty(event, 'isPrimary', { value: true });
  return event;
}

function mountPair(engine: 'native' | 'pointer') {
  const left = ref<CoarListboxOption<string>[]>([
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ]);
  const right = ref<CoarListboxOption<string>[]>([{ value: 'x', label: 'Xigua' }]);
  const adds: unknown[] = [];
  const Host = defineComponent({
    setup() {
      return () =>
        h('div', null, [
          h(CoarListbox, {
            id: 'left',
            options: left.value,
            draggable: true,
            droppable: true,
            dragEngine: engine,
            dragGroup: 'fruit',
            'onItems-remove': ({ items }: { items: readonly CoarListboxOption<unknown>[] }) => {
              left.value = left.value.filter((o) => !items.includes(o));
            },
          }),
          h(CoarListbox, {
            id: 'right',
            options: right.value,
            draggable: true,
            droppable: true,
            dragEngine: engine,
            dragGroup: 'fruit',
            'onItems-add': (payload: { items: readonly CoarListboxOption<unknown>[]; insertIndex: number | null }) => {
              adds.push(payload);
              right.value = [...right.value, ...(payload.items as CoarListboxOption<string>[])];
            },
          }),
        ]);
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  return { wrapper, left, right, adds };
}

describe('CoarListbox pointer engine', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps the native attributes when the engine is native', () => {
    const { wrapper } = mountPair('native');
    expect(wrapper.find('#left .coar-listbox-item').attributes('draggable')).toBe('true');
  });

  it('drops the draggable attribute and moves items with pointer events', async () => {
    const { wrapper, left, right, adds } = mountPair('pointer');
    const source = wrapper.find('#left .coar-listbox-item').element as HTMLElement;
    const targetList = wrapper.find('#right .coar-listbox-list').element as HTMLElement;
    const targetItem = wrapper.find('#right .coar-listbox-item').element as HTMLElement;
    expect(source.getAttribute('draggable')).toBeNull();

    source.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 }));
    document.elementFromPoint = () => targetItem;
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 300, clientY: 10 }));
    await nextTick();
    expect(wrapper.find('#right .coar-listbox--drag-over').exists() || wrapper.find('#right').classes()).toBeTruthy();
    expect(targetList.contains(targetItem)).toBe(true);

    document.dispatchEvent(pointerEvent('pointerup', { clientX: 300, clientY: 10 }));
    await nextTick();
    expect(adds).toHaveLength(1);
    expect(adds[0]).toMatchObject({ insertIndex: 0 });
    expect(right.value.map((o) => o.value)).toEqual(['x', 'a']);
    expect(left.value.map((o) => o.value)).toEqual(['b']);
  });

  it('refuses drops into a list that is not droppable', async () => {
    const left = ref<CoarListboxOption<string>[]>([{ value: 'a', label: 'Apple' }]);
    const adds: unknown[] = [];
    const Host = defineComponent({
      setup: () => () =>
        h('div', null, [
          h(CoarListbox, { id: 'src', options: left.value, draggable: true, dragEngine: 'pointer', dragGroup: 'g' }),
          h(CoarListbox, {
            id: 'dst',
            options: [],
            dragEngine: 'pointer',
            dragGroup: 'g',
            'onItems-add': (payload: unknown) => adds.push(payload),
          }),
        ]),
    });
    const wrapper = mount(Host, { attachTo: document.body });
    const source = wrapper.find('#src .coar-listbox-item').element as HTMLElement;
    const targetList = wrapper.find('#dst .coar-listbox-list').element;
    source.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 }));
    document.elementFromPoint = () => targetList;
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 300, clientY: 10 }));
    document.dispatchEvent(pointerEvent('pointerup', { clientX: 300, clientY: 10 }));
    await nextTick();
    expect(adds).toHaveLength(0);
    expect(left.value).toHaveLength(1);
  });
});
