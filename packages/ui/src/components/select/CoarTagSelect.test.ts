import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
import CoarTagSelect from './CoarTagSelect.vue';
import type { CoarSelectOption } from './types';
import { CoarOverlayPlugin, _resetOverlayServiceForTests } from '../overlay/useOverlay';
import CoarOverlayHost from '../overlay/CoarOverlayHost.vue';

/** See `CoarSelect.test.ts` for the rationale — identical wrapper with overlay plugin. */
function mountTagSelect(initial: Record<string, unknown> = {}): { wrapper: VueWrapper; state: Record<string, unknown> } {
  const state = reactive({ ...initial }) as Record<string, unknown>;
  const Wrapper = defineComponent({
    setup() {
      return () => h('div', null, [
        h(CoarTagSelect, {
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
  { value: 'vue', label: 'Vue' },
  { value: 'react', label: 'React' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
];

describe('CoarTagSelect', () => {
  beforeEach(() => {
    _resetOverlayServiceForTests();
  });

  afterEach(() => {
    _resetOverlayServiceForTests();
    document.body.innerHTML = '';
  });

  it('renders with placeholder when empty', () => {
    const { wrapper: w } = mountTagSelect({ options: baseOptions });
    expect(w.find('.coar-tag-select-input').attributes('placeholder')).toBe('Type to search...');
  });

  it('renders selected tags', () => {
    const { wrapper: w } = mountTagSelect({ modelValue: ['vue', 'react'], options: baseOptions });
    const tags = w.findAll('.coar-tag-select-tag');
    expect(tags).toHaveLength(2);
    expect(tags[0].text()).toContain('Vue');
    expect(tags[1].text()).toContain('React');
  });

  it('removes tag on X click', async () => {
    const { wrapper: w, state } = mountTagSelect({ modelValue: ['vue', 'react'], options: baseOptions });
    await w.findAll('.coar-tag-select-tag-remove')[0].trigger('click');
    expect(state.modelValue).toEqual(['react']);
  });

  it('hides placeholder when tags are present', () => {
    const { wrapper: w } = mountTagSelect({ modelValue: ['vue'], options: baseOptions });
    expect(w.find('.coar-tag-select-input').attributes('placeholder')).toBe('');
  });

  it('selects option from dropdown', async () => {
    const { wrapper: w, state } = mountTagSelect({ modelValue: [], options: baseOptions });
    await w.find('.coar-tag-select-input').trigger('focus');
    await w.find('.coar-tag-select-input').setValue('Vu');
    await w.find('.coar-tag-select-input').trigger('input');
    const options = w.findAll('.coar-select-option');
    expect(options.length).toBe(1);
    await options[0].trigger('click');
    expect(state.modelValue).toEqual(['vue']);
  });

  it('filters out already selected options', async () => {
    const { wrapper: w } = mountTagSelect({ modelValue: ['vue'], options: baseOptions });
    await w.find('.coar-tag-select-input').trigger('focus');
    // Only 3 remaining options should show (vue is already selected)
    const options = w.findAll('.coar-select-option');
    expect(options.length).toBe(3);
  });

  it('does not open when disabled', async () => {
    const { wrapper: w } = mountTagSelect({ disabled: true, options: baseOptions });
    await w.find('.coar-tag-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('does not remove tags when readonly', async () => {
    const { wrapper: w } = mountTagSelect({ modelValue: ['vue'], readonly: true, options: baseOptions });
    expect(w.find('.coar-tag-select-tag-remove').exists()).toBe(false);
  });

  it('backspace removes last tag when input is empty', async () => {
    const { wrapper: w, state } = mountTagSelect({ modelValue: ['vue', 'react'], options: baseOptions });
    await w.find('.coar-tag-select-input').trigger('keydown', { key: 'Backspace' });
    expect(state.modelValue).toEqual(['vue']);
  });

  it('creates new tag when allowCreate is true', async () => {
    const { wrapper: w, state } = mountTagSelect({ modelValue: [], allowCreate: true, options: baseOptions });
    const input = w.find('.coar-tag-select-input');
    await input.setValue('NewTag');
    await input.trigger('input');
    await input.trigger('keydown', { key: 'Enter' });
    expect(state.modelValue).toEqual(['NewTag']);
  });

  it('applies size class', () => {
    const { wrapper: w } = mountTagSelect({ size: 's', options: baseOptions });
    expect(w.find('.coar-select--s').exists()).toBe(true);
  });

  it('sorts options ascending when sortOptions is asc', async () => {
    const opts: CoarSelectOption[] = [
      { value: 'svelte', label: 'Svelte' },
      { value: 'angular', label: 'Angular' },
      { value: 'vue', label: 'Vue' },
    ];
    const { wrapper: w } = mountTagSelect({ modelValue: [], options: opts, sortOptions: 'asc' });
    await w.find('.coar-tag-select-input').trigger('focus');
    const labels = w.findAll('.coar-select-option-label').map((el) => el.text());
    expect(labels).toEqual(['Angular', 'Svelte', 'Vue']);
  });
});
