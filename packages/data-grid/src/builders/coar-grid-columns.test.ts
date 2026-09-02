import { describe, expect, it, vi } from 'vitest';
import type { ColDef, Column, ColumnState, GridApi } from 'ag-grid-community';
import { CoarGridColumns } from './coar-grid-columns';

interface TestRow {
  id: number;
  name: string;
  status: string;
  score?: number;
}

function createMockApi(initialDefs: ColDef<TestRow>[], initialState?: ColumnState[]) {
  let definitions = [...initialDefs];
  let state =
    initialState ??
    definitions.map((definition) => ({
      colId: definition.colId ?? String(definition.field),
      hide: definition.hide ?? false,
      width: definition.width ?? 100,
    }));
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  function emit(name: string) {
    for (const listener of listeners.get(name) ?? []) listener({ finished: true });
  }

  function columnFor(id: string): Column | null {
    const definition = definitions.find(
      (candidate) => (candidate.colId ?? String(candidate.field)) === id,
    );
    if (!definition) return null;
    return {
      getColId: () => id,
      getColDef: () => definition,
      isVisible: () => state.find((entry) => entry.colId === id)?.hide !== true,
    } as unknown as Column;
  }

  const api = {
    getColumnState: vi.fn(() => state.map((entry) => ({ ...entry }))),
    getColumn: vi.fn((id: string) => columnFor(id)),
    getColumns: vi.fn(
      () =>
        definitions
          .map((definition) => columnFor(definition.colId ?? String(definition.field)))
          .filter(Boolean) as Column[],
    ),
    getAllGridColumns: vi.fn(
      () =>
        definitions
          .map((definition) => columnFor(definition.colId ?? String(definition.field)))
          .filter(Boolean) as Column[],
    ),
    setGridOption: vi.fn((key: string, value: unknown) => {
      if (key !== 'columnDefs') return;
      definitions = [...(value as ColDef<TestRow>[])];
      const known = new Set(state.map((entry) => entry.colId));
      for (const definition of definitions) {
        const id = definition.colId ?? String(definition.field);
        if (!known.has(id)) {
          state.push({ colId: id, hide: definition.hide ?? false, width: definition.width ?? 100 });
        }
      }
      state = state.filter((entry) =>
        definitions.some(
          (definition) => (definition.colId ?? String(definition.field)) === entry.colId,
        ),
      );
      emit('newColumnsLoaded');
    }),
    applyColumnState: vi.fn(
      ({ state: incoming, applyOrder }: { state: ColumnState[]; applyOrder?: boolean }) => {
        const incomingById = new Map(incoming.map((entry) => [entry.colId, entry]));
        state = state.map((entry) => ({ ...entry, ...incomingById.get(entry.colId) }));
        if (applyOrder) {
          const order = new Map(incoming.map((entry, index) => [entry.colId, index]));
          state.sort(
            (left, right) =>
              (order.get(left.colId) ?? Number.MAX_SAFE_INTEGER) -
              (order.get(right.colId) ?? Number.MAX_SAFE_INTEGER),
          );
          definitions.sort(
            (left, right) =>
              (order.get(left.colId ?? String(left.field)) ?? Number.MAX_SAFE_INTEGER) -
              (order.get(right.colId ?? String(right.field)) ?? Number.MAX_SAFE_INTEGER),
          );
        }
        return true;
      },
    ),
    setColumnsVisible: vi.fn((ids: string[], visible: boolean) => {
      state = state.map((entry) =>
        ids.includes(entry.colId) ? { ...entry, hide: !visible } : entry,
      );
      emit('columnVisible');
    }),
    resetColumnState: vi.fn(),
    addEventListener: vi.fn((name: string, listener: (...args: unknown[]) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(listener);
    }),
    removeEventListener: vi.fn((name: string, listener: (...args: unknown[]) => void) => {
      listeners.get(name)?.delete(listener);
    }),
  } as unknown as GridApi<TestRow>;

  return { api, getState: () => state };
}

