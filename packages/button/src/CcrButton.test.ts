import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CcrButton from './CcrButton.vue';

describe('CcrButton', () => {
  it('renders with default props', () => {
    const wrapper = mount(CcrButton);
    expect(wrapper.text()).toBe('Button');
    expect(wrapper.classes()).toContain('ccr-button');
    expect(wrapper.classes()).toContain('ccr-button--primary');
  });

  it('renders with custom label', () => {
    const wrapper = mount(CcrButton, { props: { label: 'Click me' } });
    expect(wrapper.text()).toBe('Click me');
  });

  it('applies variant class', () => {
    const wrapper = mount(CcrButton, { props: { variant: 'secondary' } });
    expect(wrapper.classes()).toContain('ccr-button--secondary');
  });

  it('applies size class', () => {
    const wrapper = mount(CcrButton, { props: { size: 4 } });
    expect(wrapper.classes()).toContain('ccr-button--size-4');
  });

  it('clamps invalid size values', () => {
    const wrapper = mount(CcrButton, { props: { size: 99 as never } });
    expect(wrapper.classes()).toContain('ccr-button--size-5');
  });

  it('emits click event when not disabled', async () => {
    const wrapper = mount(CcrButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(CcrButton, { props: { disabled: true } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('renders slot content', () => {
    const wrapper = mount(CcrButton, { slots: { default: 'Custom Content' } });
    expect(wrapper.text()).toBe('Custom Content');
  });
});
