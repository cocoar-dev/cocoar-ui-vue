import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { Temporal } from '@js-temporal/polyfill';

import CoarScrollableCalendar from '../CoarScrollableCalendar.vue';

// Mock scrollIntoView since happy-dom doesn't support it
Element.prototype.scrollIntoView = vi.fn();

function mountCalendar(props: Record<string, unknown> = {}) {
  return mount(CoarScrollableCalendar, {
    props: {
      ...props,
    },
    attachTo: document.body,
  });
}

describe('CoarScrollableCalendar', () => {
  describe('rendering', () => {
    it('renders weekday headers', () => {
      const wrapper = mountCalendar();
      const weekdays = wrapper.findAll('.coar-scrollable-calendar__weekday');
      expect(weekdays.length).toBe(7);
    });

    it('renders multiple months', () => {
      const wrapper = mountCalendar();
      const months = wrapper.findAll('.coar-scrollable-calendar__month');
      expect(months.length).toBeGreaterThan(12);
    });

    it('renders month names and years', () => {
      const wrapper = mountCalendar();
      const monthNames = wrapper.findAll('.coar-scrollable-calendar__month-name');
      expect(monthNames.length).toBeGreaterThan(0);
      expect(monthNames[0].text()).toBeTruthy();
    });

    it('renders 42 day cells per month (6 rows × 7 cols)', () => {
      const wrapper = mountCalendar();
      const firstMonth = wrapper.find('.coar-scrollable-calendar__month');
      const days = firstMonth.findAll('.coar-scrollable-calendar__day');
      expect(days.length).toBe(42);
    });
  });

  describe('week numbers', () => {
    it('shows week number column when showWeekNumbers is true', () => {
      const wrapper = mountCalendar({ showWeekNumbers: true });
      const weekNumbers = wrapper.findAll('.coar-scrollable-calendar__week-number');
      expect(weekNumbers.length).toBeGreaterThan(0);
    });

    it('hides week numbers by default', () => {
      const wrapper = mountCalendar();
      const weekNumbers = wrapper.findAll('.coar-scrollable-calendar__week-number');
      expect(weekNumbers.length).toBe(0);
    });

    it('adds with-weeks class to grid when showing week numbers', () => {
      const wrapper = mountCalendar({ showWeekNumbers: true });
      expect(wrapper.find('.coar-scrollable-calendar__grid--with-weeks').exists()).toBe(true);
    });
  });

  describe('date selection', () => {
    it('emits dateSelected when clicking a day', async () => {
      const wrapper = mountCalendar();
      const dayButton = wrapper.find('.coar-scrollable-calendar__day:not([disabled])');
      await dayButton.trigger('click');
      expect(wrapper.emitted('dateSelected')).toBeTruthy();
    });

    it('marks selected date', async () => {
      const selectedDate = Temporal.PlainDate.from('2025-07-15');
      const wrapper = mountCalendar({
        modelValue: selectedDate,
        activeMonth: selectedDate.toPlainYearMonth(),
      });
      await nextTick();

      const selectedDay = wrapper.find('.coar-scrollable-calendar__day--selected');
      expect(selectedDay.exists()).toBe(true);
      expect(selectedDay.attributes('data-date')).toBe('2025-07-15');
    });

    it('does not select disabled dates', async () => {
      const minDate = Temporal.PlainDate.from('2025-07-10');
      const wrapper = mountCalendar({
        min: minDate,
        activeMonth: minDate.toPlainYearMonth(),
      });

      // Find a disabled day (before min)
      const disabledDay = wrapper.find('.coar-scrollable-calendar__day--disabled');
      if (disabledDay.exists()) {
        await disabledDay.trigger('click');
        expect(wrapper.emitted('dateSelected')).toBeUndefined();
      }
    });
  });

  describe('today highlighting', () => {
    it('marks today with special class', () => {
      const wrapper = mountCalendar();
      const todayEl = wrapper.find('.coar-scrollable-calendar__day--today');
      expect(todayEl.exists()).toBe(true);
    });

    it('today has aria-current="date"', () => {
      const wrapper = mountCalendar();
      const todayEl = wrapper.find('[aria-current="date"]');
      expect(todayEl.exists()).toBe(true);
    });
  });

  describe('min/max constraints', () => {
    it('disables dates before min', () => {
      const min = Temporal.PlainDate.from('2025-07-15');
      const wrapper = mountCalendar({
        min,
        activeMonth: min.toPlainYearMonth(),
      });

      const disabledDays = wrapper.findAll('.coar-scrollable-calendar__day--disabled');
      expect(disabledDays.length).toBeGreaterThan(0);
    });

    it('disables dates after max', () => {
      const max = Temporal.PlainDate.from('2025-07-15');
      const wrapper = mountCalendar({
        max,
        activeMonth: max.toPlainYearMonth(),
      });

      const disabledDays = wrapper.findAll('.coar-scrollable-calendar__day--disabled');
      expect(disabledDays.length).toBeGreaterThan(0);
    });
  });

  describe('markers', () => {
    it('highlights marked dates', () => {
      const markers = [
        {
          startDate: Temporal.PlainDate.from('2025-07-04'),
          description: 'Holiday',
        },
      ];
      const wrapper = mountCalendar({
        markers,
        activeMonth: Temporal.PlainYearMonth.from('2025-07'),
      });

      const markedDay = wrapper.find('.coar-scrollable-calendar__day--marked');
      expect(markedDay.exists()).toBe(true);
    });
  });

  describe('weekend highlighting', () => {
    it('marks weekend days when highlightWeekends is true', () => {
      const wrapper = mountCalendar({
        highlightWeekends: true,
        activeMonth: Temporal.PlainYearMonth.from('2025-07'),
      });

      const weekendDays = wrapper.findAll('.coar-scrollable-calendar__day--weekend');
      expect(weekendDays.length).toBeGreaterThan(0);
    });

    it('does not mark weekends when highlightWeekends is false', () => {
      const wrapper = mountCalendar({
        highlightWeekends: false,
        activeMonth: Temporal.PlainYearMonth.from('2025-07'),
      });

      const weekendDays = wrapper.findAll('.coar-scrollable-calendar__day--weekend');
      expect(weekendDays.length).toBe(0);
    });
  });

  describe('accessibility', () => {
    it('day cells are buttons', () => {
      const wrapper = mountCalendar();
      const firstDay = wrapper.find('.coar-scrollable-calendar__day');
      expect(firstDay.element.tagName).toBe('BUTTON');
    });

    it('grid has role="grid"', () => {
      const wrapper = mountCalendar();
      const grid = wrapper.find('[role="grid"]');
      expect(grid.exists()).toBe(true);
    });

    it('focused day has tabindex 0', async () => {
      const wrapper = mountCalendar();
      await nextTick();
      const focusedDay = wrapper.find('.coar-scrollable-calendar__day--focused');
      expect(focusedDay.exists()).toBe(true);
      expect(focusedDay.attributes('tabindex')).toBe('0');
    });
  });
});
