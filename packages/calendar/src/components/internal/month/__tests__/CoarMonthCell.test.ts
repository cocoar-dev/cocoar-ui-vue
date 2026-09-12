/**
 * Tests for `<CoarMonthCell>` (internal/month).
 *
 * Scope: state-class wiring, "+N" overflow button, click emission,
 * slot rendering, density.
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

    it('exposes data-day-key for the drop hit-test', () => {
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

  describe('"+N" overflow button', () => {
    it('renders no button and no menu trigger by default', () => {
      const wrapper = mountCell();
      expect(wrapper.find('.coar-month-cell__overflow').exists()).toBe(false);
      expect(wrapper.find('.coar-month-cell__menu-trigger').exists()).toBe(false);
    });

    it('renders "+N" after the pills as a dialog trigger with an accessible name', () => {
      const wrapper = mountCell({ overflowCount: 3, overflowLabel: '3 weitere Termine' });
      const button = wrapper.find('button.coar-month-cell__overflow');
      expect(button.exists()).toBe(true);
      expect(button.text()).toBe('+3');
      expect(button.attributes('aria-label')).toBe('3 weitere Termine');
      expect(button.attributes('aria-haspopup')).toBe('dialog');
      expect(button.attributes('aria-expanded')).toBe('false');
      expect(wrapper.find('.coar-month-cell__pills').element.lastElementChild).toBe(button.element);
    });

    it('reflects overlayOpen on aria-expanded', () => {
      const wrapper = mountCell({ overflowCount: 1, overlayOpen: true });
      expect(wrapper.find('.coar-month-cell__overflow').attributes('aria-expanded')).toBe('true');
    });

    it('emits overflowClick on click and swallows pointerdown (no cell click)', async () => {
      const wrapper = mountCell({ overflowCount: 1, overflowLabel: '1 more event' });
      const button = wrapper.find('.coar-month-cell__overflow');
      await button.trigger('pointerdown');
      await button.trigger('click');
      expect(wrapper.emitted('cellPointerdown')).toBeUndefined();
      const evts = wrapper.emitted('overflowClick');
      expect(evts).toHaveLength(1);
      expect((evts![0][1] as Temporal.PlainDate).toString()).toBe('2026-05-04');
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

    it('emits cellDblclick with native + day', async () => {
      const wrapper = mountCell();
      await wrapper.find('.coar-month-cell').trigger('dblclick');
      const evts = wrapper.emitted('cellDblclick');
      expect(evts).toHaveLength(1);
      expect((evts![0][1] as Temporal.PlainDate).toString()).toBe('2026-05-04');
    });
  });

  describe('density', () => {
    it('applies --density-compact only when density is compact', () => {
      const compact = mountCell({ density: 'compact' });
      expect(compact.find('.coar-month-cell').classes()).toContain(
        'coar-month-cell--density-compact',
      );

      const comfortable = mountCell();
      expect(comfortable.find('.coar-month-cell').classes()).not.toContain(
        'coar-month-cell--density-compact',
      );
    });
  });
});
