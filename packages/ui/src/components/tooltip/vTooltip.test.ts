import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref, nextTick } from 'vue';
import { vTooltip, _resetActiveState } from './vTooltip';

function createWrapper(
  template: string,
  setup?: () => Record<string, unknown>,
): VueWrapper {
  const comp = defineComponent({
    directives: { tooltip: vTooltip },
    setup,
    template,
  });
  return mount(comp, { attachTo: document.body });
}

function getTooltipEl(): HTMLElement | null {
  return document.querySelector('.coar-tooltip');
}

describe('vTooltip', () => {
  beforeEach(() => {
    _resetActiveState();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up any remaining tooltips
    document.querySelectorAll('.coar-tooltip').forEach(el => el.remove());
    _resetActiveState();
  });

  describe('mounting and unmounting', () => {
    it('should not show tooltip on mount', () => {
      const wrapper = createWrapper('<button v-tooltip="\'Hello\'">Btn</button>');
      expect(getTooltipEl()).toBeNull();
      wrapper.unmount();
    });

    it('should clean up tooltip on unmount', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Hello\'">Btn</button>');
      await wrapper.find('button').trigger('mouseenter');
      expect(getTooltipEl()).not.toBeNull();
      wrapper.unmount();
      expect(getTooltipEl()).toBeNull();
    });
  });

  describe('hover trigger', () => {
    it('should show tooltip on mouseenter', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Hello\'">Btn</button>');
      await wrapper.find('button').trigger('mouseenter');
      const tooltip = getTooltipEl();
      expect(tooltip).not.toBeNull();
      expect(tooltip!.textContent).toBe('Hello');
      wrapper.unmount();
    });

    it('should hide tooltip on mouseleave', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Hello\'">Btn</button>');
      const btn = wrapper.find('button');
      await btn.trigger('mouseenter');
      expect(getTooltipEl()).not.toBeNull();
      await btn.trigger('mouseleave');
      expect(getTooltipEl()).toBeNull();
      wrapper.unmount();
    });

    it('should set role="tooltip" on the tooltip element', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Info\'">Btn</button>');
      await wrapper.find('button').trigger('mouseenter');
      const tooltip = getTooltipEl();
      expect(tooltip!.getAttribute('role')).toBe('tooltip');
      wrapper.unmount();
    });

    it('should set aria-describedby on the trigger', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Info\'">Btn</button>');
      const btn = wrapper.find('button');
      await btn.trigger('mouseenter');
      const tooltip = getTooltipEl();
      expect(btn.element.getAttribute('aria-describedby')).toBe(tooltip!.id);
      wrapper.unmount();
    });
  });

  describe('focus trigger', () => {
    it('should show tooltip on focusin', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Focus tip\'">Btn</button>');
      await wrapper.find('button').trigger('focusin');
      const tooltip = getTooltipEl();
      expect(tooltip).not.toBeNull();
      expect(tooltip!.textContent).toBe('Focus tip');
      wrapper.unmount();
    });

    it('should hide tooltip on focusout', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Focus tip\'">Btn</button>');
      const btn = wrapper.find('button');
      await btn.trigger('focusin');
      expect(getTooltipEl()).not.toBeNull();
      await btn.trigger('focusout');
      expect(getTooltipEl()).toBeNull();
      wrapper.unmount();
    });
  });

  describe('hover + focus interaction', () => {
    it('should close tooltip when mouseleave fires after focusin', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Tip\'">Btn</button>');
      const btn = wrapper.find('button');
      // Hover opens tooltip
      await btn.trigger('mouseenter');
      expect(getTooltipEl()).not.toBeNull();
      // Click gives focus — adds 'focus' reason
      await btn.trigger('focusin');
      expect(getTooltipEl()).not.toBeNull();
      // Mouse leaves — should still close (not get stuck)
      await btn.trigger('mouseleave');
      await btn.trigger('focusout');
      expect(getTooltipEl()).toBeNull();
      wrapper.unmount();
    });

    it('should not pin tooltip on pointer-initiated focus', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Tip\'">Btn</button>');
      const btn = wrapper.find('button');
      // Hover opens tooltip
      await btn.trigger('mouseenter');
      expect(getTooltipEl()).not.toBeNull();
      // Pointer click gives focus — should NOT add 'focus' reason
      await btn.trigger('pointerdown');
      await btn.trigger('focusin');
      // Mouse leaves — tooltip should close (not get stuck)
      await btn.trigger('mouseleave');
      expect(getTooltipEl()).toBeNull();
      wrapper.unmount();
    });

    it('should keep tooltip open while at least one reason remains', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Tip\'">Btn</button>');
      const btn = wrapper.find('button');
      await btn.trigger('mouseenter');
      await btn.trigger('focusin');
      expect(getTooltipEl()).not.toBeNull();
      // Mouse leaves but focus remains
      await btn.trigger('mouseleave');
      expect(getTooltipEl()).not.toBeNull();
      // Focus leaves too — now it should close
      await btn.trigger('focusout');
      expect(getTooltipEl()).toBeNull();
      wrapper.unmount();
    });
  });

  describe('disabled', () => {
    it('should not show tooltip when disabled', async () => {
      const wrapper = createWrapper(
        '<button v-tooltip="{ content: \'Nope\', disabled: true }">Btn</button>',
      );
      await wrapper.find('button').trigger('mouseenter');
      expect(getTooltipEl()).toBeNull();
      wrapper.unmount();
    });

    it('should close tooltip when disabled dynamically', async () => {
      const wrapper = createWrapper(
        '<button v-tooltip="{ content: \'Hi\', disabled: d }">Btn</button>',
        () => {
          const d = ref(false);
          return { d };
        },
      );
      await wrapper.find('button').trigger('mouseenter');
      expect(getTooltipEl()).not.toBeNull();
      // Disable
      (wrapper.vm as Record<string, unknown>).d = true;
      await nextTick();
      expect(getTooltipEl()).toBeNull();
      wrapper.unmount();
    });
  });

  describe('content', () => {
    it('should support string shorthand', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Short\'">Btn</button>');
      await wrapper.find('button').trigger('mouseenter');
      expect(getTooltipEl()!.textContent).toBe('Short');
      wrapper.unmount();
    });

    it('should support object binding', async () => {
      const wrapper = createWrapper(
        '<button v-tooltip="{ content: \'Object tip\', placement: \'bottom\' }">Btn</button>',
      );
      await wrapper.find('button').trigger('mouseenter');
      expect(getTooltipEl()!.textContent).toBe('Object tip');
      wrapper.unmount();
    });

    it('should escape HTML in content', async () => {
      const wrapper = createWrapper(
        `<button v-tooltip="'<script>alert(1)</script>'">Btn</button>`,
      );
      await wrapper.find('button').trigger('mouseenter');
      const tooltip = getTooltipEl();
      expect(tooltip!.querySelector('script')).toBeNull();
      expect(tooltip!.textContent).toContain('<script>');
      wrapper.unmount();
    });

    it('should update content reactively', async () => {
      const wrapper = createWrapper(
        '<button v-tooltip="{ content: text }">Btn</button>',
        () => {
          const text = ref('First');
          return { text };
        },
      );
      await wrapper.find('button').trigger('mouseenter');
      expect(getTooltipEl()!.textContent).toBe('First');
      (wrapper.vm as Record<string, unknown>).text = 'Second';
      await nextTick();
      expect(getTooltipEl()!.textContent).toBe('Second');
      wrapper.unmount();
    });

    it('should not show tooltip with empty content', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'\'">Btn</button>');
      await wrapper.find('button').trigger('mouseenter');
      expect(getTooltipEl()).toBeNull();
      wrapper.unmount();
    });
  });

  describe('single tooltip at a time', () => {
    it('should close previous tooltip when opening new one', async () => {
      const wrapper = createWrapper(`
        <div>
          <button id="a" v-tooltip="'Tip A'">A</button>
          <button id="b" v-tooltip="'Tip B'">B</button>
        </div>
      `);
      await wrapper.find('#a').trigger('mouseenter');
      expect(getTooltipEl()!.textContent).toBe('Tip A');
      expect(document.querySelectorAll('.coar-tooltip').length).toBe(1);

      await wrapper.find('#b').trigger('mouseenter');
      expect(getTooltipEl()!.textContent).toBe('Tip B');
      expect(document.querySelectorAll('.coar-tooltip').length).toBe(1);
      wrapper.unmount();
    });
  });

  describe('styling', () => {
    it('should have coar-tooltip class', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Styled\'">Btn</button>');
      await wrapper.find('button').trigger('mouseenter');
      const tooltip = getTooltipEl();
      expect(tooltip!.classList.contains('coar-tooltip')).toBe(true);
      wrapper.unmount();
    });

    it('should have pointer-events: none', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'No click\'">Btn</button>');
      await wrapper.find('button').trigger('mouseenter');
      const tooltip = getTooltipEl();
      expect(tooltip!.style.pointerEvents).toBe('none');
      wrapper.unmount();
    });

    it('should have position: fixed', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Fixed\'">Btn</button>');
      await wrapper.find('button').trigger('mouseenter');
      const tooltip = getTooltipEl();
      expect(tooltip!.style.position).toBe('fixed');
      wrapper.unmount();
    });

    it('should have coar-tooltip-text span', async () => {
      const wrapper = createWrapper('<button v-tooltip="\'Text\'">Btn</button>');
      await wrapper.find('button').trigger('mouseenter');
      const tooltip = getTooltipEl();
      const textSpan = tooltip!.querySelector('.coar-tooltip-text');
      expect(textSpan).not.toBeNull();
      expect(textSpan!.textContent).toBe('Text');
      wrapper.unmount();
    });
  });

  describe('delays', () => {
    it('should respect openDelay', async () => {
      vi.useFakeTimers();
      const wrapper = createWrapper(
        '<button v-tooltip="{ content: \'Delayed\', openDelay: 200 }">Btn</button>',
      );
      await wrapper.find('button').trigger('mouseenter');
      expect(getTooltipEl()).toBeNull();

      vi.advanceTimersByTime(100);
      expect(getTooltipEl()).toBeNull();

      vi.advanceTimersByTime(100);
      expect(getTooltipEl()).not.toBeNull();
      vi.useRealTimers();
      wrapper.unmount();
    });

    it('should respect closeDelay', async () => {
      vi.useFakeTimers();
      const wrapper = createWrapper(
        '<button v-tooltip="{ content: \'Delayed close\', closeDelay: 150 }">Btn</button>',
      );
      await wrapper.find('button').trigger('focusin');
      expect(getTooltipEl()).not.toBeNull();

      await wrapper.find('button').trigger('focusout');
      expect(getTooltipEl()).not.toBeNull();

      vi.advanceTimersByTime(150);
      expect(getTooltipEl()).toBeNull();
      vi.useRealTimers();
      wrapper.unmount();
    });
  });
});
