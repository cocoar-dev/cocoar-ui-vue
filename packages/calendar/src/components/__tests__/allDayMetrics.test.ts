import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { CalendarBuilder } from '../../builders/calendar-builder';
import { Temporal, type CalendarEvent } from '../../core';
import CoarTimeGrid from '../CoarTimeGrid.vue';

afterEach(() => vi.unstubAllGlobals());

describe('all-day CSS metric', () => {
  it('keeps lane positions, overflow and band height in sync when the role grows and shrinks', async () => {
    const observers: Array<{ callback: ResizeObserverCallback; targets: Set<Element>; disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('ResizeObserver', class {
      targets = new Set<Element>();
      disconnect = vi.fn(() => this.targets.clear());
      constructor(callback: ResizeObserverCallback) {
        observers.push({ callback, targets: this.targets, disconnect: this.disconnect });
      }
      observe(element: Element) { this.targets.add(element); }
      unobserve(element: Element) { this.targets.delete(element); }
    });
    const date = Temporal.PlainDate.from('2026-04-15');
    const events = ref<CalendarEvent[]>(Array.from({ length: 3 }, (_, i) => ({
      id: `all-day-${i}`,
      start: date,
      end: date.add({ days: 1 }),
      meta: { title: `Event ${i}` },
    })));
    const builder = CalendarBuilder.create().timezone('UTC').locale('en-US').date(date)
      .events(events).allDayMaxVisibleLanes(2);
    const wrapper = mount(CoarTimeGrid, { props: { builder, dates: [date] } });
    try {
      const metric = wrapper.get('.coar-time-grid__all-day-lane-metric').element;
      const observer = observers.find((entry) => entry.targets.has(metric))!;
      expect(observer).toBeDefined();
      const measure = async (height: number) => {
        observer.callback([{ target: metric, contentRect: { width: 0, height } } as ResizeObserverEntry], {} as ResizeObserver);
        await nextTick();
      };
      const band = () => wrapper.get('.coar-time-grid-all-day-band').attributes('style');
      const overflow = () => wrapper.get('.coar-time-grid-all-day-overflow');
      expect(overflow().attributes('style')).toContain('height: 24px');
      expect(band()).toContain('min-height: 60px');
      await measure(44);
      expect(overflow().attributes('style')).toContain('top: 50px');
      expect(overflow().attributes('style')).toContain('height: 44px');
      expect(band()).toContain('min-height: 100px');
      await overflow().trigger('click');
      expect(band()).toContain('min-height: 146px');
      await measure(24);
      expect(band()).toContain('min-height: 86px');
      wrapper.unmount();
      expect(observer.disconnect).toHaveBeenCalledOnce();
    } finally {
      if (wrapper.exists()) wrapper.unmount();
    }
  });
});
