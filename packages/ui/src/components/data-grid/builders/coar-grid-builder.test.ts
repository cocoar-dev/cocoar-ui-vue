import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { CoarGridBuilder } from './coar-grid-builder';
import { CoarGridColumnBuilder } from './coar-grid-column-builder';

interface TestRow {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

describe('CoarGridBuilder', () => {
  describe('create', () => {
    it('should create a builder instance', () => {
      const builder = CoarGridBuilder.create<TestRow>();
      expect(builder).toBeInstanceOf(CoarGridBuilder);
    });

    it('should have gridReady as false initially', () => {
      const builder = CoarGridBuilder.create<TestRow>();
      expect(builder.gridReady.value).toBe(false);
    });

    it('should have api as undefined initially', () => {
      const builder = CoarGridBuilder.create<TestRow>();
      expect(builder.api).toBeUndefined();
    });
  });

  describe('columns', () => {
    it('should set column definitions using factory functions', () => {
      const builder = CoarGridBuilder.create<TestRow>().columns([
        (col) => col.field('name').header('Name'),
        (col) => col.field('status').header('Status'),
      ]);

      const colDefs = builder._getColumnDefs();
      expect(colDefs).toHaveLength(2);
      expect(colDefs[0].field).toBe('name');
      expect(colDefs[0].headerName).toBe('Name');
      expect(colDefs[1].field).toBe('status');
      expect(colDefs[1].headerName).toBe('Status');
    });

    it('should accept raw column builders', () => {
      const nameBuilder = new CoarGridColumnBuilder<TestRow>('name').header('Name');

      const builder = CoarGridBuilder.create<TestRow>().columns([nameBuilder]);

      const colDefs = builder._getColumnDefs();
      expect(colDefs).toHaveLength(1);
      expect(colDefs[0].field).toBe('name');
    });
  });

  describe('rowData', () => {
    it('should set static row data', () => {
      const data: TestRow[] = [{ id: 1, name: 'Test', status: 'active' }];
      const builder = CoarGridBuilder.create<TestRow>().rowData(data);

      expect(builder._getRowData()).toEqual(data);
    });

    it('should set row data to null', () => {
      const builder = CoarGridBuilder.create<TestRow>().rowData(null);
      expect(builder._getRowData()).toBeNull();
    });
  });

  describe('rowSelection', () => {
    it('should configure single row selection', () => {
      const builder = CoarGridBuilder.create<TestRow>().rowSelection('single');
      const options = builder._getGridOptions();

      expect(options.rowSelection).toEqual({ mode: 'singleRow' });
    });

    it('should configure multiple row selection', () => {
      const builder = CoarGridBuilder.create<TestRow>().rowSelection('multiple');
      const options = builder._getGridOptions();

      expect(options.rowSelection).toEqual({ mode: 'multiRow' });
    });
  });

  describe('defaultColDef', () => {
    it('should set default column definition from object', () => {
      const builder = CoarGridBuilder.create<TestRow>().defaultColDef({
        sortable: true,
        resizable: true,
      });
      const options = builder._getGridOptions();

      expect(options.defaultColDef?.sortable).toBe(true);
      expect(options.defaultColDef?.resizable).toBe(true);
    });

    it('should set default column definition from builder function', () => {
      const builder = CoarGridBuilder.create<TestRow>().defaultColDef((b) =>
        b.sortable().resizable().flex(1),
      );
      const options = builder._getGridOptions();

      expect(options.defaultColDef?.sortable).toBe(true);
      expect(options.defaultColDef?.flex).toBe(1);
    });
  });

  describe('rowClassRules', () => {
    it('should set row class rules', () => {
      const rules = {
        'row-active': (params: { data?: TestRow }) => params.data?.status === 'active',
      };
      const builder = CoarGridBuilder.create<TestRow>().rowClassRules(rules);
      const options = builder._getGridOptions();

      expect(options.rowClassRules).toBeDefined();
    });
  });

  describe('defaultSort', () => {
    it('should set initial sort state', () => {
      const builder = CoarGridBuilder.create<TestRow>().defaultSort('name', 'asc');
      const options = builder._getGridOptions();

      expect(options.initialState?.sort?.sortModel).toEqual([
        { colId: 'name', sort: 'asc' },
      ]);
    });
  });

  describe('editing', () => {
    it('should enable full row editing', () => {
      const builder = CoarGridBuilder.create<TestRow>().fullRowEdit();
      const options = builder._getGridOptions();

      expect(options.editType).toBe('fullRow');
    });

    it('should disable full row editing', () => {
      const builder = CoarGridBuilder.create<TestRow>().fullRowEdit(false);
      const options = builder._getGridOptions();

      expect(options.editType).toBeUndefined();
    });

    it('should enable stop editing when cells lose focus', () => {
      const builder = CoarGridBuilder.create<TestRow>().stopEditingWhenCellsLoseFocus();
      const options = builder._getGridOptions();

      expect(options.stopEditingWhenCellsLoseFocus).toBe(true);
    });
  });

  describe('event handlers', () => {
    it('should set onRowClicked handler', () => {
      const handler = vi.fn();
      const builder = CoarGridBuilder.create<TestRow>().onRowClicked(handler);
      const options = builder._getGridOptions();

      expect(options.onRowClicked).toBe(handler);
    });

    it('should set onRowDoubleClicked handler', () => {
      const handler = vi.fn();
      const builder = CoarGridBuilder.create<TestRow>().onRowDoubleClicked(handler);
      const options = builder._getGridOptions();

      expect(options.onRowDoubleClicked).toBe(handler);
    });

    it('should set onCellClicked handler', () => {
      const handler = vi.fn();
      const builder = CoarGridBuilder.create<TestRow>().onCellClicked(handler);
      const options = builder._getGridOptions();

      expect(options.onCellClicked).toBe(handler);
    });

    it('should set onCellDoubleClicked handler', () => {
      const handler = vi.fn();
      const builder = CoarGridBuilder.create<TestRow>().onCellDoubleClicked(handler);
      const options = builder._getGridOptions();

      expect(options.onCellDoubleClicked).toBe(handler);
    });

    it('should set viewport click handler', () => {
      const handler = vi.fn();
      const builder = CoarGridBuilder.create<TestRow>().onViewportClick(handler);

      expect(builder._getViewportClickHandler()).toBe(handler);
    });

    it('should set viewport context menu handler', () => {
      const handler = vi.fn();
      const builder = CoarGridBuilder.create<TestRow>().onViewportContextMenu(handler);

      expect(builder._getViewportContextMenuHandler()).toBe(handler);
    });

    it('should suppress ctrl+click for cell context menu', () => {
      const handler = vi.fn();
      const builder = CoarGridBuilder.create<TestRow>().onCellContextMenu(handler);
      const options = builder._getGridOptions();

      // Simulate ctrl+click - handler should NOT be called
      const ctrlEvent = { event: { ctrlKey: true } };
      (options.onCellContextMenu as Function)(ctrlEvent);
      expect(handler).not.toHaveBeenCalled();

      // Simulate normal right-click - handler SHOULD be called
      const normalEvent = { event: { ctrlKey: false } };
      (options.onCellContextMenu as Function)(normalEvent);
      expect(handler).toHaveBeenCalledWith(normalEvent);
    });

    it('should report when cell context menu handler is registered', () => {
      const builder = CoarGridBuilder.create<TestRow>();
      expect(builder._hasCellContextMenuHandler()).toBe(false);

      builder.onCellContextMenu(vi.fn());
      expect(builder._hasCellContextMenuHandler()).toBe(true);
    });
  });

  describe('animateRows', () => {
    it('should enable row animation by default', () => {
      const builder = CoarGridBuilder.create<TestRow>();
      const options = builder._getGridOptions();

      expect(options.animateRows).toBe(true);
    });

    it('should disable row animation', () => {
      const builder = CoarGridBuilder.create<TestRow>().animateRows(false);
      const options = builder._getGridOptions();

      expect(options.animateRows).toBe(false);
    });
  });

  describe('option and options', () => {
    it('should set a single grid option', () => {
      const builder = CoarGridBuilder.create<TestRow>().option('pagination', true);
      const options = builder._getGridOptions();

      expect(options.pagination).toBe(true);
    });

    it('should merge grid options', () => {
      const builder = CoarGridBuilder.create<TestRow>().options({
        pagination: true,
        paginationPageSize: 25,
      });
      const options = builder._getGridOptions();

      expect(options.pagination).toBe(true);
      expect(options.paginationPageSize).toBe(25);
    });
  });

  describe('externalFilter', () => {
    it('should set external filter', () => {
      const filterFn = vi.fn().mockReturnValue(true);
      const builder = CoarGridBuilder.create<TestRow>().externalFilter(filterFn);
      const options = builder._getGridOptions();

      expect(options.doesExternalFilterPass).toBe(filterFn);
      expect(options.isExternalFilterPresent).toBeDefined();
      // Default isFilterPresent returns true
      expect((options.isExternalFilterPresent as Function)()).toBe(true);
    });

    it('should set external filter with custom isFilterPresent', () => {
      const filterFn = vi.fn().mockReturnValue(true);
      const isPresent = vi.fn().mockReturnValue(false);
      const builder = CoarGridBuilder.create<TestRow>().externalFilter(filterFn, isPresent);
      const options = builder._getGridOptions();

      expect(options.isExternalFilterPresent).toBe(isPresent);
    });
  });

  describe('shiftResizeMode', () => {
    it('should enable shift resize mode', () => {
      const builder = CoarGridBuilder.create<TestRow>().shiftResizeMode();
      const options = builder._getGridOptions();

      expect(options.colResizeDefault).toBe('shift');
    });

    it('should disable shift resize mode', () => {
      const builder = CoarGridBuilder.create<TestRow>().shiftResizeMode(false);
      const options = builder._getGridOptions();

      expect(options.colResizeDefault).toBeUndefined();
    });
  });

  describe('_bind and _destroy', () => {
    it('should set gridReady to true on bind', () => {
      const builder = CoarGridBuilder.create<TestRow>();
      const mockApi = {} as any;

      builder._bind(mockApi);

      expect(builder.gridReady.value).toBe(true);
      expect(builder.api).toBe(mockApi);
    });

    it('should set gridReady to false on destroy', () => {
      const builder = CoarGridBuilder.create<TestRow>();
      const mockApi = {} as any;

      builder._bind(mockApi);
      builder._destroy();

      expect(builder.gridReady.value).toBe(false);
      expect(builder.api).toBeUndefined();
    });

    it('should watch reactive row data after bind', () => {
      const data = ref<TestRow[] | null>(null);
      const mockApi = {
        setGridOption: vi.fn(),
      } as any;

      const builder = CoarGridBuilder.create<TestRow>().rowDataRef(data);
      builder._bind(mockApi);

      // Immediate watch should set loading true for null data
      expect(mockApi.setGridOption).toHaveBeenCalledWith('rowData', []);
      expect(mockApi.setGridOption).toHaveBeenCalledWith('loading', true);
    });

    it('should apply static column state on bind', () => {
      const columnState = [{ colId: 'name', width: 200 }];
      const mockApi = {
        applyColumnState: vi.fn(),
      } as any;

      const builder = CoarGridBuilder.create<TestRow>().columnState(columnState);
      builder._bind(mockApi);

      expect(mockApi.applyColumnState).toHaveBeenCalledWith({
        state: columnState,
        applyOrder: true,
      });
    });
  });

  describe('fluent chaining', () => {
    it('should support method chaining', () => {
      const data: TestRow[] = [{ id: 1, name: 'Test', status: 'active' }];
      const handler = vi.fn();

      const builder = CoarGridBuilder.create<TestRow>()
        .rowData(data)
        .columns([(col) => col.field('name')])
        .rowSelection('single')
        .animateRows(true)
        .onRowClicked(handler);

      expect(builder).toBeInstanceOf(CoarGridBuilder);
      expect(builder._getRowData()).toEqual(data);
      expect(builder._getColumnDefs()).toHaveLength(1);
    });
  });
});
