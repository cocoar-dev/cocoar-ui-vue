import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import CoarListbox from './CoarListbox.vue';
import type { CoarListboxOption } from './types';

/** Minimal DataTransfer stub — jsdom doesn't implement it. */
function createDataTransfer(): DataTransfer {
  const store = new Map<string, string>();
  const types: string[] = [];
  const dt = {
    effectAllowed: 'none',
    dropEffect: 'none',
    types,
    setData(type: string, value: string) {
      if (!store.has(type)) types.push(type);
      store.set(type, value);
    },
    getData(type: string) {
      return store.get(type) ?? '';
    },
    clearData() { store.clear(); types.length = 0; },
    setDragImage() {},
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
  };
  return dt as unknown as DataTransfer;
}

const baseOptions: CoarListboxOption<string>[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
  { value: 'd', label: 'Disabled', disabled: true },
];

const groupedOptions: CoarListboxOption<string>[] = [
  { value: 'ap', label: 'Apple', group: 'Fruit' },
  { value: 'ba', label: 'Banana', group: 'Fruit' },
  { value: 'ca', label: 'Carrot', group: 'Vegetable' },
];

describe('CoarListbox', () => {
  it('renders every option', () => {
    const w = mount(CoarListbox, { props: { options: baseOptions } });
    const items = w.findAll('.coar-listbox-item');
    expect(items).toHaveLength(4);
    expect(items[0].text()).toBe('Apple');
  });

  it('shows empty state when options are empty', () => {
    const w = mount(CoarListbox, { props: { options: [], emptyText: 'Nothing here' } });
    expect(w.find('.coar-listbox-empty').text()).toBe('Nothing here');
  });

  it('uses header label and count', () => {
    const w = mount(CoarListbox, {
      props: { options: baseOptions, label: 'Members', showCount: true },
    });
    expect(w.find('.coar-listbox-title').text()).toBe('Members');
    expect(w.find('.coar-listbox-count').text()).toBe('4');
  });

  it('highlights on click (single selection)', async () => {
    const w = mount(CoarListbox, { props: { modelValue: [], options: baseOptions } });
    await w.findAll('.coar-listbox-item')[1].trigger('click');
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([['b']]);
  });

  it('toggles with Ctrl+click (multi-select)', async () => {
    const w = mount(CoarListbox, {
      props: {
        modelValue: ['a'],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    await w.findAll('.coar-listbox-item')[1].trigger('click', { ctrlKey: true });
    expect(w.props('modelValue')).toEqual(['a', 'b']);
    // Ctrl-click again removes
    await w.findAll('.coar-listbox-item')[1].trigger('click', { ctrlKey: true });
    expect(w.props('modelValue')).toEqual(['a']);
  });

  it('range-selects with Shift+click', async () => {
    const w = mount(CoarListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    await w.findAll('.coar-listbox-item')[0].trigger('click');
    await w.findAll('.coar-listbox-item')[2].trigger('click', { shiftKey: true });
    expect(w.props('modelValue')).toEqual(['a', 'b', 'c']);
  });

  it('does not highlight disabled items', async () => {
    const w = mount(CoarListbox, { props: { modelValue: [], options: baseOptions } });
    await w.findAll('.coar-listbox-item')[3].trigger('click');
    // 'd' is disabled; no highlight change expected
    expect(w.emitted('update:modelValue')).toBeFalsy();
  });

  it('emits item-activate on double-click', async () => {
    const w = mount(CoarListbox, { props: { options: baseOptions } });
    await w.findAll('.coar-listbox-item')[0].trigger('dblclick');
    expect(w.emitted('item-activate')).toBeTruthy();
    expect((w.emitted('item-activate')![0][0] as { item: { value: string } }).item.value).toBe('a');
  });

  it('ignores clicks when displayOnly', async () => {
    const w = mount(CoarListbox, { props: { options: baseOptions, displayOnly: true } });
    await w.findAll('.coar-listbox-item')[0].trigger('click');
    expect(w.emitted('update:modelValue')).toBeFalsy();
  });

  it('uses role=list in displayOnly mode', () => {
    const w = mount(CoarListbox, { props: { options: baseOptions, displayOnly: true } });
    expect(w.find('.coar-listbox-list').attributes('role')).toBe('list');
    expect(w.find('.coar-listbox-item').attributes('role')).toBe('listitem');
  });

  it('uses role=listbox by default', () => {
    const w = mount(CoarListbox, { props: { options: baseOptions } });
    expect(w.find('.coar-listbox-list').attributes('role')).toBe('listbox');
    expect(w.find('.coar-listbox-item').attributes('role')).toBe('option');
  });

  it('renders group headings for grouped options', () => {
    const w = mount(CoarListbox, { props: { options: groupedOptions } });
    const headings = w.findAll('.coar-listbox-group-heading').map((h) => h.text());
    expect(headings).toContain('Fruit');
    expect(headings).toContain('Vegetable');
  });

  it('hides group headings when hideGroupHeadings is set', () => {
    const w = mount(CoarListbox, { props: { options: groupedOptions, hideGroupHeadings: true } });
    expect(w.findAll('.coar-listbox-group-heading')).toHaveLength(0);
  });

  it('filters by label using searchFields=[label] (default)', async () => {
    const w = mount(CoarListbox, { props: { options: baseOptions, searchable: true } });
    const input = w.find('input');
    await input.setValue('ban');
    expect(w.findAll('.coar-listbox-item')).toHaveLength(1);
    expect(w.find('.coar-listbox-item').text()).toBe('Banana');
  });

  it('filters across searchFields', async () => {
    const opts: CoarListboxOption<string>[] = [
      { value: 'a', label: 'Apple', subtitle: 'red round' },
      { value: 'b', label: 'Banana', subtitle: 'yellow long' },
    ];
    const w = mount(CoarListbox, {
      props: { options: opts, searchable: true, searchFields: ['label', 'subtitle'] },
    });
    await w.find('input').setValue('round');
    expect(w.findAll('.coar-listbox-item')).toHaveLength(1);
    expect(w.find('.coar-listbox-item').text()).toContain('Apple');
  });

  it('supports custom searchBy', async () => {
    interface User { id: string; email: string }
    const users: CoarListboxOption<User>[] = [
      { value: { id: '1', email: 'al@x.com' }, label: 'Alice' },
      { value: { id: '2', email: 'bob@x.com' }, label: 'Bob' },
    ];
    const w = mount(CoarListbox, {
      props: {
        options: users,
        searchable: true,
        searchBy: (i: CoarListboxOption<User>) => `${i.label} ${i.value.email}`,
      },
    });
    await w.find('input').setValue('bob@');
    expect(w.findAll('.coar-listbox-item')).toHaveLength(1);
  });

  it('supports filterWith for full control', async () => {
    const w = mount(CoarListbox, {
      props: {
        options: baseOptions,
        searchable: true,
        filterWith: (i: CoarListboxOption<string>, q: string) => i.value === q,
      },
    });
    await w.find('input').setValue('c');
    expect(w.findAll('.coar-listbox-item')).toHaveLength(1);
    expect(w.find('.coar-listbox-item').text()).toBe('Cherry');
  });

  it('sorts options ascending by label when sortOptions=asc', () => {
    const unsorted: CoarListboxOption<string>[] = [
      { value: 'c', label: 'Cherry' },
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
    ];
    const w = mount(CoarListbox, { props: { options: unsorted, sortOptions: 'asc' } });
    const labels = w.findAll('.coar-listbox-item').map((el) => el.text());
    expect(labels).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('renders #item slot when provided', () => {
    const w = mount(CoarListbox, {
      props: { options: baseOptions },
      slots: { item: `<template #item="{ item }"><strong class="custom">{{ item.label }}!</strong></template>` },
    });
    expect(w.findAll('.custom').length).toBeGreaterThan(0);
    expect(w.find('.custom').text()).toBe('Apple!');
  });

  it('renders #item-<kind> slot per kind', () => {
    const opts: CoarListboxOption<string>[] = [
      { value: 'u', label: 'User One', kind: 'user' },
      { value: 't', label: 'Team One', kind: 'team' },
    ];
    const w = mount(CoarListbox, {
      props: { options: opts },
      slots: {
        'item-user': `<template #item-user="{ item }"><span class="u">U:{{ item.label }}</span></template>`,
        'item-team': `<template #item-team="{ item }"><span class="t">T:{{ item.label }}</span></template>`,
      },
    });
    expect(w.find('.u').text()).toBe('U:User One');
    expect(w.find('.t').text()).toBe('T:Team One');
  });

  it('renders custom component from itemComponents by kind', () => {
    const UserItem = defineComponent({
      props: ['item'],
      setup(p) { return () => h('span', { class: 'user-item' }, `U:${p.item.label}`); },
    });
    const opts: CoarListboxOption<string>[] = [
      { value: 'u', label: 'Alice', kind: 'user' },
      { value: 'x', label: 'Plain' },
    ];
    const w = mount(CoarListbox, {
      props: { options: opts, itemComponents: { user: UserItem } },
    });
    expect(w.find('.user-item').text()).toBe('U:Alice');
    // Plain one falls back to default renderer
    expect(w.findAll('.coar-listbox-item-label').at(-1)!.text()).toBe('Plain');
  });

  it('component-per-kind takes precedence over #item slot', () => {
    const UserItem = defineComponent({
      props: ['item'],
      setup(p) { return () => h('span', { class: 'comp' }, `C:${p.item.label}`); },
    });
    const opts: CoarListboxOption<string>[] = [{ value: 'u', label: 'Alice', kind: 'user' }];
    const w = mount(CoarListbox, {
      props: { options: opts, itemComponents: { user: UserItem } },
      slots: { item: `<template #item="{ item }"><span class="slot">S:{{ item.label }}</span></template>` },
    });
    expect(w.find('.comp').exists()).toBe(true);
    expect(w.find('.slot').exists()).toBe(false);
  });

  it('exposes clearHighlight and highlightAll', async () => {
    const w = mount(CoarListbox, {
      props: {
        modelValue: ['a'],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    const exposed = w.vm as unknown as { clearHighlight: () => void; highlightAll: () => void };
    exposed.clearHighlight();
    await nextTick();
    expect(w.props('modelValue')).toEqual([]);
    exposed.highlightAll();
    await nextTick();
    // 'd' is disabled and must be excluded
    expect(w.props('modelValue')).toEqual(['a', 'b', 'c']);
  });

  it('uses kindBy to derive kind from arbitrary field', () => {
    interface Row { type: string; name: string }
    const opts: CoarListboxOption<Row>[] = [
      { value: { type: 'user', name: 'u1' }, label: 'u1' },
      { value: { type: 'team', name: 't1' }, label: 't1' },
    ];
    const w = mount(CoarListbox, {
      props: {
        options: opts,
        kindBy: (i: CoarListboxOption<Row>) => i.value.type,
      },
      slots: {
        'item-user': `<template #item-user="{ item }"><span class="k-user">{{ item.label }}</span></template>`,
      },
    });
    expect(w.find('.k-user').exists()).toBe(true);
  });

  it('adds draggable=true to items when draggable prop is set', () => {
    const w = mount(CoarListbox, { props: { options: baseOptions, draggable: true } });
    const items = w.findAll('.coar-listbox-item');
    // First three are interactable (not disabled) — all draggable.
    expect(items[0].attributes('draggable')).toBe('true');
    expect(items[1].attributes('draggable')).toBe('true');
    expect(items[2].attributes('draggable')).toBe('true');
    // Disabled item should not be draggable.
    expect(items[3].attributes('draggable')).toBeUndefined();
  });

  it('does not mark items draggable by default', () => {
    const w = mount(CoarListbox, { props: { options: baseOptions } });
    expect(w.find('.coar-listbox-item').attributes('draggable')).toBeUndefined();
  });

  it('emits drag-start with a single item when dragged item is not highlighted', async () => {
    const w = mount(CoarListbox, { props: { options: baseOptions, draggable: true } });
    const dt = createDataTransfer();
    await w.findAll('.coar-listbox-item')[1].trigger('dragstart', { dataTransfer: dt });
    const emitted = w.emitted('drag-start');
    expect(emitted).toBeTruthy();
    const payload = emitted![0][0] as { items: { value: string }[] };
    expect(payload.items.map((i) => i.value)).toEqual(['b']);
    expect(dt.getData('application/x-coar-dnd')).toBeTruthy();
  });

  it('drags all highlighted items when the dragged one is part of the highlight', async () => {
    const w = mount(CoarListbox, {
      props: { modelValue: ['a', 'c'], options: baseOptions, draggable: true },
    });
    const dt = createDataTransfer();
    await w.findAll('.coar-listbox-item')[0].trigger('dragstart', { dataTransfer: dt });
    const payload = w.emitted('drag-start')![0][0] as { items: { value: string }[] };
    expect(payload.items.map((i) => i.value).sort()).toEqual(['a', 'c']);
  });

  it('fires items-add on drop target and items-remove on source across two lists', async () => {
    // Mount both lists inside a single wrapper so they share the same DataTransfer.
    const Host = defineComponent({
      components: { CoarListbox },
      data() {
        return {
          source: [
            { value: 'a', label: 'Apple' },
            { value: 'b', label: 'Banana' },
          ] as CoarListboxOption<string>[],
          target: [] as CoarListboxOption<string>[],
          sourceEvents: [] as unknown[],
          targetEvents: [] as unknown[],
        };
      },
      methods: {
        onSourceRemove(p: { items: CoarListboxOption<string>[] }) {
          this.sourceEvents.push(p);
          const removing = new Set(p.items.map((i) => i.value));
          this.source = this.source.filter((o) => !removing.has(o.value));
        },
        onTargetAdd(p: { items: CoarListboxOption<string>[] }) {
          this.targetEvents.push(p);
          this.target = [...this.target, ...p.items];
        },
      },
      template: `
        <div>
          <CoarListbox ref="src" :options="source" draggable drag-group="xs" @items-remove="onSourceRemove" />
          <CoarListbox ref="tgt" :options="target" droppable drag-group="xs" @items-add="onTargetAdd" />
        </div>
      `,
    });

    const w = mount(Host);
    const dt = createDataTransfer();
    const srcItem = w.findAllComponents(CoarListbox)[0].findAll('.coar-listbox-item')[0];
    await srcItem.trigger('dragstart', { dataTransfer: dt });

    const targetList = w.findAllComponents(CoarListbox)[1].find('.coar-listbox-list');
    // Simulate the types being present on the dragover (our stub adds them on setData).
    await targetList.trigger('dragover', { dataTransfer: dt });
    await targetList.trigger('drop', { dataTransfer: dt });

    expect(w.vm.target.map((o) => o.value)).toEqual(['a']);
    expect(w.vm.source.map((o) => o.value)).toEqual(['b']);
    expect(w.vm.sourceEvents).toHaveLength(1);
    expect(w.vm.targetEvents).toHaveLength(1);
  });

  it('passes an imperative api to custom item components', async () => {
    const RowWithRemove = defineComponent({
      props: ['item', 'api'],
      setup(p) {
        return () =>
          h('div', { class: 'row' }, [
            h('span', p.item.label),
            h('button', {
              class: 'remove',
              onClick: (e: MouseEvent) => { e.stopPropagation(); p.api.remove(); },
            }, '×'),
            h('button', {
              class: 'toggle',
              onClick: (e: MouseEvent) => { e.stopPropagation(); p.api.toggleHighlight(); },
            }, '*'),
          ]);
      },
    });
    const opts: CoarListboxOption<string>[] = [
      { value: 'a', label: 'Apple', kind: 'row' },
      { value: 'b', label: 'Banana', kind: 'row' },
    ];
    const w = mount(CoarListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: opts,
        itemComponents: { row: RowWithRemove },
      },
    });

    // Click remove — listbox emits item-remove with the item.
    await w.findAll('.remove')[0].trigger('click');
    const removed = w.emitted('item-remove');
    expect(removed).toBeTruthy();
    expect((removed![0][0] as { item: { value: string } }).item.value).toBe('a');

    // Click toggle — model updates.
    await w.findAll('.toggle')[1].trigger('click');
    expect(w.props('modelValue')).toEqual(['b']);
  });

  it('passes the api to #item slots too', async () => {
    const opts: CoarListboxOption<string>[] = [{ value: 'a', label: 'Apple' }];
    const w = mount(CoarListbox, {
      props: { options: opts },
      slots: {
        item: `<template #item="{ item, api }">
          <span>{{ item.label }}</span>
          <button class="rm" @click.stop="api.remove()">×</button>
        </template>`,
      },
    });
    await w.find('.rm').trigger('click');
    expect(w.emitted('item-remove')).toBeTruthy();
  });

  it('emits item-action with name and payload', async () => {
    const Row = defineComponent({
      props: ['item', 'api'],
      setup(p) {
        return () =>
          h('button', {
            class: 'rename',
            onClick: (e: MouseEvent) => { e.stopPropagation(); p.api.action('rename', { newLabel: 'X' }); },
          }, 'rename');
      },
    });
    const opts: CoarListboxOption<string>[] = [{ value: 'a', label: 'Apple', kind: 'row' }];
    const w = mount(CoarListbox, { props: { options: opts, itemComponents: { row: Row } } });
    await w.find('.rename').trigger('click');
    const events = w.emitted('item-action');
    expect(events).toBeTruthy();
    const e = events![0][0] as { item: { value: string }; name: string; payload: { newLabel: string } };
    expect(e.name).toBe('rename');
    expect(e.payload.newLabel).toBe('X');
  });

  it('renders at most a windowed subset of items in virtual mode', async () => {
    const many: CoarListboxOption<string>[] = Array.from({ length: 5000 }, (_, i) => ({
      value: `v${i}`,
      label: `Item ${i}`,
    }));
    const w = mount(CoarListbox, {
      props: { options: many, virtual: true, itemHeight: 30, overscan: 5 },
      attachTo: document.body,
    });
    // Stub clientHeight so the virtualizer can compute a viewport window.
    const listEl = w.find('.coar-listbox-list').element as HTMLElement;
    Object.defineProperty(listEl, 'clientHeight', { configurable: true, get: () => 300 });
    listEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    const rendered = w.findAll('.coar-listbox-item').length;
    // Viewport = 300px / 30px = 10 items visible, + 2×5 overscan ≈ 20 total.
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(30);
  });

  it('uses a spacer tall enough for the full list in virtual mode', async () => {
    const many: CoarListboxOption<string>[] = Array.from({ length: 1000 }, (_, i) => ({
      value: `v${i}`,
      label: `Item ${i}`,
    }));
    const w = mount(CoarListbox, {
      props: { options: many, virtual: true, itemHeight: 32 },
      attachTo: document.body,
    });
    const listEl = w.find('.coar-listbox-list').element as HTMLElement;
    Object.defineProperty(listEl, 'clientHeight', { configurable: true, get: () => 300 });
    listEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    const spacer = w.find('.coar-listbox-virtual-spacer').element as HTMLElement;
    expect(spacer.style.height).toBe(`${1000 * 32}px`);
  });

  it('drag & drop works when the source listbox is in virtual mode', async () => {
    const many: CoarListboxOption<string>[] = Array.from({ length: 500 }, (_, i) => ({
      value: `v${i}`,
      label: `Item ${i}`,
    }));
    const Host = defineComponent({
      components: { CoarListbox },
      data() {
        return {
          source: many,
          target: [] as CoarListboxOption<string>[],
        };
      },
      methods: {
        onRemove(p: { items: CoarListboxOption<string>[] }) {
          const removing = new Set(p.items.map((i) => i.value));
          this.source = this.source.filter((o) => !removing.has(o.value));
        },
        onAdd(p: { items: CoarListboxOption<string>[] }) {
          this.target = [...this.target, ...p.items];
        },
      },
      template: `
        <div>
          <CoarListbox ref="src" :options="source" draggable drag-group="xv" virtual :item-height="30" @items-remove="onRemove" />
          <CoarListbox ref="tgt" :options="target" droppable drag-group="xv" @items-add="onAdd" />
        </div>
      `,
    });

    const w = mount(Host, { attachTo: document.body });
    // Stub viewport heights so the virtualizer renders something.
    const srcList = w.findAllComponents(CoarListbox)[0].find('.coar-listbox-list').element as HTMLElement;
    Object.defineProperty(srcList, 'clientHeight', { configurable: true, get: () => 200 });
    srcList.dispatchEvent(new Event('scroll'));
    await nextTick();

    // Grab the first visible draggable item (from the overscan window at scrollTop=0).
    const firstItem = w.findAllComponents(CoarListbox)[0].find('.coar-listbox-item');
    expect(firstItem.attributes('draggable')).toBe('true');

    const dt = createDataTransfer();
    await firstItem.trigger('dragstart', { dataTransfer: dt });

    const targetList = w.findAllComponents(CoarListbox)[1].find('.coar-listbox-list');
    await targetList.trigger('dragover', { dataTransfer: dt });
    await targetList.trigger('drop', { dataTransfer: dt });

    expect(w.vm.target.map((o) => o.value)).toEqual(['v0']);
    expect(w.vm.source.length).toBe(499);
  });

  it('drag & drop works when the drop target is in virtual mode', async () => {
    const few: CoarListboxOption<string>[] = [
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
    ];
    const large: CoarListboxOption<string>[] = Array.from({ length: 500 }, (_, i) => ({
      value: `v${i}`,
      label: `Item ${i}`,
    }));
    const Host = defineComponent({
      components: { CoarListbox },
      data() {
        return {
          source: few,
          target: large,
        };
      },
      methods: {
        onRemove(p: { items: CoarListboxOption<string>[] }) {
          const removing = new Set(p.items.map((i) => i.value));
          this.source = this.source.filter((o) => !removing.has(o.value));
        },
        onAdd(p: { items: CoarListboxOption<string>[] }) {
          this.target = [...this.target, ...p.items];
        },
      },
      template: `
        <div>
          <CoarListbox ref="src" :options="source" draggable drag-group="xv2" @items-remove="onRemove" />
          <CoarListbox ref="tgt" :options="target" droppable drag-group="xv2" virtual :item-height="30" @items-add="onAdd" />
        </div>
      `,
    });

    const w = mount(Host, { attachTo: document.body });
    // Size the virtual target so it actually mounts a scroll region.
    const tgtList = w.findAllComponents(CoarListbox)[1].find('.coar-listbox-list').element as HTMLElement;
    Object.defineProperty(tgtList, 'clientHeight', { configurable: true, get: () => 200 });
    tgtList.dispatchEvent(new Event('scroll'));
    await nextTick();

    const firstItem = w.findAllComponents(CoarListbox)[0].find('.coar-listbox-item');
    const dt = createDataTransfer();
    await firstItem.trigger('dragstart', { dataTransfer: dt });

    const targetList = w.findAllComponents(CoarListbox)[1].find('.coar-listbox-list');
    await targetList.trigger('dragover', { dataTransfer: dt });
    await targetList.trigger('drop', { dataTransfer: dt });

    expect(w.vm.target.length).toBe(501);
    expect(w.vm.target.at(-1)!.value).toBe('a');
    expect(w.vm.source.map((o) => o.value)).toEqual(['b']);
  });

  it('preserves click-to-highlight in virtual mode', async () => {
    const many: CoarListboxOption<string>[] = Array.from({ length: 100 }, (_, i) => ({
      value: `v${i}`,
      label: `Item ${i}`,
    }));
    const w = mount(CoarListbox, {
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: many,
        virtual: true,
        itemHeight: 30,
      },
      attachTo: document.body,
    });
    const listEl = w.find('.coar-listbox-list').element as HTMLElement;
    Object.defineProperty(listEl, 'clientHeight', { configurable: true, get: () => 300 });
    listEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    await w.findAll('.coar-listbox-item')[0].trigger('click');
    expect(w.props('modelValue')).toEqual(['v0']);
  });

  it('canDrag filters which items become draggable', () => {
    const opts: CoarListboxOption<string>[] = [
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
    ];
    const w = mount(CoarListbox, {
      props: {
        options: opts,
        draggable: true,
        canDrag: (i: CoarListboxOption<string>) => i.value !== 'b',
      },
    });
    const items = w.findAll('.coar-listbox-item');
    expect(items[0].attributes('draggable')).toBe('true');
    expect(items[1].attributes('draggable')).toBeUndefined();
  });

  it('canDrag=false blocks dragstart from firing a drag', async () => {
    const opts: CoarListboxOption<string>[] = [{ value: 'a', label: 'Apple' }];
    const w = mount(CoarListbox, {
      props: {
        options: opts,
        draggable: true,
        canDrag: () => false,
      },
    });
    const dt = createDataTransfer();
    await w.find('.coar-listbox-item').trigger('dragstart', { dataTransfer: dt });
    expect(w.emitted('drag-start')).toBeFalsy();
    expect(dt.getData('application/x-coar-dnd')).toBe('');
  });

  it('dragAccept whitelists source dragIds', async () => {
    const Host = defineComponent({
      components: { CoarListbox },
      data() {
        return {
          sourceA: [{ value: 'a', label: 'A' }] as CoarListboxOption<string>[],
          sourceB: [{ value: 'b', label: 'B' }] as CoarListboxOption<string>[],
          target: [] as CoarListboxOption<string>[],
        };
      },
      methods: {
        onAdd(p: { items: CoarListboxOption<string>[] }) {
          this.target = [...this.target, ...p.items];
        },
      },
      template: `
        <div>
          <CoarListbox ref="a" :options="sourceA" draggable drag-group="g" drag-id="src-a" />
          <CoarListbox ref="b" :options="sourceB" draggable drag-group="g" drag-id="src-b" />
          <CoarListbox
            ref="t"
            :options="target"
            droppable
            drag-group="g"
            :drag-accept="['src-a']"
            @items-add="onAdd"
          />
        </div>
      `,
    });
    const w = mount(Host);

    // Drag from A (allowed) → accepted
    const dtA = createDataTransfer();
    await w.findAllComponents(CoarListbox)[0].find('.coar-listbox-item').trigger('dragstart', { dataTransfer: dtA });
    const targetList = w.findAllComponents(CoarListbox)[2].find('.coar-listbox-list');
    await targetList.trigger('dragover', { dataTransfer: dtA });
    await targetList.trigger('drop', { dataTransfer: dtA });
    expect(w.vm.target.map((o) => o.value)).toEqual(['a']);

    // Drag from B (not whitelisted) → refused
    const dtB = createDataTransfer();
    await w.findAllComponents(CoarListbox)[1].find('.coar-listbox-item').trigger('dragstart', { dataTransfer: dtB });
    await targetList.trigger('dragover', { dataTransfer: dtB });
    await targetList.trigger('drop', { dataTransfer: dtB });
    expect(w.vm.target.map((o) => o.value)).toEqual(['a']); // unchanged
  });

  it('canDrop refuses drops whose payload fails validation', async () => {
    const Host = defineComponent({
      components: { CoarListbox },
      data() {
        return {
          source: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ] as CoarListboxOption<string>[],
          target: [] as CoarListboxOption<string>[],
        };
      },
      methods: {
        onAdd(p: { items: CoarListboxOption<string>[] }) {
          this.target = [...this.target, ...p.items];
        },
      },
      template: `
        <div>
          <CoarListbox ref="s" :options="source" draggable drag-group="g" />
          <CoarListbox
            ref="t"
            :options="target"
            droppable
            drag-group="g"
            :can-drop="(p) => p.items.every(i => i.value !== 'b')"
            @items-add="onAdd"
          />
        </div>
      `,
    });
    const w = mount(Host);
    const srcItems = w.findAllComponents(CoarListbox)[0].findAll('.coar-listbox-item');

    // Drag 'a' → accepted
    const dt1 = createDataTransfer();
    await srcItems[0].trigger('dragstart', { dataTransfer: dt1 });
    const targetList = w.findAllComponents(CoarListbox)[1].find('.coar-listbox-list');
    await targetList.trigger('dragover', { dataTransfer: dt1 });
    await targetList.trigger('drop', { dataTransfer: dt1 });
    expect(w.vm.target.map((o) => o.value)).toEqual(['a']);

    // Drag 'b' → refused by canDrop
    const dt2 = createDataTransfer();
    await srcItems[1].trigger('dragstart', { dataTransfer: dt2 });
    await targetList.trigger('dragover', { dataTransfer: dt2 });
    await targetList.trigger('drop', { dataTransfer: dt2 });
    expect(w.vm.target.map((o) => o.value)).toEqual(['a']);
  });

  it('asymmetric 3-box flow: box1→box2→box3, no back-edges', async () => {
    const Host = defineComponent({
      components: { CoarListbox },
      data() {
        return {
          box1: [{ value: 'x', label: 'X' }] as CoarListboxOption<string>[],
          box2: [] as CoarListboxOption<string>[],
          box3: [] as CoarListboxOption<string>[],
          adds: [] as string[],
        };
      },
      methods: {
        onRemove1(p: { items: CoarListboxOption<string>[] }) {
          const r = new Set(p.items.map((i) => i.value));
          this.box1 = this.box1.filter((o) => !r.has(o.value));
        },
        onRemove2(p: { items: CoarListboxOption<string>[] }) {
          const r = new Set(p.items.map((i) => i.value));
          this.box2 = this.box2.filter((o) => !r.has(o.value));
        },
        add2(p: { items: CoarListboxOption<string>[] }) {
          this.box2 = [...this.box2, ...p.items];
          this.adds.push('2:' + p.items.map((i) => i.value).join(','));
        },
        add3(p: { items: CoarListboxOption<string>[] }) {
          this.box3 = [...this.box3, ...p.items];
          this.adds.push('3:' + p.items.map((i) => i.value).join(','));
        },
      },
      template: `
        <div>
          <CoarListbox ref="b1" :options="box1" draggable drag-group="flow" drag-id="b1" @items-remove="onRemove1" />
          <CoarListbox ref="b2" :options="box2" draggable droppable drag-group="flow" drag-id="b2"
            :drag-accept="['b1']" @items-add="add2" @items-remove="onRemove2" />
          <CoarListbox ref="b3" :options="box3" droppable drag-group="flow" drag-id="b3"
            :drag-accept="['b1', 'b2']" @items-add="add3" />
        </div>
      `,
    });
    const w = mount(Host);
    const getLists = () => w.findAllComponents(CoarListbox);

    // b1 → b2: allowed
    let dt = createDataTransfer();
    await getLists()[0].find('.coar-listbox-item').trigger('dragstart', { dataTransfer: dt });
    await getLists()[1].find('.coar-listbox-list').trigger('dragover', { dataTransfer: dt });
    await getLists()[1].find('.coar-listbox-list').trigger('drop', { dataTransfer: dt });
    expect(w.vm.box2.map((o) => o.value)).toEqual(['x']);
    expect(w.vm.box1.length).toBe(0);

    // b2 → b3: allowed
    dt = createDataTransfer();
    await getLists()[1].find('.coar-listbox-item').trigger('dragstart', { dataTransfer: dt });
    await getLists()[2].find('.coar-listbox-list').trigger('dragover', { dataTransfer: dt });
    await getLists()[2].find('.coar-listbox-list').trigger('drop', { dataTransfer: dt });
    expect(w.vm.box3.map((o) => o.value)).toEqual(['x']);
    expect(w.vm.box2.length).toBe(0);

    // Seed b3 with a new item via direct state, then try b3 → b2: refused (b2 only accepts b1).
    w.vm.box3 = [{ value: 'y', label: 'Y' }];
    await nextTick();
    dt = createDataTransfer();
    await getLists()[2].find('.coar-listbox-item').trigger('dragstart', { dataTransfer: dt });
    // b3 has no draggable attribute since b3 isn't set draggable; this dragstart is a no-op.
    // But even if we inject a drag, b2 must refuse because dragAccept=['b1'].
    // To simulate: drag from b2-with-item directly and target b1 (which has no droppable → refused)
    w.vm.box2 = [{ value: 'z', label: 'Z' }];
    await nextTick();
    dt = createDataTransfer();
    await getLists()[1].find('.coar-listbox-item').trigger('dragstart', { dataTransfer: dt });
    const b1List = getLists()[0].find('.coar-listbox-list');
    await b1List.trigger('dragover', { dataTransfer: dt });
    await b1List.trigger('drop', { dataTransfer: dt });
    expect(w.vm.box1.length).toBe(0); // b1 is not droppable, nothing lands
  });

  it('rejects drops from a different drag group', async () => {
    const Host = defineComponent({
      components: { CoarListbox },
      data() {
        return {
          source: [{ value: 'a', label: 'A' }] as CoarListboxOption<string>[],
          target: [] as CoarListboxOption<string>[],
          dropped: 0,
        };
      },
      methods: {
        onAdd(p: { items: CoarListboxOption<string>[] }) {
          this.dropped += p.items.length;
          this.target = [...this.target, ...p.items];
        },
      },
      template: `
        <div>
          <CoarListbox ref="src" :options="source" draggable drag-group="alpha" />
          <CoarListbox ref="tgt" :options="target" droppable drag-group="beta" @items-add="onAdd" />
        </div>
      `,
    });

    const w = mount(Host);
    const dt = createDataTransfer();
    const srcItem = w.findAllComponents(CoarListbox)[0].find('.coar-listbox-item');
    await srcItem.trigger('dragstart', { dataTransfer: dt });

    const targetList = w.findAllComponents(CoarListbox)[1].find('.coar-listbox-list');
    await targetList.trigger('dragover', { dataTransfer: dt });
    await targetList.trigger('drop', { dataTransfer: dt });

    expect(w.vm.dropped).toBe(0);
  });
});
