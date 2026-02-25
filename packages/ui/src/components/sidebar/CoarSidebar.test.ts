import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarSidebar from './CoarSidebar.vue';

function mountSidebar(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(CoarSidebar, {
    props,
    slots: {
      default: '<nav>Menu content</nav>',
      ...slots,
    },
    attachTo: document.body,
  });
}

describe('CoarSidebar', () => {
  it('renders as aside element', () => {
    const wrapper = mountSidebar();
    expect(wrapper.find('aside.coar-sidebar').exists()).toBe(true);
  });

  it('renders default slot in content area', () => {
    const wrapper = mountSidebar();
    const content = wrapper.find('.coar-sidebar__content');
    expect(content.exists()).toBe(true);
    expect(content.text()).toContain('Menu content');
  });

  it('renders header slot when provided', () => {
    const wrapper = mountSidebar({}, { header: '<h2>Logo</h2>' });
    const header = wrapper.find('.coar-sidebar__header');
    expect(header.exists()).toBe(true);
    expect(header.text()).toBe('Logo');
  });

  it('hides header when no header slot', () => {
    const wrapper = mountSidebar();
    expect(wrapper.find('.coar-sidebar__header').exists()).toBe(false);
  });

  it('renders footer slot when provided', () => {
    const wrapper = mountSidebar({}, { footer: '<span>v1.0</span>' });
    const footer = wrapper.find('.coar-sidebar__footer');
    expect(footer.exists()).toBe(true);
    expect(footer.text()).toBe('v1.0');
  });

  it('hides footer when no footer slot', () => {
    const wrapper = mountSidebar();
    expect(wrapper.find('.coar-sidebar__footer').exists()).toBe(false);
  });

  it('defaults to left position', () => {
    const wrapper = mountSidebar();
    expect(wrapper.find('.coar-sidebar--position-right').exists()).toBe(false);
  });

  it('applies right position class', () => {
    const wrapper = mountSidebar({ position: 'right' });
    expect(wrapper.find('.coar-sidebar--position-right').exists()).toBe(true);
  });

  it('applies collapsed class', () => {
    const wrapper = mountSidebar({ collapsed: true });
    expect(wrapper.find('.coar-sidebar--collapsed').exists()).toBe(true);
  });

  it('is not collapsed by default', () => {
    const wrapper = mountSidebar();
    expect(wrapper.find('.coar-sidebar--collapsed').exists()).toBe(false);
  });
});
