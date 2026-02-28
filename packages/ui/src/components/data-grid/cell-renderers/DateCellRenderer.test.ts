import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DateCellRenderer from './DateCellRenderer.vue';
import type { ICellRendererParams } from 'ag-grid-community';

function createParams(value: unknown): ICellRendererParams {
  return {
    value,
    valueFormatted: null,
    colDef: {},
    data: undefined,
    node: {} as any,
    rowIndex: 0,
    api: {} as any,
    column: {} as any,
    eGridCell: document.createElement('div'),
    eParentOfValue: document.createElement('div'),
    formatValue: (v: unknown) => String(v),
    getValue: () => value,
    setValue: () => {},
    refreshCell: () => {},
    registerRowDragger: () => {},
    setTooltip: () => {},
  } as unknown as ICellRendererParams;
}

describe('DateCellRenderer', () => {
  it('renders the wrapper element', () => {
    const wrapper = mount(DateCellRenderer, {
      props: { params: createParams('2024-01-15') },
    });
    expect(wrapper.find('.coar-date-cell-renderer').exists()).toBe(true);
  });

  it('renders empty string for null value', () => {
    const wrapper = mount(DateCellRenderer, {
      props: { params: createParams(null) },
    });
    expect(wrapper.find('.coar-date-cell-renderer').text()).toBe('');
  });

  it('renders empty string for empty string value', () => {
    const wrapper = mount(DateCellRenderer, {
      props: { params: createParams('') },
    });
    expect(wrapper.find('.coar-date-cell-renderer').text()).toBe('');
  });

  it('renders empty string for undefined value', () => {
    const wrapper = mount(DateCellRenderer, {
      props: { params: createParams(undefined) },
    });
    expect(wrapper.find('.coar-date-cell-renderer').text()).toBe('');
  });

  it('formats a string date value', () => {
    const wrapper = mount(DateCellRenderer, {
      props: { params: createParams('2024-01-15') },
    });
    // Without localization provider, fmtDate returns String(value)
    expect(wrapper.find('.coar-date-cell-renderer').text()).toBe('2024-01-15');
  });

  it('formats a Date object value', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    const wrapper = mount(DateCellRenderer, {
      props: { params: createParams(date) },
    });
    // Without localization provider, fmtDate returns String(value)
    const text = wrapper.find('.coar-date-cell-renderer').text();
    expect(text).toBeTruthy();
  });

  it('returns null dateValue for non-date types', () => {
    const wrapper = mount(DateCellRenderer, {
      props: { params: createParams(12345) },
    });
    // Number is not a string or Date, so dateValue is null, formatted as empty
    expect(wrapper.find('.coar-date-cell-renderer').text()).toBe('');
  });
});
