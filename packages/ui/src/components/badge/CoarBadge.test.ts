import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CoarBadge from './CoarBadge.vue';

function mountBadge(props: Record<string, unknown> = {}) {
  return mount(CoarBadge, { props });
}

describe('CoarBadge', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountBadge();
      expect(wrapper.find('.coar-badge').exists()).toBe(true);
    });

    it('should render content', () => {
      const wrapper = mountBadge({ content: '5' });
      expect(wrapper.find('.coar-badge__content').text()).toBe('5');
    });

    it('should render numeric content', () => {
      const wrapper = mountBadge({ content: 42 });
      expect(wrapper.find('.coar-badge__content').text()).toBe('42');
    });
  });

  describe('defaults', () => {
    it('should have primary variant by default', () => {
      const wrapper = mountBadge();
      expect(wrapper.find('.coar-badge--primary').exists()).toBe(true);
    });

    it('should have m size by default', () => {
      const wrapper = mountBadge();
      expect(wrapper.find('.coar-badge--m').exists()).toBe(true);
    });

    it('should not pulse by default', () => {
      const wrapper = mountBadge();
      expect(wrapper.find('.coar-badge-host--pulse').exists()).toBe(false);
    });

    it('should not be a dot by default', () => {
      const wrapper = mountBadge();
      expect(wrapper.find('.coar-badge--dot').exists()).toBe(false);
    });

    it('should not be bordered by default', () => {
      const wrapper = mountBadge();
      expect(wrapper.find('.coar-badge--bordered').exists()).toBe(false);
    });
  });

  describe('variants', () => {
    it.each(['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const)(
      'should apply %s variant class',
      (variant) => {
        const wrapper = mountBadge({ variant });
        expect(wrapper.find(`.coar-badge--${variant}`).exists()).toBe(true);
      },
    );
  });

  describe('sizes', () => {
    it.each(['xs', 's', 'm', 'l', 'xl'] as const)('should apply %s size class', (size) => {
      const wrapper = mountBadge({ size });
      expect(wrapper.find(`.coar-badge--${size}`).exists()).toBe(true);
    });
  });

  describe('max value', () => {
    it('should display content when below max', () => {
      const wrapper = mountBadge({ content: 50, max: 99 });
      expect(wrapper.find('.coar-badge__content').text()).toBe('50');
    });

    it('should display max+ when content exceeds max', () => {
      const wrapper = mountBadge({ content: 150, max: 99 });
      expect(wrapper.find('.coar-badge__content').text()).toBe('99+');
    });

    it('should display exact number when equal to max', () => {
      const wrapper = mountBadge({ content: 99, max: 99 });
      expect(wrapper.find('.coar-badge__content').text()).toBe('99');
    });
  });

  describe('dot mode', () => {
    it('should apply dot class', () => {
      const wrapper = mountBadge({ dot: true });
      expect(wrapper.find('.coar-badge--dot').exists()).toBe(true);
    });

    it('should not render content in dot mode', () => {
      const wrapper = mountBadge({ dot: true, content: '5' });
      expect(wrapper.find('.coar-badge__content').exists()).toBe(false);
    });
  });

  describe('pulse', () => {
    it('should apply pulse class', () => {
      const wrapper = mountBadge({ pulse: true });
      expect(wrapper.find('.coar-badge-host--pulse').exists()).toBe(true);
    });
  });

  describe('bordered', () => {
    it('should apply bordered class', () => {
      const wrapper = mountBadge({ bordered: true });
      expect(wrapper.find('.coar-badge--bordered').exists()).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have status role', () => {
      const wrapper = mountBadge();
      expect(wrapper.find('.coar-badge').attributes('role')).toBe('status');
    });

    it('should use content as aria-label', () => {
      const wrapper = mountBadge({ content: '5' });
      expect(wrapper.find('.coar-badge').attributes('aria-label')).toBe('5');
    });

    it('should omit aria-label for empty non-dot badge', () => {
      const wrapper = mountBadge();
      expect(wrapper.find('.coar-badge').attributes('aria-label')).toBeUndefined();
    });

    it('should use notification indicator as aria-label in dot mode', () => {
      const wrapper = mountBadge({ dot: true, variant: 'success' });
      expect(wrapper.find('.coar-badge').attributes('aria-label')).toBe('Notification indicator');
    });

    it('should omit aria-label when no content provided', () => {
      const wrapper = mountBadge({ variant: 'error' });
      expect(wrapper.find('.coar-badge').attributes('aria-label')).toBeUndefined();
    });
  });
});
