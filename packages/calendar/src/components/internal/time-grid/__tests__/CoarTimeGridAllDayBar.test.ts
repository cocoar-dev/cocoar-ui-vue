/**
 * Tests for `<CoarTimeGridAllDayBar>` (internal/time-grid).
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarTimeGridAllDayBar from '../CoarTimeGridAllDayBar.vue';
import type { CalendarEvent, AllDayBar } from '../../../../core';
import { pd } from '../../../../__test-utils__/event-fixtures';

const event: CalendarEvent = {
  id: 'b1',
  start: pd('2026-04-15'),
  end: pd('2026-04-17'),
  meta: { title: 'OOO', color: '#abcdef' },
};

const bar: AllDayBar = {
  event,
  lane: 0,
  laneCount: 1,
  startCol: 0,
  endCol: 2,
  clippedStart: false,
  clippedEnd: false,
};

const baseProps = {
  event,
  bar,
  bg: '#abcdef',
  border: '#0070f3',
  title: 'OOO',
  ariaLabel: 'OOO, Apr 15-17',
  top: 4,
  left: 'calc(0% + 4px)',
  width: 'calc(43% - 8px)',
  height: 20,
  zIndex: 1,
} as const;

function mountBar(propsOverride: Record<string, unknown> = {}) {
  return mount(CoarTimeGridAllDayBar, { props: { ...baseProps, ...propsOverride } });
}

describe('<CoarTimeGridAllDayBar>', () => {
  it('renders title and is interactive in live variant', () => {
    const wrapper = mountBar();
    expect(wrapper.text()).toContain('OOO');
    expect(wrapper.find('.coar-time-grid-all-day-bar').attributes('tabindex')).toBe('0');
  });

  it('emits startResize / endResize from the side handles', async () => {
    const wrapper = mountBar();
    await wrapper.find('.coar-time-grid-all-day-bar__resize--start').trigger('pointerdown');
    await wrapper.find('.coar-time-grid-all-day-bar__resize--end').trigger('pointerdown');
    expect(wrapper.emitted('startResize')).toHaveLength(1);
    expect(wrapper.emitted('endResize')).toHaveLength(1);
  });

  it('hides the start handle when clippedStart, end handle when clippedEnd', () => {
    const start = mountBar({ clippedStart: true });
    expect(start.find('.coar-time-grid-all-day-bar__resize--start').exists()).toBe(false);
    expect(start.find('.coar-time-grid-all-day-bar__resize--end').exists()).toBe(true);

    const end = mountBar({ clippedEnd: true });
    expect(end.find('.coar-time-grid-all-day-bar__resize--start').exists()).toBe(true);
    expect(end.find('.coar-time-grid-all-day-bar__resize--end').exists()).toBe(false);
  });

  it('drops the left border when clippedStart', () => {
    const wrapper = mountBar({ clippedStart: true });
    const style = wrapper.find('.coar-time-grid-all-day-bar').attributes('style') ?? '';
    expect(style).toMatch(/border-left-style:\s*none/);
  });

  it('preview / phantom / invalid variants behave non-interactive', async () => {
    for (const variant of ['preview', 'phantom', 'invalid'] as const) {
      const wrapper = mountBar({ variant });
      const root = wrapper.find('.coar-time-grid-all-day-bar');
      expect(root.attributes('tabindex')).toBe('-1');
      await root.trigger('pointerdown');
      expect(wrapper.emitted('pointerdown')).toBeUndefined();
    }
  });

  it('applies density-compact', () => {
    const wrapper = mountBar({ density: 'compact' });
    expect(wrapper.find('.coar-time-grid-all-day-bar').classes()).toContain(
      'coar-time-grid-all-day-bar--density-compact',
    );
  });
});
