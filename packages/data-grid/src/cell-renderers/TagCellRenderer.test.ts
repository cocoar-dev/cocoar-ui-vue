import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TagCellRenderer from './TagCellRenderer.vue';
import type { Column, GridApi, ICellRendererParams, IRowNode } from 'ag-grid-community';

function createParams(
  value: unknown,
  config: Record<string, unknown> = {},
  valueFormatted?: string | null,
): ICellRendererParams {
  return {
    value,
    valueFormatted: valueFormatted ?? null,
    colDef: {
      cellRendererParams: { config },
    },
    // Minimal stubs for the rest of ICellRendererParams
    data: undefined,
    node: {} as IRowNode,
    rowIndex: 0,
    api: {} as GridApi,
    column: {} as Column,
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

describe('TagCellRenderer', () => {
  it('renders nothing for null value', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams(null) },
    });
    expect(wrapper.findAll('.coar-tag')).toHaveLength(0);
  });

  it('renders a single tag from a string value', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams('active') },
    });
    const tags = wrapper.findAll('.coar-tag');
    expect(tags).toHaveLength(1);
    expect(tags[0].text()).toBe('active');
  });

  it('splits comma-separated string into multiple tags', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams('alpha, beta, gamma') },
    });
    const tags = wrapper.findAll('.coar-tag');
    expect(tags).toHaveLength(3);
    expect(tags[0].text()).toBe('alpha');
    expect(tags[1].text()).toBe('beta');
    expect(tags[2].text()).toBe('gamma');
  });

  it('uses custom separator from config', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams('a|b|c', { separator: '|' }) },
    });
    expect(wrapper.findAll('.coar-tag')).toHaveLength(3);
  });

  it('renders tags from an array value', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams(['foo', 'bar']) },
    });
    const tags = wrapper.findAll('.coar-tag');
    expect(tags).toHaveLength(2);
    expect(tags[0].text()).toBe('foo');
    expect(tags[1].text()).toBe('bar');
  });

  it('applies variant from variantMap', () => {
    const wrapper = mount(TagCellRenderer, {
      props: {
        params: createParams('active', {
          variantMap: { active: 'success' },
        }),
      },
    });
    const tag = wrapper.find('.coar-tag');
    expect(tag.classes()).toContain('coar-tag--success');
  });

  it('falls back to config variant when not in variantMap', () => {
    const wrapper = mount(TagCellRenderer, {
      props: {
        params: createParams('unknown', { variant: 'warning' }),
      },
    });
    const tag = wrapper.find('.coar-tag');
    expect(tag.classes()).toContain('coar-tag--warning');
  });

  it('defaults to neutral variant', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams('test') },
    });
    const tag = wrapper.find('.coar-tag');
    expect(tag.classes()).toContain('coar-tag--neutral');
  });

  it('applies size from config', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams('test', { size: 'l' }) },
    });
    const tag = wrapper.find('.coar-tag');
    expect(tag.classes()).toContain('coar-tag--l');
  });

  it('defaults to size s', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams('test') },
    });
    const tag = wrapper.find('.coar-tag');
    expect(tag.classes()).toContain('coar-tag--s');
  });

  it('reads labels from objects with labelProperty', () => {
    const value = [
      { name: 'Alpha', id: 1 },
      { name: 'Beta', id: 2 },
    ];
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams(value, { labelProperty: 'name' }) },
    });
    const tags = wrapper.findAll('.coar-tag');
    expect(tags).toHaveLength(2);
    expect(tags[0].text()).toBe('Alpha');
    expect(tags[1].text()).toBe('Beta');
  });

  it('uses valueFormatted for primitive values when available', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams('raw', {}, 'formatted') },
    });
    const tags = wrapper.findAll('.coar-tag');
    expect(tags).toHaveLength(1);
    expect(tags[0].text()).toBe('formatted');
  });

  it('prefers raw value for arrays even when valueFormatted exists', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams(['a', 'b'], {}, 'formatted') },
    });
    expect(wrapper.findAll('.coar-tag')).toHaveLength(2);
  });

  it('applies i18nPrefix to labels (falls back to key without provider)', () => {
    const wrapper = mount(TagCellRenderer, {
      props: {
        params: createParams('active', { i18nPrefix: 'status.' }),
      },
    });
    // Without localization provider, useI18n.t returns the key itself
    expect(wrapper.find('.coar-tag').text()).toBe('status.active');
  });

  it('filters out empty strings from split', () => {
    const wrapper = mount(TagCellRenderer, {
      props: { params: createParams(',a,,b,') },
    });
    expect(wrapper.findAll('.coar-tag')).toHaveLength(2);
  });
});
