import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, reactive, ref, type VNode } from 'vue';
import CoarSelect from './CoarSelect.vue';
import type {
  CoarSelectOption, CoarSelectSortGroups, CoarSelectSortOptions,
  CoarSelectValueSlotProps, CoarSelectOptionSlotProps,
} from './types';
import { CoarOverlayPlugin, _resetOverlayServiceForTests } from '../overlay/useOverlay';
import CoarOverlayHost from '../overlay/CoarOverlayHost.vue';
import CoarFormField from '../form-field/CoarFormField.vue';

/**
 * Each test mounts a thin wrapper that nests `CoarSelect` beside a `CoarOverlayHost`,
 * so the service-mounted dropdown actually renders into the DOM. `Teleport` is stubbed
 * so the host's outlet renders inline (query-able via the wrapper) instead of body.
 * State is held in a `reactive` object so tests can read the current model value back
 * without plumbing `setProps` through the wrapper.
 */
type SelectSlots = {
  value?: (scope: CoarSelectValueSlotProps) => VNode[];
  option?: (scope: CoarSelectOptionSlotProps) => VNode[];
};

function mountSelect(
  initial: Record<string, unknown> = {},
  slots: SelectSlots | (() => SelectSlots) = {},
): { wrapper: VueWrapper; state: Record<string, unknown> } {
  const state = reactive({ ...initial }) as Record<string, unknown>;
  const Wrapper = defineComponent({
    setup() {
      return () => h('div', null, [
        h(CoarSelect, {
          ...state,
          'onUpdate:modelValue': (v: unknown) => { state.modelValue = v; },
        }, typeof slots === 'function' ? slots() : slots),
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

describe('CoarSelect', () => {
  beforeEach(() => {
    _resetOverlayServiceForTests();
  });

  afterEach(() => {
    _resetOverlayServiceForTests();
    document.body.innerHTML = '';
  });

  it('renders with placeholder when no value', () => {
    const { wrapper: w } = mountSelect({ options: baseOptions });
    expect(w.text()).toContain('Select an option...');
  });

  it('shows selected option label', () => {
    const { wrapper: w } = mountSelect({ modelValue: 'b', options: baseOptions });
    expect(w.find('.coar-select-value').text()).toBe('Banana');
  });

  it('opens dropdown on click', async () => {
    const { wrapper: w } = mountSelect({ options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(true);
    expect(w.findAll('.coar-select-option')).toHaveLength(4);
  });

  it('selects option on click', async () => {
    const { wrapper: w, state } = mountSelect({ modelValue: null, options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[1].trigger('click');
    expect(state.modelValue).toBe('b');
  });

  it('does not select disabled option', async () => {
    const { wrapper: w, state } = mountSelect({ modelValue: null, options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[3].trigger('click');
    expect(state.modelValue).toBeNull();
  });

  it('closes dropdown after selection', async () => {
    const { wrapper: w } = mountSelect({ modelValue: null, options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.coar-select-option')[0].trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('does not open when disabled', async () => {
    const { wrapper: w } = mountSelect({ disabled: true, options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('does not open when readonly', async () => {
    const { wrapper: w } = mountSelect({ readonly: true, options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('applies size class', () => {
    const { wrapper: w } = mountSelect({ size: 'l', options: baseOptions });
    expect(w.find('.coar-select--l').exists()).toBe(true);
  });

  it('applies inline appearance', () => {
    const { wrapper: w } = mountSelect({ appearance: 'inline', options: baseOptions });
    expect(w.find('.coar-select--inline').exists()).toBe(true);
  });

  it('shows clear button when clearable and has value', async () => {
    const { wrapper: w, state } = mountSelect({ modelValue: 'a', clearable: true, options: baseOptions });
    expect(w.find('.coar-select-clear').exists()).toBe(true);
    await w.find('.coar-select-clear').trigger('click');
    expect(state.modelValue).toBeNull();
  });

  it('does not show clear button when no value', () => {
    const { wrapper: w } = mountSelect({ clearable: true, options: baseOptions });
    expect(w.find('.coar-select-clear').exists()).toBe(false);
  });

  it('filters options when searchable', async () => {
    const { wrapper: w } = mountSelect({ searchable: true, options: baseOptions });
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
    const { wrapper: w, state } = mountSelect({ modelValue: null, options: baseOptions });
    const trigger = w.find('.coar-select-trigger');
    await trigger.trigger('keydown', { key: 'ArrowDown' });
    expect(w.find('.coar-select-dropdown').exists()).toBe(true);
    await trigger.trigger('keydown', { key: 'ArrowDown' });
    await trigger.trigger('keydown', { key: 'Enter' });
    expect(state.modelValue).toBe('b');
  });

  it('closes with Escape', async () => {
    const { wrapper: w } = mountSelect({ options: baseOptions });
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
    const { wrapper: w } = mountSelect({
      modelValue: { id: 2 },
      options: opts,
      compareWith: (a: unknown, b: unknown) => (a as { id: number }).id === (b as { id: number }).id,
    });
    expect(w.find('.coar-select-value').text()).toBe('Two');
  });

  it('marks selected option with checkmark', async () => {
    const { wrapper: w } = mountSelect({ modelValue: 'a', options: baseOptions });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.findAll('.coar-select-option')[0].find('.coar-select-option-check').exists()).toBe(true);
    expect(w.findAll('.coar-select-option')[1].find('.coar-select-option-check').exists()).toBe(false);
  });

  it('shows empty state', async () => {
    const { wrapper: w } = mountSelect({ options: [] });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-empty').text()).toBe('No options available');
  });

  it('has correct ARIA attributes', () => {
    const { wrapper: w } = mountSelect({ error: true, options: baseOptions });
    const trigger = w.find('.coar-select-trigger');
    expect(trigger.attributes('role')).toBe('combobox');
    expect(trigger.attributes('aria-haspopup')).toBe('listbox');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(trigger.attributes('aria-invalid')).toBe('true');
  });

  it('handles a search-input Enter only once without reopening the dropdown', async () => {
    const { wrapper: w, state } = mountSelect({
      modelValue: null, options: baseOptions, searchable: true,
    });
    await w.find('.coar-select-trigger').trigger('click');
    const search = w.find('.coar-select-inline-search');
    await search.setValue('ban');
    await search.trigger('keydown', { key: 'ArrowDown' });
    await search.trigger('keydown', { key: 'Enter' });
    expect(state.modelValue).toBe('b');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('uses the surrounding form-field label as its accessible name', () => {
    const Wrapper = defineComponent({
      setup: () => () => h(CoarFormField, { label: 'Editing language' }, {
        default: () => h(CoarSelect, { modelValue: 'de', options: [{ value: 'de', label: 'Deutsch' }] }),
      }),
    });
    const wrapper = mount(Wrapper);
    const label = wrapper.find('label');
    const trigger = wrapper.find('.coar-select-trigger');

    expect(trigger.attributes('aria-labelledby')).toBe(label.attributes('id'));
  });

  describe('sortOptions', () => {
    it('sorts options ascending by label when sortOptions is asc', async () => {
      const opts: CoarSelectOption[] = [
        { value: 'c', label: 'Cherry' },
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
      ];
      const { wrapper: w } = mountSelect({ options: opts, sortOptions: 'asc' as CoarSelectSortOptions });
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
      const { wrapper: w } = mountSelect({ options: opts, sortOptions: 'desc' as CoarSelectSortOptions });
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
      const { wrapper: w } = mountSelect({ options: opts });
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
      const { wrapper: w } = mountSelect({
        options: opts,
        sortOptions: ((a: CoarSelectOption, b: CoarSelectOption) =>
          String(a.value).localeCompare(String(b.value))) as CoarSelectSortOptions,
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
      const { wrapper: w } = mountSelect({ options: groupedOptions });
      await w.find('.coar-select-trigger').trigger('click');
      const headers = w.findAll('.coar-select-group-header').map((el) => el.text());
      expect(headers).toEqual(['Fruits', 'Vegetables']);
    });

    it('sorts groups descending when sortGroups is desc', async () => {
      const { wrapper: w } = mountSelect({ options: groupedOptions, sortGroups: 'desc' as CoarSelectSortGroups });
      await w.find('.coar-select-trigger').trigger('click');
      const headers = w.findAll('.coar-select-group-header').map((el) => el.text());
      expect(headers).toEqual(['Vegetables', 'Fruits']);
    });

    it('preserves group input order when sortGroups is none', async () => {
      const { wrapper: w } = mountSelect({ options: groupedOptions, sortGroups: 'none' as CoarSelectSortGroups });
      await w.find('.coar-select-trigger').trigger('click');
      const headers = w.findAll('.coar-select-group-header').map((el) => el.text());
      expect(headers).toEqual(['Vegetables', 'Fruits']);
    });

    it('ungrouped options always appear first', async () => {
      const { wrapper: w } = mountSelect({ options: groupedOptions });
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
      const { wrapper: w } = mountSelect({ options: opts, sortOptions: 'asc' as CoarSelectSortOptions });
      await w.find('.coar-select-trigger').trigger('click');
      const labels = w.findAll('.coar-select-option-label').map((el) => el.text());
      expect(labels).toEqual(['Apple', 'Banana', 'Artichoke', 'Broccoli']);
    });

    it('accepts a custom group comparator', async () => {
      const opts: CoarSelectOption[] = [
        { value: 1, label: 'A', group: 'Zzz' },
        { value: 2, label: 'B', group: 'Aaa' },
      ];
      const { wrapper: w } = mountSelect({
        options: opts,
        sortGroups: ((a: string, b: string) => b.localeCompare(a)) as CoarSelectSortGroups,
      });
      await w.find('.coar-select-trigger').trigger('click');
      const headers = w.findAll('.coar-select-group-header').map((el) => el.text());
      expect(headers).toEqual(['Zzz', 'Aaa']);
    });
  });
});

describe('CoarSelect inline appearance and content width', () => {
  const options = [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ];

  it('keeps the outline frame and the full width by default', () => {
    const { wrapper: w } = mountSelect({ options });
    expect(w.get('.coar-select-trigger').classes()).not.toContain('coar-input-frame--inline');
    expect(w.find('.coar-select--content').exists()).toBe(false);
  });

  it('draws the inline frame and keeps the error state', () => {
    const { wrapper: w } = mountSelect({ options, appearance: 'inline', error: true });
    const frame = w.get('.coar-select-trigger');
    expect(frame.classes()).toContain('coar-input-frame--inline');
    expect(frame.classes()).toContain('coar-input-frame--error');
  });

  it('searches over the closed label at content width', async () => {
    const { wrapper: w } = mountSelect({ options, modelValue: 'b', searchable: true, width: 'content' });
    expect(w.find('.coar-select--content').exists()).toBe(true);
    await w.get('.coar-select-trigger').trigger('click');
    expect(w.get('.coar-select-search-sizer').text()).toBe('Banana');
    expect(w.find('.coar-select-content-search .coar-select-inline-search').exists()).toBe(true);
    await w.get('.coar-select-inline-search').setValue('app');
    expect(w.findAll('.coar-select-option').map((o) => o.text())).toEqual(['Apple']);
  });
});

describe('CoarSelect templates', () => {
  beforeEach(() => {
    _resetOverlayServiceForTests();
  });

  afterEach(() => {
    _resetOverlayServiceForTests();
    document.body.innerHTML = '';
  });

  it('renders a value slot for selected and empty states, including raw values', async () => {
    const { wrapper: w, state } = mountSelect({ modelValue: null, options: baseOptions, placeholder: 'Pick one' }, {
      value: ({ option, value, placeholder }) => [
        h('span', { class: 'custom-value' }, option ? `${option.label}/${value}` : `Empty: ${placeholder}`),
      ],
    });
    expect(w.find('.custom-value').text()).toBe('Empty: Pick one');
    state.modelValue = 'b';
    await w.vm.$nextTick();
    expect(w.find('.custom-value').text()).toBe('Banana/b');
    await w.find('.coar-select-trigger').trigger('click');
    // A value slot alone must not change the default option renderer.
    expect(w.findAll('.coar-select-option-label').map((el) => el.text())).toEqual(['Apple', 'Banana', 'Cherry', 'Disabled']);
  });

  it('keeps the original value-slot content as the content-width search sizer', async () => {
    const { wrapper: w } = mountSelect({
      modelValue: 'a', options: baseOptions, width: 'content', searchable: true,
    }, {
      value: ({ option }) => [h('span', { class: 'custom-value' }, `Person: ${option?.label}`)],
    });
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.coar-select-search-sizer .custom-value').text()).toBe('Person: Apple');
    await w.find('.coar-select-inline-search').setValue('ban');
    expect(w.findAll('.coar-select-option')).toHaveLength(1);
    expect(w.find('.coar-select-option-label').text()).toBe('Banana');
  });

  it('passes option state to the slot while preserving roles, checks and keyboard selection', async () => {
    const { wrapper: w, state } = mountSelect({ modelValue: 'b', options: baseOptions }, {
      option: ({ option, selected, highlighted, index }) => [
        h('span', {
          class: 'custom-option', 'data-selected': String(selected),
          'data-highlighted': String(highlighted), 'data-index': index,
        }, `Custom ${option.label}`),
      ],
    });
    const trigger = w.find('.coar-select-trigger');
    await trigger.trigger('click');
    expect(w.find('.coar-select-value').text()).toBe('Banana');
    const selected = w.findAll('.coar-select-option')[1];
    expect(selected.attributes('role')).toBe('option');
    expect(selected.attributes('aria-label')).toBe('Banana');
    expect(selected.attributes('aria-selected')).toBe('true');
    expect(selected.find('.custom-option').attributes('data-selected')).toBe('true');
    expect(selected.find('.custom-option').attributes('data-index')).toBe('1');
    expect(selected.find('.coar-select-option-check').exists()).toBe(true);
    await selected.trigger('mouseenter');
    expect(selected.find('.custom-option').attributes('data-highlighted')).toBe('true');
    await trigger.trigger('keydown', { key: 'ArrowDown' });
    expect(w.findAll('.custom-option')[2].attributes('data-highlighted')).toBe('true');
    await trigger.trigger('keydown', { key: 'Enter' });
    expect(state.modelValue).toBe('c');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('filters by labels and blocks disabled options even with custom content', async () => {
    const { wrapper: w, state } = mountSelect({ options: baseOptions, searchable: true }, {
      option: () => [h('span', { class: 'custom-option' }, 'Visual content')],
    });
    await w.find('.coar-select-trigger').trigger('click');
    await w.findAll('.custom-option')[3].trigger('click');
    expect(state.modelValue).toBeUndefined();
    expect(w.find('.coar-select-dropdown').exists()).toBe(true);
    await w.find('.coar-select-inline-search').setValue('ban');
    expect(w.findAll('.coar-select-option')).toHaveLength(1);
    expect(w.find('.coar-select-option').attributes('aria-label')).toBe('Banana');
    await w.find('.custom-option').trigger('click');
    expect(state.modelValue).toBe('b');
  });

  it('updates service-mounted slot content without remounting its components', async () => {
    let mounts = 0;
    const suffix = ref('!');
    const Label = defineComponent({
      props: { label: { type: String, required: true } },
      setup(props) {
        mounts += 1;
        return () => h('span', { class: 'slot-label' }, props.label);
      },
    });
    const { wrapper: w } = mountSelect({ options: baseOptions }, {
      option: ({ option }) => [h(Label, { label: option.label + suffix.value })],
    });
    await w.find('.coar-select-trigger').trigger('click');
    expect(mounts).toBe(4);
    suffix.value = '?';
    await w.vm.$nextTick();
    expect(w.find('.slot-label').text()).toBe('Apple?');
    expect(mounts).toBe(4);
  });

  it('switches between custom and default option content while the overlay is open', async () => {
    const custom = ref(false);
    const { wrapper: w } = mountSelect({ options: baseOptions }, () => custom.value ? {
      option: ({ option }) => [h('span', { class: 'custom-option' }, `Custom ${option.label}`)],
    } : {});
    await w.find('.coar-select-trigger').trigger('click');
    expect(w.find('.custom-option').exists()).toBe(false);
    custom.value = true;
    await w.vm.$nextTick();
    expect(w.findAll('.custom-option')).toHaveLength(4);
    custom.value = false;
    await w.vm.$nextTick();
    expect(w.find('.custom-option').exists()).toBe(false);
    expect(w.find('.coar-select-option-label').text()).toBe('Apple');
  });
});
