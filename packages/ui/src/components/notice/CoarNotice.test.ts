import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarNotice from './CoarNotice.vue';

describe('CoarNotice', () => {
  it('renders an info notice inline by default', () => {
    const wrapper = mount(CoarNotice, { slots: { default: 'System message' } });

    expect(wrapper.classes()).toContain('coar-notice--info');
    expect(wrapper.classes()).toContain('coar-notice--inline');
    expect(wrapper.attributes('role')).toBe('note');
    expect(wrapper.text()).toContain('System message');
  });

  it.each(['neutral', 'info', 'success', 'warning', 'error', 'accent'] as const)(
    'supports the %s variant',
    (variant) => {
      const wrapper = mount(CoarNotice, { props: { variant } });
      expect(wrapper.classes()).toContain(`coar-notice--${variant}`);
    },
  );

  it('adds a colon after the optional label', () => {
    const wrapper = mount(CoarNotice, {
      props: { label: 'Maintenance' },
      slots: { default: 'Starts tonight.' },
    });

    expect(wrapper.find('.coar-notice__label').text()).toBe('Maintenance:');
  });

  it('uses the banner layout without truncating', () => {
    const wrapper = mount(CoarNotice, {
      props: { placement: 'banner', truncate: true },
    });

    expect(wrapper.classes()).toContain('coar-notice--banner');
    expect(wrapper.classes()).not.toContain('coar-notice--truncate');
  });

  it('supports truncation for inline notices', () => {
    const wrapper = mount(CoarNotice, { props: { truncate: true } });
    expect(wrapper.classes()).toContain('coar-notice--truncate');
  });

  it('renders optional details and CTA affordances', () => {
    const wrapper = mount(CoarNotice, {
      slots: {
        default: 'Short message',
        details: 'Long explanation',
        cta: '<a href="/settings">Configure</a>',
      },
    });

    expect(wrapper.find('.coar-notice__details').text()).toBe('Details');
    expect(wrapper.find('.coar-notice__cta').text()).toBe('Configure');
  });
});
