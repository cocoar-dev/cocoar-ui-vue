import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarMultiSelect from './CoarMultiSelect.vue';
import type { CoarSelectOption } from './types';

const globalStubs = { global: { stubs: { Teleport: true } } };

const baseOptions: CoarSelectOption[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
  { value: 'd', label: 'Disabled', disabled: true },
];

describe('CoarMultiSelect', () => {
  it('renders with placeholder when no value', () => {
    const w = mount(CoarMultiSelect, { ...globalStubs, props: { options: baseOptions } });
    expect(w.text()).toContain('Select options...');
  });

  it('shows selected count badge', () => {
    const w = mount(CoarMultiSelect, { ...globalStubs, props: { modelValue: ['a', 'b'], options: baseOptions } });
    expect(w.find('.coar-multi-select-badge').text()).toBe('2');
  });

  it('shows display text for single selection', () => {
    const w = mount(CoarMultiSelect, { ...globalStubs, props: { modelValue: ['b'], options: baseOptions } });
    expect(w.find('.coar-select-value').text()).toBe('Banana');
  });

  it('shows display text for multiple selections', () => {
    const w = mount(CoarMultiSelect, { ...globalStubs, props: { modelValue: ['a', 'b'], options: baseOptions } });
    expect(w.find('.coar-select-value').text()).toBe('2 selected');
  });

  it('opens dropdown on click', async () => {
    const w = mount(CoarMultiSelect, { ...globalStubs, props: { options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(true);
  });

  it('toggles option on click', async () => {
    const w = mount(CoarMultiSelect, {
      ...globalStubs,
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[0].trigger('click');
    expect(w.props('modelValue')).toEqual(['a']);
    // Toggle again to deselect
    await w.findAll('.coar-select-option')[0].trigger('click');
    expect(w.props('modelValue')).toEqual([]);
  });

  it('does not toggle disabled option', async () => {
    const w = mount(CoarMultiSelect, {
      ...globalStubs,
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[3].trigger('click');
    expect(w.props('modelValue')).toEqual([]);
  });

  it('keeps dropdown open after selection', async () => {
    const w = mount(CoarMultiSelect, {
      ...globalStubs,
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[0].trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(true);
  });

  it('does not open when disabled', async () => {
    const w = mount(CoarMultiSelect, { ...globalStubs, props: { disabled: true, options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('shows checkboxes in options', async () => {
    const w = mount(CoarMultiSelect, { ...globalStubs, props: { modelValue: ['a'], options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    const checks = w.findAll('.coar-multi-select-check');
    expect(checks.length).toBeGreaterThan(0);
    expect(checks[0].classes()).toContain('coar-multi-select-check--checked');
    expect(checks[1].classes()).not.toContain('coar-multi-select-check--checked');
  });

  it('shows clear button when clearable and has values', async () => {
    const w = mount(CoarMultiSelect, {
      ...globalStubs,
      props: {
        modelValue: ['a', 'b'],
        clearable: true,
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    expect(w.find('.coar-select-clear').exists()).toBe(true);
    await w.find('.coar-select-clear').trigger('click');
    expect(w.props('modelValue')).toEqual([]);
  });

  it('select all selects all enabled options', async () => {
    const w = mount(CoarMultiSelect, {
      ...globalStubs,
      props: {
        modelValue: [],
        showSelectAll: true,
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    await w.find('.coar-select-trigger').trigger('click');
    await w.find('.coar-select-option--select-all').trigger('click');
    expect(w.props('modelValue')).toEqual(['a', 'b', 'c']);
  });

  it('select all deselects when all selected', async () => {
    const w = mount(CoarMultiSelect, {
      ...globalStubs,
      props: {
        modelValue: ['a', 'b', 'c'],
        showSelectAll: true,
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    await w.find('.coar-select-trigger').trigger('click');
    await w.find('.coar-select-option--select-all').trigger('click');
    expect(w.props('modelValue')).toEqual([]);
  });

  it('shows indeterminate state for select all', async () => {
    const w = mount(CoarMultiSelect, {
      ...globalStubs,
      props: { modelValue: ['a'], showSelectAll: true, options: baseOptions },
    });
    await w.find('.coar-select-trigger').trigger('click');
    const selectAllCheck = w.find('.coar-select-option--select-all .coar-multi-select-check');
    expect(selectAllCheck.classes()).toContain('coar-multi-select-check--indeterminate');
  });

  it('has multiselectable ARIA', async () => {
    const w = mount(CoarMultiSelect, { ...globalStubs, props: { options: baseOptions } });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('[role="listbox"]').attributes('aria-multiselectable')).toBe('true');
  });
});
