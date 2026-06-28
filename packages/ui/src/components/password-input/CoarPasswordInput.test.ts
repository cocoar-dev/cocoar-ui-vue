import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarPasswordInput from './CoarPasswordInput.vue';

const CoarIconStub = { template: '<span class="icon-stub" />' };

describe('CoarPasswordInput', () => {
  const mountInput = (props = {}) =>
    mount(CoarPasswordInput, {
      props,
      global: { stubs: { CoarIcon: CoarIconStub } },
    });

  it('renders with default props', () => {
    const wrapper = mountInput();
    expect(wrapper.find('.coar-password-input-host').exists()).toBe(true);
    expect(wrapper.find('input.coar-password-input-field').exists()).toBe(true);
  });

  it('renders as password type by default', () => {
    const wrapper = mountInput();
    expect(wrapper.find('input').attributes('type')).toBe('password');
  });

  it('toggles password visibility', async () => {
    const wrapper = mountInput();
    const toggleBtn = wrapper.find('.coar-password-input-toggle');
    expect(wrapper.find('input').attributes('type')).toBe('password');

    await toggleBtn.trigger('click');
    expect(wrapper.find('input').attributes('type')).toBe('text');

    await toggleBtn.trigger('click');
    expect(wrapper.find('input').attributes('type')).toBe('password');
  });

  it('v-model works', async () => {
    const wrapper = mountInput({ modelValue: 'secret' });
    const input = wrapper.find('input');
    expect((input.element as HTMLInputElement).value).toBe('secret');

    await input.setValue('newsecret');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['newsecret']);
  });

  it('shows clear button when clearable and has value', () => {
    const wrapper = mountInput({ modelValue: 'pw', clearable: true });
    const clear = wrapper.find('.coar-password-input-clear');
    expect(clear.exists()).toBe(true);
    expect(clear.classes()).not.toContain('coar-password-input-clear--hidden');
  });

  it('keeps the clear-button slot but hides it when empty (no resize on first keystroke)', () => {
    const wrapper = mountInput({ modelValue: '', clearable: true });
    const clear = wrapper.find('.coar-password-input-clear');
    expect(clear.exists()).toBe(true);
    expect(clear.classes()).toContain('coar-password-input-clear--hidden');
  });

  it('renders no clear-button slot when not clearable', () => {
    const wrapper = mountInput({ modelValue: 'pw', clearable: false });
    expect(wrapper.find('.coar-password-input-clear').exists()).toBe(false);
  });

  it('clears value when clear button clicked', async () => {
    const wrapper = mountInput({ modelValue: 'pw', clearable: true });
    await wrapper.find('.coar-password-input-clear').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('applies error state via the input frame when error is true', () => {
    const wrapper = mountInput({ error: true });
    expect(wrapper.find('.coar-input-frame--error').exists()).toBe(true);
  });

  it('applies disabled state', () => {
    const wrapper = mountInput({ disabled: true });
    expect(wrapper.find('.coar-input-frame--disabled').exists()).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(true);
  });

  it('does not toggle visibility when disabled', async () => {
    const wrapper = mountInput({ disabled: true });
    await wrapper.find('.coar-password-input-toggle').trigger('click');
    expect(wrapper.find('input').attributes('type')).toBe('password');
  });

  it('applies readonly state', () => {
    const wrapper = mountInput({ readonly: true });
    expect(wrapper.find('.coar-input-frame--readonly').exists()).toBe(true);
  });

  it('applies size class', () => {
    const wrapper = mountInput({ size: 's' });
    expect(wrapper.find('.coar-password-input--s').exists()).toBe(true);
  });

  it('defaults autocomplete to current-password', () => {
    const wrapper = mountInput();
    expect(wrapper.find('input').attributes('autocomplete')).toBe('current-password');
  });

  it('emits focused and blurred events', async () => {
    const wrapper = mountInput();
    const input = wrapper.find('input');
    await input.trigger('focus');
    expect(wrapper.emitted('focused')).toHaveLength(1);
    await input.trigger('blur');
    expect(wrapper.emitted('blurred')).toHaveLength(1);
  });
});
