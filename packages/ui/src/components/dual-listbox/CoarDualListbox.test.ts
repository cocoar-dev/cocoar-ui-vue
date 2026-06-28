import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import CoarDualListbox from './CoarDualListbox.vue';
import CoarListbox from '../listbox/CoarListbox.vue';
import type { CoarListboxOption } from '../listbox/types';

function createDataTransfer(): DataTransfer {
  const store = new Map<string, string>();
  const types: string[] = [];
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    types,
    setData(t: string, v: string) {
      if (!store.has(t)) types.push(t);
      store.set(t, v);
    },
    getData(t: string) { return store.get(t) ?? ''; },
    clearData() { store.clear(); types.length = 0; },
    setDragImage() {},
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
  } as unknown as DataTransfer;
}

const options: CoarListboxOption<string>[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
  { value: 'd', label: 'Durian' },
];

describe('CoarDualListbox', () => {
  it('splits options into available / selected by modelValue', () => {
    const w = mount(CoarDualListbox, { props: { modelValue: ['b'], options } });
    const columns = w.findAll('.coar-listbox-list');
    expect(columns).toHaveLength(2);
    const left = columns[0].findAll('.coar-listbox-item').map((el) => el.text());
    const right = columns[1].findAll('.coar-listbox-item').map((el) => el.text());
    expect(left).toEqual(['Apple', 'Cherry', 'Durian']);
    expect(right).toEqual(['Banana']);
  });

  it('moves highlighted items right on single arrow', async () => {
    const w = mount(CoarDualListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown[]) => w.setProps({ modelValue: v }),
        options,
      },
    });
    // highlight Apple in left column
    const leftItems = w.findAll('.coar-listbox-list')[0].findAll('.coar-listbox-item');
    await leftItems[0].trigger('click');
    // click "move right" (2nd button when move-all is shown)
    const buttons = w.findAll('.coar-dual-listbox-actions .coar-button');
    await buttons[1].trigger('click');
    expect(w.props('modelValue')).toEqual(['a']);
  });

  it('moves all visible items right on double arrow', async () => {
    const w = mount(CoarDualListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown[]) => w.setProps({ modelValue: v }),
        options,
      },
    });
    await nextTick();
    const buttons = w.findAll('.coar-dual-listbox-actions .coar-button');
    await buttons[0].trigger('click'); // move-all-right
    expect(w.props('modelValue')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('moves highlighted items left', async () => {
    const w = mount(CoarDualListbox, {
      props: {
        modelValue: ['a', 'b'],
        'onUpdate:modelValue': (v: unknown[]) => w.setProps({ modelValue: v }),
        options,
      },
    });
    const rightItems = w.findAll('.coar-listbox-list')[1].findAll('.coar-listbox-item');
    await rightItems[0].trigger('click'); // highlight 'a' in right col
    const buttons = w.findAll('.coar-dual-listbox-actions .coar-button');
    await buttons[2].trigger('click'); // move-left
    expect(w.props('modelValue')).toEqual(['b']);
  });

  it('double-click in available moves single item to selected', async () => {
    const w = mount(CoarDualListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown[]) => w.setProps({ modelValue: v }),
        options,
      },
    });
    const leftItems = w.findAll('.coar-listbox-list')[0].findAll('.coar-listbox-item');
    await leftItems[1].trigger('dblclick');
    expect(w.props('modelValue')).toEqual(['b']);
  });

  it('emits move events with direction and values', async () => {
    const w = mount(CoarDualListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown[]) => w.setProps({ modelValue: v }),
        options,
      },
    });
    const leftItems = w.findAll('.coar-listbox-list')[0].findAll('.coar-listbox-item');
    await leftItems[0].trigger('dblclick');
    const emitted = w.emitted('move');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toEqual({ direction: 'right', values: ['a'] });
  });

  it('hides move-all buttons when hideMoveAll=true', () => {
    const w = mount(CoarDualListbox, { props: { options, hideMoveAll: true } });
    expect(w.findAll('.coar-dual-listbox-actions .coar-button')).toHaveLength(2);
  });

  it('forwards #item slot to both sides', () => {
    const w = mount(CoarDualListbox, {
      props: { modelValue: ['a'], options },
      slots: {
        item: `<template #item="{ item, side }"><span :class="'x-' + side">X:{{ item.label }}</span></template>`,
      },
    });
    expect(w.findAll('.x-available').length).toBeGreaterThan(0);
    expect(w.findAll('.x-selected').length).toBe(1);
    expect(w.find('.x-selected').text()).toBe('X:Apple');
  });

  it('respects per-side empty slots', () => {
    const w = mount(CoarDualListbox, {
      props: { modelValue: [], options: [] },
      slots: {
        'empty-available': `<div class="ea">nope</div>`,
        'empty-selected': `<div class="es">none</div>`,
      },
    });
    expect(w.find('.ea').exists()).toBe(true);
    expect(w.find('.es').exists()).toBe(true);
  });

  it('preserves click order by default (sortSelectedBySource=false)', async () => {
    const w = mount(CoarDualListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown[]) => w.setProps({ modelValue: v }),
        options,
      },
    });
    // double-click in reverse order: d, then a
    const leftItems = () => w.findAll('.coar-listbox-list')[0].findAll('.coar-listbox-item');
    await leftItems()[3].trigger('dblclick');
    await nextTick();
    await leftItems()[0].trigger('dblclick');
    await nextTick();
    expect(w.props('modelValue')).toEqual(['d', 'a']);
  });

  it('sorts selected by source order when sortSelectedBySource=true', async () => {
    const w = mount(CoarDualListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown[]) => w.setProps({ modelValue: v }),
        options,
        sortSelectedBySource: true,
      },
    });
    const leftItems = () => w.findAll('.coar-listbox-list')[0].findAll('.coar-listbox-item');
    await leftItems()[3].trigger('dblclick');
    await nextTick();
    await leftItems()[0].trigger('dblclick');
    await nextTick();
    expect(w.props('modelValue')).toEqual(['a', 'd']);
  });

  it('does not mark items draggable by default', () => {
    const w = mount(CoarDualListbox, { props: { modelValue: ['a'], options } });
    const items = w.findAll('.coar-listbox-item');
    for (const item of items) {
      expect(item.attributes('draggable')).toBeUndefined();
    }
  });

  it('enables drag-drop between columns when dragDrop=true', async () => {
    const w = mount(CoarDualListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown[]) => w.setProps({ modelValue: v }),
        options,
        dragDrop: true,
      },
    });
    await nextTick();
    const listboxes = w.findAllComponents(CoarListbox);
    const leftItems = listboxes[0].findAll('.coar-listbox-item');
    expect(leftItems[0].attributes('draggable')).toBe('true');

    // Drag Apple from left, drop on right.
    const dt = createDataTransfer();
    await leftItems[0].trigger('dragstart', { dataTransfer: dt });
    const rightList = listboxes[1].find('.coar-listbox-list');
    await rightList.trigger('dragover', { dataTransfer: dt });
    await rightList.trigger('drop', { dataTransfer: dt });

    expect(w.props('modelValue')).toEqual(['a']);
  });

  it('dragDrop drop from right column back to left removes from modelValue', async () => {
    const w = mount(CoarDualListbox, {
      props: {
        modelValue: ['a', 'b'],
        'onUpdate:modelValue': (v: unknown[]) => w.setProps({ modelValue: v }),
        options,
        dragDrop: true,
      },
    });
    await nextTick();
    const listboxes = w.findAllComponents(CoarListbox);
    const rightItems = listboxes[1].findAll('.coar-listbox-item');

    const dt = createDataTransfer();
    await rightItems[0].trigger('dragstart', { dataTransfer: dt });
    const leftList = listboxes[0].find('.coar-listbox-list');
    await leftList.trigger('dragover', { dataTransfer: dt });
    await leftList.trigger('drop', { dataTransfer: dt });

    expect(w.props('modelValue')).toEqual(['b']);
  });

  it('forwards item-remove from custom components with side annotation', async () => {
    const { defineComponent, h } = await import('vue');
    const Row = defineComponent({
      props: ['item', 'api'],
      setup(p) {
        return () =>
          h('button', {
            class: 'rm',
            onClick: (e: MouseEvent) => { e.stopPropagation(); p.api.remove(); },
          }, '×');
      },
    });
    const opts: CoarListboxOption<string>[] = [
      { value: 'a', label: 'Apple', kind: 'row' },
      { value: 'b', label: 'Banana', kind: 'row' },
    ];
    const w = mount(CoarDualListbox, {
      props: { modelValue: ['a'], options: opts, itemComponents: { row: Row } },
    });

    // Right column item (selected side) — Apple. Clicking × should emit item-remove with side=selected.
    const right = w.findAllComponents(CoarListbox)[1];
    await right.find('.rm').trigger('click');
    const events = w.emitted('item-remove');
    expect(events).toBeTruthy();
    const e = events![0][0] as { item: { value: string }; side: string };
    expect(e.item.value).toBe('a');
    expect(e.side).toBe('selected');
  });

  it('exposes move actions as methods', async () => {
    const w = mount(CoarDualListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown[]) => w.setProps({ modelValue: v }),
        options,
      },
    });
    const exposed = w.vm as unknown as { moveAllRight: () => void };
    exposed.moveAllRight();
    await nextTick();
    expect(w.props('modelValue')).toEqual(['a', 'b', 'c', 'd']);
  });
});
