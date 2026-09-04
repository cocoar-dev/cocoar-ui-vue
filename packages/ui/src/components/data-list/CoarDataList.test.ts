import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import CoarDataList from './CoarDataList.vue';
import type { CoarDataListKey, CoarDataListSort, CoarDataListSortOption } from './types';

interface Row {
  id: number;
  title: string;
  owner: string;
}

const rows: Row[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  title: `Task ${index + 1}`,
  owner: index % 2 === 0 ? 'Ada' : 'Grace',
}));

const sortOptions: CoarDataListSortOption<Row>[] = [{ key: 'title', label: 'Title' }];

function mountList(props: Record<string, unknown> = {}) {
  const selected = ref<CoarDataListKey[]>([]);
  const sort = ref<CoarDataListSort | null>(null);
  const search = ref('');
  const Host = defineComponent({
    setup() {
      return () =>
        h(
          CoarDataList as never,
          {
            items: rows,
            itemKey: (row: Row) => row.id,
            selection: 'multiple',
            selected: selected.value,
            'onUpdate:selected': (value: CoarDataListKey[]) => { selected.value = value; },
            sort: sort.value,
            'onUpdate:sort': (value: CoarDataListSort | null) => { sort.value = value; },
            search: search.value,
            'onUpdate:search': (value: string) => { search.value = value; },
            height: '200px',
            ...props,
          },
          {
            item: ({ item }: { item: Row }) => h('div', { class: 'row' }, `${item.title} · ${item.owner}`),
          },
        );
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  const viewport = wrapper.find('.coar-data-list__viewport').element as HTMLElement;
  Object.defineProperty(viewport, 'clientHeight', { configurable: true, get: () => 200 });
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, get: () => 600 });
  viewport.dispatchEvent(new Event('scroll'));
  return { wrapper, viewport, selected, sort, search };
}

function itemTexts(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('.coar-data-list__item').map((node) => node.text());
}

describe('CoarDataList', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders items through the item slot with listbox semantics', async () => {
    const { wrapper } = mountList();
    await nextTick();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    expect(wrapper.find('[aria-multiselectable="true"]').exists()).toBe(true);
    const items = wrapper.findAll('.coar-data-list__item');
    expect(items.length).toBe(8);
    expect(items[0].attributes('role')).toBe('option');
    expect(items[0].text()).toBe('Task 1 · Ada');
  });

  it('uses role=list without selection', async () => {
    const { wrapper } = mountList({ selection: 'none' });
    await nextTick();
    expect(wrapper.find('[role="list"]').exists()).toBe(true);
    expect(wrapper.find('.coar-data-list__item').attributes('role')).toBe('listitem');
  });

  it('selects with click, ctrl-click and shift-click', async () => {
    const { wrapper, selected } = mountList();
    await nextTick();
    const items = wrapper.findAll('.coar-data-list__item');
    await items[1].trigger('click');
    expect(selected.value).toEqual([2]);
    await items[3].trigger('click', { ctrlKey: true });
    expect(selected.value).toEqual([2, 4]);
    await items[5].trigger('click', { shiftKey: true });
    expect(selected.value).toEqual([4, 5, 6]);
    await nextTick();
    expect(wrapper.findAll('.coar-data-list__item--selected').length).toBe(3);
    expect(items[4].attributes('aria-selected')).toBe('true');
  });

  it('suppresses native text selection on shift-mousedown only', async () => {
    const { wrapper } = mountList();
    await nextTick();
    const row = wrapper.find('.coar-data-list__item').element;
    const shifted = new MouseEvent('mousedown', { bubbles: true, cancelable: true, shiftKey: true });
    row.dispatchEvent(shifted);
    expect(shifted.defaultPrevented).toBe(true);
    const plain = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    row.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false);
  });

  it('navigates and selects with the keyboard', async () => {
    const { wrapper, viewport, selected } = mountList();
    await nextTick();
    await wrapper.find('.coar-data-list__viewport').trigger('focus');
    await wrapper.find('.coar-data-list__viewport').trigger('keydown', { key: 'ArrowDown' });
    expect(selected.value).toEqual([2]);
    await wrapper.find('.coar-data-list__viewport').trigger('keydown', { key: 'ArrowDown', shiftKey: true });
    expect(selected.value).toEqual([2, 3]);
    await wrapper.find('.coar-data-list__viewport').trigger('keydown', { key: 'End' });
    expect(selected.value).toEqual([8]);
    await wrapper.find('.coar-data-list__viewport').trigger('keydown', { key: 'a', ctrlKey: true });
    expect(selected.value).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    await wrapper.find('.coar-data-list__viewport').trigger('keydown', { key: 'Home' });
    await wrapper.find('.coar-data-list__viewport').trigger('keydown', { key: ' ' });
    expect(selected.value).toEqual([]);
    expect(viewport.getAttribute('tabindex')).toBe('0');
  });

  it('emits item-activate on Enter and double-click', async () => {
    const { wrapper } = mountList();
    await nextTick();
    await wrapper.findAll('.coar-data-list__item')[2].trigger('dblclick');
    await wrapper.find('.coar-data-list__viewport').trigger('focus');
    await wrapper.find('.coar-data-list__viewport').trigger('keydown', { key: 'Enter' });
    const list = wrapper.findComponent({ name: 'CoarDataList' });
    const activations = list.emitted('item-activate') as Array<[{ item: Row }]>;
    expect(activations.map(([event]) => event.item.id)).toEqual([3, 1]);
  });

  it('filters by search and shows the empty slot', async () => {
    const { wrapper, search } = mountList();
    await nextTick();
    search.value = 'grace 4';
    await nextTick();
    expect(itemTexts(wrapper)).toEqual(['Task 4 · Grace']);
    search.value = 'nothing';
    await nextTick();
    expect(wrapper.find('.coar-data-list__empty').text()).toBe('No items');
  });

  it('sorts via the sort model and renders group headings', async () => {
    const { wrapper, sort } = mountList({ sortOptions, groupBy: (row: Row) => row.owner });
    await nextTick();
    const groups = wrapper.findAll('.coar-data-list__group');
    expect(groups.map((node) => node.text())).toEqual(['Ada4', 'Grace4']);
    sort.value = { key: 'title', direction: 'desc' };
    await nextTick();
    expect(itemTexts(wrapper)[0]).toBe('Task 7 · Ada');
  });

  it('shows the toolbar only when a control is enabled', async () => {
    const plain = mountList();
    await nextTick();
    expect(plain.wrapper.find('.coar-data-list-toolbar').exists()).toBe(false);
    plain.wrapper.unmount();

    const withSearch = mountList({ showSearch: true });
    await nextTick();
    expect(withSearch.wrapper.find('.coar-data-list-toolbar').exists()).toBe(true);
    expect(withSearch.wrapper.find('input').attributes('placeholder')).toBe('Search…');
  });

  it('applies the gap as a CSS variable and skips it on the last row', async () => {
    const { wrapper } = mountList({ gap: 8 });
    await nextTick();
    const root = wrapper.find('.coar-data-list').element as HTMLElement;
    expect(root.style.getPropertyValue('--coar-data-list-gap')).toBe('8px');
    const rows = wrapper.findAll('.coar-data-list__row');
    expect(rows[0].classes()).not.toContain('coar-data-list__row--last');
    expect(rows[rows.length - 1].classes()).toContain('coar-data-list__row--last');

    const rem = mountList({ gap: '0.5rem' });
    await nextTick();
    expect((rem.wrapper.find('.coar-data-list').element as HTMLElement).style.getPropertyValue('--coar-data-list-gap')).toBe('0.5rem');
  });

  it('wraps tiles into rows in grid layout, keeping data order', async () => {
    const { wrapper } = mountList({ layout: 'grid', tileMinWidth: 200 });
    await nextTick();
    await nextTick();
    const rows = wrapper.findAll('.coar-data-list__row');
    expect(rows.length).toBe(3); // 8 items, 600px / 200px = 3 per row
    expect(rows[0].findAll('.coar-data-list__item').map((node) => node.text())).toEqual([
      'Task 1 · Ada', 'Task 2 · Grace', 'Task 3 · Ada',
    ]);
    expect(rows[2].findAll('.coar-data-list__item').length).toBe(2);
    expect((rows[0].find('.coar-data-list__cells').element as HTMLElement).style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    expect(wrapper.find('.coar-data-list--layout-grid').exists()).toBe(true);
  });

  it('keeps group headings on their own row in grid layout', async () => {
    const { wrapper } = mountList({ layout: 'grid', tileMinWidth: 200, groupBy: (row: Row) => row.owner });
    await nextTick();
    await nextTick();
    const rows = wrapper.findAll('.coar-data-list__row');
    expect(rows.map((row) => (row.find('.coar-data-list__group').exists() ? 'G' : row.findAll('.coar-data-list__item').length))).toEqual([
      'G', 3, 1, 'G', 3, 1,
    ]);
  });

  it('moves focus by tile and by row in grid layout', async () => {
    const { wrapper, selected } = mountList({ layout: 'grid', tileMinWidth: 200 });
    await nextTick();
    await nextTick();
    const viewport = wrapper.find('.coar-data-list__viewport');
    await viewport.trigger('focus');
    await viewport.trigger('keydown', { key: 'ArrowRight' });
    expect(selected.value).toEqual([2]);
    await viewport.trigger('keydown', { key: 'ArrowDown' });
    expect(selected.value).toEqual([5]);
    await viewport.trigger('keydown', { key: 'ArrowLeft' });
    expect(selected.value).toEqual([4]);
    await viewport.trigger('keydown', { key: 'ArrowUp' });
    expect(selected.value).toEqual([1]);
  });

  it('ignores ArrowLeft/Right in list layout', async () => {
    const { wrapper, selected } = mountList();
    await nextTick();
    const viewport = wrapper.find('.coar-data-list__viewport');
    await viewport.trigger('focus');
    await viewport.trigger('keydown', { key: 'ArrowRight' });
    expect(selected.value).toEqual([]);
  });

  it('marks the root when the template owns the box', async () => {
    const { wrapper } = mountList({ unstyledItems: true });
    await nextTick();
    expect(wrapper.find('.coar-data-list--unstyled').exists()).toBe(true);
    // Structure and behaviour stay: rows, keys, roles.
    expect(wrapper.findAll('.coar-data-list__item').length).toBe(8);
    expect(wrapper.find('.coar-data-list__item').attributes('data-key')).toBe('1');
  });

  it('exposes the headless list and scroll helpers', async () => {
    const { wrapper } = mountList();
    await nextTick();
    const exposed = wrapper.findComponent({ name: 'CoarDataList' }).vm as unknown as {
      list: { count: { value: number } };
      scrollToKey: (key: CoarDataListKey) => void;
      focusKey: (key: CoarDataListKey) => void;
    };
    expect(exposed.list.count.value).toBe(8);
    expect(() => exposed.scrollToKey(8)).not.toThrow();
    exposed.focusKey(3);
    await nextTick();
    await nextTick();
    expect(wrapper.find('.coar-data-list__item--focused').text()).toBe('Task 3 · Ada');
  });
});
