import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarTag from './CoarTag.vue';

function mountTag(props: Record<string, unknown> = {}, slots?: Record<string, string>) {
  return mount(CoarTag, { props, slots: { default: 'Tag', ...slots } });
}

describe('CoarTag', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountTag();
      expect(wrapper.find('.coar-tag').exists()).toBe(true);
    });

    it('should render slot content', () => {
      const wrapper = mountTag({}, { default: 'Published' });
      expect(wrapper.text()).toContain('Published');
    });
  });

  describe('defaults', () => {
    it('should have neutral variant by default', () => {
      const wrapper = mountTag();
      expect(wrapper.find('.coar-tag--neutral').exists()).toBe(true);
    });

    it('should have m size by default', () => {
      const wrapper = mountTag();
      expect(wrapper.find('.coar-tag--m').exists()).toBe(true);
    });

    it('should not be elevated by default', () => {
      const wrapper = mountTag();
      expect(wrapper.find('.coar-tag--elevated').exists()).toBe(false);
    });

    it('should not be borderless by default', () => {
      const wrapper = mountTag();
      expect(wrapper.find('.coar-tag--borderless').exists()).toBe(false);
    });

    it('should not be closable by default', () => {
      const wrapper = mountTag();
      expect(wrapper.find('.coar-tag__close').exists()).toBe(false);
    });
  });

  describe('variants', () => {
    it.each(['neutral', 'success', 'warning', 'error', 'info', 'accent'] as const)(
      'should apply %s variant class',
      (variant) => {
        const wrapper = mountTag({ variant });
        expect(wrapper.find(`.coar-tag--${variant}`).exists()).toBe(true);
      },
    );
  });

  describe('sizes', () => {
    it.each(['s', 'm', 'l'] as const)('should apply %s size class', (size) => {
      const wrapper = mountTag({ size });
      expect(wrapper.find(`.coar-tag--${size}`).exists()).toBe(true);
    });
  });

  describe('elevated', () => {
    it('should apply elevated class', () => {
      const wrapper = mountTag({ elevated: true });
      expect(wrapper.find('.coar-tag--elevated').exists()).toBe(true);
    });
  });

  describe('borderless', () => {
    it('should apply borderless class', () => {
      const wrapper = mountTag({ borderless: true });
      expect(wrapper.find('.coar-tag--borderless').exists()).toBe(true);
    });
  });

  describe('closable', () => {
    it('should show close button when closable', () => {
      const wrapper = mountTag({ closable: true });
      expect(wrapper.find('.coar-tag__close').exists()).toBe(true);
    });

    it('should hide close button when not closable', () => {
      const wrapper = mountTag({ closable: false });
      expect(wrapper.find('.coar-tag__close').exists()).toBe(false);
    });

    it('should emit closed event on close click', async () => {
      const wrapper = mountTag({ closable: true });
      await wrapper.find('.coar-tag__close').trigger('click');
      expect(wrapper.emitted('closed')).toHaveLength(1);
    });

    it('should have accessible close button', () => {
      const wrapper = mountTag({ closable: true });
      expect(wrapper.find('.coar-tag__close').attributes('aria-label')).toBe('Remove tag');
    });
  });

  describe('dynamic updates', () => {
    it('should update variant class', async () => {
      const wrapper = mountTag({ variant: 'neutral' });
      expect(wrapper.find('.coar-tag--neutral').exists()).toBe(true);

      await wrapper.setProps({ variant: 'success' });
      expect(wrapper.find('.coar-tag--success').exists()).toBe(true);
      expect(wrapper.find('.coar-tag--neutral').exists()).toBe(false);
    });
  });
});
