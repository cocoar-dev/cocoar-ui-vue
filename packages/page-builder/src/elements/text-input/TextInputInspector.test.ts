import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { CoarCheckbox, CoarNumberInput, CoarTextInput } from '@cocoar/vue-ui';
import TextInputInspector from './TextInputInspector.vue';
import type { TextInputNode } from '../../schema';

// The host-owned Field section (name/required/defaultValue) lives in
// BuilderPropsPanel now — this suite covers only the element-owned controls.

function mountPanel(node: TextInputNode) {
  const patch = vi.fn();
  const wrapper = mount(TextInputInspector, { props: { node, patch } });
  return { wrapper, patch };
}

function makeNode(props: TextInputNode['props'] = {}): TextInputNode {
  return { id: 't', type: 'text-input', props };
}

describe('TextInputInspector — element-owned props patch into the props bag', () => {
  it('patches the label', () => {
    const { wrapper, patch } = mountPanel(makeNode());

    // First text input = Label, second = Placeholder.
    wrapper.findAllComponents(CoarTextInput)[0].vm.$emit('update:modelValue', 'Email');
    expect(patch).toHaveBeenCalledWith({ props: { label: 'Email' } });
  });

  it('keeps rows above 1 and clears the key otherwise', () => {
    const { wrapper, patch } = mountPanel(makeNode({ rows: 4 }));
    const rows = wrapper.findComponent(CoarNumberInput);

    rows.vm.$emit('update:modelValue', 3);
    expect(patch).toHaveBeenCalledWith({ props: { rows: 3 } });

    rows.vm.$emit('update:modelValue', 1);
    expect(patch).toHaveBeenCalledWith({ props: { rows: undefined } });
  });

  it('patches the disabled flag', () => {
    const { wrapper, patch } = mountPanel(makeNode());

    wrapper.findComponent(CoarCheckbox).vm.$emit('update:modelValue', true);
    expect(patch).toHaveBeenCalledWith({ props: { disabled: true } });
  });
});
