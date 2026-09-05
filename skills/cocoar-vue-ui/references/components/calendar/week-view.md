<!-- Generated from apps/docs/components/calendar/week-view.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# `<CoarWeekView>` — Week View (Preview)

7-day time-grid view — one hour-axis on the left, seven day columns on the right, all-day band pinned under the day-of-week header. The week's first day is locale-aware (`en-US` / `ja-JP` start on Sunday, `de-AT` / `fr-FR` start on Monday) but can be overridden via `firstDayOfWeek()`.

```html
<CoarWeekView :builder="builder" />
```

## Standalone usage

```ts
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarWeekView,
  useWeekView,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[UTC]'),
    end:   Temporal.ZonedDateTime.from('2026-04-15T09:30:00[UTC]'),
  },
]);
const date = ref('2026-04-15');

const { builder, api } = useWeekView();
builder
  .events(events)
  .date(date)
  .timezone('UTC')
  .timeRange([7, 20])
  .slotDuration(30)
  .firstDayOfWeek(1);   // Monday — overrides locale default
```

```html
<CoarWeekView :builder="builder" />
```

The Week view shares its builder type, `CalendarBuilder`, with the [Day view](./day-view.md) — they differ only in the days array the wrapper computes (Week uses `weekDates(date, fdow)` to expand the cursor to the 7-day window).

**Demo — `calendar/demos/WeekViewBasic.vue`**

```vue
<template>
  <div style="height: 600px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarWeekView :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarWeekView,
  useWeekView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-15'));

const pd = (iso: string) => Temporal.PlainDate.from(iso);
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  // Multi-day all-day band entries.
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  {
    id: 'sven-ooo',
    start: pd('2026-04-15'),
    end: pd('2026-04-18'),
    meta: { title: 'Sven — OOO', color: '#9ca3af' },
  },
  // Daily standups Mon–Fri.
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: zdt(`${d}T09:00:00`),
      end: zdt(`${d}T09:30:00`),
      meta: { title: 'Daily standup', color: '#10b981' },
    }),
  ),
  // Wed busy-day cluster.
  {
    id: 'wed-design',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'wed-lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
  {
    id: 'wed-1on1',
    start: zdt('2026-04-15T15:00:00'),
    end: zdt('2026-04-15T15:45:00'),
    meta: { title: '1:1 with Bernhard', color: '#3b82f6' },
  },
  // Thu deep-work block.
  {
    id: 'thu-deep',
    start: zdt('2026-04-16T09:00:00'),
    end: zdt('2026-04-16T13:00:00'),
    meta: { title: 'Deep work — Calendar', color: '#2563eb' },
  },
  // Fri client demo.
  {
    id: 'fri-demo',
    start: zdt('2026-04-17T15:00:00'),
    end: zdt('2026-04-17T16:30:00'),
    meta: { title: 'Client demo', color: '#dc2626' },
  },
]);

const { builder } = useWeekView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .firstDayOfWeek(1) // Monday — overrides the locale default
  .onEventDrop(({ event, next }) => {
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  });
</script>
```

## Custom day header

The `#dayHeader` slot replaces the default per-column header. Receives `{ date, isToday, isWeekend }` so you can render whatever fits your design — the example below stacks day-of-week + day-of-month with a today indicator and weekend muting.

**Demo — `calendar/demos/WeekViewCustomDayHeader.vue`**

```vue
<template>
  <div>
    <p class="hint">
      Custom <code>#dayHeader</code> slot — day-of-week + day-of-month
      stacked, today highlighted with a blue dot, weekends muted.
    </p>
    <div style="height: 540px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarWeekView :builder="builder">
        <template #dayHeader="{ date: d, isToday, isWeekend }">
          <div class="hdr" :class="{ 'hdr--today': isToday, 'hdr--weekend': isWeekend }">
            <span class="hdr__dow">{{ formatDow(d) }}</span>
            <span class="hdr__day">
              {{ d.day }}
              <span v-if="isToday" class="hdr__dot" />
            </span>
          </div>
        </template>
      </CoarWeekView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarWeekView,
  useWeekView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-15'));

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: zdt(`${d}T09:00:00`),
      end: zdt(`${d}T09:30:00`),
      meta: { title: 'Standup', color: '#10b981' },
    }),
  ),
  {
    id: 'review',
    start: zdt('2026-04-15T14:00:00'),
    end: zdt('2026-04-15T15:00:00'),
    meta: { title: 'Sprint review', color: '#8b5cf6' },
  },
]);

const { builder } = useWeekView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .firstDayOfWeek(1)
  .timeRange({ startMinutes: 8 * 60, endMinutes: 18 * 60 })
  .onEventDrop(({ event, next }) => {
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  });

const dowFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
function formatDow(d: Temporal.PlainDate): string {
  return dowFmt
    .format(new Date(Date.UTC(d.year, d.month - 1, d.day)))
    .toUpperCase();
}
</script>

<style scoped>
.hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--coar-text-subtle, #6b7280);
}
.hint code {
  font-family: var(--coar-font-family-mono, monospace);
  font-size: 12px;
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  padding: 1px 5px;
  border-radius: 3px;
}
.hdr {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 4px 8px;
}
.hdr__dow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--coar-text-subtle, #6b7280);
}
.hdr__day {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
}
.hdr__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--coar-color-accent, #2563eb);
}
.hdr--today .hdr__day {
  color: var(--coar-color-accent, #2563eb);
}
.hdr--weekend .hdr__day,
.hdr--weekend .hdr__dow {
  color: var(--coar-text-subtle, #9ca3af);
}
</style>
```

## Inside `<CoarCalendar>`

`<CoarCalendar>` and `<CoarWeekView>` consume the SAME `CalendarBuilder` instance — there's no sub-builder forking. Set time-grid config directly on the composer's builder:

