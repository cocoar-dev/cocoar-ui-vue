import { describe, it, expect, vi } from 'vitest';
import { defineComponent } from 'vue';
import { CoarGridColumnBuilder } from './coar-grid-column-builder';
import { CoarGridColumnFactory } from './coar-grid-column-factory';
import { CoarGridWrapperColumnBuilder } from './coar-grid-wrapper-column-builder';
import WrapperCellRenderer from '../cell-renderers/WrapperCellRenderer.vue';
import TagCellRenderer from '../cell-renderers/TagCellRenderer.vue';
import type {
  WrapperCellRendererConfig,
  WrapperIconSlotConfig,
  WrapperComponentSlotConfig,
} from '../cell-renderers/wrapper-cell-renderer.models';

interface Row {
  id: number;
  name: string;
  starred: boolean;
  unread: number;
  status: string;
}

function getWrapperConfig<T>(
  colDef: { cellRendererParams?: Record<string, unknown> },
): WrapperCellRendererConfig<T> {
  return colDef.cellRendererParams?.config as WrapperCellRendererConfig<T>;
}

describe('CoarGridColumnFactory.wrap', () => {
  it('returns a CoarGridWrapperColumnBuilder', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const inner = factory.field('name');
    const wrapper = factory.wrap(inner);
    expect(wrapper).toBeInstanceOf(CoarGridWrapperColumnBuilder);
  });
});

describe('CoarGridWrapperColumnBuilder', () => {
  it('preserves the inner colDef field', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const colDef = factory.wrap(factory.field('name').header('Name')).build();
    expect(colDef.field).toBe('name');
    expect(colDef.headerName).toBe('Name');
  });

  it('preserves inner sortable/resizable/flex settings', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const colDef = factory
      .wrap(factory.field('name').sortable().flex(2))
      .build();
    expect(colDef.sortable).toBe(true);
    expect(colDef.flex).toBe(2);
    expect(colDef.resizable).toBe(true);
  });

  it('preserves inner valueFormatter', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const fmt = vi.fn((p: { value: unknown }) => `#${p.value}`);
    const colDef = factory
      .wrap(factory.field('id').valueFormatter(fmt as never))
      .build();
    expect(colDef.valueFormatter).toBe(fmt);
  });

  it('preserves inner comparator', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const inner = new CoarGridColumnBuilder<Row, string>('name').comparator(
      (a, b) => String(a).localeCompare(String(b)),
    );
    const colDef = factory.wrap(inner).build();
    expect(typeof colDef.comparator).toBe('function');
  });

  it('swaps cellRenderer to WrapperCellRenderer', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const colDef = factory.wrap(factory.field('name')).build();
    expect(colDef.cellRenderer).toBe(WrapperCellRenderer);
  });

  it('swaps cellRenderer even when inner has its own renderer', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const colDef = factory.wrap(factory.tag('status')).build();
    expect(colDef.cellRenderer).toBe(WrapperCellRenderer);
  });

  it('forwards the inner renderer through config.innerRenderer', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const colDef = factory.wrap(factory.tag('status')).build();
    const cfg = getWrapperConfig<Row>(colDef);
    expect(cfg.innerRenderer).toBe(TagCellRenderer);
  });

  it('forwards the inner cellRendererParams through config.innerRendererParams', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const colDef = factory
      .wrap(factory.tag('status', { variantMap: { open: 'success' } }))
      .build();
    const cfg = getWrapperConfig<Row>(colDef);
    expect(cfg.innerRendererParams).toEqual({
      config: { variantMap: { open: 'success' } },
    });
  });

  it('innerRenderer is null when inner has no cellRenderer', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const colDef = factory.wrap(factory.field('name')).build();
    const cfg = getWrapperConfig<Row>(colDef);
    expect(cfg.innerRenderer).toBe(null);
  });

  it('stores left slot config on the wrapper config', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const left: WrapperIconSlotConfig<Row> = {
      icon: (r) => (r.starred ? 'star' : null),
      size: 's',
    };
    const colDef = factory.wrap(factory.field('name')).left(left).build();
    const cfg = getWrapperConfig<Row>(colDef);
    expect(cfg.left).toBe(left);
    expect(cfg.right).toBeUndefined();
  });

  it('stores right slot config on the wrapper config', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const Badge = defineComponent({ template: '<span />' });
    const right: WrapperComponentSlotConfig<Row> = {
      component: Badge,
      params: (r) => ({ count: r.unread }),
    };
    const colDef = factory.wrap(factory.field('name')).right(right).build();
    const cfg = getWrapperConfig<Row>(colDef);
    expect(cfg.right).toBe(right);
  });

  it('supports both slots at once', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const colDef = factory
      .wrap(factory.field('name'))
      .left({ icon: 'star' })
      .right({ text: (r) => String(r.unread) })
      .build();
    const cfg = getWrapperConfig<Row>(colDef);
    expect(cfg.left).toBeDefined();
    expect(cfg.right).toBeDefined();
  });

  it('does not leak inner cellRendererParams into the outer cellRendererParams namespace', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const colDef = factory
      .wrap(factory.tag('status', { variantMap: { open: 'success' } }))
      .build();
    // Only { config } should live on the outer cellRendererParams.
    expect(Object.keys(colDef.cellRendererParams ?? {})).toEqual(['config']);
  });

  it('left/right are fluent (return this)', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const wrapper = factory.wrap(factory.field('name'));
    expect(wrapper.left({ icon: 'a' })).toBe(wrapper);
    expect(wrapper.right({ icon: 'b' })).toBe(wrapper);
  });

  it('accepts an array of items on a slot', () => {
    const factory = new CoarGridColumnFactory<Row>();
    const right = [
      { icon: 'circle-alert', show: (r: Row) => r.status === 'critical' },
      { icon: 'bell',         show: (r: Row) => r.unread > 0 },
    ];
    const colDef = factory.wrap(factory.field('name')).right(right).build();
    const cfg = getWrapperConfig<Row>(colDef);
    expect(Array.isArray(cfg.right)).toBe(true);
    expect((cfg.right as typeof right).length).toBe(2);
  });
});
