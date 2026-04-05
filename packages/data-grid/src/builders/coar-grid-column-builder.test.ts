import { describe, it, expect, vi } from 'vitest';
import type { Component } from 'vue';
import { CoarGridColumnBuilder } from './coar-grid-column-builder';

interface TestRow {
  id: number;
  name: string;
  amount: number;
  status: 'active' | 'inactive';
}

describe('CoarGridColumnBuilder', () => {
  describe('constructor', () => {
    it('should create a column with field name', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').build();

      expect(colDef.field).toBe('name');
      expect(colDef.headerName).toBe('name');
      expect(colDef.resizable).toBe(true);
      expect(colDef.sortable).toBe(false);
    });

    it('should create a column without field name', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>().build();

      expect(colDef.field).toBeUndefined();
    });
  });

  describe('field', () => {
    it('should set the field and default headerName', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>().field('name').build();

      expect(colDef.field).toBe('name');
      expect(colDef.headerName).toBe('name');
    });

    it('should not override existing headerName', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>()
        .header('Full Name')
        .field('name')
        .build();

      expect(colDef.field).toBe('name');
      expect(colDef.headerName).toBe('Full Name');
    });
  });

  describe('header', () => {
    it('should set header name', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').header('Full Name').build();

      expect(colDef.headerName).toBe('Full Name');
    });
  });

  describe('headerTooltip', () => {
    it('should set header tooltip', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name')
        .headerTooltip('This is the name')
        .build();

      expect(colDef.headerTooltip).toBe('This is the name');
    });
  });

  describe('width and sizing', () => {
    it('should set width', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').width(150).build();

      expect(colDef.width).toBe(150);
    });

    it('should set width with min and max', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').width(150, 100, 300).build();

      expect(colDef.width).toBe(150);
      expect(colDef.minWidth).toBe(100);
      expect(colDef.maxWidth).toBe(300);
    });

    it('should set fixed width (width = min = max)', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').fixedWidth(150).build();

      expect(colDef.width).toBe(150);
      expect(colDef.minWidth).toBe(150);
      expect(colDef.maxWidth).toBe(150);
    });

    it('should set min width', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').minWidth(100).build();

      expect(colDef.minWidth).toBe(100);
    });

    it('should set max width', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').maxWidth(300).build();

      expect(colDef.maxWidth).toBe(300);
    });

    it('should set flex', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').flex(2).build();

      expect(colDef.flex).toBe(2);
    });

    it('should default flex to 1', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').flex().build();

      expect(colDef.flex).toBe(1);
    });
  });

  describe('sorting', () => {
    it('should enable sorting', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').sortable().build();

      expect(colDef.sortable).toBe(true);
    });

    it('should disable sorting explicitly', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').sortable(false).build();

      expect(colDef.sortable).toBe(false);
    });
  });

  describe('resizable', () => {
    it('should make column resizable', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').resizable().build();

      expect(colDef.resizable).toBe(true);
    });

    it('should disable column resizing', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').resizable(false).build();

      expect(colDef.resizable).toBe(false);
    });
  });

  describe('hidden', () => {
    it('should hide column', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('id').hidden().build();

      expect(colDef.hide).toBe(true);
    });

    it('should show column explicitly', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('id').hidden(false).build();

      expect(colDef.hide).toBe(false);
    });
  });

  describe('pinning', () => {
    it('should pin column to left', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').pinned('left').build();

      expect(colDef.pinned).toBe('left');
    });

    it('should pin column to right', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').pinned('right').build();

      expect(colDef.pinned).toBe('right');
    });

    it('should unpin column', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').pinned(null).build();

      expect(colDef.pinned).toBeNull();
    });
  });

  describe('lockPosition', () => {
    it('should lock position', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').lockPosition().build();

      expect(colDef.lockPosition).toBe(true);
    });

    it('should lock position to left', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').lockPosition('left').build();

      expect(colDef.lockPosition).toBe('left');
    });
  });

  describe('cellRenderer', () => {
    it('should set cell renderer component', () => {
      const FakeRenderer = {} as Component;
      const colDef = new CoarGridColumnBuilder<TestRow>('name')
        .cellRenderer(FakeRenderer)
        .build();

      expect(colDef.cellRenderer).toBe(FakeRenderer);
    });

    it('should set cell renderer with params', () => {
      const FakeRenderer = {} as Component;
      const colDef = new CoarGridColumnBuilder<TestRow>('name')
        .cellRenderer(FakeRenderer, { foo: 'bar' })
        .build();

      expect(colDef.cellRenderer).toBe(FakeRenderer);
      expect(colDef.cellRendererParams).toEqual({ foo: 'bar' });
    });
  });

  describe('cellRendererParams', () => {
    it('should merge cell renderer params', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name')
        .cellRendererParams({ a: 1 })
        .cellRendererParams({ b: 2 })
        .build();

      expect(colDef.cellRendererParams).toEqual({ a: 1, b: 2 });
    });
  });

  describe('cellRendererConfig', () => {
    it('should set cell renderer with config wrapped in config key', () => {
      const FakeRenderer = {} as Component;
      const config = { size: 's' };
      const colDef = new CoarGridColumnBuilder<TestRow>('name')
        .cellRendererConfig(FakeRenderer, config)
        .build();

      expect(colDef.cellRenderer).toBe(FakeRenderer);
      expect(colDef.cellRendererParams?.config).toEqual(config);
    });
  });

  describe('valueFormatter', () => {
    it('should set value formatter function', () => {
      const formatter = (params: { value: string }) => params.value.toUpperCase();
      const colDef = new CoarGridColumnBuilder<TestRow>('name').valueFormatter(formatter).build();

      expect(colDef.valueFormatter).toBe(formatter);
    });
  });

  describe('valueGetter', () => {
    it('should set value getter function', () => {
      const getter = vi.fn();
      const colDef = new CoarGridColumnBuilder<TestRow>('name').valueGetter(getter).build();

      expect(colDef.valueGetter).toBe(getter);
    });
  });

  describe('cellClass', () => {
    it('should set static cell class', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('status').cellClass('status-cell').build();

      expect(colDef.cellClass).toBe('status-cell');
    });

    it('should set array cell class', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('status')
        .cellClass(['a', 'b'])
        .build();

      expect(colDef.cellClass).toEqual(['a', 'b']);
    });

    it('should set dynamic cell class function', () => {
      const classFn = () => 'dynamic-class';
      const colDef = new CoarGridColumnBuilder<TestRow>('status').cellClass(classFn).build();

      expect(colDef.cellClass).toBe(classFn);
    });
  });

  describe('cellStyle', () => {
    it('should set cell style object', () => {
      const style = { color: 'red' };
      const colDef = new CoarGridColumnBuilder<TestRow>('name').cellStyle(style).build();

      expect(colDef.cellStyle).toEqual({ color: 'red' });
    });
  });

  describe('classRule', () => {
    it('should add a class rule', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('status')
        .classRule('active', (params) => params.value === 'active')
        .build();

      expect(colDef.cellClassRules).toBeDefined();
      expect(colDef.cellClassRules!['active']).toBeDefined();
    });

    it('should add multiple class rules', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('status')
        .classRule('active', 'value === "active"')
        .classRule('inactive', 'value === "inactive"')
        .build();

      expect(Object.keys(colDef.cellClassRules!)).toHaveLength(2);
    });
  });

  describe('tooltip', () => {
    it('should use field as tooltip when called without args', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').tooltip().build();

      expect(colDef.tooltipField).toBe('name');
    });

    it('should set tooltip field from string', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').tooltip('description').build();

      expect(colDef.tooltipField).toBe('description');
    });

    it('should set tooltip value getter from function', () => {
      const fn = () => 'tooltip text';
      const colDef = new CoarGridColumnBuilder<TestRow>('name').tooltip(fn).build();

      expect(colDef.tooltipValueGetter).toBe(fn);
    });
  });

  describe('filter', () => {
    it('should enable filtering', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').filter().build();

      expect(colDef.filter).toBe(true);
    });

    it('should set filter type string', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').filter('agTextColumnFilter').build();

      expect(colDef.filter).toBe('agTextColumnFilter');
    });

    it('should set filter params', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name')
        .filterParams({ buttons: ['reset'] })
        .build();

      expect(colDef.filterParams).toEqual({ buttons: ['reset'] });
    });
  });

  describe('quickFilter', () => {
    it('should disable quick filter', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').quickFilter(false).build();

      expect((colDef as Record<string, unknown>)['__coarQuickFilter']).toBe(false);
    });

    it('should set custom quick filter function', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const fn = (value: unknown, data: TestRow) => 'custom';
      const colDef = new CoarGridColumnBuilder<TestRow>('name').quickFilter(fn).build();

      expect((colDef as Record<string, unknown>)['__coarQuickFilter']).toBe(fn);
    });

    it('should enable quick filter with true', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').quickFilter(true).build();

      expect((colDef as Record<string, unknown>)['__coarQuickFilter']).toBe(true);
    });
  });

  describe('comparator', () => {
    it('should set custom sort comparator', () => {
      const cmp = () => 0;
      const colDef = new CoarGridColumnBuilder<TestRow>('name').comparator(cmp).build();

      expect(colDef.comparator).toBeDefined();
    });
  });

  describe('rowDrag', () => {
    it('should enable row drag', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name').rowDrag().build();

      expect(colDef.rowDrag).toBe(true);
    });

    it('should set row drag callback', () => {
      const cb = vi.fn();
      const colDef = new CoarGridColumnBuilder<TestRow>('name').rowDrag(cb).build();

      expect(colDef.rowDrag).toBe(cb);
    });
  });

  describe('onCellDoubleClicked', () => {
    it('should set cell double click handler', () => {
      const handler = vi.fn();
      const colDef = new CoarGridColumnBuilder<TestRow>('name')
        .onCellDoubleClicked(handler)
        .build();

      expect(colDef.onCellDoubleClicked).toBe(handler);
    });
  });

  describe('option', () => {
    it('should set an arbitrary ColDef option', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name')
        .option('editable', true)
        .build();

      expect(colDef.editable).toBe(true);
    });
  });

  describe('customize', () => {
    it('should apply custom modifications', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name')
        .customize((def) => {
          def.editable = true;
        })
        .build();

      expect(colDef.editable).toBe(true);
    });
  });

  describe('build', () => {
    it('should return a copy of the column definition', () => {
      const builder = new CoarGridColumnBuilder<TestRow>('name');
      const colDef1 = builder.build();
      const colDef2 = builder.build();

      expect(colDef1).toEqual(colDef2);
      expect(colDef1).not.toBe(colDef2);
    });
  });

  describe('fluent chaining', () => {
    it('should support method chaining', () => {
      const colDef = new CoarGridColumnBuilder<TestRow>('name')
        .header('Full Name')
        .width(200)
        .minWidth(100)
        .maxWidth(400)
        .sortable()
        .pinned('left')
        .build();

      expect(colDef.field).toBe('name');
      expect(colDef.headerName).toBe('Full Name');
      expect(colDef.width).toBe(200);
      expect(colDef.minWidth).toBe(100);
      expect(colDef.maxWidth).toBe(400);
      expect(colDef.sortable).toBe(true);
      expect(colDef.pinned).toBe('left');
    });
  });
});
