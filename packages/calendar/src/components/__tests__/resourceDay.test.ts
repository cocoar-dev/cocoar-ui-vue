import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarDayView from '../CoarDayView.vue';
import CoarCalendar from '../CoarCalendar.vue';
import type { CalendarEvent } from '../../core';
import { pd, zdt } from '../../__test-utils__/event-fixtures';

type Meta = { title: string; who: string[] };
const ZONE = 'Europe/Vienna';
const timed = (id: string, start: string, end: string, who: string[]): CalendarEvent<Meta> => ({
  id,
  start: zdt(`2026-11-19T${start}:00`, ZONE),
  end: zdt(`2026-11-19T${end}:00`, ZONE),
  meta: { title: id, who },
});

const newBuilder = (events: CalendarEvent<Meta>[]) =>
  CalendarBuilder.create<Meta>()
    .view('day')
    .timezone(ZONE)
    .locale('de-AT')
    .date(Temporal.PlainDate.from('2026-11-19'))
    .pixelsPerHour(60)
    .slotDuration(30)
    .resources([
      { id: 'j', label: 'Jonas' },
      { id: 'l', label: 'Lena' },
      { id: 's', label: 'Sam' },
      { id: 'e', label: 'Emma' },
    ])
    .eventResources((event) => event.meta?.who ?? [])
    .events(ref(events)) as unknown as CalendarBuilder;

/** Columns at x 100–500 (100 px each), hour 0 at y 0. */
function stubColumns(w: ReturnType<typeof mount>) {
  vi.spyOn(w.find('.coar-resource-day__columns').element, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    right: 500,
    width: 400,
    top: 0,
  } as DOMRect);
}
const at = (type: string, x: number, y: number) =>
  new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, bubbles: true, button: 0 });
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

