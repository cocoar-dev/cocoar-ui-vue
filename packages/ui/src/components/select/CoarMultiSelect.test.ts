import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
import CoarMultiSelect from './CoarMultiSelect.vue';
import type { CoarSelectOption } from './types';
import { CoarOverlayPlugin, _resetOverlayServiceForTests } from '../overlay/useOverlay';
import CoarOverlayHost from '../overlay/CoarOverlayHost.vue';

/** See `CoarSelect.test.ts` for the rationale — identical wrapper with overlay plugin. */
function mountMultiSelect(initial: Record<string, unknown> = {}): { wrapper: VueWrapper; state: Record<string, unknown> } {
  const state = reactive({ ...initial }) as Record<string, unknown>;
  const Wrapper = defineComponent({
    setup() {
      return () => h('div', null, [
        h(CoarMultiSelect, {
          ...state,
          'onUpdate:modelValue': (v: unknown) => { state.modelValue = v; },
        }),
        h(CoarOverlayHost),
      ]);
    },
  });
  const wrapper = mount(Wrapper, {
    global: {
      plugins: [CoarOverlayPlugin],
      stubs: { Teleport: true },
    },
    attachTo: document.body,
  });
  return { wrapper, state };
}

const baseOptions: CoarSelectOption[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
  { value: 'd', label: 'Disabled', disabled: true },
];

describe('CoarMultiSelect', () => {
  beforeEach(() => {
    _resetOverlayServiceForTests();
  });

  afterEach(() => {
    _resetOverlayServiceForTests();
    document.body.innerHTML = '';
  });

  it('renders with placeholder when no value', () => {
    const { wrapper: w } = mountMultiSelect({ options: baseOptions });
    expect(w.text()).toContain('Select options...');
  });

  it('shows selected count badge', () => {
    const { wrapper: w } = mountMultiSelect({ modelValue: ['a', 'b'], options: baseOptions });
    expect(w.find('.coar-multi-select-badge').text()).toBe('2');
  });

  it('shows display text for single selection', () => {
    const { wrapper: w } = mountMultiSelect({ modelValue: ['b'], options: baseOptions });
    expect(w.find('.coar-select-value').text()).toBe('Banana');
  });

  it('shows display text for multiple selections', () => {
    const { wrapper: w } = mountMultiSelect({ modelValue: ['a', 'b'], options: baseOptions });
    expect(w.find('.coar-select-value').text()).toBe('2 selected');
  });

  it('opens dropdown on click', async () => {
    const { wrapper: w } = mountMultiSelect({ options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(true);
  });

  it('toggles option on click', async () => {
    const { wrapper: w, state } = mountMultiSelect({ modelValue: [], options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[0].trigger('click');
    expect(state.modelValue).toEqual(['a']);
    // Toggle again to deselect
    await w.findAll('.coar-select-option')[0].trigger('click');
    expect(state.modelValue).toEqual([]);
  });

  it('does not toggle disabled option', async () => {
    const { wrapper: w, state } = mountMultiSelect({ modelValue: [], options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[3].trigger('click');
    expect(state.modelValue).toEqual([]);
  });

  it('keeps dropdown open after selection', async () => {
    const { wrapper: w } = mountMultiSelect({ modelValue: [], options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[0].trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(true);
  });

  it('does not open when disabled', async () => {
    const { wrapper: w } = mountMultiSelect({ disabled: true, options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('shows checkboxes in options', async () => {
    const { wrapper: w } = mountMultiSelect({ modelValue: ['a'], options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    const checks = w.findAll('.coar-multi-select-check');
    expect(checks.length).toBeGreaterThan(0);
    expect(checks[0].classes()).toContain('coar-multi-select-check--checked');
    expect(checks[1].classes()).not.toContain('coar-multi-select-check--checked');
  });

  it('shows clear button when clearable and has values', async () => {
    const { wrapper: w, state } = mountMultiSelect({ modelValue: ['a', 'b'], clearable: true, options: baseOptions });
    expect(w.find('.coar-select-clear').exists()).toBe(true);
    await w.find('.coar-select-clear').trigger('click');
    expect(state.modelValue).toEqual([]);
  });

  it('select all selects all enabled options', async () => {
    const { wrapper: w, state } = mountMultiSelect({ modelValue: [], showSelectAll: true, options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    await w.find('.coar-select-option--select-all').trigger('click');
    expect(state.modelValue).toEqual(['a', 'b', 'c']);
  });

  it('select all deselects when all selected', async () => {
    const { wrapper: w, state } = mountMultiSelect({ modelValue: ['a', 'b', 'c'], showSelectAll: true, options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    await w.find('.coar-select-option--select-all').trigger('click');
    expect(state.modelValue).toEqual([]);
  });

  it('shows indeterminate state for select all', async () => {
    const { wrapper: w } = mountMultiSelect({ modelValue: ['a'], showSelectAll: true, options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    const selectAllCheck = w.find('.coar-select-option--select-all .coar-multi-select-check');
    expect(selectAllCheck.classes()).toContain('coar-multi-select-check--indeterminate');
  });

  it('has multiselectable ARIA', async () => {
    const { wrapper: w } = mountMultiSelect({ options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('[role="listbox"]').attributes('aria-multiselectable')).toBe('true');
  });

  it('sorts options ascending when sortOptions is asc', async () => {
    const opts: CoarSelectOption[] = [
      { value: 'c', label: 'Cherry' },
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
    ];
    const { wrapper: w } = mountMultiSelect({ options: opts, sortOptions: 'asc' });
    await w.find('.coar-select-trigger').trigger('click');
    const labels = w.findAll('.coar-select-option-label').map((el) => el.text());
    expect(labels).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('sorts groups descending when sortGroups is desc', async () => {
    const opts: CoarSelectOption[] = [
      { value: 1, label: 'A', group: 'Alpha' },
      { value: 2, label: 'B', group: 'Beta' },
    ];
    const { wrapper: w } = mountMultiSelect({ options: opts, sortGroups: 'desc' });
    await w.find('.coar-select-trigger').trigger('click');
    const headers = w.findAll('.coar-select-group-header').map((el) => el.text());
    expect(headers).toEqual(['Beta', 'Alpha']);
  });
});
