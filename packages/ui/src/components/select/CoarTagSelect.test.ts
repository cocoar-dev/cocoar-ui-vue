import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarTagSelect from './CoarTagSelect.vue';
import type { CoarSelectOption } from './types';

const globalStubs = { global: { stubs: { Teleport: true } } };

const baseOptions: CoarSelectOption[] = [
  { value: 'vue', label: 'Vue' },
  { value: 'react', label: 'React' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
];

describe('CoarTagSelect', () => {
  it('renders with placeholder when empty', () => {
    const w = mount(CoarTagSelect, { ...globalStubs, props: { options: baseOptions } });
    expect(w.find('.coar-tag-select-input').attributes('placeholder')).toBe('Type to search...');
  });

  it('renders selected tags', () => {
    const w = mount(CoarTagSelect, { ...globalStubs, props: { modelValue: ['vue', 'react'], options: baseOptions } });
    const tags = w.findAll('.coar-tag-select-tag');
    expect(tags).toHaveLength(2);
    expect(tags[0].text()).toContain('Vue');
    expect(tags[1].text()).toContain('React');
  });

  it('removes tag on X click', async () => {
    const w = mount(CoarTagSelect, {
      ...globalStubs,
      props: {
        modelValue: ['vue', 'react'],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    await w.findAll('.coar-tag-select-tag-remove')[0].trigger('click');
    expect(w.props('modelValue')).toEqual(['react']);
  });

  it('hides placeholder when tags are present', () => {
    const w = mount(CoarTagSelect, { ...globalStubs, props: { modelValue: ['vue'], options: baseOptions } });
    expect(w.find('.coar-tag-select-input').attributes('placeholder')).toBe('');
  });

  it('selects option from dropdown', async () => {
    const w = mount(CoarTagSelect, {
      ...globalStubs,
      props: {
        modelValue: [],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
      attachTo: document.body,
    });
    await w.find('.coar-tag-select-input').trigger('focus');
    await w.find('.coar-tag-select-input').setValue('Vu');
    await w.find('.coar-tag-select-input').trigger('input');
    const options = w.findAll('.coar-select-option');
    expect(options.length).toBe(1);
    await options[0].trigger('click');
    expect(w.props('modelValue')).toEqual(['vue']);
    w.unmount();
  });

  it('filters out already selected options', async () => {
    const w = mount(CoarTagSelect, {
      ...globalStubs,
      props: { modelValue: ['vue'], options: baseOptions },
      attachTo: document.body,
    });
    await w.find('.coar-tag-select-input').trigger('focus');
    // Only 3 remaining options should show (vue is already selected)
    const options = w.findAll('.coar-select-option');
    expect(options.length).toBe(3);
    w.unmount();
  });

  it('does not open when disabled', async () => {
    const w = mount(CoarTagSelect, { ...globalStubs, props: { disabled: true, options: baseOptions } });
    await w.find('.coar-tag-select-trigger').trigger('click');
    expect(w.find('.coar-select-dropdown').exists()).toBe(false);
  });

  it('does not remove tags when readonly', async () => {
    const w = mount(CoarTagSelect, { ...globalStubs, props: { modelValue: ['vue'], readonly: true, options: baseOptions } });
    expect(w.find('.coar-tag-select-tag-remove').exists()).toBe(false);
  });

  it('backspace removes last tag when input is empty', async () => {
    const w = mount(CoarTagSelect, {
      ...globalStubs,
      props: {
        modelValue: ['vue', 'react'],
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    await w.find('.coar-tag-select-input').trigger('keydown', { key: 'Backspace' });
    expect(w.props('modelValue')).toEqual(['vue']);
  });

  it('creates new tag when allowCreate is true', async () => {
    const w = mount(CoarTagSelect, {
      ...globalStubs,
      props: {
        modelValue: [],
        allowCreate: true,
        'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
        options: baseOptions,
      },
    });
    const input = w.find('.coar-tag-select-input');
    await input.setValue('NewTag');
    await input.trigger('input');
    await input.trigger('keydown', { key: 'Enter' });
    expect(w.props('modelValue')).toEqual(['NewTag']);
  });

  it('applies size class', () => {
    const w = mount(CoarTagSelect, { ...globalStubs, props: { size: 's', options: baseOptions } });
    expect(w.find('.coar-select--s').exists()).toBe(true);
  });
});