describe('day view with resources', () => {
  it('shows a column per resource instead of the regular grid', () => {
    const w = mount(CoarDayView, { props: { builder: newBuilder([]) } });
    expect(w.find('.coar-time-grid').exists()).toBe(false);
    expect(w.findAll('.coar-resource-day__resource').map((c) => c.text())).toEqual([
      'Jonas',
      'Lena',
      'Sam',
      'Emma',
    ]);
  });

  it('keeps the regular grid without resources', () => {
    const b = CalendarBuilder.create().view('day').timezone(ZONE).date(Temporal.PlainDate.from('2026-11-19'));
    const w = mount(CoarDayView, { props: { builder: b } });
    expect(w.find('.coar-time-grid').exists()).toBe(true);
    expect(w.find('.coar-resource-day').exists()).toBe(false);
  });

  it('keeps the regular grid for several days', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const b = newBuilder([]).timeGridRange({ anchor: 'cursor', span: 3, filter: 'all', step: 1 });
    const w = mount(CoarDayView, { props: { builder: b } });
    expect(w.find('.coar-time-grid').exists()).toBe(true);
    expect(warn.mock.calls.some(([m]) => String(m).includes('builder.resources'))).toBe(true);
    warn.mockRestore();
  });

  it('draws a shared event as one block, or two when the columns are apart', () => {
    const w = mount(CoarDayView, {
      props: {
        builder: newBuilder([
          timed('neighbours', '09:00', '10:00', ['l', 's']),
          timed('apart', '12:00', '13:00', ['j', 'e']),
        ]),
      },
    });
    expect(w.findAll('[data-event-id="neighbours"]')).toHaveLength(1);
    expect(w.findAll('[data-event-id="apart"]')).toHaveLength(2);
  });

  it('adds the unassigned column only when an event needs it', () => {
    const w = mount(CoarDayView, { props: { builder: newBuilder([timed('n', '09:00', '10:00', [])]) } });
    expect(w.findAll('.coar-resource-day__resource')).toHaveLength(5);
  });

  it('shows all-day events in a band across their columns', () => {
    const event: CalendarEvent<Meta> = {
      id: 'camp',
      start: pd('2026-11-19'),
      end: pd('2026-11-20'),
      meta: { title: 'Camp', who: ['l', 's'] },
    };
    const w = mount(CoarDayView, { props: { builder: newBuilder([event]) } });
    expect(w.find('.coar-resource-day__block--all-day').text()).toBe('Camp');
  });

  it('draws an overlay across all columns through its slot', () => {
    const b = newBuilder([]).dayOverlays(() => [
      { key: 'meal', start: zdt('2026-11-19T18:30:00', ZONE), end: zdt('2026-11-19T19:00:00', ZONE), label: 'Dinner' },
    ]);
    const w = mount(CoarDayView, {
      props: { builder: b },
      slots: { overlay: `<template #overlay="{ overlay }"><b class="meal">{{ overlay.label }}</b></template>` },
    });
    const overlay = w.find('[data-overlay-key="meal"]');
    expect(overlay.find('.meal').text()).toBe('Dinner');
    expect((overlay.element as HTMLElement).style.top).toBe('1110px');
    expect((overlay.element as HTMLElement).style.height).toBe('30px');
  });

  it('a drop reports the new time and resource and leaves the assignment to the host', async () => {
    const onEventDrop = vi.fn();
    const b = newBuilder([timed('a', '09:00', '10:00', ['j'])]).onEventDrop(onEventDrop);
    const w = mount(CoarDayView, { props: { builder: b } });
    stubColumns(w);
    await w.find('[data-event-id="a"]').trigger('pointerdown', {
      button: 0, pointerId: 1, clientX: 150, clientY: 540,
    });
    window.dispatchEvent(at('pointermove', 350, 660));
    await frame();
    window.dispatchEvent(at('pointerup', 350, 660));
    expect(onEventDrop).toHaveBeenCalledOnce();
    const payload = onEventDrop.mock.calls[0][0];
    expect(payload.next.start.toPlainTime().toString()).toBe('11:00:00');
    expect(payload.next.end.toPlainTime().toString()).toBe('12:00:00');
    expect(payload.target).toMatchObject({ resourceId: 's', sourceResourceId: 'j' });
  });

  it('opens a block with the keyboard', async () => {
    const onEventClick = vi.fn();
    const b = newBuilder([timed('a', '09:00', '10:00', ['j'])]).onEventClick(onEventClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    await w.find('[data-event-id="a"]').trigger('keydown', { key: 'Enter' });
    expect(onEventClick).toHaveBeenCalledOnce();
  });

  it('asks canDrop with the resource under the pointer', async () => {
    const onEventDrop = vi.fn();
    const canDrop = vi.fn((_e, target: { resourceId?: string }) => target.resourceId !== 's');
    const b = newBuilder([timed('a', '09:00', '10:00', ['j'])]).onEventDrop(onEventDrop).canDrop(canDrop);
    const w = mount(CoarDayView, { props: { builder: b } });
    stubColumns(w);
    await w.find('[data-event-id="a"]').trigger('pointerdown', {
      button: 0, pointerId: 1, clientX: 150, clientY: 540,
    });
    window.dispatchEvent(at('pointermove', 350, 540));
    await frame();
    window.dispatchEvent(at('pointerup', 350, 540));
    expect(onEventDrop).not.toHaveBeenCalled();
  });

  it('a click on an empty column reports the time and resource', async () => {
    const onTimeClick = vi.fn();
    const b = newBuilder([]).onTimeClick(onTimeClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    stubColumns(w);
    w.find('.coar-resource-day__columns').element.dispatchEvent(at('pointerdown', 250, 600));
    await nextTick();
    expect(onTimeClick).toHaveBeenCalledOnce();
    expect(onTimeClick.mock.calls[0][0].time.toString()).toBe('10:00:00');
    expect(onTimeClick.mock.calls[0][0].resourceId).toBe('l');
  });

  it('selects a range in a column with the resource', async () => {
    const onTimeRangeSelect = vi.fn();
    const b = newBuilder([]).timeRangeSelect(true).onTimeRangeSelect(onTimeRangeSelect);
    const w = mount(CoarDayView, { props: { builder: b } });
    stubColumns(w);
    w.find('.coar-resource-day__columns').element.dispatchEvent(at('pointerdown', 450, 600));
    window.dispatchEvent(at('pointermove', 450, 690));
    await nextTick();
    expect(w.find('.coar-resource-day__selection').exists()).toBe(true);
    window.dispatchEvent(at('pointerup', 450, 690));
    const payload = onTimeRangeSelect.mock.calls[0][0];
    expect(payload.start.toPlainTime().toString()).toBe('10:00:00');
    expect(payload.end.toPlainTime().toString()).toBe('12:00:00');
    expect(payload).toMatchObject({ resourceId: 'e', source: 'drag' });
  });

  it('forwards the resource slots through CoarCalendar', () => {
    const w = mount(CoarCalendar, {
      props: { builder: newBuilder([]) },
      slots: {
        resourceHeader: `<template #resourceHeader="{ id }"><i class="who">{{ id }}</i></template>`,
      },
    });
    expect(w.findAll('.who').map((n) => n.text())).toEqual(['j', 'l', 's', 'e']);
  });
});
