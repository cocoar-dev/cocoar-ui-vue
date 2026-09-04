import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useDataListModel } from './useDataListModel';
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

describe('useDataListModel pipeline', () => {
  it('passes items through untouched by default', () => {
    const list = useDataListModel<Row>({ items: rows, itemKey: (row) => row.id });
    expect(ids(list.items.value)).toEqual([1, 2, 3, 4]);
    expect(list.total.value).toBe(4);
    expect(list.count.value).toBe(4);
  });

  it('searches all primitive fields with AND-terms, diacritics folded', () => {
    const search = ref('');
    const list = useDataListModel<Row>({ items: rows, itemKey: (row) => row.id, search });
    search.value = 'eu';
    expect(ids(list.items.value)).toEqual([1, 2]);
    search.value = 'eu relay';
    expect(ids(list.items.value)).toEqual([2]);
    search.value = 'Dánube';
    expect(ids(list.items.value)).toEqual([2]);
  });

  it('respects searchBy fields', () => {
    const list = useDataListModel<Row>({
      items: rows,
      itemKey: (row) => row.id,
      search: 'EU',
      searchBy: ['name'],
    });
    expect(list.items.value).toEqual([]);
  });

  it('applies the filter before the search', () => {
    const list = useDataListModel<Row>({
      items: rows,
      itemKey: (row) => row.id,
      filter: (row) => row.region === 'EU',
      search: 'gateway',
    });
    expect(ids(list.items.value)).toEqual([1]);
  });

  it('sorts by option key, extractor, and custom comparator', () => {
    const sort = ref<CoarDataListSort | null>({ key: 'name', direction: 'asc' });
    const list = useDataListModel<Row>({ items: rows, itemKey: (row) => row.id, sort, sortOptions, locale: 'en' });
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
    const list = useDataListModel<Row>({
      items: rows,
      itemKey: (row) => row.id,
      sort: { key: 'nope', direction: 'asc' },
      sortOptions,
    });
    expect(ids(list.items.value)).toEqual([1, 2, 3, 4]);
  });

  it('groups with headings in group order and sorts inside groups', () => {
    const list = useDataListModel<Row>({
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
    const list = useDataListModel<Row>({
      items: rows,
      itemKey: (row) => row.id,
      groupBy: (row) => row.region,
      sortGroups: 'desc',
    });
    const groups = list.entries.value.filter((entry) => entry.kind === 'group').map((entry) => entry.key);
    expect(groups).toEqual(['g:US', 'g:EU', 'g:APAC']);
  });
});

describe('useDataListModel nesting', () => {
  interface Task {
    id: string;
    title: string;
    due: number;
    subTasks?: Task[];
  }
  const tasks: Task[] = [
    {
      id: 'b',
      title: 'Beta',
      due: 2,
      subTasks: [
        { id: 'b2', title: 'Beta two', due: 20 },
        { id: 'b1', title: 'Beta one', due: 10, subTasks: [{ id: 'b1x', title: 'Deep', due: 5 }] },
      ],
    },
    { id: 'a', title: 'Alpha', due: 3 },
    { id: 'c', title: 'Gamma', due: 1, subTasks: [{ id: 'c1', title: 'Only child', due: 7 }] },
  ];
  const byTitle = { key: 'title', direction: 'asc' as const };
  const titleOptions = [{ key: 'title', label: 'Title' }, { key: 'due', label: 'Due' }];

  function keys(list: { entries: { value: unknown[] } }): string[] {
    return (list.entries.value as Array<{ kind: string; itemKey?: string; depth?: number }>)
      .filter((entry) => entry.kind === 'item')
      .map((entry) => `${'  '.repeat(entry.depth ?? 0)}${entry.itemKey}`);
  }

  it('shows top-level items only until a parent is expanded', () => {
    const expanded = ref<(string | number)[]>([]);
    const list = useDataListModel<Task>({ items: tasks, itemKey: (t) => t.id, children: (t) => t.subTasks, expanded });
    expect(keys(list)).toEqual(['b', 'a', 'c']);
    expect(list.hasChildren(tasks[0])).toBe(true);
    expect(list.hasChildren(tasks[1])).toBe(false);
    list.expand('b');
    expect(expanded.value).toEqual(['b']);
    expect(keys(list)).toEqual(['b', '  b2', '  b1', 'a', 'c']);
    list.expand('b1');
    expect(keys(list)).toEqual(['b', '  b2', '  b1', '    b1x', 'a', 'c']);
    expect(list.parentOf('b1x')).toBe('b1');
    expect(list.entryOfKey('b1')?.hasChildren).toBe(true);
    list.collapse('b');
    expect(keys(list)).toEqual(['b', 'a', 'c']);
    expect(list.total.value).toBe(3);
  });

  it('sorts child levels with their own configuration', () => {
    const list = useDataListModel<Task>({
      items: tasks,
      itemKey: (t) => t.id,
      children: (t) => t.subTasks,
      expanded: ref(['b']),
      sort: byTitle,
      sortOptions: titleOptions,
      childLevel: { sort: { key: 'due', direction: 'desc' }, sortOptions: titleOptions },
      locale: 'en',
    });
    expect(keys(list)).toEqual(['a', 'b', '  b2', '  b1', 'c']);
  });

  it('lets child levels inherit the top-level sort or keep input order', () => {
    const inherit = useDataListModel<Task>({
      items: tasks, itemKey: (t) => t.id, children: (t) => t.subTasks, expanded: ref(['b']), sort: byTitle, sortOptions: titleOptions, locale: 'en',
    });
    expect(keys(inherit)).toEqual(['a', 'b', '  b1', '  b2', 'c']);
    const unsorted = useDataListModel<Task>({
      items: tasks, itemKey: (t) => t.id, children: (t) => t.subTasks, expanded: ref(['b']), sort: byTitle, sortOptions: titleOptions, childLevel: { sort: null }, locale: 'en',
    });
    expect(keys(unsorted)).toEqual(['a', 'b', '  b2', '  b1', 'c']);
  });

  it('keeps parents of matching descendants and opens them while searching', () => {
    const search = ref('');
    const list = useDataListModel<Task>({ items: tasks, itemKey: (t) => t.id, children: (t) => t.subTasks, search, searchBy: ['title'] });
    search.value = 'deep';
    expect(keys(list)).toEqual(['b', '  b1', '    b1x']);
    search.value = 'gamma';
    // The parent matches itself; its children are not forced open.
    expect(keys(list)).toEqual(['c']);
    search.value = '';
    expect(keys(list)).toEqual(['b', 'a', 'c']);
  });

  it('respects maxDepth and the nesting switch', () => {
    const shallow = useDataListModel<Task>({ items: tasks, itemKey: (t) => t.id, children: (t) => t.subTasks, expanded: ref(['b', 'b1']), maxDepth: 1 });
    expect(keys(shallow)).toEqual(['b', '  b2', '  b1', 'a', 'c']);
    expect(shallow.entryOfKey('b1')?.expanded).toBe(false);
    const off = useDataListModel<Task>({ items: tasks, itemKey: (t) => t.id, children: (t) => t.subTasks, expanded: ref(['b']), nesting: false });
    expect(keys(off)).toEqual(['b', 'a', 'c']);
    expect(off.hasChildren(tasks[0])).toBe(false);
  });

  it('expands and collapses everything, and resolves nested keys', () => {
    const list = useDataListModel<Task>({ items: tasks, itemKey: (t) => t.id, children: (t) => t.subTasks });
    list.expandAll();
    expect(new Set(list.expanded.value)).toEqual(new Set(['b', 'b1', 'c']));
    expect(list.count.value).toBe(7);
    expect(list.itemByKey('b1x')?.title).toBe('Deep');
    list.collapseAll();
    expect(list.count.value).toBe(3);
    expect(list.itemByKey('b1x')?.title).toBe('Deep'); // still resolvable while hidden
  });
});

describe('useDataListModel selection', () => {
  it('replaces, toggles, and ranges in multiple mode', () => {
    const list = useDataListModel<Row>({ items: rows, itemKey: (row) => row.id, selectionMode: 'multiple' });
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
    const list = useDataListModel<Row>({ items: rows, itemKey: (row) => row.id, selectionMode: 'single' });
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
    const list = useDataListModel<Row>({ items: rows, itemKey: (row) => row.id, selectionMode: 'none' });
    list.select(1);
    expect(list.selected.value).toEqual([]);
  });

  it('writes to an external model and resolves selected items even when filtered out', () => {
    const selected = ref<(string | number)[]>([3]);
    const search = ref('');
    const list = useDataListModel<Row>({
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
