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
});
