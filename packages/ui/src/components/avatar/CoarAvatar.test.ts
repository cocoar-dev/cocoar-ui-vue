import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
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

    it('should uppercase initials', () => {
      const wrapper = mountAvatar({ name: 'alice johnson' });
      expect(wrapper.vm.displayInitials).toBe('AJO');
    });

    it('should use custom initials when provided', () => {
      const wrapper = mountAvatar({ name: 'Alice Johnson', initials: 'AJ' });
      expect(wrapper.vm.displayInitials).toBe('AJ');
    });

    it('should limit custom initials to maxLength chars', () => {
      const wrapper = mountAvatar({ initials: 'ABCD' });
      expect(wrapper.vm.displayInitials).toBe('ABC');
    });

    describe('maxLength: 2', () => {
      it('single word pads from the word: Alice → AL', () => {
        const wrapper = mountAvatar({ name: 'Alice', maxLength: 2 });
        expect(wrapper.vm.displayInitials).toBe('AL');
      });

      it('two words uses one letter each: Alice Johnson → AJ', () => {
        const wrapper = mountAvatar({ name: 'Alice Johnson', maxLength: 2 });
        expect(wrapper.vm.displayInitials).toBe('AJ');
      });

      it('three words uses first two: Alice Jane Doe → AJ', () => {
        const wrapper = mountAvatar({ name: 'Alice Jane Doe', maxLength: 2 });
        expect(wrapper.vm.displayInitials).toBe('AJ');
      });
    });

    describe('maxLength: 3 (default)', () => {
      it('single word pads from the word: Alice → ALI', () => {
        const wrapper = mountAvatar({ name: 'Alice' });
        expect(wrapper.vm.displayInitials).toBe('ALI');
      });

      it('two words pads last word: Alice Johnson → AJO', () => {
        const wrapper = mountAvatar({ name: 'Alice Johnson' });
        expect(wrapper.vm.displayInitials).toBe('AJO');
      });

      it('three words uses one letter each: Alice Jane Doe → AJD', () => {
        const wrapper = mountAvatar({ name: 'Alice Jane Doe' });
        expect(wrapper.vm.displayInitials).toBe('AJD');
      });

      it('four+ words uses first three: Alice Jane Doe Smith → AJD', () => {
        const wrapper = mountAvatar({ name: 'Alice Jane Doe Smith' });
        expect(wrapper.vm.displayInitials).toBe('AJD');
      });
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
