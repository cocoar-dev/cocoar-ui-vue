import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarTextInput from './CoarTextInput.vue';

// Provide a stub for CoarIcon
const CoarIconStub = { template: '<span class="icon-stub" />' };

describe('CoarTextInput', () => {
  const mountInput = (props = {}, slots = {}) =>
    mount(CoarTextInput, {
      props,
      slots,
      global: { stubs: { CoarIcon: CoarIconStub } },
    });

  it('renders with default props', () => {
    const wrapper = mountInput();
    expect(wrapper.find('.coar-text-input-host').exists()).toBe(true);
    expect(wrapper.find('input.coar-text-input-field').exists()).toBe(true);
  });

  it('renders label when provided', () => {
    const wrapper = mountInput({ label: 'Username' });
    expect(wrapper.find('.coar-text-input-label').text()).toContain('Username');
  });

  it('shows required asterisk', () => {
    const wrapper = mountInput({ label: 'Email', required: true });
    expect(wrapper.find('.coar-text-input-required').text()).toBe('*');
  });

  it('renders textarea when rows > 1', () => {
    const wrapper = mountInput({ rows: 3 });
    expect(wrapper.find('textarea.coar-text-input-field').exists()).toBe(true);
    expect(wrapper.find('input.coar-text-input-field').exists()).toBe(false);
  });

  it('applies size class', () => {
    const wrapper = mountInput({ size: 'l' });
    expect(wrapper.find('.coar-text-input--l').exists()).toBe(true);
  });

  it('applies multiline class for textarea', () => {
    const wrapper = mountInput({ rows: 4 });
    expect(wrapper.find('.coar-text-input--multiline').exists()).toBe(true);
  });

  it('v-model works', async () => {
    const wrapper = mountInput({ modelValue: 'hello' });
    const input = wrapper.find('input');
    expect((input.element as HTMLInputElement).value).toBe('hello');

    await input.setValue('world');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['world']);
  });

  it('emits focused and blurred events', async () => {
    const wrapper = mountInput();
    const input = wrapper.find('input');
    await input.trigger('focus');
    expect(wrapper.emitted('focused')).toHaveLength(1);
    await input.trigger('blur');
    expect(wrapper.emitted('blurred')).toHaveLength(1);
  });

  it('shows clear button when clearable and has value', async () => {
    const wrapper = mountInput({ modelValue: 'text', clearable: true });
    expect(wrapper.find('.coar-text-input-clear').exists()).toBe(true);
  });

  it('hides clear button when empty', () => {
    const wrapper = mountInput({ modelValue: '', clearable: true });
    expect(wrapper.find('.coar-text-input-clear').exists()).toBe(false);
  });

  it('hides clear button when disabled', () => {
    const wrapper = mountInput({ modelValue: 'text', clearable: true, disabled: true });
    expect(wrapper.find('.coar-text-input-clear').exists()).toBe(false);
  });

  it('clears value when clear button clicked', async () => {
    const wrapper = mountInput({ modelValue: 'text', clearable: true });
    await wrapper.find('.coar-text-input-clear').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('shows error state', () => {
    const wrapper = mountInput({ error: 'Required field' });
    expect(wrapper.find('.coar-text-input-error').exists()).toBe(true);
    expect(wrapper.find('.coar-form-field-message--error').text()).toBe('Required field');
  });

  it('shows hint when no error', () => {
    const wrapper = mountInput({ hint: 'Enter your name' });
    expect(wrapper.find('.coar-form-field-message').text()).toBe('Enter your name');
    expect(wrapper.find('.coar-form-field-message--error').exists()).toBe(false);
  });

  it('error takes priority over hint', () => {
    const wrapper = mountInput({ error: 'Error!', hint: 'Hint' });
    expect(wrapper.find('.coar-form-field-message').text()).toBe('Error!');
  });

  it('renders prefix text', () => {
    const wrapper = mountInput({ prefix: '$' });
    expect(wrapper.find('.coar-text-input-prefix').text()).toContain('$');
  });

  it('renders suffix text', () => {
    const wrapper = mountInput({ suffix: 'kg' });
    expect(wrapper.find('.coar-text-input-suffix').text()).toContain('kg');
  });

  it('applies disabled state', () => {
    const wrapper = mountInput({ disabled: true });
    expect(wrapper.find('.coar-text-input-disabled').exists()).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(true);
  });

  it('applies readonly state', () => {
    const wrapper = mountInput({ readonly: true });
    expect(wrapper.find('.coar-text-input-readonly').exists()).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).readOnly).toBe(true);
  });

  it('applies placeholder', () => {
    const wrapper = mountInput({ placeholder: 'Type here...' });
    expect((wrapper.find('input').element as HTMLInputElement).placeholder).toBe('Type here...');
  });

  it('applies maxlength', () => {
    const wrapper = mountInput({ maxlength: 50 });
    expect(wrapper.find('input').attributes('maxlength')).toBe('50');
  });

  it('hides prefix/suffix in multiline mode', () => {
    const wrapper = mountInput({ rows: 3, prefix: '$', suffix: 'kg' });
    expect(wrapper.find('.coar-text-input-prefix').exists()).toBe(false);
    expect(wrapper.find('.coar-text-input-suffix').exists()).toBe(false);
  });

  it('applies aria-invalid on error', () => {
    const wrapper = mountInput({ error: 'Bad!' });
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
  });

  it('does not set aria-invalid without error', () => {
    const wrapper = mountInput();
    expect(wrapper.find('input').attributes('aria-invalid')).toBeUndefined();
  });
});
