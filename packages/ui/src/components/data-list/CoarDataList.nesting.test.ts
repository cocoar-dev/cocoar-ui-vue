import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import { mount } from '@vue/test-utils';
import CoarDataListRaw from './CoarDataList.vue';
import type { CoarDataListDropEvent, CoarDataListKey } from './types';

const CoarDataList = CoarDataListRaw as Component;

interface Task {
  id: string;
  title: string;
  subTasks?: Task[];
}

const tasks: Task[] = [
  { id: 'a', title: 'Alpha', subTasks: [{ id: 'a1', title: 'Alpha one' }, { id: 'a2', title: 'Alpha two' }] },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Gamma', subTasks: [{ id: 'c1', title: 'Gamma one' }] },
];

function createDataTransfer(): DataTransfer {
  const store = new Map<string, string>();
  const types: string[] = [];
  return {
    effectAllowed: 'none', dropEffect: 'none', types, files: [] as unknown as FileList, items: [] as unknown as DataTransferItemList,
    setData(type: string, value: string) { if (!store.has(type)) types.push(type); store.set(type, value); },
    getData(type: string) { return store.get(type) ?? ''; },
    clearData() { store.clear(); types.length = 0; },
    setDragImage() {},
  } as unknown as DataTransfer;
}

function mountList(props: Record<string, unknown> = {}) {
  const expanded = ref<CoarDataListKey[]>([]);
  const selected = ref<CoarDataListKey[]>([]);
  const reorders: CoarDataListDropEvent<Task>[] = [];
  const Host = defineComponent({
    setup: () => () =>
      h(
        CoarDataList,
        {
          items: tasks,
          itemKey: (t: Task) => t.id,
          children: (t: Task) => t.subTasks,
          selection: 'multiple',
          height: '300px',
          expanded: expanded.value,
          'onUpdate:expanded': (value: CoarDataListKey[]) => { expanded.value = value; },
          selected: selected.value,
          'onUpdate:selected': (value: CoarDataListKey[]) => { selected.value = value; },
          onReorder: (event: CoarDataListDropEvent<Task>) => reorders.push(event),
          ...props,
        },
        { item: ({ item, depth }: { item: Task; depth: number }) => h('span', { 'data-depth': depth }, item.title) },
      ),
  });
  const wrapper = mount(Host, { attachTo: document.body });
  const viewport = wrapper.find('.coar-data-list__viewport').element as HTMLElement;
  Object.defineProperty(viewport, 'clientHeight', { configurable: true, get: () => 300 });
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, get: () => 600 });
  viewport.dispatchEvent(new Event('scroll'));
  return { wrapper, expanded, selected, reorders };
}

const titles = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('.coar-data-list__content').map((node) => node.text());

