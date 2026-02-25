import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarNavbar from './CoarNavbar.vue';

function mountNavbar(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(CoarNavbar, {
    props,
    slots,
    attachTo: document.body,
  });
}

describe('CoarNavbar', () => {
  it('renders as header with role="banner"', () => {
    const wrapper = mountNavbar();
    const header = wrapper.find('header.coar-navbar');
    expect(header.exists()).toBe(true);
    expect(header.attributes('role')).toBe('banner');
  });

  it('renders start slot', () => {
    const wrapper = mountNavbar({}, { start: '<span>Logo</span>' });
    const start = wrapper.find('.coar-navbar__start');
    expect(start.exists()).toBe(true);
    expect(start.text()).toBe('Logo');
  });

  it('renders center slot', () => {
    const wrapper = mountNavbar({}, { center: '<nav>Links</nav>' });
    const center = wrapper.find('.coar-navbar__center');
    expect(center.exists()).toBe(true);
    expect(center.text()).toBe('Links');
  });

  it('renders end slot', () => {
    const wrapper = mountNavbar({}, { end: '<button>Action</button>' });
    const end = wrapper.find('.coar-navbar__end');
    expect(end.exists()).toBe(true);
    expect(end.text()).toBe('Action');
  });

  it('hides slot wrappers when slots are empty', () => {
    const wrapper = mountNavbar();
    expect(wrapper.find('.coar-navbar__start').exists()).toBe(false);
    expect(wrapper.find('.coar-navbar__center').exists()).toBe(false);
    expect(wrapper.find('.coar-navbar__end').exists()).toBe(false);
  });

  it('always renders spacers', () => {
    const wrapper = mountNavbar();
    const spacers = wrapper.findAll('.coar-navbar__spacer');
    expect(spacers).toHaveLength(2);
  });

  it('applies elevated class by default', () => {
    const wrapper = mountNavbar();
    expect(wrapper.find('.coar-navbar--elevated').exists()).toBe(true);
  });

  it('removes elevated class when false', () => {
    const wrapper = mountNavbar({ elevated: false });
    expect(wrapper.find('.coar-navbar--elevated').exists()).toBe(false);
  });

  it('applies bordered class when true', () => {
    const wrapper = mountNavbar({ bordered: true });
    expect(wrapper.find('.coar-navbar--bordered').exists()).toBe(true);
  });

  it('does not apply bordered class by default', () => {
    const wrapper = mountNavbar();
    expect(wrapper.find('.coar-navbar--bordered').exists()).toBe(false);
  });
});
