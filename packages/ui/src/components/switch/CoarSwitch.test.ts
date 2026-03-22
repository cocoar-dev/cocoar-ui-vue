import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarSwitch from './CoarSwitch.vue';

describe('CoarSwitch', () => {
  const mountSwitch = (props = {}) => mount(CoarSwitch, { props });

  it('renders with default props', () => {
    const wrapper = mountSwitch();
    expect(wrapper.find('.coar-switch-host').exists()).toBe(true);
    expect(wrapper.find('input[role="switch"]').exists()).toBe(true);
  });

  it('renders label text', () => {
    const wrapper = mountSwitch({ label: 'Dark mode' });
    expect(wrapper.find('.coar-switch-label').text()).toBe('Dark mode');
  });

  it('hides label when not provided', () => {
    const wrapper = mountSwitch();
    expect(wrapper.find('.coar-switch-label').exists()).toBe(false);
  });

  it('defaults to unchecked', () => {
    const wrapper = mountSwitch();
    expect(wrapper.find('.coar-switch--checked').exists()).toBe(false);
    expect(wrapper.find('.coar-switch-track--checked').exists()).toBe(false);
  });

  it('renders checked when modelValue is true', () => {
    const wrapper = mountSwitch({ modelValue: true });
    expect(wrapper.find('.coar-switch--checked').exists()).toBe(true);
    expect(wrapper.find('.coar-switch-track--checked').exists()).toBe(true);
  });

  it('toggles on change', async () => {
    const wrapper = mountSwitch({ modelValue: false });
    await wrapper.find('input').setValue(true);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
  });

  it('applies size m by default', () => {
    const wrapper = mountSwitch();
    expect(wrapper.find('.coar-switch--m').exists()).toBe(true);
  });

  it('applies size s', () => {
    const wrapper = mountSwitch({ size: 's' });
    expect(wrapper.find('.coar-switch--s').exists()).toBe(true);
  });

  it('applies size l', () => {
    const wrapper = mountSwitch({ size: 'l' });
    expect(wrapper.find('.coar-switch--l').exists()).toBe(true);
  });

  it('applies disabled state', () => {
    const wrapper = mountSwitch({ disabled: true });
    expect(wrapper.find('.coar-switch--disabled').exists()).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(true);
  });

  it('applies readonly state', () => {
    const wrapper = mountSwitch({ readonly: true });
    expect(wrapper.find('.coar-switch--readonly').exists()).toBe(true);
  });

  it('prevents toggle when readonly', async () => {
    const wrapper = mountSwitch({ modelValue: false, readonly: true });
    await wrapper.find('input').trigger('change');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('label before position', () => {
    const wrapper = mountSwitch({ label: 'Theme', labelPosition: 'before' });
    const children = wrapper.find('.coar-switch-wrapper').element.children;
    // Label should come before the input
    expect(children[0].classList.contains('coar-switch-label')).toBe(true);
  });

  it('label after position (default)', () => {
    const wrapper = mountSwitch({ label: 'Theme', labelPosition: 'after' });
    const children = wrapper.find('.coar-switch-wrapper').element.children;
    // Last element should be the label
    expect(children[children.length - 1].classList.contains('coar-switch-label')).toBe(true);
  });

  it('sets aria-checked', () => {
    const wrapper = mountSwitch({ modelValue: true });
    expect(wrapper.find('input').attributes('aria-checked')).toBe('true');
  });

  it('sets aria-disabled', () => {
    const wrapper = mountSwitch({ disabled: true });
    expect(wrapper.find('input').attributes('aria-disabled')).toBe('true');
  });

  it('sets aria-readonly', () => {
    const wrapper = mountSwitch({ readonly: true });
    expect(wrapper.find('input').attributes('aria-readonly')).toBe('true');
  });

  // Error state tests
  describe('error state', () => {
    it('applies error CSS class to host', () => {
      const wrapper = mountSwitch({ error: true });
      expect(wrapper.find('.coar-switch--error').exists()).toBe(true);
    });

    it('does not apply error class when error is false', () => {
      const wrapper = mountSwitch({ error: false });
      expect(wrapper.find('.coar-switch--error').exists()).toBe(false);
    });

    it('sets aria-invalid when error is true', () => {
      const wrapper = mountSwitch({ error: true });
      expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
    });

    it('does not set aria-invalid when no error', () => {
      const wrapper = mountSwitch();
      expect(wrapper.find('input').attributes('aria-invalid')).toBeUndefined();
    });
  });

  // Focus ring tests
  describe('focus ring', () => {
    it('applies focused class on focus', async () => {
      const wrapper = mountSwitch();
      await wrapper.find('input').trigger('focus');
      expect(wrapper.find('.coar-switch-focused').exists()).toBe(true);
    });

    it('removes focused class on blur', async () => {
      const wrapper = mountSwitch();
      await wrapper.find('input').trigger('focus');
      expect(wrapper.find('.coar-switch-focused').exists()).toBe(true);
      await wrapper.find('input').trigger('blur');
      expect(wrapper.find('.coar-switch-focused').exists()).toBe(false);
    });
  });
});
