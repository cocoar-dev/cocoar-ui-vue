<script setup lang="ts">
/**
 * Popover-on-hover demo.
 *
 * Shows how to wire `builder.onEventHover` / `onEventHoverLeave`
 * to `useOverlay()` from `@cocoar/vue-ui` so events get a hover
 * tooltip / popover with consumer-defined content. The library
 * doesn't ship a built-in popover — that's intentional: every app
 * wants different content (title, description, action buttons,
 * editing affordance, etc.). The handlers expose the timing +
 * anchor element; the consumer composes the rest.
 *
 * Pattern:
 *   1. `useOverlay()` to get the overlay service.
 *   2. Store the active `OverlayRef` in a local ref.
 *   3. `onEventHover` opens (closing the previous one first).
 *   4. `onEventHoverLeave` closes.
 *
 * Optional refinements:
 *   - Wrap the open in a `setTimeout(..., 200)` for hover-delay.
 *   - Track pointer-over-the-popover so the user can click action
 *     buttons inside without losing it. Standard tooltip UX —
 *     omitted here for brevity; see `@cocoar/vue-ui`'s
 *     `vTooltip` directive for the polished pattern.
 */

import { h, markRaw, ref } from 'vue';
import { useOverlay, popoverPreset, type OverlayRef } from '@cocoar/vue-ui';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

// Demo event content component — receives the event via `inputs`.
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
            background: 'white',
            border: '1px solid #e5e7eb',
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
            {
              style: {
                fontWeight: 600,
                marginBottom: '4px',
              },
            },
            (props.event.meta as { title?: string } | undefined)?.title ??
              props.event.event.id,
          ),
          h(
            'div',
            {
              style: { color: '#666', fontSize: '12px' },
            },
            formatEventTime(props.event),
          ),
          h(
            'div',
            {
              style: {
                marginTop: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#999',
              },
            },
            `id: ${props.event.id}`,
          ),
        ],
      );
  },
});

function formatEventTime(event: CalendarEvent): string {
  if (event.start instanceof Temporal.ZonedDateTime) {
    const start = event.start.toString().slice(0, 16).replace('T', ' ');
    if (event.end instanceof Temporal.ZonedDateTime) {
      const end = event.end.toString().slice(11, 16);
      return `${start} – ${end}`;
    }
    return start;
  }
  // PlainDate
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
    // Close previous popover before opening a new one — pointer
    // could enter event B without leaving event A's bubble area.
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

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — popover on hover</h1>
      <p>
        Wires <code>builder.onEventHover</code> / <code>onEventHoverLeave</code>
        to <code>useOverlay()</code> from <code>@cocoar/vue-ui</code>. Hover any
        event to see a popover anchored at the event's DOM node with the
        consumer-defined content. The library doesn't ship a popover —
        consumer code composes whatever it needs (title, description, action
        buttons, etc.).
      </p>
    </header>

    <div class="status">
      Currently hovered:
      <strong>{{ hoveredEventId ?? '(none)' }}</strong>
    </div>

    <div class="page__calendar">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}
.page__header h1 {
  margin: 0 0 4px;
}
.page__header p {
  margin: 0;
  color: #555;
}
.status {
  font-family: monospace;
  font-size: 12px;
  padding: 6px 10px;
  background: #f3f4f6;
  border-radius: 4px;
  flex: 0 0 auto;
}
.page__calendar {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  min-height: 600px;
}
</style>
