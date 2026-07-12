/**
 * Tests for `<CoarTimeGridEvent>` (internal/time-grid).
 *
 * Scope: variants + event-emit gates + clipping + density. The
 * pixel positioning (top/height/left/width) is just style
 * forwarding from the parent's layout pass; that's covered by
 * the existing core/timeGridLayout tests.
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarTimeGridEvent from '../CoarTimeGridEvent.vue';
import type { CalendarEvent, PositionedEvent } from '../../../../core';
import { zdt } from '../../../../__test-utils__/event-fixtures';

const event: CalendarEvent = {
  id: 'e1',
  start: zdt('2026-04-15T09:00:00'),
  end: zdt('2026-04-15T10:00:00'),
  meta: { title: 'Standup', color: '#abcdef' },
};

const positioned: PositionedEvent = {
  event,
  startMinutes: 540,
  endMinutes: 600,
  lane: 0,
  laneCount: 1,
  clippedTop: false,
  clippedBottom: false,
};

const baseProps = {
  event,
  positioned,
  bg: '#abcdef',
  border: '#0070f3',
  title: 'Standup',
  ariaLabel: 'Standup, 9 AM',
  top: 540,
  height: 60,
  left: 'calc(0% + 4px)',
  width: 'calc(100% - 8px)',
  zIndex: 1,
} as const;

function mountEvent(propsOverride: Record<string, unknown> = {}) {
  return mount(CoarTimeGridEvent, { props: { ...baseProps, ...propsOverride } });
}

describe('<CoarTimeGridEvent>', () => {
  describe('live', () => {
    it('renders title, focusable, button role, data-event-id', () => {
      const wrapper = mountEvent();
      const root = wrapper.find('.coar-time-grid-event');
      expect(wrapper.text()).toContain('Standup');
      expect(root.attributes('tabindex')).toBe('0');
      expect(root.attributes('role')).toBe('button');
      expect(root.attributes('data-event-id')).toBe('e1');
    });

    it('renders both resize handles', () => {
      const wrapper = mountEvent();
      expect(wrapper.find('.coar-time-grid-event__resize--top').exists()).toBe(true);
      expect(wrapper.find('.coar-time-grid-event__resize--bottom').exists()).toBe(true);
    });

    it('emits startResize / endResize from the handles, not pointerdown on the body', async () => {
      const wrapper = mountEvent();
      await wrapper.find('.coar-time-grid-event__resize--top').trigger('pointerdown');
      expect(wrapper.emitted('startResize')).toHaveLength(1);
      expect(wrapper.emitted('pointerdown')).toBeUndefined();
      await wrapper.find('.coar-time-grid-event__resize--bottom').trigger('pointerdown');
      expect(wrapper.emitted('endResize')).toHaveLength(1);
    });

    it('renders inline geometry top / height / left / width / zIndex', () => {
      const wrapper = mountEvent({ zIndex: 100 });
      const style = wrapper.find('.coar-time-grid-event').attributes('style') ?? '';
      expect(style).toContain('top: 540px');
      expect(style).toContain('height: 60px');
      expect(style).toContain('z-index: 100');
    });
  });

  describe('preview / phantom / invalid', () => {
    it('preview applies --ghost + suppresses events', async () => {
      const wrapper = mountEvent({ variant: 'preview' });
      const root = wrapper.find('.coar-time-grid-event');
      expect(root.classes()).toContain('coar-time-grid-event--ghost');
      expect(wrapper.find('.coar-time-grid-event__resize--top').exists()).toBe(false);
      await root.trigger('pointerdown');
      expect(wrapper.emitted('pointerdown')).toBeUndefined();
    });

    it('phantom is non-interactive and aria-hidden', () => {
      const wrapper = mountEvent({ variant: 'phantom' });
      const root = wrapper.find('.coar-time-grid-event');
      expect(root.classes()).toContain('coar-time-grid-event--source-phantom');
      expect(root.attributes('aria-hidden')).toBe('true');
      expect(root.attributes('tabindex')).toBe('-1');
    });

    it('invalid + snapping-back applies both classes', () => {
      const wrapper = mountEvent({ variant: 'invalid', snappingBack: true });
      const cls = wrapper.find('.coar-time-grid-event').classes();
      expect(cls).toContain('coar-time-grid-event--invalid');
      expect(cls).toContain('coar-time-grid-event--snap-back');
    });
  });

  describe('clipping', () => {
    it('applies --clipped-top / --clipped-bottom classes', () => {
      const top = mountEvent({ clippedTop: true });
      expect(top.find('.coar-time-grid-event').classes()).toContain(
        'coar-time-grid-event--clipped-top',
      );

      const bottom = mountEvent({ clippedBottom: true });
      expect(bottom.find('.coar-time-grid-event').classes()).toContain(
        'coar-time-grid-event--clipped-bottom',
      );
    });
  });

  describe('density', () => {
    it('applies --density-compact when density is compact', () => {
      const wrapper = mountEvent({ density: 'compact' });
      expect(wrapper.find('.coar-time-grid-event').classes()).toContain(
        'coar-time-grid-event--density-compact',
      );
    });
  });

  describe('point events (timed, no end)', () => {
    const pointEvent: CalendarEvent = {
      id: 'p1',
      start: zdt('2026-04-15T14:00:00'),
      meta: { title: 'Anruf', color: '#abcdef' },
    };
    // layoutDayEvents applies the +30-min default; the card keeps
    // that slot geometry — only the skin changes.
    const pointPositioned: PositionedEvent = {
      event: pointEvent,
      startMinutes: 840,
      endMinutes: 870,
      lane: 0,
      laneCount: 1,
      clippedTop: false,
      clippedBottom: false,
    };

    function mountPoint(propsOverride: Record<string, unknown> = {}) {
      return mountEvent({
        event: pointEvent,
        positioned: pointPositioned,
        ...propsOverride,
      });
    }

    it('applies the --point modifier class', () => {
      const wrapper = mountPoint();
      expect(wrapper.find('.coar-time-grid-event').classes()).toContain(
        'coar-time-grid-event--point',
      );
    });

    it('renders the start edge (colored via --event-border)', () => {
      const wrapper = mountPoint();
      expect(wrapper.find('.coar-time-grid-event__point-edge').exists()).toBe(true);
      // The edge + the color-mix'd body both read the custom
      // properties forwarded on the root's inline style.
      const style = wrapper.find('.coar-time-grid-event').attributes('style') ?? '';
      expect(style).toContain('--event-border: #0070f3');
      expect(style).toContain('--event-bg: #abcdef');
    });

    it('does not dim the element itself (title must stay opaque)', () => {
      const wrapper = mountPoint();
      const style = wrapper.find('.coar-time-grid-event').attributes('style') ?? '';
      expect(style).not.toMatch(/(?:^|;)\s*opacity:/);
    });

    it('suppresses both resize handles', () => {
      const wrapper = mountPoint();
      expect(wrapper.find('.coar-time-grid-event__resize--top').exists()).toBe(false);
      expect(wrapper.find('.coar-time-grid-event__resize--bottom').exists()).toBe(false);
    });

    it('does not draw the start edge when clippedTop', () => {
      const wrapper = mountPoint({ clippedTop: true });
      expect(wrapper.find('.coar-time-grid-event__point-edge').exists()).toBe(false);
    });

    it('leaves a normal card (with end) untouched', () => {
      const wrapper = mountEvent();
      const root = wrapper.find('.coar-time-grid-event');
      expect(root.classes()).not.toContain('coar-time-grid-event--point');
      expect(wrapper.find('.coar-time-grid-event__point-edge').exists()).toBe(false);
      expect(wrapper.find('.coar-time-grid-event__resize--top').exists()).toBe(true);
    });
  });
});
