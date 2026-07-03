import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SelectProps from './SelectProps.vue';
import type { SelectNode } from '../../schema';

function mountPanel(node: Partial<SelectNode> = {}) {
  const patch = vi.fn();
  const wrapper = mount(SelectProps, {
    props: {
      node: { id: 's', type: 'select', ...node } as SelectNode,
      patch,
    },
  });
  return { wrapper, patch };
}

const twoOptions = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];

describe('SelectProps — options editor', () => {
  it('adds an option', async () => {
    const { wrapper, patch } = mountPanel({ options: twoOptions });
    await wrapper.find('.pb-select-options__add').trigger('click');
    expect(patch).toHaveBeenCalledWith({
      options: [...twoOptions, { value: 'option-3', label: 'Option 3' }],
    });
  });

  it('edits an option value', async () => {
    const { wrapper, patch } = mountPanel({ options: twoOptions });
    // Row grid: [value input, label input, …buttons] — first input = value.
    const firstValueInput = wrapper.findAll('.pb-select-options__row input')[0];
    await firstValueInput.setValue('alpha');
    expect(patch).toHaveBeenCalledWith({
      options: [{ value: 'alpha', label: 'A' }, twoOptions[1]],
    });
  });

  it('removes an option and prunes a defaultValue that pointed at it', async () => {
    const { wrapper, patch } = mountPanel({ options: twoOptions, defaultValue: 'b' });
    const removeButtons = wrapper.findAll('button[title="Remove option"]');
    await removeButtons[1].trigger('click');
    expect(patch).toHaveBeenCalledWith({
      options: [twoOptions[0]],
      defaultValue: undefined,
    });
  });

  it('clears the options key entirely when the last option is removed', async () => {
    const { wrapper, patch } = mountPanel({ options: [twoOptions[0]] });
    await wrapper.find('button[title="Remove option"]').trigger('click');
    expect(patch).toHaveBeenCalledWith({ options: undefined });
  });

  it('reorders options', async () => {
    const { wrapper, patch } = mountPanel({ options: twoOptions });
    const downButtons = wrapper.findAll('button[title="Move down"]');
    await downButtons[0].trigger('click');
    expect(patch).toHaveBeenCalledWith({
      options: [twoOptions[1], twoOptions[0]],
    });
  });

  it('keeps a still-valid defaultValue when other options change', async () => {
    const { wrapper, patch } = mountPanel({ options: twoOptions, defaultValue: 'a' });
    const removeButtons = wrapper.findAll('button[title="Remove option"]');
    await removeButtons[1].trigger('click');
    expect(patch).toHaveBeenCalledWith({ options: [twoOptions[0]] });
  });
});
