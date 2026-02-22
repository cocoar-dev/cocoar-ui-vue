import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarDivider from './CoarDivider.vue';

function mountDivider(props: Record<string, unknown> = {}, slots?: Record<string, string>) {
  return mount(CoarDivider, { props, slots });
}

describe('CoarDivider', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountDivider();
      expect(wrapper.find('.coar-divider').exists()).toBe(true);
    });

    it('should render before and after lines', () => {
      const wrapper = mountDivider();
      expect(wrapper.find('.coar-divider__line--before').exists()).toBe(true);
      expect(wrapper.find('.coar-divider__line--after').exists()).toBe(true);
    });

    it('should hide content area when no slot content', () => {
      const wrapper = mountDivider();
      expect(wrapper.find('.coar-divider__content').exists()).toBe(false);
    });

    it('should render slot content', () => {
      const wrapper = mountDivider({}, { default: 'OR' });
      const content = wrapper.find('.coar-divider__content');
      expect(content.exists()).toBe(true);
      expect(content.text()).toBe('OR');
    });
  });

  describe('defaults', () => {
    it('should have center alignment by default', () => {
      const wrapper = mountDivider();
      expect(wrapper.find('.coar-divider--center').exists()).toBe(true);
    });

    it('should have subtle variant by default', () => {
      const wrapper = mountDivider();
      expect(wrapper.find('.coar-divider--subtle').exists()).toBe(true);
    });

    it('should have 90% width by default', () => {
      const wrapper = mountDivider();
      const container = wrapper.find('.coar-divider__container');
      expect(container.attributes('style')).toContain('width: 90%');
    });

    it('should have 0px spacing by default', () => {
      const wrapper = mountDivider();
      const container = wrapper.find('.coar-divider__container');
      expect(container.attributes('style')).toContain('margin-top: 0px');
      expect(container.attributes('style')).toContain('margin-bottom: 0px');
    });
  });

  describe('alignment', () => {
    it.each(['left', 'center', 'right'] as const)('should apply %s alignment class', (align) => {
      const wrapper = mountDivider({ align });
      expect(wrapper.find(`.coar-divider--${align}`).exists()).toBe(true);
    });
  });

  describe('variants', () => {
    it.each(['subtle', 'strong'] as const)('should apply %s variant class', (variant) => {
      const wrapper = mountDivider({ variant });
      expect(wrapper.find(`.coar-divider--${variant}`).exists()).toBe(true);
    });
  });

  describe('width and spacing', () => {
    it('should apply custom width', () => {
      const wrapper = mountDivider({ width: 50 });
      const container = wrapper.find('.coar-divider__container');
      expect(container.attributes('style')).toContain('width: 50%');
    });

    it('should apply custom spacing', () => {
      const wrapper = mountDivider({ spacingTop: 16, spacingBottom: 24 });
      const container = wrapper.find('.coar-divider__container');
      expect(container.attributes('style')).toContain('margin-top: 16px');
      expect(container.attributes('style')).toContain('margin-bottom: 24px');
    });
  });

  describe('accessibility', () => {
    it('should have separator role', () => {
      const wrapper = mountDivider();
      expect(wrapper.find('.coar-divider').attributes('role')).toBe('separator');
    });

    it('should have horizontal aria-orientation', () => {
      const wrapper = mountDivider();
      expect(wrapper.find('.coar-divider').attributes('aria-orientation')).toBe('horizontal');
    });
  });
});
