import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarButton from './CoarButton.vue';

describe('CoarButton', () => {
  it('renders with default props', () => {
    const wrapper = mount(CoarButton);
    expect(wrapper.text()).toBe('Button');
    expect(wrapper.classes()).toContain('coar-button');
    expect(wrapper.classes()).toContain('coar-button--primary');
  });

  it('renders with custom label', () => {
    const wrapper = mount(CoarButton, { props: { label: 'Click me' } });
    expect(wrapper.text()).toBe('Click me');
  });

  it('applies variant class', () => {
    const wrapper = mount(CoarButton, { props: { variant: 'secondary' } });
    expect(wrapper.classes()).toContain('coar-button--secondary');
  });

  it('applies size class', () => {
    const wrapper = mount(CoarButton, { props: { size: 4 } });
    expect(wrapper.classes()).toContain('coar-button--size-4');
  });

  it('clamps invalid size values', () => {
    const wrapper = mount(CoarButton, { props: { size: 99 as never } });
    expect(wrapper.classes()).toContain('coar-button--size-5');
  });

  it('emits click event when not disabled', async () => {
    const wrapper = mount(CoarButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(CoarButton, { props: { disabled: true } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('renders slot content', () => {
    const wrapper = mount(CoarButton, { slots: { default: 'Custom Content' } });
    expect(wrapper.text()).toBe('Custom Content');
  });
});
