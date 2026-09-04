import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import { mount } from '@vue/test-utils';
import CoarDataListRaw from './CoarDataList.vue';
import type { CoarDataListDropEvent, CoarDataListItemsRemoveEvent, CoarDataListKey, CoarDataListSort } from './types';

const CoarDataList = CoarDataListRaw as Component;

interface Row {
  id: number;
  title: string;
}

function rows(prefix: string, count: number, offset = 0): Row[] {
  return Array.from({ length: count }, (_, index) => ({ id: offset + index + 1, title: `${prefix} ${offset + index + 1}` }));
}

/** Minimal DataTransfer — happy-dom does not implement it. */
function createDataTransfer(): DataTransfer {
  const store = new Map<string, string>();
  const types: string[] = [];
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    types,
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    setData(type: string, value: string) {
      if (!store.has(type)) types.push(type);
      store.set(type, value);
    },
    getData(type: string) {
      return store.get(type) ?? '';
    },
    clearData() {
      store.clear();
      types.length = 0;
    },
    setDragImage() {},
  } as unknown as DataTransfer;
}

interface MountOptions {
  items?: Row[];
  props?: Record<string, unknown>;
  /** Extra sibling lists sharing the drag group. */
  second?: { items: Row[]; props?: Record<string, unknown> };
}

function mountLists(options: MountOptions = {}) {
  const items = ref(options.items ?? rows('Task', 5));
  const secondItems = ref(options.second?.items ?? []);
  const reorders: CoarDataListDropEvent<Row>[] = [];
  const adds: CoarDataListDropEvent<Row>[] = [];
  const removes: CoarDataListItemsRemoveEvent<Row>[] = [];
  const selected = ref<CoarDataListKey[]>([]);
  const sort = ref<CoarDataListSort | null>(null);

  const listNode = (id: string, data: typeof items, extra: Record<string, unknown> = {}) =>
    h(
      CoarDataList,
      {
        id,
        items: data.value,
        itemKey: (row: Row) => row.id,
        reorderable: true,
        selection: 'multiple',
        height: '200px',
        selected: selected.value,
        'onUpdate:selected': (value: CoarDataListKey[]) => { selected.value = value; },
        sort: sort.value,
        onReorder: (event: CoarDataListDropEvent<Row>) => reorders.push(event),
        'onItems-add': (event: CoarDataListDropEvent<Row>) => adds.push(event),
        'onItems-remove': (event: CoarDataListItemsRemoveEvent<Row>) => removes.push(event),
        ...extra,
      },
      { item: ({ item }: { item: Row }) => h('span', item.title) },
    );

  const Host = defineComponent({
    setup() {
      return () =>
        h('div', null, [
          listNode('first', items, options.props),
          ...(options.second ? [listNode('second', secondItems, options.second.props)] : []),
        ]);
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  for (const viewport of wrapper.findAll('.coar-data-list__viewport')) {
    const el = viewport.element as HTMLElement;
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => 200 });
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => 600 });
    el.dispatchEvent(new Event('scroll'));
  }
  return { wrapper, items, secondItems, reorders, adds, removes, selected, sort };
}

/** Make `elementFromPoint` return the given element (happy-dom has no layout). */
function pointAt(element: Element | null) {
  document.elementFromPoint = () => element;
}

function itemEl(wrapper: ReturnType<typeof mount>, listId: string, index: number): HTMLElement {
  return wrapper.find(`#${listId}`).findAll('.coar-data-list__item')[index].element as HTMLElement;
}

function rectOf(el: HTMLElement, top: number, height = 40) {
  el.getBoundingClientRect = () => ({ top, left: 0, width: 300, height, right: 300, bottom: top + height, x: 0, y: top, toJSON: () => ({}) });
}

