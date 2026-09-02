import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useDataList } from './useDataList';
import type { CoarDataListSort, CoarDataListSortOption } from './types';

interface Row {
  id: number;
  name: string;
  region: string;
  score: number | null;
}

const rows: Row[] = [
  { id: 1, name: 'Vienna Gateway', region: 'EU', score: 18 },
  { id: 2, name: 'Danube Relay', region: 'EU', score: 62 },
  { id: 3, name: 'Pacific Node', region: 'APAC', score: null },
  { id: 4, name: 'Atlantic Edge', region: 'US', score: 84 },
];

const sortOptions: CoarDataListSortOption<Row>[] = [
  { key: 'name', label: 'Name' },
  { key: 'score', label: 'Score', by: (row) => row.score },
  { key: 'custom', label: 'Custom', compare: (a, b) => b.id - a.id },
];

function ids(items: readonly Row[]): number[] {
  return items.map((row) => row.id);
}

describe('useDataList pipeline', () => {
  it('passes items through untouched by default', () => {
    const list = useDataList<Row>({ items: rows, itemKey: (row) => row.id });
    expect(ids(list.items.value)).toEqual([1, 2, 3, 4]);
    expect(list.total.value).toBe(4);
    expect(list.count.value).toBe(4);
  });

  it('searches all primitive fields with AND-terms, diacritics folded', () => {
    const search = ref('');
    const list = useDataList<Row>({ items: rows, itemKey: (row) => row.id, search });
    search.value = 'eu';
    expect(ids(list.items.value)).toEqual([1, 2]);
    search.value = 'eu relay';
    expect(ids(list.items.value)).toEqual([2]);
    search.value = 'Dánube';
    expect(ids(list.items.value)).toEqual([2]);
  });

  it('respects searchBy fields', () => {
    const list = useDataList<Row>({
      items: rows,
      itemKey: (row) => row.id,
      search: 'EU',
      searchBy: ['name'],
    });
    expect(list.items.value).toEqual([]);
  });

  it('applies the filter before the search', () => {
    const list = useDataList<Row>({
      items: rows,
      itemKey: (row) => row.id,
      filter: (row) => row.region === 'EU',
      search: 'gateway',
    });
    expect(ids(list.items.value)).toEqual([1]);
  });

  it('sorts by option key, extractor, and custom comparator', () => {
    const sort = ref<CoarDataListSort | null>({ key: 'name', direction: 'asc' });
    const list = useDataList<Row>({ items: rows, itemKey: (row) => row.id, sort, sortOptions, locale: 'en' });
    expect(ids(list.items.value)).toEqual([4, 2, 3, 1]);

    sort.value = { key: 'score', direction: 'desc' };
    // null score sorts last in ascending; descending reverses the comparator result,
    // so the null row moves first. Consumers wanting "nulls always last" use `compare`.
    expect(ids(list.items.value)).toEqual([3, 4, 2, 1]);

    sort.value = { key: 'custom', direction: 'asc' };
    expect(ids(list.items.value)).toEqual([4, 3, 2, 1]);

    sort.value = null;
    expect(ids(list.items.value)).toEqual([1, 2, 3, 4]);
  });

  it('ignores an unknown sort key', () => {
    const list = useDataList<Row>({
      items: rows,
      itemKey: (row) => row.id,
      sort: { key: 'nope', direction: 'asc' },
      sortOptions,
    });
    expect(ids(list.items.value)).toEqual([1, 2, 3, 4]);
  });

  it('groups with headings in group order and sorts inside groups', () => {
    const list = useDataList<Row>({
      items: rows,
      itemKey: (row) => row.id,
      groupBy: (row) => row.region,
      sort: { key: 'name', direction: 'asc' },
      sortOptions,
      locale: 'en',
    });
    expect(list.entries.value.map((entry) => (entry.kind === 'group' ? `#${entry.group}` : entry.itemKey))).toEqual([
      '#APAC', 3, '#EU', 2, 1, '#US', 4,
    ]);
    expect(ids(list.items.value)).toEqual([3, 2, 1, 4]);
    expect(list.indexOfKey(1)).toBe(2);
    expect(list.entryIndexOfKey(1)).toBe(4);
  });

  it('supports custom group order', () => {
    const list = useDataList<Row>({
      items: rows,
      itemKey: (row) => row.id,
      groupBy: (row) => row.region,
      sortGroups: 'desc',
    });
    const groups = list.entries.value.filter((entry) => entry.kind === 'group').map((entry) => entry.key);
    expect(groups).toEqual(['g:US', 'g:EU', 'g:APAC']);
  });
});

describe('useDataList selection', () => {
  it('replaces, toggles, and ranges in multiple mode', () => {
    const list = useDataList<Row>({ items: rows, itemKey: (row) => row.id, selectionMode: 'multiple' });
    list.select(2);
    expect(list.selected.value).toEqual([2]);
    list.select(4, 'toggle');
    expect(list.selected.value).toEqual([2, 4]);
    list.select(4, 'toggle');
    expect(list.selected.value).toEqual([2]);
    list.select(1);
    list.select(3, 'range');
    expect(list.selected.value).toEqual([1, 2, 3]);
    list.selectAll();
    expect(list.selected.value).toEqual([1, 2, 3, 4]);
    list.clear();
    expect(list.selected.value).toEqual([]);
    expect(list.anchor.value).toBeNull();
  });

  it('keeps a single item in single mode', () => {
    const list = useDataList<Row>({ items: rows, itemKey: (row) => row.id, selectionMode: 'single' });
    list.select(1);
    list.select(2, 'toggle');
    expect(list.selected.value).toEqual([2]);
    list.select(2, 'toggle');
    expect(list.selected.value).toEqual([]);
    list.select(1);
    list.select(3, 'range');
    expect(list.selected.value).toEqual([3]);
    list.selectAll();
    expect(list.selected.value).toEqual([3]);
  });

  it('does nothing in none mode', () => {
    const list = useDataList<Row>({ items: rows, itemKey: (row) => row.id, selectionMode: 'none' });
    list.select(1);
    expect(list.selected.value).toEqual([]);
  });

  it('writes to an external model and resolves selected items even when filtered out', () => {
    const selected = ref<(string | number)[]>([3]);
    const search = ref('');
    const list = useDataList<Row>({
      items: rows,
      itemKey: (row) => row.id,
      selectionMode: 'multiple',
      selected,
      search,
    });
    list.select(1, 'toggle');
    expect(selected.value).toEqual([3, 1]);
    search.value = 'vienna';
    expect(ids(list.items.value)).toEqual([1]);
    expect(ids(list.selectedItems.value)).toEqual([3, 1]);
    expect(list.isSelected(3)).toBe(true);
  });
});