describe('CoarDataList nesting', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders chevrons for parents, a hidden placeholder for leaves, and expands on click', async () => {
    const { wrapper, expanded } = mountList();
    await nextTick();
    expect(titles(wrapper)).toEqual(['Alpha', 'Beta', 'Gamma']);
    const items = wrapper.findAll('.coar-data-list__item');
    expect(items[0].classes()).toContain('coar-data-list__item--parent');
    expect(items[0].attributes('aria-expanded')).toBe('false');
    expect(items[0].attributes('aria-level')).toBe('1');
    expect(items[1].find('.coar-data-list__toggle').classes()).toContain('coar-data-list__toggle--leaf');

    await items[0].find('.coar-data-list__toggle').trigger('click');
    expect(expanded.value).toEqual(['a']);
    await nextTick();
    expect(titles(wrapper)).toEqual(['Alpha', 'Alpha one', 'Alpha two', 'Beta', 'Gamma']);
    const child = wrapper.findAll('.coar-data-list__item')[1];
    expect(child.classes()).toContain('coar-data-list__item--nested');
    expect(child.attributes('aria-level')).toBe('2');
    expect(child.findAll('.coar-data-list__guide').length).toBe(1);
    expect((child.element as HTMLElement).style.getPropertyValue('--coar-data-list-depth')).toBe('1');
    expect(wrapper.find('.coar-data-list--nesting-lines').exists()).toBe(true);
  });

  it('exposes depth / expanded / toggleExpanded to the item slot', async () => {
    const seen: Array<{ depth: number; hasChildren: boolean }> = [];
    const Host = defineComponent({
      setup: () => () =>
        h(
          CoarDataList,
          { items: tasks, itemKey: (t: Task) => t.id, children: (t: Task) => t.subTasks, expanded: ['c'], hideExpandToggle: true },
          {
            item: (slot: { item: Task; depth: number; hasChildren: boolean; toggleExpanded: () => void }) => {
              seen.push({ depth: slot.depth, hasChildren: slot.hasChildren });
              return h('button', { class: 'own-toggle', onClick: slot.toggleExpanded }, slot.item.title);
            },
          },
        ),
    });
    const wrapper = mount(Host, { attachTo: document.body });
    await nextTick();
    expect(wrapper.find('.coar-data-list__toggle').exists()).toBe(false);
    expect(seen.filter((s) => s.depth === 1)).toHaveLength(1);
    expect(seen.find((s) => s.hasChildren)).toBeTruthy();
  });

  it('expands, collapses and jumps to the parent with the arrow keys', async () => {
    const { wrapper, expanded, selected } = mountList();
    await nextTick();
    const viewport = wrapper.find('.coar-data-list__viewport');
    await viewport.trigger('focus'); // Alpha
    await viewport.trigger('keydown', { key: 'ArrowRight' });
    expect(expanded.value).toEqual(['a']);
    await nextTick();
    await viewport.trigger('keydown', { key: 'ArrowRight' }); // into first child
    expect(selected.value).toEqual(['a1']);
    await viewport.trigger('keydown', { key: 'ArrowLeft' }); // back to the parent
    expect(selected.value).toEqual(['a']);
    await viewport.trigger('keydown', { key: 'ArrowLeft' }); // collapse
    expect(expanded.value).toEqual([]);
  });

  it('shows top-level items only in grid layout', async () => {
    const { wrapper } = mountList({ layout: 'grid', tileMinWidth: 100 });
    await nextTick();
    await nextTick();
    const Host = wrapper;
    expect(Host.find('.coar-data-list--nested').exists()).toBe(false);
    expect(Host.find('.coar-data-list__toggle').exists()).toBe(false);
    expect(titles(Host)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  describe('drag & drop', () => {
    function rectOf(el: HTMLElement, top: number, height = 40) {
      el.getBoundingClientRect = () => ({ top, left: 0, width: 300, height, right: 300, bottom: top + height, x: 0, y: top, toJSON: () => ({}) });
    }

    async function dragTo(wrapper: ReturnType<typeof mount>, fromIndex: number, toIndex: number, y: number) {
      const items = wrapper.findAll('.coar-data-list__item');
      const target = items[toIndex].element as HTMLElement;
      rectOf(target, 100);
      document.elementFromPoint = () => target;
      const dt = createDataTransfer();
      await items[fromIndex].trigger('dragstart', { dataTransfer: dt });
      const viewport = wrapper.find('.coar-data-list__viewport');
      await viewport.trigger('dragover', { dataTransfer: dt, clientX: 10, clientY: 100 + y });
      const indicator = wrapper.find('[class*="coar-data-list__item--drop-"]');
      const position = indicator.exists() ? indicator.classes().find((c) => c.startsWith('coar-data-list__item--drop-'))?.replace('coar-data-list__item--drop-', '') : null;
      await viewport.trigger('drop', { dataTransfer: dt, clientX: 10, clientY: 100 + y });
      await items[fromIndex].trigger('dragend');
      return position;
    }

    it('drops inside a row to re-parent, before/after to reorder among siblings', async () => {
      const { wrapper, reorders } = mountList({ reorderable: true, expanded: ['a'] });
      await nextTick();
      // Beta (index 3) dropped in the middle of Alpha (index 0) → inside
      let position = await dragTo(wrapper, 3, 0, 20);
      expect(position).toBe('inside');
      expect(reorders.at(-1)).toMatchObject({ keys: ['b'], parentKey: 'a', toIndex: 2, afterKey: 'a2', beforeKey: null });

      // Gamma (index 4) dropped in the top band of Alpha two (index 2) → before it, under Alpha
      position = await dragTo(wrapper, 4, 2, 5);
      expect(position).toBe('before');
      expect(reorders.at(-1)).toMatchObject({ keys: ['c'], parentKey: 'a', toIndex: 1, afterKey: 'a1', beforeKey: 'a2' });

      // Alpha one (index 1) dropped in the bottom band of Beta (index 3) → after Beta at the top level
      position = await dragTo(wrapper, 1, 3, 36);
      expect(position).toBe('after');
      expect(reorders.at(-1)).toMatchObject({ keys: ['a1'], parentKey: null, toIndex: 2, afterKey: 'b', beforeKey: 'c' });
    });

    it('refuses to drop a parent into its own subtree and honours canNest', async () => {
      const { wrapper, reorders } = mountList({ reorderable: true, expanded: ['a'], canNest: (_item: Task, parent: Task) => parent.id !== 'c' });
      await nextTick();
      // Alpha (0) onto its child Alpha one (1) → no target at all
      let position = await dragTo(wrapper, 0, 1, 20);
      expect(position).toBeNull();
      expect(reorders).toHaveLength(0);
      // Beta (3) into Gamma (4) is vetoed → the middle band is not offered, it falls back to before/after
      position = await dragTo(wrapper, 3, 4, 20);
      expect(position).toBe('after');
      expect(reorders.at(-1)).toMatchObject({ keys: ['b'], parentKey: null, afterKey: 'c' });
    });

    it('still re-parents while a sort is active, but refuses plain reordering', async () => {
      const { wrapper, reorders } = mountList({
        reorderable: true,
        expanded: ['a'],
        maxDepth: 1,
        sortOptions: [{ key: 'title', label: 'Title' }],
        sort: { key: 'title', direction: 'asc' },
      });
      await nextTick();
      // Order by title: Alpha, Alpha one, Alpha two, Beta, Gamma. Beta (3) anywhere on Gamma (4) → inside.
      let position = await dragTo(wrapper, 3, 4, 5);
      expect(position).toBe('inside');
      expect(reorders.at(-1)).toMatchObject({ keys: ['b'], parentKey: 'c' });
      // Alpha one (1) onto Alpha two (2): depth 1 cannot take children (maxDepth) → nothing happens.
      reorders.length = 0;
      position = await dragTo(wrapper, 1, 2, 5);
      expect(position).toBeNull();
      expect(reorders).toHaveLength(0);
    });

    it('judges sortedness per level: sorted parents, manually ordered children', async () => {
      const { wrapper, reorders } = mountList({
        reorderable: true,
        expanded: ['a'],
        sortOptions: [{ key: 'title', label: 'Title' }],
        sort: { key: 'title', direction: 'asc' },
        childLevel: { sort: null },
      });
      await nextTick();
      // Rows: Alpha, Alpha one, Alpha two, Beta, Gamma. Children keep input order → reorderable.
      let position = await dragTo(wrapper, 1, 2, 36); // Alpha one after Alpha two
      expect(position).toBe('after');
      expect(reorders.at(-1)).toMatchObject({ keys: ['a1'], parentKey: 'a', afterKey: 'a2' });
      // Top level is sorted → Beta before Gamma is refused (only "inside" is offered).
      reorders.length = 0;
      position = await dragTo(wrapper, 3, 4, 5);
      expect(position).toBe('inside');
      // Keyboard grab follows the same rule.
      const viewport = wrapper.find('.coar-data-list__viewport');
      await viewport.trigger('focus'); // Alpha (sorted level)
      await viewport.trigger('keydown', { key: 'x', ctrlKey: true });
      expect(wrapper.find('.coar-data-list__item--dragging').exists()).toBe(false);
      await viewport.trigger('keydown', { key: 'ArrowDown' }); // Alpha one (manual level)
      await viewport.trigger('keydown', { key: 'x', ctrlKey: true });
      expect(wrapper.find('.coar-data-list__item--dragging').text()).toContain('Alpha one');
    });

    it('keeps keyboard moves among siblings', async () => {
      const { wrapper, reorders } = mountList({ reorderable: true, expanded: ['a'] });
      await nextTick();
      const viewport = wrapper.find('.coar-data-list__viewport');
      await viewport.trigger('focus');
      await viewport.trigger('keydown', { key: 'ArrowDown' }); // Alpha one
      await viewport.trigger('keydown', { key: 'x', ctrlKey: true });
      await viewport.trigger('keydown', { key: 'End' });
      expect(wrapper.find('.coar-data-list__item--drop-after').text()).toContain('Alpha two');
      await viewport.trigger('keydown', { key: 'Enter' });
      expect(reorders[0]).toMatchObject({ keys: ['a1'], parentKey: 'a', toIndex: 1, afterKey: 'a2', beforeKey: null });
    });
  });
});
