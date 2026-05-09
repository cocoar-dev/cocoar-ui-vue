/**
 * Tests for `<CoarMonthBar>` (internal/month).
 *
 * Scope: variant rendering, slot fallback, event emission gates,
 * resize-handle visibility, clipping, density. Layout / dnd math
 * live in their own files.
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import CoarMonthBar from '../CoarMonthBar.vue';
import type { CalendarEvent, MonthMultiDayBar } from '../../../../core';
import { pd } from '../../../../__test-utils__/event-fixtures';

const event: CalendarEvent = {
  id: 'evt-bar-1',
  start: pd('2026-05-04'),
  end: pd('2026-05-07'),
  meta: { title: 'Conference', color: '#abcdef' },
};

const bar: MonthMultiDayBar = {
  event,
  lane: 0,
  laneCount: 1,
  startCol: 1,
  endCol: 3,
  clippedStart: false,
  clippedEnd: false,
};

const baseProps = {
  event,
  bar,
  bg: '#abcdef',
  border: '#0070f3',
  title: 'Conference',
  ariaLabel: 'Conference, May 4-6',
  top: 24,
  left: 'calc(14% + 2px)',
  width: 'calc(43% - 4px)',
  height: 20,
  zIndex: 1,
} as const;

function mountBar(propsOverride: Record<string, unknown> = {}) {
  return mount(CoarMonthBar, {
    props: { ...baseProps, ...propsOverride },
  });
}

describe('<CoarMonthBar>', () => {
  describe('live variant (default)', () => {
    it('renders title from prop', () => {
      const wrapper = mountBar();
      expect(wrapper.text()).toContain('Conference');
    });

    it('is focusable + has button role + aria-label + data-event-id', () => {
      const wrapper = mountBar();
      const root = wrapper.find('.coar-month-bar');
      expect(root.attributes('tabindex')).toBe('0');
      expect(root.attributes('role')).toBe('button');
      expect(root.attributes('aria-label')).toBe('Conference, May 4-6');
      expect(root.attributes('data-event-id')).toBe('evt-bar-1');
    });

    it('renders both resize handles when not clipped', () => {
      const wrapper = mountBar();
      expect(wrapper.find('.coar-month-bar__resize--start').exists()).toBe(true);
      expect(wrapper.find('.coar-month-bar__resize--end').exists()).toBe(true);
    });

    it('hides the start handle when clippedStart is true', () => {
      const wrapper = mountBar({ clippedStart: true });
      expect(wrapper.find('.coar-month-bar__resize--start').exists()).toBe(false);
      expect(wrapper.find('.coar-month-bar__resize--end').exists()).toBe(true);
      expect(wrapper.find('.coar-month-bar').classes()).toContain('coar-month-bar--clipped-start');
    });

    it('hides the end handle when clippedEnd is true', () => {
      const wrapper = mountBar({ clippedEnd: true });
      expect(wrapper.find('.coar-month-bar__resize--start').exists()).toBe(true);
      expect(wrapper.find('.coar-month-bar__resize--end').exists()).toBe(false);
      expect(wrapper.find('.coar-month-bar').classes()).toContain('coar-month-bar--clipped-end');
    });

    it('emits resize events from the handles, NOT pointerdown on the bar body', async () => {
      const wrapper = mountBar();
      await wrapper.find('.coar-month-bar__resize--start').trigger('pointerdown');
      // Verify that startResize fired AND the body pointerdown did not fire
      // (the handler stops propagation at the handle).
      expect(wrapper.emitted('startResize')).toHaveLength(1);
      expect(wrapper.emitted('pointerdown')).toBeUndefined();
      await wrapper.find('.coar-month-bar__resize--end').trigger('pointerdown');
      expect(wrapper.emitted('endResize')).toHaveLength(1);
    });

    it('emits pointerdown on the bar body itself', async () => {
      const wrapper = mountBar();
      await wrapper.find('.coar-month-bar').trigger('pointerdown');
      expect(wrapper.emitted('pointerdown')).toHaveLength(1);
    });

    it('renders inline geometry (top / left / width / height / zIndex)', () => {
      const wrapper = mountBar({ zIndex: 100 });
      const style = wrapper.find('.coar-month-bar').attributes('style') ?? '';
      expect(style).toContain('top: 24px');
      expect(style).toContain('width: calc(43% - 4px)');
      expect(style).toContain('height: 20px');
      expect(style).toContain('z-index: 100');
    });

    it('drops the left border when clippedStart', () => {
      const wrapper = mountBar({ clippedStart: true });
      const style = wrapper.find('.coar-month-bar').attributes('style') ?? '';
      // happy-dom serializes the `none` shorthand to longhand.
      expect(style).toMatch(/border-left-style:\s*none/);
    });
  });

  describe('preview variant', () => {
    it('applies --ghost, no resize handles, no events', async () => {
      const wrapper = mountBar({ variant: 'preview' });
      const root = wrapper.find('.coar-month-bar');
      expect(root.classes()).toContain('coar-month-bar--ghost');
      expect(wrapper.find('.coar-month-bar__resize--start').exists()).toBe(false);
      expect(wrapper.find('.coar-month-bar__resize--end').exists()).toBe(false);
      await root.trigger('pointerdown');
      expect(wrapper.emitted('pointerdown')).toBeUndefined();
    });
  });

  describe('phantom variant', () => {
    it('applies --source-phantom and is non-interactive', () => {
      const wrapper = mountBar({ variant: 'phantom' });
      const root = wrapper.find('.coar-month-bar');
      expect(root.classes()).toContain('coar-month-bar--source-phantom');
      expect(root.attributes('aria-hidden')).toBe('true');
      expect(root.attributes('tabindex')).toBe('-1');
      expect(wrapper.find('.coar-month-bar__resize--start').exists()).toBe(false);
    });
  });

  describe('invalid variant', () => {
    it('applies --invalid + --snap-back when snappingBack', () => {
      const wrapper = mountBar({ variant: 'invalid', snappingBack: true });
      expect(wrapper.find('.coar-month-bar').classes()).toContain('coar-month-bar--invalid');
      expect(wrapper.find('.coar-month-bar').classes()).toContain('coar-month-bar--snap-back');
    });
  });

  describe('density', () => {
    it('applies --density-compact for compact', () => {
      const wrapper = mountBar({ density: 'compact' });
      expect(wrapper.find('.coar-month-bar').classes()).toContain(
        'coar-month-bar--density-compact',
      );
    });
  });

  describe('slot', () => {
    it('forwards event + bar to the default slot for live + preview', () => {
      const Renderer = defineComponent({
        setup() {
          return () =>
            h(
              CoarMonthBar,
              { ...baseProps },
              {
                default: ({ bar: b }: { bar: MonthMultiDayBar }) =>
                  h('span', { class: 'custom' }, `${b.startCol}-${b.endCol}`),
              },
            );
        },
      });
      const wrapper = mount(Renderer);
      expect(wrapper.find('.custom').text()).toBe('1-3');
    });
  });
});
