/**
 * Tests for `<CoarMonthPill>` (internal/month).
 *
 * Scope: variant rendering, slot fallback, event emission gates,
 * density class. Layout / dnd math live in their own files.
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import CoarMonthPill from '../CoarMonthPill.vue';
import type { CalendarEvent, MonthCellPill } from '../../../../core';
import { pd } from '../../../../__test-utils__/event-fixtures';

const event: CalendarEvent = {
  id: 'evt-1',
  start: pd('2026-05-04'),
  meta: { title: 'Standup', color: '#abcdef' },
};

const pill: MonthCellPill = {
  event,
  order: 0,
};

function mountPill(propsOverride: Record<string, unknown> = {}) {
  return mount(CoarMonthPill, {
    props: {
      event,
      pill,
      bg: '#abcdef',
      border: '#0070f3',
      title: 'Standup',
      ariaLabel: 'Standup, May 4',
      ...propsOverride,
    },
  });
}

describe('<CoarMonthPill>', () => {
  describe('live variant (default)', () => {
    it('renders the title from the prop', () => {
      const wrapper = mountPill();
      expect(wrapper.text()).toContain('Standup');
    });

    it('is focusable, has button role + aria-label', () => {
      const wrapper = mountPill();
      const root = wrapper.find('.coar-month-pill');
      expect(root.attributes('tabindex')).toBe('0');
      expect(root.attributes('role')).toBe('button');
      expect(root.attributes('aria-label')).toBe('Standup, May 4');
      expect(root.attributes('aria-hidden')).toBeUndefined();
    });

    it('exposes data-event-id for the dnd / focus pipeline', () => {
      const wrapper = mountPill();
      expect(wrapper.find('.coar-month-pill').attributes('data-event-id')).toBe('evt-1');
    });

    it('emits pointerdown / keydown / dblclick', async () => {
      const wrapper = mountPill();
      await wrapper.find('.coar-month-pill').trigger('pointerdown');
      await wrapper.find('.coar-month-pill').trigger('keydown', { key: 'ArrowRight' });
      await wrapper.find('.coar-month-pill').trigger('dblclick');
      expect(wrapper.emitted('pointerdown')).toHaveLength(1);
      expect(wrapper.emitted('keydown')).toHaveLength(1);
      expect(wrapper.emitted('dblclick')).toHaveLength(1);
    });

    it('renders the bg / border styles inline', () => {
      const wrapper = mountPill();
      const style = wrapper.find('.coar-month-pill').attributes('style') ?? '';
      expect(style).toContain('background: #abcdef');
      // happy-dom serializes border-left to longhand properties.
      expect(style).toMatch(/border-left(?:-color)?:\s*#0070f3/);
    });
  });

  describe('preview variant', () => {
    it('applies --ghost class, no data-event-id, tabindex -1', () => {
      const wrapper = mountPill({ variant: 'preview' });
      const root = wrapper.find('.coar-month-pill');
      expect(root.classes()).toContain('coar-month-pill--ghost');
      expect(root.attributes('data-event-id')).toBeUndefined();
      expect(root.attributes('tabindex')).toBe('-1');
      expect(root.attributes('role')).toBeUndefined();
      expect(root.attributes('aria-hidden')).toBe('true');
    });

    it('does NOT emit interactive events', async () => {
      const wrapper = mountPill({ variant: 'preview' });
      await wrapper.find('.coar-month-pill').trigger('pointerdown');
      await wrapper.find('.coar-month-pill').trigger('keydown', { key: 'ArrowRight' });
      await wrapper.find('.coar-month-pill').trigger('dblclick');
      expect(wrapper.emitted('pointerdown')).toBeUndefined();
      expect(wrapper.emitted('keydown')).toBeUndefined();
      expect(wrapper.emitted('dblclick')).toBeUndefined();
    });

    it('with kbdActive=true is focusable + emits keydown so the kbd-drag state machine stays reachable', async () => {
      const wrapper = mountPill({ variant: 'preview', kbdActive: true });
      const root = wrapper.find('.coar-month-pill');
      // Promoted to interactive: tabbable + role=button + aria-label visible.
      expect(root.attributes('tabindex')).toBe('0');
      expect(root.attributes('role')).toBe('button');
      expect(root.attributes('aria-label')).toBe('Standup, May 4');
      expect(root.attributes('aria-hidden')).toBeUndefined();
      // And keydown emits — without this the next arrow keystroke
      // would be lost after staging unmounts the original card.
      await root.trigger('keydown', { key: 'ArrowRight' });
      expect(wrapper.emitted('keydown')).toHaveLength(1);
    });

    it('still respects the user slot (parent custom rendering)', () => {
      const Renderer = defineComponent({
        setup() {
          return () =>
            h(
              CoarMonthPill,
              {
                event,
                pill,
                bg: '#abcdef',
                border: '#0070f3',
                title: 'Standup',
                variant: 'preview',
              },
              {
                default: ({ event: e }: { event: CalendarEvent }) =>
                  h('span', { class: 'custom' }, `★ ${(e.meta as { title?: string }).title}`),
              },
            );
        },
      });
      const wrapper = mount(Renderer);
      expect(wrapper.find('.custom').text()).toBe('★ Standup');
    });
  });

  describe('phantom variant', () => {
    it('applies --source-phantom class and is non-interactive', () => {
      const wrapper = mountPill({ variant: 'phantom' });
      const root = wrapper.find('.coar-month-pill');
      expect(root.classes()).toContain('coar-month-pill--source-phantom');
      expect(root.attributes('aria-hidden')).toBe('true');
      expect(root.attributes('tabindex')).toBe('-1');
    });

    it('falls back to bare title (custom slot ignored)', () => {
      const Renderer = defineComponent({
        setup() {
          return () =>
            h(
              CoarMonthPill,
              {
                event,
                pill,
                bg: '#abcdef',
                border: '#0070f3',
                title: 'Standup',
                variant: 'phantom',
              },
              { default: () => h('span', { class: 'custom' }, 'CUSTOM') },
            );
        },
      });
      const wrapper = mount(Renderer);
      expect(wrapper.find('.custom').exists()).toBe(false);
      expect(wrapper.text()).toContain('Standup');
    });
  });

  describe('invalid variant', () => {
    it('applies --invalid + --snap-back when snappingBack is true', () => {
      const wrapper = mountPill({ variant: 'invalid', snappingBack: true });
      const root = wrapper.find('.coar-month-pill');
      expect(root.classes()).toContain('coar-month-pill--invalid');
      expect(root.classes()).toContain('coar-month-pill--snap-back');
    });

    it('does not apply --snap-back unless snappingBack', () => {
      const wrapper = mountPill({ variant: 'invalid' });
      expect(wrapper.find('.coar-month-pill').classes()).not.toContain('coar-month-pill--snap-back');
    });
  });

  describe('density', () => {
    it('applies --density-compact when density is compact', () => {
      const wrapper = mountPill({ density: 'compact' });
      expect(wrapper.find('.coar-month-pill').classes()).toContain(
        'coar-month-pill--density-compact',
      );
    });

    it('does not apply density class for comfortable (default)', () => {
      const wrapper = mountPill();
      expect(wrapper.find('.coar-month-pill').classes()).not.toContain(
        'coar-month-pill--density-compact',
      );
    });
  });
});