describe('CoarDataList reordering', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('keyboard', () => {
    it('grabs with Ctrl+X, moves the target with arrows and drops with Ctrl+V', async () => {
      const { wrapper, reorders } = mountLists();
      await nextTick();
      const viewport = wrapper.find('.coar-data-list__viewport');
      await viewport.trigger('focus');
      await viewport.trigger('keydown', { key: 'ArrowDown' }); // focus + select Task 2
      await viewport.trigger('keydown', { key: 'x', ctrlKey: true });
      expect(wrapper.find('.coar-data-list__item--dragging').text()).toBe('Task 2');
      await viewport.trigger('keydown', { key: 'ArrowDown' });
      await viewport.trigger('keydown', { key: 'ArrowDown' });
      expect(wrapper.find('.coar-data-list__item--drop-before').text()).toBe('Task 5');
      await viewport.trigger('keydown', { key: 'v', ctrlKey: true });
      expect(reorders).toHaveLength(1);
      expect(reorders[0]).toMatchObject({ keys: [2], toIndex: 3, afterKey: 4, beforeKey: 5, fromSelf: true, group: null });
      expect(wrapper.find('.coar-data-list__item--dragging').exists()).toBe(false);
    });

    it('cancels with Escape and ignores no-op drops', async () => {
      const { wrapper, reorders } = mountLists();
      await nextTick();
      const viewport = wrapper.find('.coar-data-list__viewport');
      await viewport.trigger('focus');
      await viewport.trigger('keydown', { key: 'x', ctrlKey: true });
      await viewport.trigger('keydown', { key: 'Enter' }); // same place → no event
      expect(reorders).toHaveLength(0);
      await viewport.trigger('keydown', { key: 'x', ctrlKey: true });
      await viewport.trigger('keydown', { key: 'ArrowDown' });
      await viewport.trigger('keydown', { key: 'Escape' });
      expect(wrapper.find('.coar-data-list__item--dragging').exists()).toBe(false);
      expect(reorders).toHaveLength(0);
    });

    it('moves a multi-selection as one block', async () => {
      const { wrapper, reorders, selected } = mountLists();
      await nextTick();
      selected.value = [1, 3];
      await nextTick();
      const viewport = wrapper.find('.coar-data-list__viewport');
      await viewport.trigger('focus'); // focus lands on Task 1 (selected)
      await viewport.trigger('keydown', { key: 'x', ctrlKey: true });
      expect(wrapper.findAll('.coar-data-list__item--dragging').length).toBe(2);
      await viewport.trigger('keydown', { key: 'End' });
      await viewport.trigger('keydown', { key: 'Enter' });
      expect(reorders[0]).toMatchObject({ keys: [1, 3], toIndex: 3, afterKey: 5, beforeKey: null });
    });

    it('is inactive while a sort is applied or reorderable is off', async () => {
      const sorted = mountLists({ props: { sortOptions: [{ key: 'title', label: 'Title' }] } });
      sorted.sort.value = { key: 'title', direction: 'asc' };
      await nextTick();
      const viewport = sorted.wrapper.find('.coar-data-list__viewport');
      await viewport.trigger('focus');
      await viewport.trigger('keydown', { key: 'x', ctrlKey: true });
      expect(sorted.wrapper.find('.coar-data-list__item--dragging').exists()).toBe(false);
      sorted.wrapper.unmount();

      const off = mountLists({ props: { reorderable: false } });
      await nextTick();
      expect(off.wrapper.find('.coar-data-list--reorderable').exists()).toBe(false);
      expect(off.wrapper.find('.coar-data-list__item').attributes('draggable')).toBeUndefined();
    });
  });

  describe('native engine', () => {
    it('marks items draggable and reorders through dragstart / dragover / drop', async () => {
      const { wrapper, reorders } = mountLists();
      await nextTick();
      const source = itemEl(wrapper, 'first', 0);
      const target = itemEl(wrapper, 'first', 2);
      expect(source.getAttribute('draggable')).toBe('true');
      rectOf(target, 80);
      pointAt(target);
      const dt = createDataTransfer();

      await wrapper.findAll('.coar-data-list__item')[0].trigger('dragstart', { dataTransfer: dt });
      expect(wrapper.find('.coar-data-list__item--dragging').text()).toBe('Task 1');

      const viewport = wrapper.find('.coar-data-list__viewport');
      await viewport.trigger('dragover', { dataTransfer: dt, clientX: 10, clientY: 115 }); // lower half → after
      expect(wrapper.find('.coar-data-list__item--drop-after').text()).toBe('Task 3');
      expect(wrapper.find('.coar-data-list--drag-over').exists()).toBe(true);

      await viewport.trigger('drop', { dataTransfer: dt, clientX: 10, clientY: 115 });
      await wrapper.findAll('.coar-data-list__item')[0].trigger('dragend');
      expect(reorders).toHaveLength(1);
      expect(reorders[0]).toMatchObject({ keys: [1], toIndex: 2, afterKey: 3, beforeKey: 4, fromSelf: true });
      expect(wrapper.find('.coar-data-list__item--dragging').exists()).toBe(false);
    });

    it('moves items between lists sharing a dragGroup', async () => {
      const { wrapper, adds, removes, reorders } = mountLists({
        props: { dragGroup: 'tasks', dragId: 'backlog' },
        second: { items: rows('Done', 2, 10), props: { dragGroup: 'tasks', dragId: 'done' } },
      });
      await nextTick();
      const target = itemEl(wrapper, 'second', 0);
      rectOf(target, 0);
      pointAt(target);
      const dt = createDataTransfer();

      await wrapper.find('#first').findAll('.coar-data-list__item')[1].trigger('dragstart', { dataTransfer: dt });
      const secondViewport = wrapper.find('#second .coar-data-list__viewport');
      await secondViewport.trigger('dragover', { dataTransfer: dt, clientX: 10, clientY: 5 });
      await secondViewport.trigger('drop', { dataTransfer: dt, clientX: 10, clientY: 5 });
      await wrapper.find('#first').findAll('.coar-data-list__item')[1].trigger('dragend');

      expect(reorders).toHaveLength(0);
      expect(adds).toHaveLength(1);
      expect(adds[0]).toMatchObject({ keys: [2], toIndex: 0, beforeKey: 11, fromSelf: false, sourceId: 'backlog', sourceDragGroup: 'tasks' });
      expect(removes).toHaveLength(1);
      expect(removes[0]).toMatchObject({ keys: [2], toDragGroup: 'tasks' });
    });

    it('refuses drops from a different dragGroup', async () => {
      const { wrapper, adds } = mountLists({
        props: { dragGroup: 'a' },
        second: { items: rows('Other', 2, 10), props: { dragGroup: 'b' } },
      });
      await nextTick();
      const target = itemEl(wrapper, 'second', 0);
      rectOf(target, 0);
      pointAt(target);
      const dt = createDataTransfer();
      await wrapper.find('#first').findAll('.coar-data-list__item')[0].trigger('dragstart', { dataTransfer: dt });
      const secondViewport = wrapper.find('#second .coar-data-list__viewport');
      await secondViewport.trigger('dragover', { dataTransfer: dt, clientX: 10, clientY: 5 });
      expect(wrapper.find('#second .coar-data-list__item--drop-before').exists()).toBe(false);
      await secondViewport.trigger('drop', { dataTransfer: dt, clientX: 10, clientY: 5 });
      expect(adds).toHaveLength(0);
    });

    it('accepts OS files when acceptsFiles is set', async () => {
      const files: File[][] = [];
      const { wrapper } = mountLists({
        props: { acceptsFiles: true, reorderable: false, 'onFiles-drop': (event: { files: File[] }) => files.push(event.files) },
      });
      await nextTick();
      const file = new File(['x'], 'note.txt');
      const dt = { types: ['Files'], files: [file] } as unknown as DataTransfer;
      const viewport = wrapper.find('.coar-data-list__viewport');
      const over = new Event('dragover', { bubbles: true, cancelable: true }) as DragEvent;
      Object.defineProperty(over, 'dataTransfer', { value: dt });
      viewport.element.dispatchEvent(over);
      expect(over.defaultPrevented).toBe(true);
      const drop = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
      Object.defineProperty(drop, 'dataTransfer', { value: dt });
      viewport.element.dispatchEvent(drop);
      expect(files).toEqual([[file]]);
    });
  });

  describe('pointer engine', () => {
    function pointerEvent(type: string, init: Record<string, unknown>) {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init }) as PointerEvent;
      Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
      Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
      Object.defineProperty(event, 'isPrimary', { value: true });
      return event;
    }

    it('starts after the mouse moves past the threshold and drops on the hovered row', async () => {
      const { wrapper, reorders } = mountLists({ props: { dragEngine: 'pointer' } });
      await nextTick();
      const source = itemEl(wrapper, 'first', 0);
      const target = itemEl(wrapper, 'first', 3);
      rectOf(source, 0);
      rectOf(target, 120);
      expect(source.getAttribute('draggable')).toBeNull();

      source.dispatchEvent(pointerEvent('pointerdown', { clientX: 10, clientY: 10, button: 0 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 12, clientY: 12 }));
      expect(wrapper.find('.coar-data-list__item--dragging').exists()).toBe(false);

      pointAt(target);
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 10, clientY: 125 })); // past threshold → drag starts
      await nextTick();
      expect(wrapper.find('.coar-data-list__item--dragging').text()).toBe('Task 1');
      expect(document.body.querySelector('.coar-data-list__ghost')).not.toBeNull();
      expect(wrapper.find('.coar-data-list__item--drop-before').text()).toBe('Task 4');

      document.dispatchEvent(pointerEvent('pointerup', { clientX: 10, clientY: 125 }));
      await nextTick();
      expect(reorders).toHaveLength(1);
      expect(reorders[0]).toMatchObject({ keys: [1], toIndex: 2, afterKey: 3, beforeKey: 4, fromSelf: true });
      expect(document.body.querySelector('.coar-data-list__ghost')).toBeNull();
      expect(wrapper.find('.coar-data-list__item--dragging').exists()).toBe(false);
    });

    it('needs a long press on touch and treats early movement as scrolling', async () => {
      vi.useFakeTimers();
      const { wrapper } = mountLists({ props: { dragEngine: 'pointer' } });
      await nextTick();
      const source = itemEl(wrapper, 'first', 1);
      rectOf(source, 40);

      source.dispatchEvent(pointerEvent('pointerdown', { clientX: 10, clientY: 50, button: 0, pointerType: 'touch' }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 10, clientY: 80, pointerType: 'touch' })); // scroll gesture
      vi.advanceTimersByTime(400);
      await nextTick();
      expect(wrapper.find('.coar-data-list__item--dragging').exists()).toBe(false);

      source.dispatchEvent(pointerEvent('pointerdown', { clientX: 10, clientY: 50, button: 0, pointerType: 'touch' }));
      vi.advanceTimersByTime(400);
      await nextTick();
      expect(wrapper.find('.coar-data-list__item--dragging').text()).toBe('Task 2');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await nextTick();
      expect(wrapper.find('.coar-data-list__item--dragging').exists()).toBe(false);
      vi.useRealTimers();
    });

    it('moves items between lists', async () => {
      const { wrapper, adds, removes } = mountLists({
        props: { dragEngine: 'pointer', dragGroup: 'tasks' },
        second: { items: rows('Done', 1, 10), props: { dragEngine: 'pointer', dragGroup: 'tasks' } },
      });
      await nextTick();
      const source = itemEl(wrapper, 'first', 2);
      const target = itemEl(wrapper, 'second', 0);
      rectOf(source, 80);
      rectOf(target, 500);

      source.dispatchEvent(pointerEvent('pointerdown', { clientX: 10, clientY: 90, button: 0 }));
      pointAt(target);
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 10, clientY: 535 }));
      await nextTick();
      expect(wrapper.find('#second .coar-data-list__item--drop-after').exists()).toBe(true);
      document.dispatchEvent(pointerEvent('pointerup', { clientX: 10, clientY: 535 }));
      await nextTick();
      expect(adds[0]).toMatchObject({ keys: [3], toIndex: 1, afterKey: 11, beforeKey: null, fromSelf: false });
      expect(removes[0]).toMatchObject({ keys: [3], toDragGroup: 'tasks' });
    });

    it('does not start a drag from interactive children', async () => {
      const { wrapper } = mountLists({ props: { dragEngine: 'pointer' } });
      await nextTick();
      const source = itemEl(wrapper, 'first', 0);
      const button = document.createElement('button');
      source.appendChild(button);
      button.dispatchEvent(pointerEvent('pointerdown', { clientX: 10, clientY: 10, button: 0 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 10, clientY: 100 }));
      await nextTick();
      expect(wrapper.find('.coar-data-list__item--dragging').exists()).toBe(false);
    });
  });
});
