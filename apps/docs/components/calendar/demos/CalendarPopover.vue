<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="font-family: monospace; font-size: 11px; color: var(--coar-text-neutral-secondary);">
      Currently hovered: <strong>{{ hoveredEventId ?? '(none)' }}</strong>
    </div>
    <div style="height: 520px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Wires `builder.onEventHover` / `onEventHoverLeave` to
 * `useOverlay()` from `@cocoar/vue-ui` so events get a hover popover
 * with consumer-defined content. The lib doesn't ship a built-in
 * popover — different apps want different content (title + time,
 * action buttons, edit-in-place, full preview). The handlers
 * surface the timing + anchor element; consumer composes the rest.
 *
 * Pattern:
 *   1. `useOverlay()` to get the overlay service.
 *   2. Store the active `OverlayRef` in a local ref.
 *   3. `onEventHover` opens (closing previous first — pointer can
 *      enter event B before leaving event A's bubble area).
 *   4. `onEventHoverLeave` closes.
 *
 * No hover delay applied — wrap the open call in `setTimeout` if a
 * delay is wanted. For touch / pen pointers, `pointerenter` fires
 * on press, so this doubles as a long-press surface on tablets when
 * paired with a delay.
 */

import { h, markRaw, ref } from 'vue';
import { useOverlay, popoverPreset, type OverlayRef } from '@cocoar/vue-ui';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

// Consumer-defined popover content. Receives the hovered event via
// `inputs`. Replace this with whatever fits your domain — action
// buttons, descriptions, status pills, edit forms…
const EventPopover = markRaw({
  name: 'EventPopover',
  props: {
    event: { type: Object, required: true },
  },
  setup(props: { event: CalendarEvent }) {
    return () =>
      h(
        'div',
        {
          style: {
            padding: '12px 16px',
            background: 'var(--coar-background-neutral-primary, white)',
            border: '1px solid var(--coar-border-neutral-tertiary, #e5e7eb)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            fontFamily: 'var(--coar-body-base-family)',
            fontSize: '13px',
            minWidth: '200px',
            maxWidth: '320px',
          },
        },
        [
          h(
            'div',
            { style: { fontWeight: 600, marginBottom: '4px' } },
            (props.event.meta as { title?: string } | undefined)?.title ??
              props.event.id,
          ),
          h(
            'div',
            { style: { color: 'var(--coar-text-neutral-secondary, #666)', fontSize: '12px' } },
            formatEventTime(props.event),
          ),
        ],
      );
  },
});

function formatEventTime(event: CalendarEvent): string {
  if (event.start instanceof Temporal.ZonedDateTime) {
    const start = event.start.toString().slice(0, 16).replace('T', ' ');
    if (event.end instanceof Temporal.ZonedDateTime) {
      return `${start} – ${event.end.toString().slice(11, 16)}`;
    }
    return start;
  }
  if (event.end instanceof Temporal.PlainDate) {
    return `${event.start.toString()} – ${event.end.toString()}`;
  }
  return event.start.toString();
}

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-06-15T09:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-15T09:30:00[Europe/Vienna]'),
    meta: { title: 'Daily Standup', color: '#4f46e5' },
  },
  {
    id: 'design-review',
    start: Temporal.ZonedDateTime.from('2026-06-16T14:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-16T15:30:00[Europe/Vienna]'),
    meta: { title: 'Design Review', color: '#06b6d4' },
  },
  {
    id: 'lunch',
    start: Temporal.ZonedDateTime.from('2026-06-17T12:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-17T13:00:00[Europe/Vienna]'),
    meta: { title: 'Lunch with Anna', color: '#f59e0b' },
  },
  {
    id: 'vacation',
    start: Temporal.PlainDate.from('2026-06-22'),
    end: Temporal.PlainDate.from('2026-06-27'),
    meta: { title: 'Vacation', color: '#10b981' },
  },
]);

const { builder } = useCalendar();
const overlay = useOverlay();
const activeOverlay = ref<OverlayRef | null>(null);
const hoveredEventId = ref<string | null>(null);

builder
  .events(events)
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .firstDayOfWeek(1)
  .view('week')
  .date(Temporal.PlainDate.from('2026-06-15'))
  .onEventHover(({ event, native }) => {
    activeOverlay.value?.close();
    hoveredEventId.value = event.id;
    activeOverlay.value = overlay.open({
      spec: {
        ...popoverPreset,
        anchor: {
          kind: 'element',
          element: native.currentTarget as Element,
        },
      },
      content: { kind: 'component', component: EventPopover },
      inputs: { event },
    });
  })
  .onEventHoverLeave(() => {
    activeOverlay.value?.close();
    activeOverlay.value = null;
    hoveredEventId.value = null;
  });
</script>
