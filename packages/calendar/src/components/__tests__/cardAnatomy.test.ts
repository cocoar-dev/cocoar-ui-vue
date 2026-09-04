/**
 * Built-in Day / Week card anatomy under overlap (iOS 4.0 parity).
 *
 * Pins:
 *   - a card with room shows location + time rows; nothing below the
 *     duration thresholds
 *   - three parallel cards in a narrow column drop to the compact
 *     anatomy (one title line, no rows), each still its own card
 *   - `timedEventDetailMinWidth(0)` disables the switch
 *   - a custom `#event` slot is never touched by the policy
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarDayView from '../CoarDayView.vue';
import type { CalendarEvent } from '../../core';
import { zdt } from '../../__test-utils__/event-fixtures';

const DAY = '2026-06-15';
const timed = (id: string, from: string, to: string, meta: Record<string, unknown> = {}) => ({
  id,
  start: zdt(`${DAY}T${from}:00`, 'Europe/Vienna'),
  end: zdt(`${DAY}T${to}:00`, 'Europe/Vienna'),
  meta: { title: `Event ${id}`, ...meta },
});

const newBuilder = (events: CalendarEvent[]) =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .view('day')
    .date(Temporal.PlainDate.from(DAY))
    .events(ref(events));

/** happy-dom lays nothing out; pretend every box is 300 px wide (one day column). */
const originalRect = HTMLElement.prototype.getBoundingClientRect;
beforeEach(() => {
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 300,
      height: 600,
      right: 300,
      bottom: 600,
      toJSON: () => ({}),
    } as DOMRect;
  };
});
afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = originalRect;
});

async function mountDay(events: CalendarEvent[], detailMinWidth?: number) {
  const b = newBuilder(events);
  if (detailMinWidth !== undefined) b.timedEventDetailMinWidth(detailMinWidth);
  const w = mount(CoarDayView, { props: { builder: b } });
  await nextTick();
  await nextTick();
  return w;
}

describe('built-in card anatomy', () => {
  it('a lone card in a narrow column keeps its rows (ellipsized, never compact)', async () => {
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: 90,
        height: 600,
        right: 90,
        bottom: 600,
        toJSON: () => ({}),
      } as DOMRect;
    };
    const w = await mountDay([timed('lone', '09:00', '11:00', { location: 'Room 4' })]);
    const card = w.find('.coar-time-grid-event');
    expect(card.classes()).not.toContain('coar-time-grid-event--anatomy-compact');
    expect(card.find('.coar-time-grid-event__time').exists()).toBe(true);
  });

  it('a card with room shows location and time; short cards do not', async () => {
    const w = await mountDay([
      timed('long', '09:00', '11:00', { location: 'Room 4' }),
      timed('short', '13:00', '13:30', { location: 'Room 5' }),
    ]);
    const cards = w.findAll('.coar-time-grid-event');
    const long = cards.find((c) => c.text().includes('Event long'))!;
    const short = cards.find((c) => c.text().includes('Event short'))!;
    expect(long.classes()).not.toContain('coar-time-grid-event--anatomy-compact');
    expect(long.find('.coar-time-grid-event__location').text()).toBe('Room 4');
    // Same formatter as the agenda: locale hour ("9:00" in de-AT), en dash span.
    expect(long.find('.coar-time-grid-event__time').text()).toMatch(/^0?9:00\s*–\s*11:00$/);
    expect(long.find('.coar-time-grid-event__title--two-lines').exists()).toBe(true);
    expect(short.find('.coar-time-grid-event__location').exists()).toBe(false);
    expect(short.find('.coar-time-grid-event__time').exists()).toBe(false);
  });

  it('three parallel cards in a narrow column go compact, each still its own card', async () => {
    const parallel = [
      timed('a', '09:00', '11:00', { location: 'A' }),
      timed('b', '09:00', '11:00', { location: 'B' }),
      timed('c', '09:00', '11:00', { location: 'C' }),
    ];
    const w = await mountDay(parallel);
    const cards = w.findAll('.coar-time-grid-event');
    expect(cards).toHaveLength(3);
    const compact = cards.filter((c) =>
      c.classes().includes('coar-time-grid-event--anatomy-compact'),
    );
    expect(compact.length).toBeGreaterThan(0);
    for (const c of compact) {
      expect(c.find('.coar-time-grid-event__location').exists()).toBe(false);
      expect(c.find('.coar-time-grid-event__time').exists()).toBe(false);
      expect(c.find('.coar-time-grid-event__title--two-lines').exists()).toBe(false);
      expect(c.find('.coar-time-grid-event__title').text()).toMatch(/^Event [abc]$/);
    }

    // `0` disables the policy: every card keeps the full anatomy.
    const off = await mountDay(parallel, 0);
    expect(off.findAll('.coar-time-grid-event--anatomy-compact')).toHaveLength(0);
    expect(off.findAll('.coar-time-grid-event__time')).toHaveLength(3);
  });

  it('leaves a custom event slot alone', async () => {
    const b = newBuilder([
      timed('a', '09:00', '11:00', { location: 'A' }),
      timed('b', '09:00', '11:00', { location: 'B' }),
      timed('c', '09:00', '11:00', { location: 'C' }),
    ]);
    const w = mount(CoarDayView, {
      props: { builder: b },
      slots: { event: '<p class="host-card">mine</p>' },
    });
    await nextTick();
    expect(w.findAll('.host-card')).toHaveLength(3);
    expect(w.findAll('.coar-time-grid-event__time')).toHaveLength(0);
  });
});
