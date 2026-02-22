import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarSpinner from './CoarSpinner.vue';

function mountSpinner(props: Record<string, unknown> = {}) {
  return mount(CoarSpinner, { props });
}

describe('CoarSpinner', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountSpinner();
      expect(wrapper.find('.coar-spinner').exists()).toBe(true);
    });

    it('should render SVG element', () => {
      const wrapper = mountSpinner();
      expect(wrapper.find('svg').exists()).toBe(true);
    });

    it('should render background circle', () => {
      const wrapper = mountSpinner();
      expect(wrapper.find('.coar-spinner-bg').exists()).toBe(true);
    });

    it('should render spinning arc', () => {
      const wrapper = mountSpinner();
      expect(wrapper.find('.coar-spinner-arc').exists()).toBe(true);
    });
  });

  describe('defaults', () => {
    it('should have m size by default', () => {
      const wrapper = mountSpinner();
      expect(wrapper.find('.coar-spinner--m').exists()).toBe(true);
    });

    it('should have Loading label by default', () => {
      const wrapper = mountSpinner();
      expect(wrapper.find('.coar-spinner').attributes('aria-label')).toBe('Loading');
    });
  });

  describe('size variants', () => {
    it.each(['xs', 's', 'm', 'l'] as const)('should apply %s size class', (size) => {
      const wrapper = mountSpinner({ size });
      expect(wrapper.find(`.coar-spinner--${size}`).exists()).toBe(true);
    });

    it('should only have one size class at a time', () => {
      const wrapper = mountSpinner({ size: 'l' });
      const classes = wrapper.find('.coar-spinner').classes();
      const sizeClasses = classes.filter((c) => c.startsWith('coar-spinner--'));
      expect(sizeClasses).toEqual(['coar-spinner--l']);
    });
  });

  describe('accessibility', () => {
    it('should have status role', () => {
      const wrapper = mountSpinner();
      expect(wrapper.find('.coar-spinner').attributes('role')).toBe('status');
    });

    it('should have default aria-label', () => {
      const wrapper = mountSpinner();
      expect(wrapper.find('.coar-spinner').attributes('aria-label')).toBe('Loading');
    });

    it('should support custom aria-label', () => {
      const wrapper = mountSpinner({ label: 'Processing' });
      expect(wrapper.find('.coar-spinner').attributes('aria-label')).toBe('Processing');
    });
  });
});
