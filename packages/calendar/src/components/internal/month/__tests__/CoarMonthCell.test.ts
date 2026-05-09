/**
 * Tests for `<CoarMonthCell>` (internal/month).
 *
 * Scope: state-class wiring, kebab aria-expanded, click /
 * contextmenu / kebab-click emission, slot rendering, density.
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import CoarMonthCell from '../CoarMonthCell.vue';
import { Temporal } from '../../../../core';

const day = Temporal.PlainDate.from('2026-05-04');

const baseProps = {
  day,
  dayKey: '2026-05-04',
  pillsMarginTopPx: 24,
  kebabAriaLabel: 'Day actions',
  ariaRowIndex: 2,
  ariaColIndex: 1,
  ariaLabel: 'Monday, May 4, 2026',
} as const;

function mountCell(propsOverride: Record<string, unknown> = {}) {
  return mount(CoarMonthCell, { props: { ...baseProps, ...propsOverride } });
}

describe('<CoarMonthCell>', () => {
  describe('state classes', () => {
    it('renders the day number from `day.day`', () => {
      const wrapper = mountCell();
      expect(wrapper.find('.coar-month-cell__day-number').text()).toBe('4');
    });

    it('exposes data-day-key for overflow detection', () => {
      const wrapper = mountCell();
      expect(wrapper.find('.coar-month-cell').attributes('data-day-key')).toBe('2026-05-04');
    });

    it('applies --today / --weekend / --other-month classes', () => {
      const today = mountCell({ isToday: true });
      expect(today.find('.coar-month-cell').classes()).toContain('coar-month-cell--today');

      const weekend = mountCell({ isWeekend: true });
      expect(weekend.find('.coar-month-cell').classes()).toContain('coar-month-cell--weekend');

      const other = mountCell({ isOtherMonth: true });
      expect(other.find('.coar-month-cell').classes()).toContain('coar-month-cell--other-month');
    });

    it('does NOT add state classes by default', () => {
      const wrapper = mountCell();
      const classes = wrapper.find('.coar-month-cell').classes();
      expect(classes).not.toContain('coar-month-cell--today');
      expect(classes).not.toContain('coar-month-cell--weekend');
      expect(classes).not.toContain('coar-month-cell--other-month');
    });
  });

  describe('pills container', () => {
    it('positions the pills below the row bar area via margin-top', () => {
      const wrapper = mountCell({ pillsMarginTopPx: 60 });
      const style = wrapper.find('.coar-month-cell__pills').attributes('style') ?? '';
      expect(style).toContain('margin-top: 60px');
    });

    it('renders the default slot inside the pills container', () => {
      const Renderer = defineComponent({
        components: { CoarMonthCell },
        setup() {
          return () =>
            h(CoarMonthCell, { ...baseProps }, () =>
              h('div', { class: 'fake-pill' }, 'pill content'),
            );
        },
      });
      const wrapper = mount(Renderer);
      const pills = wrapper.find('.coar-month-cell__pills');
      expect(pills.find('.fake-pill').exists()).toBe(true);
      expect(pills.text()).toContain('pill content');
    });
  });

  describe('kebab menu trigger', () => {
    it('reflects menuOpenForThisCell on aria-expanded', () => {
      const closed = mountCell();
      expect(closed.find('.coar-month-cell__menu-trigger').attributes('aria-expanded')).toBe('false');

      const open = mountCell({ menuOpenForThisCell: true });
      expect(open.find('.coar-month-cell__menu-trigger').attributes('aria-expanded')).toBe('true');
    });

    it('uses the supplied kebabAriaLabel', () => {
      const wrapper = mountCell({ kebabAriaLabel: 'Tagesaktionen' });
      expect(wrapper.find('.coar-month-cell__menu-trigger').attributes('aria-label')).toBe(
        'Tagesaktionen',
      );
    });

    it('emits kebabClick (and NOT cellPointerdown) when the kebab is clicked', async () => {
      const wrapper = mountCell();
      await wrapper.find('.coar-month-cell__menu-trigger').trigger('click');
      expect(wrapper.emitted('kebabClick')).toHaveLength(1);
      expect(wrapper.emitted('cellPointerdown')).toBeUndefined();
    });
  });

  describe('cell-level events', () => {
    it('emits cellPointerdown with native + day', async () => {
      const wrapper = mountCell();
      await wrapper.find('.coar-month-cell').trigger('pointerdown');
      const evts = wrapper.emitted('cellPointerdown');
      expect(evts).toHaveLength(1);
      expect((evts![0][1] as Temporal.PlainDate).toString()).toBe('2026-05-04');
    });

    it('emits cellContextmenu with native + day', async () => {
      const wrapper = mountCell();
      await wrapper.find('.coar-month-cell').trigger('contextmenu');
      const evts = wrapper.emitted('cellContextmenu');
      expect(evts).toHaveLength(1);
      expect((evts![0][1] as Temporal.PlainDate).toString()).toBe('2026-05-04');
    });
  });

  describe('density', () => {
    it('applies --density-compact only when density is compact', () => {
      const compact = mountCell({ density: 'compact' });
      expect(compact.find('.coar-month-cell').classes()).toContain('coar-month-cell--density-compact');

      const comfortable = mountCell();
      expect(comfortable.find('.coar-month-cell').classes()).not.toContain(
        'coar-month-cell--density-compact',
      );
    });
  });
});
