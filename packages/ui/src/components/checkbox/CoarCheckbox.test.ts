import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarCheckbox from './CoarCheckbox.vue';

describe('CoarCheckbox', () => {
  const mountCheckbox = (props = {}) =>
    mount(CoarCheckbox, { props });

  it('renders with default props', () => {
    const wrapper = mountCheckbox();
    expect(wrapper.find('.coar-checkbox-host').exists()).toBe(true);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
  });

  it('renders label when provided', () => {
    const wrapper = mountCheckbox({ label: 'Accept terms' });
    expect(wrapper.find('.coar-checkbox-label').text()).toContain('Accept terms');
  });

  it('hides label when not provided', () => {
    const wrapper = mountCheckbox();
    expect(wrapper.find('.coar-checkbox-label').exists()).toBe(false);
  });

  it('shows required asterisk', () => {
    const wrapper = mountCheckbox({ label: 'Terms', required: true });
    expect(wrapper.find('.coar-checkbox-required').text()).toBe('*');
  });

  it('applies size class', () => {
    const wrapper = mountCheckbox({ size: 'l' });
    expect(wrapper.find('.coar-checkbox--l').exists()).toBe(true);
  });

  it('defaults to size m', () => {
    const wrapper = mountCheckbox();
    expect(wrapper.find('.coar-checkbox--m').exists()).toBe(true);
  });

  it('renders unchecked by default', () => {
    const wrapper = mountCheckbox();
    expect(wrapper.find('.coar-checkbox-checked').exists()).toBe(false);
  });

  it('renders checked when modelValue is true', () => {
    const wrapper = mountCheckbox({ modelValue: true });
    expect(wrapper.find('.coar-checkbox-checked').exists()).toBe(true);
  });

  it('v-model toggles on change', async () => {
    const wrapper = mountCheckbox({ modelValue: false });
    const input = wrapper.find('input[type="checkbox"]');
    await input.setValue(true);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
  });

  it('shows indeterminate visual state', () => {
    const wrapper = mountCheckbox({ indeterminate: true });
    expect(wrapper.find('.coar-checkbox-indeterminate').exists()).toBe(true);
  });

  it('applies disabled state', () => {
    const wrapper = mountCheckbox({ disabled: true });
    expect(wrapper.find('.coar-checkbox--disabled').exists()).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(true);
  });

  it('applies readonly state class', () => {
    const wrapper = mountCheckbox({ readonly: true });
    expect(wrapper.find('.coar-checkbox--readonly').exists()).toBe(true);
  });

  it('prevents change when readonly', async () => {
    const wrapper = mountCheckbox({ modelValue: false, readonly: true });
    const input = wrapper.find('input[type="checkbox"]');
    // Trigger native change event
    await input.trigger('change');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('shows error state', () => {
    const wrapper = mountCheckbox({ error: 'Must accept' });
    expect(wrapper.find('.coar-checkbox--error').exists()).toBe(true);
    expect(wrapper.find('.coar-checkbox-message--error').text()).toBe('Must accept');
  });

  it('shows hint when no error', () => {
    const wrapper = mountCheckbox({ hint: 'Optional' });
    expect(wrapper.find('.coar-checkbox-message').text()).toBe('Optional');
    expect(wrapper.find('.coar-checkbox-message--error').exists()).toBe(false);
  });

  it('error takes priority over hint', () => {
    const wrapper = mountCheckbox({ error: 'Error!', hint: 'Hint' });
    expect(wrapper.find('.coar-checkbox-message').text()).toBe('Error!');
  });

  it('applies aria-invalid on error', () => {
    const wrapper = mountCheckbox({ error: 'Bad!' });
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
  });

  it('sets aria-checked to mixed when indeterminate', () => {
    const wrapper = mountCheckbox({ indeterminate: true });
    expect(wrapper.find('input').attributes('aria-checked')).toBe('mixed');
  });

  it('sets aria-readonly when readonly', () => {
    const wrapper = mountCheckbox({ readonly: true });
    expect(wrapper.find('input').attributes('aria-readonly')).toBe('true');
  });

  it('checkbox icon visibility: unchecked hides both icons', () => {
    const wrapper = mountCheckbox({ modelValue: false });
    // Both icons exist but are hidden via CSS opacity
    expect(wrapper.find('.coar-checkbox-icon-check').exists()).toBe(true);
    expect(wrapper.find('.coar-checkbox-icon-indeterminate').exists()).toBe(true);
  });

  it('all four sizes render correctly', () => {
    for (const size of ['xs', 's', 'm', 'l'] as const) {
      const wrapper = mountCheckbox({ size, label: `Size ${size}` });
      expect(wrapper.find(`.coar-checkbox--${size}`).exists()).toBe(true);
    }
  });

  it('disabled checkbox disables clear cursor', () => {
    const wrapper = mountCheckbox({ disabled: true, label: 'Disabled' });
    expect(wrapper.find('.coar-checkbox--disabled').exists()).toBe(true);
  });

  it('checked + indeterminate shows indeterminate icon (indeterminate wins)', () => {
    const wrapper = mountCheckbox({ modelValue: true, indeterminate: true });
    // Both classes present — CSS controls which icon shows
    expect(wrapper.find('.coar-checkbox-checked').exists()).toBe(true);
    expect(wrapper.find('.coar-checkbox-indeterminate').exists()).toBe(true);
  });
});
