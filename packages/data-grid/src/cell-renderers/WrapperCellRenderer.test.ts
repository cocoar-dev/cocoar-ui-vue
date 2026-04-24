import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import WrapperCellRenderer from './WrapperCellRenderer.vue';
import type { Column, GridApi, ICellRendererParams, IRowNode } from 'ag-grid-community';
import type { WrapperCellRendererConfig } from './wrapper-cell-renderer.models';

interface Row {
  id: number;
  name: string;
  isCritical: boolean;
  awaitingFeedback: boolean;
  unread: number;
}

function createParams(data: Row, config: WrapperCellRendererConfig<Row>): ICellRendererParams {
  return {
    value: data.name,
    valueFormatted: null,
    colDef: { cellRendererParams: { config } },
    data,
    node: {} as IRowNode,
    rowIndex: 0,
    api: {} as GridApi,
    column: {} as Column,
    eGridCell: document.createElement('div'),
    eParentOfValue: document.createElement('div'),
    formatValue: (v: unknown) => String(v),
    getValue: () => data.name,
    setValue: () => {},
    refreshCell: () => {},
    registerRowDragger: () => {},
    setTooltip: () => {},
  } as unknown as ICellRendererParams;
}

const baseRow: Row = {
  id: 1,
  name: 'Q4 budget review',
  isCritical: true,
  awaitingFeedback: false,
  unread: 3,
};

describe('WrapperCellRenderer', () => {
  it('renders the fallback text when no innerRenderer is provided', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: { params: createParams(baseRow, {}) },
    });
    expect(wrapper.find('.coar-wrap-cell__inner').text()).toBe('Q4 budget review');
  });

  it('renders nothing in a slot when the single item is hidden', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: { icon: 'bell', show: () => false },
        }),
      },
    });
    expect(wrapper.find('.coar-wrap-cell__slot--right').exists()).toBe(false);
  });

  it('hides an icon item when the accessor returns null', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: { icon: () => null },
        }),
      },
    });
    expect(wrapper.find('.coar-wrap-cell__slot--right').exists()).toBe(false);
  });

  it('renders multiple right-side items when config.right is an array', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: [
            { icon: 'circle-alert', show: (r) => r.isCritical },
            { icon: 'bell',         show: (r) => r.awaitingFeedback },
          ],
        }),
      },
    });
    const items = wrapper.findAll('.coar-wrap-cell__slot--right .coar-wrap-cell__item');
    // Only the critical item is visible (awaitingFeedback = false)
    expect(items.length).toBe(1);
  });

  it('renders all array items that pass show()', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(
          { ...baseRow, isCritical: true, awaitingFeedback: true },
          {
            right: [
              { icon: 'circle-alert', show: (r) => r.isCritical },
              { icon: 'bell',         show: (r) => r.awaitingFeedback },
            ],
          },
        ),
      },
    });
    const items = wrapper.findAll('.coar-wrap-cell__slot--right .coar-wrap-cell__item');
    expect(items.length).toBe(2);
  });

  it('passes `row` as an implicit prop to component slots', () => {
    const seen: Row[] = [];
    const Probe = defineComponent({
      props: { row: { type: Object, required: true } },
      setup(p) {
        seen.push(p.row as Row);
        return () => h('span', 'probe');
      },
    });

    mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: { component: Probe },
        }),
      },
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual(baseRow);
  });

  it('allows params() to override the implicit row prop', () => {
    const seen: unknown[] = [];
    const Probe = defineComponent({
      props: { row: { type: Object, required: true } },
      setup(p) {
        seen.push(p.row);
        return () => h('span');
      },
    });

    mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: {
            component: Probe,
            params: () => ({ row: { id: 999, name: 'override' } }),
          },
        }),
      },
    });

    expect(seen[0]).toEqual({ id: 999, name: 'override' });
  });

  it('invokes onClick with the row and stops propagation', async () => {
    const onClick = vi.fn();
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          left: { icon: 'star', onClick },
        }),
      },
    });

    // Spy on stopPropagation by attaching our own listener to the parent.
    const bubbled = vi.fn();
    wrapper.element.parentElement?.addEventListener('click', bubbled);

    await wrapper.find('.coar-wrap-cell__item').trigger('click');

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0]).toEqual(baseRow);
    expect(bubbled).not.toHaveBeenCalled();
  });

  it('adds clickable class only to items with onClick', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: [
            { icon: 'star', onClick: () => {} },
            { icon: 'bell' },
          ],
        }),
      },
    });
    const items = wrapper.findAll('.coar-wrap-cell__slot--right .coar-wrap-cell__item');
    expect(items[0].classes()).toContain('coar-wrap-cell__item--clickable');
    expect(items[1].classes()).not.toContain('coar-wrap-cell__item--clickable');
  });

  it('renders text slot content', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: { text: (r) => `(${r.unread})` },
        }),
      },
    });
    expect(wrapper.find('.coar-wrap-cell__slot--right').text()).toBe('(3)');
  });

  it('hides text slot when accessor returns empty string', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: { text: () => '' },
        }),
      },
    });
    expect(wrapper.find('.coar-wrap-cell__slot--right').exists()).toBe(false);
  });

  it('applies tooltip attribute for icon slot', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          left: { icon: 'star', tooltip: (r) => (r.isCritical ? 'Critical' : 'Normal') },
        }),
      },
    });
    const item = wrapper.find('.coar-wrap-cell__item');
    expect(item.attributes('title')).toBe('Critical');
  });

  it('applies tooltip attribute for text slot', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: { text: 'label', tooltip: 'a tooltip' },
        }),
      },
    });
    expect(wrapper.find('.coar-wrap-cell__item').attributes('title')).toBe('a tooltip');
  });

  it('invokes onClick + stops propagation for component slots', async () => {
    const onClick = vi.fn();
    const Probe = defineComponent({
      props: { row: { type: Object, required: true } },
      setup() {
        return () => h('span', 'probe');
      },
    });
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: { component: Probe, onClick },
        }),
      },
    });
    const bubbled = vi.fn();
    wrapper.element.parentElement?.addEventListener('click', bubbled);

    await wrapper.find('.coar-wrap-cell__item').trigger('click');

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0]).toEqual(baseRow);
    expect(bubbled).not.toHaveBeenCalled();
  });

  it('inner renderer sees its own cellRendererParams via params.colDef (not the wrapper config)', () => {
    const seen: unknown[] = [];
    const InnerProbe = defineComponent({
      props: { params: { type: Object, required: true } },
      setup(p) {
        // Replicate how factory-created renderers (tag, tree, date, …) read their config.
        seen.push((p.params as ICellRendererParams).colDef?.cellRendererParams?.config);
        return () => h('span', 'inner');
      },
    });

    mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          innerRenderer: InnerProbe,
          innerRendererParams: { config: { variantMap: { open: 'success' } } },
          left: { icon: 'star' },
        }),
      },
    });

    expect(seen[0]).toEqual({ variantMap: { open: 'success' } });
  });

  it('respects per-item show() inside an array', () => {
    const wrapper = mount(WrapperCellRenderer, {
      props: {
        params: createParams(baseRow, {
          right: [
            { icon: 'circle-alert', show: () => true },
            { icon: 'bell',         show: () => false },
            { icon: 'star',         show: () => true },
          ],
        }),
      },
    });
    const items = wrapper.findAll('.coar-wrap-cell__slot--right .coar-wrap-cell__item');
    expect(items.length).toBe(2);
  });
});
