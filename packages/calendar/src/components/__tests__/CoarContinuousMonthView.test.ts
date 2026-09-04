import { nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import type { CalendarEvent } from '../../core';
import { zdt } from '../../__test-utils__/event-fixtures';
import CoarContinuousMonthView from '../CoarContinuousMonthView.vue';

function builder(events: CalendarEvent[] = []) {
  return CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .view('month')
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref(events));
}

describe('CoarContinuousMonthView', () => {
  it('renders a continuous window and only the weeks required by each month', () => {
    const wrapper = mount(CoarContinuousMonthView, { props: { builder: builder() } });
    const sections = wrapper.findAll('.coar-continuous-month-view__section');
    expect(sections).toHaveLength(13);
    expect(sections[0].attributes('data-month-key')).toBe('2025-12');
    expect(sections.at(-1)!.attributes('data-month-key')).toBe('2026-12');

    const june = wrapper.find('[data-month-key="2026-06"]');
    expect(june.findAll('.coar-month-row')).toHaveLength(5);
    expect(june.findAll('.coar-month-cell--placeholder')).toHaveLength(5);
  });

  it('shades weekends by default and lets consumers disable the tint', async () => {
    const calendar = builder();
    const wrapper = mount(CoarContinuousMonthView, { props: { builder: calendar } });
    expect(wrapper.classes()).toContain('coar-continuous-month-view--shade-weekends');

    calendar.shadeWeekends(false);
    await nextTick();
    expect(wrapper.classes()).not.toContain('coar-continuous-month-view--shade-weekends');
  });

  it('uses the iOS base row heights for Compact, Stacked and Details', async () => {
    const calendar = builder().monthDensity('compact');
    const wrapper = mount(CoarContinuousMonthView, { props: { builder: calendar } });
    const currentRow = () => wrapper.find('[data-month-key="2026-06"]').find('.coar-month-row');
    expect(currentRow().attributes('style')).toContain('height: 52px');

    calendar.api.setMonthDensity('stacked');
    await nextTick();
    expect(currentRow().attributes('style')).toContain('height: 68px');

    calendar.api.setMonthDensity('details');
    await nextTick();
    expect(currentRow().attributes('style')).toContain('height: 94px');
  });

  it('combines compact per-day events into one segmented colour capsule', () => {
    const events: CalendarEvent[] = [
      {
        id: 'one',
        start: zdt('2026-06-15T09:00:00', 'Europe/Vienna'),
        end: zdt('2026-06-15T09:30:00', 'Europe/Vienna'),
        meta: { title: 'One', color: '#2563eb' },
      },
      {
        id: 'two',
        start: zdt('2026-06-15T10:00:00', 'Europe/Vienna'),
        end: zdt('2026-06-15T10:30:00', 'Europe/Vienna'),
        meta: { title: 'Two', color: '#f59e0b' },
      },
    ];
    const wrapper = mount(CoarContinuousMonthView, {
      props: { builder: builder(events).monthDensity('compact') },
    });
    const june15 = wrapper.find('[data-month-key="2026-06"] [data-day-key="2026-06-15"]');
    expect(june15.findAll('.coar-month-view__segment-capsule')).toHaveLength(1);
    expect(june15.findAll('.coar-month-view__segment')).toHaveLength(2);
  });

  it('keeps every same-day event reachable in Details mode', () => {
    const events: CalendarEvent[] = [14, 15, 16].map((hour, index) => ({
      id: `overlap-${index}`,
      start: zdt(`2026-06-15T${hour}:00:00`, 'Europe/Vienna'),
      end: zdt(`2026-06-15T${hour + 2}:00:00`, 'Europe/Vienna'),
      meta: { title: `Overlap ${index + 1}` },
    }));
    const wrapper = mount(CoarContinuousMonthView, {
      props: { builder: builder(events).monthDensity('details') },
    });
    const june15 = wrapper.find('[data-month-key="2026-06"] [data-day-key="2026-06-15"]');
    expect(june15.findAll('.coar-month-pill')).toHaveLength(3);
  });

  it('keeps month drag-and-drop active inside a continuous section', async () => {
    const events: CalendarEvent[] = [
      {
        id: 'move-me',
        start: zdt('2026-06-15T09:00:00', 'Europe/Vienna'),
        end: zdt('2026-06-15T09:30:00', 'Europe/Vienna'),
        meta: { title: 'Move me' },
      },
    ];
    const calendar = builder(events).monthDensity('details');
    const onDrop = vi.fn();
    calendar.onEventDrop(onDrop);
    const wrapper = mount(CoarContinuousMonthView, {
      props: { builder: calendar },
      attachTo: document.body,
    });
    const june = wrapper.find('[data-month-key="2026-06"]');
    const grid = june.find('.coar-month-grid__rows').element as HTMLElement;
    grid.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 700,
        height: 500,
        right: 700,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    Array.from(grid.children).forEach((row, index) => {
      (row as HTMLElement).getBoundingClientRect = () =>
        ({
          left: 0,
          top: index * 100,
          width: 700,
          height: 100,
          right: 700,
          bottom: (index + 1) * 100,
          x: 0,
          y: index * 100,
          toJSON: () => ({}),
        }) as DOMRect;
    });
    const card = june.find('[data-day-key="2026-06-15"] .coar-month-pill');
    await card.trigger('pointerdown', { clientX: 50, clientY: 250, pointerId: 7, button: 0 });
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 250,
        clientY: 250,
        pointerId: 7,
        bubbles: true,
      }),
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 250,
        clientY: 250,
        pointerId: 7,
        bubbles: true,
      }),
    );
    await nextTick();
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0][0].target.date).toBe('2026-06-17');
    expect((onDrop.mock.calls[0][0].next.start as Temporal.ZonedDateTime).hour).toBe(9);
    wrapper.unmount();
  });

  it('accepts a drop target in the following month section', async () => {
    const events: CalendarEvent[] = [
      {
        id: 'cross-month',
        start: zdt('2026-06-15T09:00:00', 'Europe/Vienna'),
        end: zdt('2026-06-15T09:30:00', 'Europe/Vienna'),
        meta: { title: 'Cross month' },
      },
    ];
    const calendar = builder(events).monthDensity('details');
    const onDrop = vi.fn();
    calendar.onEventDrop(onDrop);
    const wrapper = mount(CoarContinuousMonthView, {
      props: { builder: calendar },
      attachTo: document.body,
    });
    const source = wrapper.find(
      '[data-month-key="2026-06"] [data-day-key="2026-06-15"] .coar-month-pill',
    );
    const july1 = wrapper.find('[data-month-key="2026-07"] [data-day-key="2026-07-01"]').element;
    const originalElementsFromPoint = document.elementsFromPoint;
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [july1],
    });
    try {
      await source.trigger('pointerdown', { clientX: 50, clientY: 250, pointerId: 8, button: 0 });
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 250,
          clientY: 650,
          pointerId: 8,
          bubbles: true,
        }),
      );
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          clientX: 250,
          clientY: 650,
          pointerId: 8,
          bubbles: true,
        }),
      );
      await nextTick();
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(onDrop.mock.calls[0][0].target.date).toBe('2026-07-01');
      expect((onDrop.mock.calls[0][0].next.start as Temporal.ZonedDateTime).hour).toBe(9);
    } finally {
      Object.defineProperty(document, 'elementsFromPoint', {
        configurable: true,
        value: originalElementsFromPoint,
      });
      wrapper.unmount();
    }
  });
});

