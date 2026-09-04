/**
 * The three time-grid views are presets of one surface. Pins:
 *   - each preset renders the same columns as before the consolidation
 *   - an explicit `timeGridRange` spec drives columns AND paging in
 *     the Day view (buttons and swipe alike), and is ignored by Week /
 *     Work week
 *   - the loader window is the unfiltered span
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarDayView from '../CoarDayView.vue';
import CoarWeekView from '../CoarWeekView.vue';
import CoarWorkWeekView from '../CoarWorkWeekView.vue';

const newBuilder = () =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-08-12')) // Wednesday
    .events(ref([]));

describe('time-grid presets on the shared surface', () => {
  it('Day renders one column at the cursor', () => {
    const b = newBuilder().view('day');
    const w = mount(CoarDayView, { props: { builder: b } });
    expect(w.findAll('.coar-time-grid-column')).toHaveLength(1);
    expect(w.find('.coar-day-view').attributes('data-day-count')).toBe('1');
    expect(b.api.getVisibleRange()).toMatchObject({ start: '2026-08-12', end: '2026-08-13' });
  });

  it('Week renders seven columns from Monday, window Mon–Mon', () => {
    const b = newBuilder().view('week');
    const w = mount(CoarWeekView, { props: { builder: b } });
    expect(w.findAll('.coar-time-grid-column')).toHaveLength(7);
    expect(b.api.getVisibleRange()).toMatchObject({ start: '2026-08-10', end: '2026-08-17' });
  });

  it('Work week renders the workDays columns but keeps the seven-day window', () => {
    const b = newBuilder().view('workWeek').workDays([1, 2, 3, 4]);
    const w = mount(CoarWorkWeekView, { props: { builder: b } });
    expect(w.findAll('.coar-time-grid-column')).toHaveLength(4);
    expect(b.api.getVisibleRange()).toMatchObject({ start: '2026-08-10', end: '2026-08-17' });
  });
});

describe('explicit timeGridRange on the Day view', () => {
  const fiveByWeek = { anchor: 'cursor', span: 5, filter: 'all', step: 7 } as const;

  it('"start Monday, show five days, page by a week" — columns, window and paging', async () => {
    const b = newBuilder()
      .view('day')
      .date(Temporal.PlainDate.from('2026-08-10'))
      .timeGridRange(fiveByWeek);
    const w = mount(CoarDayView, { props: { builder: b } });
    expect(w.findAll('.coar-time-grid-column')).toHaveLength(5);
    expect(b.api.getVisibleRange()).toMatchObject({ start: '2026-08-10', end: '2026-08-15' });
    b.api.next();
    await nextTick();
    expect(b.state.date.value.toString()).toBe('2026-08-17');
    expect(b.api.getVisibleRange()).toMatchObject({ start: '2026-08-17', end: '2026-08-22' });
  });

  it('weekStart anchor snaps a mid-week cursor; workDays filter hides weekend columns', () => {
    const b = newBuilder()
      .view('day')
      .timeGridRange({ anchor: 'weekStart', span: 7, filter: 'workDays', step: 7 });
    const w = mount(CoarDayView, { props: { builder: b } });
    // Mon–Fri of the cursor's week, window Mon–Mon: identical to Work week.
    expect(w.findAll('.coar-time-grid-column')).toHaveLength(5);
    expect(b.api.getVisibleRange()).toMatchObject({ start: '2026-08-10', end: '2026-08-17' });
  });

  it('is reactive (C7): swapping the spec re-renders columns', async () => {
    const spec = ref<typeof fiveByWeek | null>(null);
    const b = newBuilder().view('day').timeGridRange(spec);
    const w = mount(CoarDayView, { props: { builder: b } });
    expect(w.findAll('.coar-time-grid-column')).toHaveLength(1);
    spec.value = fiveByWeek;
    await nextTick();
    expect(w.findAll('.coar-time-grid-column')).toHaveLength(5);
  });

  it('Week and Work week ignore the explicit spec', () => {
    const b = newBuilder().timeGridRange(fiveByWeek);
    const week = mount(CoarWeekView, { props: { builder: b.view('week') } });
    expect(week.findAll('.coar-time-grid-column')).toHaveLength(7);
    const work = mount(CoarWorkWeekView, { props: { builder: b.view('workWeek') } });
    expect(work.findAll('.coar-time-grid-column')).toHaveLength(5);
  });

  it('a touch swipe pages by the spec step, not by the column count', async () => {
    const b = newBuilder()
      .view('day')
      .date(Temporal.PlainDate.from('2026-08-10'))
      .timeGridRange(fiveByWeek);
    const w = mount(CoarDayView, { props: { builder: b } });
    const col = w.find('.coar-time-grid-column').element;
    const Ctor = (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
    const pointer = (type: string, x: number) => {
      const e = new Ctor(type, { bubbles: true, cancelable: true, clientX: x, clientY: 100 });
      Object.defineProperty(e, 'pointerId', { value: 5 });
      Object.defineProperty(e, 'pointerType', { value: 'touch' });
      return e;
    };
    col.dispatchEvent(pointer('pointerdown', 200));
    window.dispatchEvent(pointer('pointermove', 150));
    window.dispatchEvent(pointer('pointermove', 100));
    window.dispatchEvent(pointer('pointerup', 100));
    await nextTick();
    expect(b.state.date.value.toString()).toBe('2026-08-17');
  });
});
