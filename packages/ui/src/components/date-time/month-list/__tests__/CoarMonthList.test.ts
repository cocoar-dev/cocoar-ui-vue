import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarMonthList from '../CoarMonthList.vue';

// Stub scrollbar directive + CoarIcon
vi.mock('../../../scrollbar', () => ({
  vScrollbar: { mounted() {}, updated() {}, unmounted() {} },
}));

vi.mock('../../../icon/CoarIcon.vue', () => ({
  default: {
    name: 'CoarIcon',
    props: ['name', 'size'],
    template: '<span class="mock-icon" />',
  },
}));

function mountList(opts: Record<string, unknown> = {}) {
  return mount(CoarMonthList, {
    props: {
      activeMonth: Temporal.PlainYearMonth.from({ year: 2025, month: 6 }),
      ...opts,
    },
    global: {
      provide: { 'coar-l10n': undefined },
    },
  });
}

describe('CoarMonthList', () => {
  describe('rendering', () => {
    it('renders 12 month buttons', () => {
      const w = mountList();
      const months = w.findAll('.coar-month-list__month');
      expect(months).toHaveLength(12);
    });

    it('shows the current year', () => {
      const w = mountList();
      expect(w.find('.coar-month-list__year').text()).toBe('2025');
    });

    it('marks the active month', () => {
      const w = mountList();
      const active = w.findAll('.coar-month-list__month--active');
      expect(active).toHaveLength(1);
      // June is active
      expect(active[0].attributes('aria-selected')).toBe('true');
    });

    it('uses role="listbox" on container', () => {
      const w = mountList();
      expect(w.find('[role="listbox"]').exists()).toBe(true);
    });

    it('uses role="option" on month buttons', () => {
      const w = mountList();
      const options = w.findAll('[role="option"]');
      expect(options).toHaveLength(12);
    });
  });

  describe('year stepper', () => {
    it('navigates to previous year', async () => {
      const w = mountList();
      await w.find('[aria-label="Previous year"]').trigger('click');
      expect(w.find('.coar-month-list__year').text()).toBe('2024');
    });

    it('navigates to next year', async () => {
      const w = mountList();
      await w.find('[aria-label="Next year"]').trigger('click');
      expect(w.find('.coar-month-list__year').text()).toBe('2026');
    });

    it('emits yearChanged on year navigation', async () => {
      const w = mountList();
      await w.find('[aria-label="Next year"]').trigger('click');
      expect(w.emitted('yearChanged')).toBeTruthy();
      expect(w.emitted('yearChanged')![0]).toEqual([2026]);
    });

    it('disables prev button at minYear', () => {
      const w = mountList({ minYear: 2025 });
      const btn = w.find('[aria-label="Previous year"]');
      expect((btn.element as HTMLButtonElement).disabled).toBe(true);
    });

    it('disables next button at maxYear', () => {
      const w = mountList({ maxYear: 2025 });
      const btn = w.find('[aria-label="Next year"]');
      expect((btn.element as HTMLButtonElement).disabled).toBe(true);
    });

    it('preserves month when changing year', async () => {
      const w = mountList();
      await w.find('[aria-label="Next year"]').trigger('click');
      await nextTick();
      // June should still be active in 2026
      const active = w.find('.coar-month-list__month--active');
      expect(active.exists()).toBe(true);
      // 6th button (0-indexed: 5)
      const months = w.findAll('.coar-month-list__month');
      expect(months[5].classes()).toContain('coar-month-list__month--active');
    });
  });

  describe('month selection', () => {
    it('emits monthSelected on click', async () => {
      const w = mountList();
      const months = w.findAll('.coar-month-list__month');
      await months[2].trigger('click'); // March
      expect(w.emitted('monthSelected')).toBeTruthy();
      const emitted = w.emitted('monthSelected')![0][0] as Temporal.PlainYearMonth;
      expect(emitted.month).toBe(3);
      expect(emitted.year).toBe(2025);
    });

    it('updates activeMonth on selection', async () => {
      const w = mountList();
      const months = w.findAll('.coar-month-list__month');
      await months[0].trigger('click'); // January
      await nextTick();

      const active = w.find('.coar-month-list__month--active');
      expect(active.exists()).toBe(true);
      // First button should now be active
      expect(months[0].classes()).toContain('coar-month-list__month--active');
    });
  });

  describe('localization', () => {
    it('renders localized month names', () => {
      const w = mountList({ locale: 'de' });
      const months = w.findAll('.coar-month-list__month');
      // German month names
      expect(months[0].text()).toBe('Januar');
      expect(months[11].text()).toBe('Dezember');
    });

    it('renders English month names by default', () => {
      const w = mountList({ locale: 'en-US' });
      const months = w.findAll('.coar-month-list__month');
      expect(months[0].text()).toBe('January');
      expect(months[11].text()).toBe('December');
    });
  });
});
