import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarSelect from './CoarSelect.vue';
import type { CoarSelectOption } from './types';

// Stub Teleport so dropdown renders inline in tests
const globalStubs = { global: { stubs: { Teleport: true } } };

const baseOptions: CoarSelectOption[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
  { value: 'd', label: 'Disabled', disabled: true },
];

describe('CoarSelect', () => {
  it('renders with placeholder when no value', () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { options: baseOptions } });
    expect(w.text()).toContain('Select an option...');
  });

  it('shows selected option label', () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { modelValue: 'b', options: baseOptions } });
    expect(w.find('.coar-select-value').text()).toBe('Banana');
  });

  it('opens dropdown on click', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(true);
    expect(w.findAll('.coar-select-option')).toHaveLength(4);
  });

  it('selects option on click', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { modelValue: null, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }), options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[1].trigger('click');
    expect(w.props('modelValue')).toBe('b');
  });

  it('does not select disabled option', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { modelValue: null, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }), options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[3].trigger('click');
    expect(w.props('modelValue')).toBeNull();
  });

  it('closes dropdown after selection', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { modelValue: null, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }), options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[0].trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('does not open when disabled', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { disabled: true, options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('does not open when readonly', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { readonly: true, options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('applies size class', () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { size: 'l', options: baseOptions } });
    expect(w.find('.coar-select--l').exists()).toBe(true);
  });

  it('applies inline appearance', () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { appearance: 'inline', options: baseOptions } });
    expect(w.find('.coar-select--inline').exists()).toBe(true);
  });

  it('shows clear button when clearable and has value', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { modelValue: 'a', clearable: true, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }), options: baseOptions } });
    expect(w.find('.coar-select-clear').exists()).toBe(true);
    await w.find('.coar-select-clear').trigger('click');
    expect(w.props('modelValue')).toBeNull();
  });

  it('does not show clear button when no value', () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { clearable: true, options: baseOptions } });
    expect(w.find('.coar-select-clear').exists()).toBe(false);
  });

  it('filters options when searchable', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { searchable: true, options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-inline-search').exists()).toBe(true);
    await w.find('.coar-select-inline-search').setValue('ban');
    await w.find('.coar-select-inline-search').trigger('input');
    // After filtering, only Banana should match
    const options = w.findAll('.coar-select-option');
    expect(options.length).toBe(1);
    expect(options[0].text()).toContain('Banana');
  });

  it('navigates with keyboard ArrowDown/Enter', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { modelValue: null, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }), options: baseOptions } });
    const trigger = w.find('.coar-select-trigger');
    await trigger.trigger('keydown', { key: 'ArrowDown' });
    expect(w.find('.coar-select-dropdown').exists()).toBe(true);
    await trigger.trigger('keydown', { key: 'ArrowDown' });
    await trigger.trigger('keydown', { key: 'Enter' });
    expect(w.props('modelValue')).toBe('b');
  });

  it('closes with Escape', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(true);
    await w.find('.coar-select-trigger').trigger('keydown', { key: 'Escape' });
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('uses compareWith function', () => {
    const opts: CoarSelectOption[] = [
      { value: { id: 1 }, label: 'One' },
      { value: { id: 2 }, label: 'Two' },
    ];
    const w = mount(CoarSelect, {
      ...globalStubs,
      props: {
        modelValue: { id: 2 },
        options: opts,
        compareWith: (a: unknown, b: unknown) => (a as { id: number }).id === (b as { id: number }).id,
      },
    });
    expect(w.find('.coar-select-value').text()).toBe('Two');
  });

  it('marks selected option with checkmark', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { modelValue: 'a', options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.findAll('.coar-select-option')[0].find('.coar-select-option-check').exists()).toBe(true);
    expect(w.findAll('.coar-select-option')[1].find('.coar-select-option-check').exists()).toBe(false);
  });

  it('shows empty state', async () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { options: [] } });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-empty').text()).toBe('No options available');
  });

  it('has correct ARIA attributes', () => {
    const w = mount(CoarSelect, { ...globalStubs, props: { error: true, options: baseOptions } });
    const trigger = w.find('.coar-select-trigger');
    expect(trigger.attributes('role')).toBe('combobox');
    expect(trigger.attributes('aria-haspopup')).toBe('listbox');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(trigger.attributes('aria-invalid')).toBe('true');
  });

  describe('sortOptions', () => {
    it('sorts options ascending by label when sortOptions is asc', async () => {
      const opts: CoarSelectOption[] = [
        { value: 'c', label: 'Cherry' },
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
      ];
      const w = mount(CoarSelect, { ...globalStubs, props: { options: opts, sortOptions: 'asc' } });
      await w.find('.coar-select-trigger').trigger('click');
      const labels = w.findAll('.coar-select-option-label').map((el) => el.text());
      expect(labels).toEqual(['Apple', 'Banana', 'Cherry']);
    });

    it('sorts options descending by label when sortOptions is desc', async () => {
      const opts: CoarSelectOption[] = [
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
        { value: 'c', label: 'Cherry' },
      ];
      const w = mount(CoarSelect, { ...globalStubs, props: { options: opts, sortOptions: 'desc' } });
      await w.find('.coar-select-trigger').trigger('click');
      const labels = w.findAll('.coar-select-option-label').map((el) => el.text());
      expect(labels).toEqual(['Cherry', 'Banana', 'Apple']);
    });

    it('preserves input order when sortOptions is none (default)', async () => {
      const opts: CoarSelectOption[] = [
        { value: 'c', label: 'Cherry' },
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
      ];
      const w = mount(CoarSelect, { ...globalStubs, props: { options: opts } });
      await w.find('.coar-select-trigger').trigger('click');
      const labels = w.findAll('.coar-select-option-label').map((el) => el.text());
      expect(labels).toEqual(['Cherry', 'Apple', 'Banana']);
    });

    it('accepts a custom comparator for sortOptions', async () => {
      const opts: CoarSelectOption[] = [
        { value: 'b', label: 'Banana' },
        { value: 'c', label: 'Cherry' },
        { value: 'a', label: 'Apple' },
      ];
      // Sort by value string
      const w = mount(CoarSelect, {
        ...globalStubs,
        props: { options: opts, sortOptions: (a: CoarSelectOption, b: CoarSelectOption) => String(a.value).localeCompare(String(b.value)) },
      });
      await w.find('.coar-select-trigger').trigger('click');
      const labels = w.findAll('.coar-select-option-label').map((el) => el.text());
      expect(labels).toEqual(['Apple', 'Banana', 'Cherry']);
    });
  });

  describe('sortGroups', () => {
    const groupedOptions: CoarSelectOption[] = [
      { value: 1, label: 'Carrot', group: 'Vegetables' },
      { value: 2, label: 'Apple', group: 'Fruits' },
      { value: 3, label: 'Banana', group: 'Fruits' },
      { value: 4, label: 'Broccoli', group: 'Vegetables' },
      { value: 5, label: 'Milk' }, // ungrouped
    ];

    it('sorts groups ascending by default', async () => {
      const w = mount(CoarSelect, { ...globalStubs, props: { options: groupedOptions } });
      await w.find('.coar-select-trigger').trigger('click');
      const headers = w.findAll('.coar-select-group-header').map((el) => el.text());
      expect(headers).toEqual(['Fruits', 'Vegetables']);
    });

    it('sorts groups descending when sortGroups is desc', async () => {
      const w = mount(CoarSelect, { ...globalStubs, props: { options: groupedOptions, sortGroups: 'desc' } });
      await w.find('.coar-select-trigger').trigger('click');
      const headers = w.findAll('.coar-select-group-header').map((el) => el.text());
      expect(headers).toEqual(['Vegetables', 'Fruits']);
    });

    it('preserves group input order when sortGroups is none', async () => {
      const w = mount(CoarSelect, { ...globalStubs, props: { options: groupedOptions, sortGroups: 'none' } });
      await w.find('.coar-select-trigger').trigger('click');
      const headers = w.findAll('.coar-select-group-header').map((el) => el.text());
      // First group encountered is Vegetables, then Fruits
      expect(headers).toEqual(['Vegetables', 'Fruits']);
    });

    it('ungrouped options always appear first', async () => {
      const w = mount(CoarSelect, { ...globalStubs, props: { options: groupedOptions } });
      await w.find('.coar-select-trigger').trigger('click');
      const labels = w.findAll('.coar-select-option-label').map((el) => el.text());
      expect(labels[0]).toBe('Milk');
    });

    it('sorts options within groups when sortOptions is asc', async () => {
      const opts: CoarSelectOption[] = [
        { value: 1, label: 'Banana', group: 'Fruits' },
        { value: 2, label: 'Apple', group: 'Fruits' },
        { value: 3, label: 'Broccoli', group: 'Vegetables' },
        { value: 4, label: 'Artichoke', group: 'Vegetables' },
      ];
      const w = mount(CoarSelect, { ...globalStubs, props: { options: opts, sortOptions: 'asc' } });
      await w.find('.coar-select-trigger').trigger('click');
      const labels = w.findAll('.coar-select-option-label').map((el) => el.text());
      // Fruits group (asc): Apple, Banana; Vegetables group (asc): Artichoke, Broccoli
      expect(labels).toEqual(['Apple', 'Banana', 'Artichoke', 'Broccoli']);
    });

    it('accepts a custom group comparator', async () => {
      const opts: CoarSelectOption[] = [
        { value: 1, label: 'A', group: 'Zzz' },
        { value: 2, label: 'B', group: 'Aaa' },
      ];
      // Reverse alphabetical
      const w = mount(CoarSelect, {
        ...globalStubs,
        props: { options: opts, sortGroups: (a: string, b: string) => b.localeCompare(a) },
      });
      await w.find('.coar-select-trigger').trigger('click');
      const headers = w.findAll('.coar-select-group-header').map((el) => el.text());
      expect(headers).toEqual(['Zzz', 'Aaa']);
    });
  });
});
