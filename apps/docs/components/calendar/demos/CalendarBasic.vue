<template>
  <div style="height: 600px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarCalendar :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref(Temporal.PlainDate.from('2026-04-15'));

const pd = (iso: string) => Temporal.PlainDate.from(iso);
// Defaulting the source zone to Vienna deliberately — the events
// represent meetings scheduled BY VIENNA WORKERS. Article 4: store
// intent (local + IANA zone), derive UTC.
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

// Mutable so drag/keyboard moves can rewrite start/end in place.
const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: zdt('2026-04-15T09:00:00'),
    end: zdt('2026-04-15T09:30:00'),
    meta: { title: 'Daily standup', color: '#10b981' },
  },
  {
    id: 'design',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  {
    id: 'sven-ooo',
    start: pd('2026-04-14'),
    end: pd('2026-04-17'),
    meta: { title: 'Sven — OOO', color: '#9ca3af' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-16T12:00:00'),
    end: zdt('2026-04-16T13:00:00'),
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
]);

const { builder } = useCalendar();
builder
  .events(events)
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  // Article 9: locale is a separate decision from timezone. Set it
  // explicitly to silence the dev-mode "defaults are not decisions"
  // warning. For multi-region apps, bind to your i18n source's
  // current language (e.g. `useLocalization().language`).
  .locale('en-US')
  // Article 5: how to resolve drops landing in DST gaps / fall-back
  // overlaps. `'compatible'` = silently shift forward / pick earlier
  // (Temporal default). `'reject'` = drop is vetoed, snap-back fires.
  // `'earlier'` / `'later'` = pick the corresponding instant on
  // overlap. Whatever fires, `target.disambiguation` tells the
  // consumer (see onEventDrop below).
  .dstPolicy('compatible')
  // The library doesn't mutate `events` itself — it emits `eventDrop`
  // with the consumer's responsibility to apply the move. This handler
  // patches the event in place so the move sticks (and so keyboard
  // navigation, drag-and-drop, and resize handles all work in the
  // demo). Cloning the array forces Vue to emit a fresh reference for
  // downstream computeds (event-index, layout, etc.).
  //
  // `next.start` / `next.end` are Temporal values matching the source
  // event's shape (PlainDate for all-day, ZonedDateTime for timed) —
  // assign them straight back onto the event.
  .onEventDrop(({ event, next, original, target }) => {
    // Article 5: when the drop landed in a DST gap or fall-back
    // overlap, `target.disambiguation` tells the consumer so they
    // can show a toast / dialog. Default `dstPolicy('compatible')`
    // resolves silently; consumers wanting different UX should set
    // `.dstPolicy('reject')` (drop is vetoed) or read this flag.
    if (target.disambiguation === 'gap') {
      // eslint-disable-next-line no-console
      console.info(
        `[CalendarBasic] DST gap on ${target.date} — meeting was ` +
          'shifted forward to the next valid wall-clock minute.',
      );
    } else if (target.disambiguation === 'overlap') {
      // eslint-disable-next-line no-console
      console.info(
        `[CalendarBasic] DST overlap on ${target.date} — meeting was ` +
          "resolved per dstPolicy (default 'compatible' = earlier instant).",
      );
    }
    // Article 3 / Article 9 — record the user's viewing context with
    // the move so audit logs / undo stacks can replay in the right
    // zone:
    //   - `original.displayZone` = zone the user was looking at when
    //      the drag started
    //   - `target.displayZone`   = zone the drop snapped in (same
    //      unless the user toggled `.timezone()` mid-drag)
    // Real apps push these into a `meta.audit = { from, at }` field
    // or a separate undo/redo store.
    pushUndoEntry({
      eventId: event.id,
      from: { start: original.start, end: original.end, displayZone: original.displayZone },
      to:   { start: next.start, end: next.end, displayZone: target.displayZone },
      disambiguation: target.disambiguation,
    });
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      // Cross-zone events: each endpoint may live in its own
      // `timeZoneId` — write both back unchanged from the payload,
      // don't try to "normalise" them.
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  });

// Tiny demo undo stack (in-memory; real apps use a proper store).
type UndoEntry = {
  eventId: string;
  from: {
    start: Temporal.ZonedDateTime | Temporal.PlainDate;
    end?: Temporal.ZonedDateTime | Temporal.PlainDate;
    displayZone: string;
  };
  to: {
    start: Temporal.ZonedDateTime | Temporal.PlainDate;
    end?: Temporal.ZonedDateTime | Temporal.PlainDate;
    displayZone: string;
  };
  disambiguation: null | 'gap' | 'overlap';
};
const undoStack: UndoEntry[] = [];
function pushUndoEntry(entry: UndoEntry): void {
  undoStack.push(entry);
}
</script>
