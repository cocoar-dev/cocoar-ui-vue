import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarButton from './CoarButton.vue';

describe('CoarButton', () => {
  // Rendering
  it('renders with default props', () => {
    const wrapper = mount(CoarButton, { slots: { default: 'Click me' } });
    expect(wrapper.text()).toBe('Click me');
    expect(wrapper.classes()).toContain('coar-button');
    expect(wrapper.classes()).toContain('coar-button--primary');
    expect(wrapper.classes()).toContain('coar-button--m');
  });

  it('renders slot content', () => {
    const wrapper = mount(CoarButton, { slots: { default: 'Custom Text' } });
    expect(wrapper.text()).toBe('Custom Text');
  });

  // Variants
  it.each(['primary', 'secondary', 'tertiary', 'danger', 'ghost'] as const)(
    'applies %s variant class',
    (variant) => {
      const wrapper = mount(CoarButton, { props: { variant } });
      expect(wrapper.classes()).toContain(`coar-button--${variant}`);
    },
  );

  // Sizes
  it.each(['xs', 's', 'm', 'l'] as const)('applies %s size class', (size) => {
    const wrapper = mount(CoarButton, { props: { size } });
    expect(wrapper.classes()).toContain(`coar-button--${size}`);
  });

  // Button type
  it('defaults to type="button"', () => {
    const wrapper = mount(CoarButton);
    expect(wrapper.attributes('type')).toBe('button');
  });

  it('sets type attribute', () => {
    const wrapper = mount(CoarButton, { props: { type: 'submit' } });
    expect(wrapper.attributes('type')).toBe('submit');
  });

  // Click handling
  it('emits click event when clicked', async () => {
    const wrapper = mount(CoarButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(CoarButton, { props: { disabled: true } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('does not emit click when loading', async () => {
    const wrapper = mount(CoarButton, { props: { loading: true } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  // Disabled state
  it('applies disabled class and attribute', () => {
    const wrapper = mount(CoarButton, { props: { disabled: true } });
    expect(wrapper.classes()).toContain('coar-button--disabled');
    expect(wrapper.attributes('disabled')).toBeDefined();
    expect(wrapper.attributes('aria-disabled')).toBe('true');
  });

  // Loading state
  it('applies loading class', () => {
    const wrapper = mount(CoarButton, { props: { loading: true } });
    expect(wrapper.classes()).toContain('coar-button--loading');
    expect(wrapper.attributes('aria-busy')).toBe('true');
    expect(wrapper.attributes('disabled')).toBeDefined();
  });

  it('shows overlay spinner when loading without icons', () => {
    const wrapper = mount(CoarButton, { props: { loading: true } });
    expect(wrapper.classes()).toContain('coar-button--loading-overlay');
    expect(wrapper.find('.coar-button__spinner--overlay').exists()).toBe(true);
  });

  it('shows inline spinner when loading with iconStart', () => {
    const wrapper = mount(CoarButton, { props: { loading: true, iconStart: 'settings' } });
    expect(wrapper.classes()).not.toContain('coar-button--loading-overlay');
    expect(wrapper.find('.coar-button__spinner--inline').exists()).toBe(true);
  });

  // Full width
  it('applies full-width class', () => {
    const wrapper = mount(CoarButton, { props: { fullWidth: true } });
    expect(wrapper.classes()).toContain('coar-button--full-width');
  });

  // Accessibility
  it('sets aria-label when provided', () => {
    const wrapper = mount(CoarButton, { props: { ariaLabel: 'Close dialog' } });
    expect(wrapper.attributes('aria-label')).toBe('Close dialog');
  });

  it('does not set aria-disabled when not disabled', () => {
    const wrapper = mount(CoarButton);
    expect(wrapper.attributes('aria-disabled')).toBeUndefined();
  });
});
