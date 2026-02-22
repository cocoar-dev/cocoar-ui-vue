import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarAvatar from './CoarAvatar.vue';

function mountAvatar(props: Record<string, unknown> = {}) {
  return mount(CoarAvatar, { props });
}

describe('CoarAvatar', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountAvatar();
      expect(wrapper.find('.coar-avatar').exists()).toBe(true);
    });

    it('should show initials when no src', () => {
      const wrapper = mountAvatar({ name: 'Alice' });
      expect(wrapper.find('.coar-avatar__initials').exists()).toBe(true);
      expect(wrapper.find('.coar-avatar__image').exists()).toBe(false);
    });

    it('should show image when src is provided', () => {
      const wrapper = mountAvatar({ src: 'https://example.com/avatar.jpg', name: 'Alice' });
      expect(wrapper.find('.coar-avatar__image').exists()).toBe(true);
      expect(wrapper.find('.coar-avatar__initials').exists()).toBe(false);
    });
  });

  describe('initials', () => {
    it('should show ? when no name', () => {
      const wrapper = mountAvatar();
      expect(wrapper.vm.displayInitials).toBe('?');
    });

    it('should show first 3 chars of name', () => {
      const wrapper = mountAvatar({ name: 'Alice' });
      expect(wrapper.vm.displayInitials).toBe('ALI');
    });

    it('should uppercase initials', () => {
      const wrapper = mountAvatar({ name: 'bob' });
      expect(wrapper.vm.displayInitials).toBe('BOB');
    });

    it('should use custom initials when provided', () => {
      const wrapper = mountAvatar({ name: 'Alice Johnson', initials: 'AJ' });
      expect(wrapper.vm.displayInitials).toBe('AJ');
    });

    it('should limit custom initials to 3 chars', () => {
      const wrapper = mountAvatar({ initials: 'ABCD' });
      expect(wrapper.vm.displayInitials).toBe('ABC');
    });
  });

  describe('background color', () => {
    it('should use neutral tertiary when no name', () => {
      const wrapper = mountAvatar();
      expect(wrapper.vm.computedBgColor).toBe('var(--coar-background-neutral-tertiary)');
    });

    it('should auto-generate color from name', () => {
      const wrapper = mountAvatar({ name: 'Alice' });
      expect(wrapper.vm.computedBgColor).toMatch(/^hsl\(\d+, 45%, 65%\)$/);
    });

    it('should generate consistent color for same name', () => {
      const a = mountAvatar({ name: 'Alice' });
      const b = mountAvatar({ name: 'Alice' });
      expect(a.vm.computedBgColor).toBe(b.vm.computedBgColor);
    });

    it('should generate different colors for different names', () => {
      const a = mountAvatar({ name: 'Alice' });
      const b = mountAvatar({ name: 'Bob' });
      expect(a.vm.computedBgColor).not.toBe(b.vm.computedBgColor);
    });

    it('should use custom bgColor when provided', () => {
      const wrapper = mountAvatar({ name: 'Alice', bgColor: '#ff0000' });
      expect(wrapper.vm.computedBgColor).toBe('#ff0000');
    });
  });

  describe('sizes', () => {
    it.each(['xs', 's', 'm', 'l', 'xl', 'xxl'] as const)('should apply %s size class', (size) => {
      const wrapper = mountAvatar({ size });
      expect(wrapper.find(`.coar-avatar--${size}`).exists()).toBe(true);
    });

    it('should default to m', () => {
      const wrapper = mountAvatar();
      expect(wrapper.find('.coar-avatar--m').exists()).toBe(true);
    });
  });

  describe('shapes', () => {
    it('should be circle by default', () => {
      const wrapper = mountAvatar();
      expect(wrapper.find('.coar-avatar--square').exists()).toBe(false);
    });

    it('should apply square class', () => {
      const wrapper = mountAvatar({ shape: 'square' });
      expect(wrapper.find('.coar-avatar--square').exists()).toBe(true);
    });
  });

  describe('clickable', () => {
    it('should not be clickable by default', () => {
      const wrapper = mountAvatar();
      expect(wrapper.find('.coar-avatar--clickable').exists()).toBe(false);
      expect(wrapper.find('.coar-avatar-host').attributes('role')).toBeUndefined();
    });

    it('should apply clickable class and role', () => {
      const wrapper = mountAvatar({ clickable: true });
      expect(wrapper.find('.coar-avatar--clickable').exists()).toBe(true);
      expect(wrapper.find('.coar-avatar-host').attributes('role')).toBe('button');
      expect(wrapper.find('.coar-avatar-host').attributes('tabindex')).toBe('0');
    });
  });

  describe('image error handling', () => {
    it('should fall back to initials on image error', async () => {
      const wrapper = mountAvatar({ src: 'https://example.com/broken.jpg', name: 'Alice' });
      expect(wrapper.find('.coar-avatar__image').exists()).toBe(true);

      await wrapper.find('.coar-avatar__image').trigger('error');
      expect(wrapper.find('.coar-avatar__initials').exists()).toBe(true);
      expect(wrapper.find('.coar-avatar__image').exists()).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on initials', () => {
      const wrapper = mountAvatar({ name: 'Alice' });
      expect(wrapper.find('.coar-avatar__initials').attributes('aria-label')).toBe('Alice');
    });

    it('should have alt on image', () => {
      const wrapper = mountAvatar({ src: 'https://example.com/avatar.jpg', name: 'Alice' });
      expect(wrapper.find('.coar-avatar__image').attributes('alt')).toBe('Alice');
    });
  });
});
