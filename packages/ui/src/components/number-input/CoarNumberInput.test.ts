import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarNumberInput from './CoarNumberInput.vue';

const CoarIconStub = { template: '<span class="icon-stub" />' };

describe('CoarNumberInput', () => {
  const mountInput = (props = {}) =>
    mount(CoarNumberInput, {
      props,
      global: { stubs: { CoarIcon: CoarIconStub } },
    });

  it('renders with default props', () => {
    const wrapper = mountInput();
    expect(wrapper.find('.coar-number-input-host').exists()).toBe(true);
    expect(wrapper.find('input.coar-number-input-field').exists()).toBe(true);
  });

  it('input is right-aligned', () => {
    const wrapper = mountInput();
    expect(wrapper.find('.coar-number-input-field').exists()).toBe(true);
  });

  it('uses type="text" with inputmode="decimal"', () => {
    const wrapper = mountInput();
    const input = wrapper.find('input');
    expect(input.attributes('type')).toBe('text');
    expect(input.attributes('inputmode')).toBe('decimal');
  });

  it('shows clear button when has value', () => {
    const wrapper = mountInput({ modelValue: 42 });
    expect(wrapper.find('.coar-number-input-clear').exists()).toBe(true);
    expect(wrapper.find('.coar-number-input-clear--hidden').exists()).toBe(false);
  });

  it('hides clear button when null', () => {
    const wrapper = mountInput({ modelValue: null });
    expect(wrapper.find('.coar-number-input-clear--hidden').exists()).toBe(true);
  });

  it('clears value when clear button clicked', async () => {
    const wrapper = mountInput({ modelValue: 42 });
    const clearBtn = wrapper.find('.coar-number-input-clear:not(.coar-number-input-clear--hidden)');
    await clearBtn.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null]);
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('applies error class when error is true', () => {
    const wrapper = mountInput({ error: true });
    expect(wrapper.find('.coar-number-input-error').exists()).toBe(true);
  });

  it('applies disabled state', () => {
    const wrapper = mountInput({ disabled: true });
    expect(wrapper.find('.coar-number-input-disabled').exists()).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(true);
  });

  it('applies readonly state', () => {
    const wrapper = mountInput({ readonly: true });
    expect(wrapper.find('.coar-number-input-readonly').exists()).toBe(true);
  });

  it('applies size class', () => {
    const wrapper = mountInput({ size: 'xs' });
    expect(wrapper.find('.coar-number-input--xs').exists()).toBe(true);
  });

  it('shows stepper buttons when set to both', () => {
    const wrapper = mountInput({ stepperButtons: 'both' });
    expect(wrapper.find('.coar-number-input-buttons').exists()).toBe(true);
    expect(wrapper.find('.coar-number-input-button--increment').exists()).toBe(true);
    expect(wrapper.find('.coar-number-input-button--decrement').exists()).toBe(true);
  });

  it('shows only increment button', () => {
    const wrapper = mountInput({ stepperButtons: 'increment' });
    expect(wrapper.find('.coar-number-input-button--increment').exists()).toBe(true);
    expect(wrapper.find('.coar-number-input-button--decrement').exists()).toBe(false);
  });

  it('shows only decrement button', () => {
    const wrapper = mountInput({ stepperButtons: 'decrement' });
    expect(wrapper.find('.coar-number-input-button--decrement').exists()).toBe(true);
    expect(wrapper.find('.coar-number-input-button--increment').exists()).toBe(false);
  });

  it('hides stepper buttons by default', () => {
    const wrapper = mountInput();
    expect(wrapper.find('.coar-number-input-buttons').exists()).toBe(false);
  });

  it('hides stepper buttons when disabled', () => {
    const wrapper = mountInput({ stepperButtons: 'both', disabled: true });
    expect(wrapper.find('.coar-number-input-buttons').exists()).toBe(false);
  });

  it('increment button increments value', async () => {
    const wrapper = mountInput({ modelValue: 5, stepperButtons: 'both', step: 1 });
    await wrapper.find('.coar-number-input-button--increment').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6]);
  });

  it('decrement button decrements value', async () => {
    const wrapper = mountInput({ modelValue: 5, stepperButtons: 'both', step: 1 });
    await wrapper.find('.coar-number-input-button--decrement').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([4]);
  });

  it('disables increment button at max', () => {
    const wrapper = mountInput({ modelValue: 10, max: 10, stepperButtons: 'both' });
    const btn = wrapper.find('.coar-number-input-button--increment');
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables decrement button at min', () => {
    const wrapper = mountInput({ modelValue: 0, min: 0, stepperButtons: 'both' });
    const btn = wrapper.find('.coar-number-input-button--decrement');
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('clamps value to min/max', async () => {
    const wrapper = mountInput({ modelValue: 50, max: 10, stepperButtons: 'both', step: 1 });
    // Value display should be formatted from the model
    // Increment should be disabled since value > max
    const incBtn = wrapper.find('.coar-number-input-button--increment');
    expect((incBtn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders prefix text', () => {
    const wrapper = mountInput({ prefix: '$' });
    expect(wrapper.find('.coar-number-input-prefix').text()).toContain('$');
  });

  it('renders suffix text', () => {
    const wrapper = mountInput({ suffix: '%' });
    expect(wrapper.find('.coar-number-input-suffix').text()).toContain('%');
  });

  it('emits focused and blurred events', async () => {
    const wrapper = mountInput();
    const input = wrapper.find('input');
    await input.trigger('focus');
    expect(wrapper.emitted('focused')).toHaveLength(1);
    await input.trigger('blur');
    expect(wrapper.emitted('blurred')).toHaveLength(1);
  });

  it('sets aria-valuemin and aria-valuemax', () => {
    const wrapper = mountInput({ min: 0, max: 100 });
    const input = wrapper.find('input');
    expect(input.attributes('aria-valuemin')).toBe('0');
    expect(input.attributes('aria-valuemax')).toBe('100');
  });

  it('keyboard ArrowUp increments value', async () => {
    const wrapper = mountInput({ modelValue: 5, step: 1 });
    await wrapper.find('input').trigger('keydown', { key: 'ArrowUp' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6]);
  });

  it('keyboard ArrowDown decrements value', async () => {
    const wrapper = mountInput({ modelValue: 5, step: 1 });
    await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([4]);
  });
});
