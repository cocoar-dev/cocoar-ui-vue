import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { CoarCheckbox } from '@cocoar/vue-ui';
import TextInputProps from './TextInputProps.vue';
import type { TextInputNode } from '../../schema';

function mountPanel(node: TextInputNode) {
  const patch = vi.fn();
  const wrapper = mount(TextInputProps, { props: { node, patch } });
  // First checkbox = Required, second = Disabled.
  const required = wrapper.findAllComponents(CoarCheckbox)[0];
  return { wrapper, patch, required };
}

describe('TextInputProps — Required toggle merges the validation object', () => {
  it('keeps JSON-authored rules when enabling Required', () => {
    const { patch, required } = mountPanel({
      id: 't',
      type: 'text-input',
      props: {},
      validation: { minLength: 8, pattern: '\\d+' },
    });

    required.vm.$emit('update:modelValue', true);
    expect(patch).toHaveBeenCalledWith({
      validation: { minLength: 8, pattern: '\\d+', required: true },
    });
  });

  it('keeps the other rules when disabling Required', () => {
    const { patch, required } = mountPanel({
      id: 't',
      type: 'text-input',
      props: {},
      validation: { required: true, minLength: 8 },
    });

    required.vm.$emit('update:modelValue', false);
    expect(patch).toHaveBeenCalledWith({ validation: { minLength: 8 } });
  });

  it('clears the validation object entirely when nothing remains', () => {
    const { patch, required } = mountPanel({
      id: 't',
      type: 'text-input',
      props: {},
      validation: { required: true },
    });

    required.vm.$emit('update:modelValue', false);
    expect(patch).toHaveBeenCalledWith({ validation: undefined });
  });
});