describe('CoarGridColumns', () => {
  it('exposes picker items and respects column visibility metadata', () => {
    const columns = CoarGridColumns.create<TestRow>([
      (col) => col.field('name').header('Name'),
      (col) => col.field('status').header('Status').hidden(),
      (col) => col.field('id').header('ID').option('lockVisible', true),
      (col) => col.field('score').option('suppressColumnsToolPanel', true),
    ]);

    expect(columns.items.value).toEqual([
      expect.objectContaining({ id: 'name', label: 'Name', visible: true, canHide: true }),
      expect.objectContaining({ id: 'status', visible: false, defaultVisible: false }),
      expect.objectContaining({ id: 'id', canHide: false }),
    ]);
  });

  it('supports headless visibility controls and never hides the final visible column', () => {
    const columns = CoarGridColumns.create<TestRow>([
      (col) => col.field('name'),
      (col) => col.field('status').hidden(),
    ]);

    columns.setVisible('name', false);
    expect(columns.items.value.find((item) => item.id === 'name')?.visible).toBe(true);

    columns.showAll();
    columns.toggle('name');
    expect(columns.items.value.map((item) => [item.id, item.visible])).toEqual([
      ['name', false],
      ['status', true],
    ]);

    columns.resetVisibility();
    expect(columns.items.value.map((item) => [item.id, item.visible])).toEqual([
      ['name', true],
      ['status', false],
    ]);
  });

  it('keeps one column visible when every definition default is hidden', () => {
    const columns = CoarGridColumns.create<TestRow>([
      (col) => col.field('name').hidden(),
      (col) => col.field('status').hidden(),
    ]);

    columns.setVisible('name', true);
    columns.resetVisibility();

    expect(columns.items.value.map((item) => [item.id, item.visible])).toEqual([
      ['name', true],
      ['status', false],
    ]);
  });

  it('updates bound definitions without remounting and restores matching runtime state', () => {
    const columns = CoarGridColumns.create<TestRow>([
      (col) => col.field('name').width(120),
      (col) => col.field('status').width(140),
    ]);
    const { api } = createMockApi(columns._getColumnDefs(), [
      { colId: 'status', width: 260, hide: false },
      { colId: 'name', width: 220, hide: true },
    ]);
    columns.bind(api);

    columns.replaceDefinitions([
      (col) => col.field('name').width(120),
      (col) => col.number('score').width(90),
    ]);

    expect(api.setGridOption).toHaveBeenCalledWith(
      'columnDefs',
      expect.arrayContaining([
        expect.objectContaining({ colId: 'name' }),
        expect.objectContaining({ colId: 'score' }),
      ]),
    );
    expect(api.applyColumnState).toHaveBeenLastCalledWith({
      state: expect.arrayContaining([
        expect.objectContaining({ colId: 'name', width: 220, hide: true }),
        expect.objectContaining({ colId: 'status', width: 260, hide: false }),
      ]),
      applyOrder: true,
    });
    expect(columns.items.value.find((item) => item.id === 'score')?.visible).toBe(true);
  });

  it('keeps dormant state so a removed dynamic column can recover it later', () => {
    const columns = CoarGridColumns.create<TestRow>([
      (col) => col.field('name'),
      (col) => col.field('status'),
    ]);
    const { api } = createMockApi(columns._getColumnDefs(), [
      { colId: 'name', width: 180, hide: false },
      { colId: 'status', width: 310, hide: true },
    ]);
    columns.bind(api);

    columns.remove('status');
    columns.append((col) => col.field('status').width(100));

    expect(api.applyColumnState).toHaveBeenLastCalledWith({
      state: expect.arrayContaining([
        expect.objectContaining({ colId: 'status', width: 310, hide: true }),
      ]),
      applyOrder: true,
    });
    expect(columns.items.value.find((item) => item.id === 'status')?.visible).toBe(false);
  });
});
