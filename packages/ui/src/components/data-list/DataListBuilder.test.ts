import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import { mount } from '@vue/test-utils';
import CoarDataListRaw from './CoarDataList.vue';
import CoarOverlayHost from '../overlay/CoarOverlayHost.vue';
import { CoarOverlayPlugin, _resetOverlayServiceForTests } from '../overlay/useOverlay';
import { useDataList, DataListBuilder } from './data-list-builder';
import type { CoarDataListKey } from './types';

// Generic + defineSlots components can't be typed through `h()`; cast like the tree tests do.
const CoarDataList = CoarDataListRaw as Component;

interface Row {
  id: number;
  title: string;
  owner: string;
}

const rows: Row[] = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  title: `Task ${index + 1}`,
  owner: index % 2 === 0 ? 'Ada' : 'Grace',
}));

function mountWith(configure: (builder: DataListBuilder<Row>) => void) {
  const { builder, api } = useDataList<Row>();
  builder.items(rows).itemKey((row) => row.id).height('200px');
  configure(builder);
  // A sibling <CoarOverlayHost> gives the internal context menu somewhere to mount.
  const Host = defineComponent({
    setup() {
      return () =>
        h('div', null, [
          h(CoarDataList, { builder }, { item: ({ item }: { item: Row }) => h('span', item.title) }),
          h(CoarOverlayHost),
        ]);
    },
  });
  const wrapper = mount(Host, { attachTo: document.body, global: { plugins: [CoarOverlayPlugin] } });
  const viewport = wrapper.find('.coar-data-list__viewport').element as HTMLElement;
  Object.defineProperty(viewport, 'clientHeight', { configurable: true, get: () => 200 });
  viewport.dispatchEvent(new Event('scroll'));
  return { wrapper, builder, api };
}

describe('DataListBuilder', () => {
  beforeEach(() => _resetOverlayServiceForTests());
  afterEach(() => {
    _resetOverlayServiceForTests();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('chains setters and stores them on the state', () => {
    const { builder } = useDataList<Row>();
    const result = builder
      .items(rows)
      .itemKey((row) => row.id)
      .selection('multiple')
      .showSearch()
      .showSort()
      .sortOption('title', 'Title')
      .sortOption('owner', 'Owner', { defaultDirection: 'desc' })
      .dividers()
      .gap(4)
      .density('s');
    expect(result).toBe(builder);
    expect(builder.state.selection).toBe('multiple');
    expect(builder.state.showSearch).toBe(true);
    expect(builder.state.sortOptions).toEqual([
      { key: 'title', label: 'Title' },
      { key: 'owner', label: 'Owner', defaultDirection: 'desc' },
    ]);
    expect(builder.state.gap).toBe(4);
  });

  it('accepts refs or initial values for the writable state', () => {
    const search = ref('x');
    const { builder } = useDataList<Row>();
    builder.search(search).sort({ key: 'title', direction: 'desc' }).selected([2]);
    expect(builder.state.search).toBe(search);
    expect(builder.state.sort.value).toEqual({ key: 'title', direction: 'desc' });
    expect(builder.state.selected.value).toEqual([2]);
  });

  it('warns and no-ops on api actions before mount', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { api } = useDataList<Row>();
    api.select(1);
    api.scrollToKey(1);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(api.count.value).toBe(0);
    expect(api.items.value).toEqual([]);
  });

  it('drives the component and exposes live readonly refs', async () => {
    const { wrapper, api, builder } = mountWith((b) => b.selection('multiple').showSearch());
    await nextTick();
    expect(wrapper.findAll('.coar-data-list__item').length).toBe(6);
    expect(api.total.value).toBe(6);

    api.search.value = 'grace';
    await nextTick();
    expect(api.count.value).toBe(3);
    expect(wrapper.findAll('.coar-data-list__item').map((node) => node.text())).toEqual(['Task 2', 'Task 4', 'Task 6']);

    api.select(2);
    api.select(4, 'toggle');
    expect(api.selected.value).toEqual([2, 4]);
    expect(api.selectedItems.value.map((row) => row.id)).toEqual([2, 4]);
    expect(api.isSelected(4)).toBe(true);
    api.clearSelection();
    expect(builder.state.selected.value).toEqual([]);

    // Late setter calls re-render.
    builder.selection('none');
    await nextTick();
    expect(wrapper.find('[role="list"]').exists()).toBe(true);
  });

  it('calls builder handlers alongside the events', async () => {
    const clicks: number[] = [];
    const activations: number[] = [];
    const { wrapper } = mountWith((b) =>
      b.selection('single').onItemClick((e) => clicks.push(e.item.id)).onItemActivate((e) => activations.push(e.item.id)),
    );
    await nextTick();
    const items = wrapper.findAll('.coar-data-list__item');
    await items[1].trigger('click');
    await items[2].trigger('dblclick');
    expect(clicks).toEqual([2]);
    expect(activations).toEqual([3]);
  });

  it('renders a declarative item menu and closes it after a click', async () => {
    const onDelete = vi.fn();
    let receivedSelection: readonly Row[] = [];
    const { wrapper, api } = mountWith((b) =>
      b.selection('multiple').itemMenu((item, selectedItems) => {
        receivedSelection = selectedItems;
        return [
          { label: `Open ${item.title}`, onClick: () => {} },
          'divider',
          { label: 'Delete', danger: true, onClick: onDelete },
        ];
      }),
    );
    await nextTick();
    await wrapper.findAll('.coar-data-list__item')[1].trigger('contextmenu', { clientX: 10, clientY: 10 });
    await nextTick();
    // The item under the pointer is selected first, so bulk actions see it.
    expect(api.selected.value).toEqual([2]);
    expect(receivedSelection.map((row) => row.id)).toEqual([2]);
    const labels = Array.from(document.body.querySelectorAll('.coar-menu-item')).map((el) => el.textContent?.trim());
    expect(labels).toContain('Open Task 2');
    expect(labels).toContain('Delete');
    const danger = document.body.querySelector('.coar-data-list__menu-item--danger');
    expect(danger).not.toBeNull();
    (danger?.querySelector('button') ?? danger)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('lets the raw context-menu handler bypass the declarative menu', async () => {
    const raw = vi.fn();
    const { wrapper } = mountWith((b) =>
      b.itemMenu(() => [{ label: 'Never', onClick: () => {} }]).onItemContextMenu(raw),
    );
    await nextTick();
    await wrapper.findAll('.coar-data-list__item')[0].trigger('contextmenu', { clientX: 10, clientY: 10 });
    await nextTick();
    expect(raw).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('.coar-menu-item')).toBeNull();
  });

  it('throws when itemKey was never set', async () => {
    const { builder } = useDataList<Row>();
    builder.items(rows);
    const Host = defineComponent({ setup: () => () => h(CoarDataList, { builder }) });
    expect(() => mount(Host)).toThrow(/itemKey/);
  });

  it('keeps selected keys as the exposed selected ref', () => {
    const selected = ref<CoarDataListKey[]>([1]);
    const { builder, api } = useDataList<Row>();
    builder.selected(selected);
    expect(api.selected).toBe(selected);
  });
});