describe('live topmost month while scrolling', () => {
  const rect = (top: number, height: number) =>
    ({
      left: 0,
      top,
      width: 700,
      height,
      right: 700,
      bottom: top + height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;

  /** Lay the sections out 500 px tall each, scrolled so `scrollTop` is the viewport top. */
  function layOut(wrapper: ReturnType<typeof mount>, scrollTop: number) {
    const root = wrapper.element as HTMLElement;
    root.getBoundingClientRect = () => rect(0, 600);
    const sections = wrapper.findAll('[data-month-key]');
    sections.forEach((section, index) => {
      (section.element as HTMLElement).getBoundingClientRect = () =>
        rect(index * 500 - scrollTop, 500);
    });
  }

  it('publishes the topmost section live and moves the cursor only when the scroll settles', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const calendar = builder();
      const onRangeChange = vi.fn();
      calendar.onRangeChange(onRangeChange);
      const wrapper = mount(CoarContinuousMonthView, { props: { builder: calendar } });
      await nextTick();
      expect(calendar.api.topmostVisibleMonth.value?.toString()).toBe('2026-06');
      onRangeChange.mockClear();

      // June is section index 6 (window starts at 2025-12). Scroll so
      // that August's section top sits at the viewport top.
      layOut(wrapper, 8 * 500);
      wrapper.element.dispatchEvent(new Event('scroll'));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      expect(calendar.api.topmostVisibleMonth.value?.toString()).toBe('2026-08');
      expect(calendar.api.rangeLabel.value).toBe('August 2026');
      // The semantic cursor has not moved yet — no loader / range churn mid-gesture.
      expect(calendar.state.date.value.toString()).toBe('2026-06-15');
      expect(onRangeChange).not.toHaveBeenCalled();

      wrapper.element.dispatchEvent(new Event('scrollend'));
      await nextTick();
      expect(calendar.state.date.value.toString()).toBe('2026-08-15');
      expect(calendar.api.rangeLabel.value).toBe('August 2026');
      wrapper.unmount();
      expect(calendar.api.topmostVisibleMonth.value).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('falls back to a settle timer where scrollend does not fire', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const calendar = builder();
      const wrapper = mount(CoarContinuousMonthView, { props: { builder: calendar } });
      await nextTick();
      layOut(wrapper, 7 * 500);
      wrapper.element.dispatchEvent(new Event('scroll'));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      expect(calendar.api.topmostVisibleMonth.value?.toString()).toBe('2026-07');
      expect(calendar.state.date.value.toString()).toBe('2026-06-15');
      vi.advanceTimersByTime(200);
      expect(calendar.state.date.value.toString()).toBe('2026-07-15');
    } finally {
      vi.useRealTimers();
    }
  });
});