```ts
const { builder } = useCalendar();
builder
  .timeRange({ startMinutes: 8 * 60, endMinutes: 18 * 60 })
  .slotDuration(15);
```

When the active view is week or day, the same builder feeds the embedded `<CoarTimeGrid>`. View-specific settings simply have no effect outside their view (e.g. `maxEventsPerCell` is a no-op in week view).

## `useWeekView<TMeta>()`

```ts
function useWeekView<TMeta>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
};
```

Returns a fresh standalone builder + its imperative api. The builder type is the same `CalendarBuilder` used by `<CoarCalendar>` — `useWeekView()` is a thin shorthand that pre-sets `view: 'week'`. The `next()` / `prev()` step is one **week** here, not one day.

## Builder setters

Full reference: see [the composer's API reference](./coar-calendar.md#api-reference). Highlights that matter for the week view:

| Setter | Argument | Default | Notes |
|---|---|---|---|
| `firstDayOfWeek(d)` | `0..6 \| undefined` | locale-aware | `0` = Sunday … `6` = Saturday. |
| `dayHeaderRenderer(r)` | `DayHeaderRenderer` | — | Per-day column header — typically the most-customised piece on a week view. |
| `timeRange(r)` | `MaybeRefOrGetter<{ startMinutes, endMinutes }>` | `{0, 1440}` | Visible hour range, in minutes from midnight. |
| `slotDuration(d)` | `MaybeRefOrGetter<number>` | `30` | Slot subdivision (minutes). Also the snap step when dragging. |
| `pixelsPerHour(p)` | `MaybeRefOrGetter<number>` | `60` | Vertical density. |
| `eventRenderer(r)` | `EventRenderer<TMeta>` | — | Universal renderer. For all-day-band bars, branch on `ctx.layout?.kind === 'allDayBar'`; for time-grid event cards, `ctx.layout?.kind === 'positioned'`. |

## Multi-day events & the all-day band

Multi-day events that touch any visible day are split into one bar per row, each clipped to the row. Single-day all-day events appear in the same band. Cluster-aware lane sizing means a busy day doesn't unfairly narrow events on quieter days in the same week.

### Lane cap and band height

The band shows at most `allDayMaxVisibleLanes` lanes — default **3**, like the system calendar. When the layout needs more, the last visible lane is given up for per-day **"+N"** markers; a click on a marker expands the band, and a **Show fewer** control under the axis label folds it back. `null` shows every lane.

`allDayBandMode` decides how much height the band claims. The hour axis starts below the band, so every height change moves the whole grid:

| Mode | Height | When |
|---|---|---|
| `fitsContent` (default) | as tall as needed, absent without all-day events | Dense weeks where every pixel counts. |
| `alwaysOneLane` | at least one lane | Removes the 0↔1 jump — the most frequent and the largest — when paging through days. |
| `reservesCap` | always `allDayMaxVisibleLanes` tall | The hour axis sits at the same place on every day; costs a few rows when nothing is in them. |

```ts
builder.allDayMaxVisibleLanes(3).allDayBandMode('reservesCap');
```

## Overlapping timed cards

Events in the same collision group form a content-aware cascade: later cards render in front, but only cover as much of the card behind them as its content block allows. When the width that stays **unobscured** falls below `timedEventDetailMinWidth` (default **112 px**, like iOS), the built-in card switches to a **compact anatomy**: one end-truncated title line, no location row, no time row. Every card remains a separate clickable, draggable target. With room, the built-in card shows the location (from 34 minutes of height at the default scale), the time span (from 52) and lets the title wrap once (from 70).

```ts
builder.timedEventDetailMinWidth(96); // switch a little later
builder.timedEventDetailMinWidth(0);  // never compact
```

A custom `#event` slot or `eventRenderer` is never touched by the policy — the cascade then keeps the safe side-by-side widths and your content decides what to show. The Day view uses exactly the same layout.
## Point events (timed, no `end`)

A timed event without `end` keeps the default 30-minute slot geometry but renders distinguishably from a real 30-minute event: a solid start edge in the event color sits exactly on the start time, and the card body drops to ~38 % fill opacity — the title stays fully opaque. Resize handles are suppressed (there is no `end` to grab). Month and Agenda render point events unchanged. The look matches the SwiftUI port; tune it via `--coar-calendar-point-edge-height` / `--coar-calendar-point-body-opacity` (see [Theming](./index.md#theming)).

## Imperative API

```ts
interface CalendarApi<TMeta> {
  goTo(iso: string): void;
  goToToday(): void;
  next(): void;                  // ±1 week
  prev(): void;
  getVisibleRange(): ViewWindow | null;
  getVisibleEvents(): CalendarEvent<TMeta>[];
  scrollToTime(hour: number): void;
  refresh(): void;
  refreshRange(start: string, end: string): void;
  readonly loading: Readonly<Ref<boolean>>;
  readonly visibleRange: Readonly<Ref<ViewWindow | null>>;
  readonly gridReady: Readonly<Ref<boolean>>;
}
```

## `<CoarWeekView>` props + slots

| Prop | Type | Description |
|---|---|---|
| `builder` | `CalendarBuilder` | **Required.** From `useWeekView()` (or share the one from `useCalendar()`). |

| Slot | Scope | Purpose |
|---|---|---|
| `event` | `{ event, layout }` | Per-event renderer. `layout` is the `PositionedEvent` (lane / startMinutes / endMinutes / clipping flags). |
| `allDayEvent` | `{ event, layout }` | All-day band renderer. `layout` is the `AllDayBar` (lane / startCol / endCol / clipping flags). |
| `dayHeader` | `{ date, isToday, isWeekend }` | Per-day column header. |
