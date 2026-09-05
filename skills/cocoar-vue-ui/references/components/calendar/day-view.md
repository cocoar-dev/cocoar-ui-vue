<!-- Generated from apps/docs/components/calendar/day-view.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# `<CoarDayView>` — Day View (Preview)

Time-grid surface with two display choices: **One day** renders one fixed column, while **Multi-day** derives 1–7 complete columns from the available container width. Multi-day all-day events that touch the visible range appear in the all-day band pinned under the day headers. Use it standalone via [`useDayView()`](#usedayview) when you need the surface without the [`<CoarCalendar>`](./coar-calendar.md) shell.

```html
<CoarDayView :builder="builder" />
```

## Standalone usage

```ts
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarDayView,
  useDayView,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[UTC]'),
    end:   Temporal.ZonedDateTime.from('2026-04-15T09:15:00[UTC]'),
  },
]);
const date = ref('2026-04-15');

const { builder, api } = useDayView();
builder
  .events(events)
  .date(date)
  .timezone('UTC')
  .timeRange([8, 18])
  .slotDuration(15)
  .onTimeClick(({ time }) => console.log(time.toString()));
```

```html
<CoarDayView :builder="builder" />
```

The Day view shares its builder type, `CalendarBuilder`, with the [Week view](./week-view.md) — they differ only in the days array the wrapper computes (Day uses `[date]`, Week uses `weekDates(date, fdow)`).

## One day and Multi-day

The shell presents both as variations under Day. Multi-day never squeezes partial columns into the available width: it calculates the number of full columns from `dayColumnMinWidth`, clamps the result to `1…7`, and honours `dayColumnCount` as its minimum.

```ts
builder
  .dayMode('multiDay')
  .dayColumnCount(1)
  .dayColumnMinWidth(220);

api.setDayMode('single');
```

For fixed seven-day and configured-workday grids, use [Week](./week-view.md) and [Work Week](./work-week-view.md). They share the same time-grid renderer.

**Demo — `calendar/demos/DayViewBasic.vue`**

```vue
<template>
  <div style="height: 600px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarDayView :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarDayView,
  useDayView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-15'));

const pd = (iso: string) => Temporal.PlainDate.from(iso);
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  // All-day band: a multi-day OOO that touches today.
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  // Three timed events with a 3-deep overlap cluster.
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
    id: 'pair',
    start: zdt('2026-04-15T11:30:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Pair: calendar', color: '#f59e0b' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
  {
    id: 'one-on-one',
    start: zdt('2026-04-15T15:00:00'),
    end: zdt('2026-04-15T15:45:00'),
    meta: { title: '1:1 with Bernhard', color: '#3b82f6' },
  },
]);

const { builder } = useDayView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  // Apply drag/keyboard moves in place so the demo is interactive.
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

## Working hours

Constrain the visible hour range via `timeRange([startHour, endHour])` and tighten drag-snap precision via `slotDuration(15)` for a 15-minute grid. Events outside the visible window are still in the data set but invisible.

**Demo — `calendar/demos/DayViewWorkingHours.vue`**

```vue
<template>
  <div>
    <p class="hint">
      Visible hour range constrained to <code>[8, 18]</code>; slot
      subdivision tightened to 15 min for finer drag-snap. The early
      flight (5–7&nbsp;AM) is still in <code>events</code> but lives off
      the visible window.
    </p>
    <div style="height: 520px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarDayView :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarDayView,
  useDayView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-15'));

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  // Off-window early — invisible at timeRange [8, 18].
  {
    id: 'red-eye',
    start: zdt('2026-04-15T05:00:00'),
    end: zdt('2026-04-15T07:30:00'),
    meta: { title: 'Early flight', color: '#84cc16' },
  },
  {
    id: 'standup',
    start: zdt('2026-04-15T09:00:00'),
    end: zdt('2026-04-15T09:15:00'),
    meta: { title: 'Daily standup', color: '#10b981' },
  },
  {
    id: 'review',
    start: zdt('2026-04-15T10:30:00'),
    end: zdt('2026-04-15T11:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch', color: '#ef4444' },
  },
  {
    id: 'deep-work',
    start: zdt('2026-04-15T13:15:00'),
    end: zdt('2026-04-15T16:45:00'),
    meta: { title: 'Deep work', color: '#2563eb' },
  },
]);

const { builder } = useDayView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .timeRange({ startMinutes: 8 * 60, endMinutes: 18 * 60 })
  .slotDuration(15)
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
</style>
```

## Point events (timed, no `end`)

A timed event without `end` keeps the default 30-minute slot geometry but renders distinguishably from a real 30-minute event: a solid start edge in the event color sits exactly on the start time, and the card body drops to ~38 % fill opacity — the title stays fully opaque. Resize handles are suppressed (there is no `end` to grab). Month and Agenda render point events unchanged. The look matches the SwiftUI port; tune it via `--coar-calendar-point-edge-height` / `--coar-calendar-point-body-opacity` (see [Theming](./index.md#theming)).

## Overlapping timed cards

Same cascade and compact-anatomy policy as the week view, tuned with `timedEventDetailMinWidth` — see [Overlapping timed cards](./week-view.md#overlapping-timed-cards).
## Inside `<CoarCalendar>`

`<CoarCalendar>` and `<CoarDayView>` consume the SAME `CalendarBuilder` instance — there's no sub-builder forking. Time-grid config goes directly on the composer's builder:

```ts
const { builder } = useCalendar();
builder
  .timeRange({ startMinutes: 8 * 60, endMinutes: 18 * 60 })
  .slotDuration(15);
```

When the active view is day or week, the same builder feeds the embedded `<CoarTimeGrid>`. View-specific settings have no effect outside their view.

## `useDayView<TMeta>()`

```ts
function useDayView<TMeta>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
};
```

Returns a fresh standalone builder + its imperative api. The builder type is the same `CalendarBuilder` used by `<CoarCalendar>` — `useDayView()` is a thin shorthand that pre-sets `view: 'day'`.

## One model for every time grid

Day, Multi-day, Week and Work week render on the same surface and are described by the same four parameters. The classic views are presets; `builder.timeGridRange(...)` lets the Day view use any other combination.

| Parameter | Meaning | Values |
|---|---|---|
| `anchor` | Where the first column stands | `'cursor'`, or `'weekStart'` (cursor snapped to the locale's first day of the week) |
| `span` | Days from the anchor | a number, or `'responsive'` (as many complete columns as the container width allows) |
| `filter` | Which of those days are drawn | `'all'`, or `'workDays'` (the builder's `workDays`; the loader window still covers the whole span) |
| `step` | How far `next` / `prev` / a swipe move the cursor | a number of days, or `'span'` (as many as are shown) |

| View | anchor | span | filter | step |
|---|---|---|---|---|
| Day, `dayMode('single')` | cursor | 1 | all | span |
| Day, `dayMode('multiDay')` | cursor | responsive | all | span |
| Week | weekStart | 7 | all | 7 |
| Work week | weekStart | 7 | workDays | 7 |

"Start on Monday, show five days, page by a week" is one more spec:

```ts
builder.view('day').timeGridRange({ anchor: 'cursor', span: 5, filter: 'all', step: 7 });
```

Week and Work week are fixed presets and ignore `timeGridRange`; `null` restores the `dayMode` presets. Because there is one resolver (`resolveTimeGridRange`, exported from the core subpath) and one surface underneath, every grid feature — touch paging, the empty-cell hooks, the all-day lane cap — behaves identically across the four.

## Touch paging

On touch devices a horizontal pan on the day columns moves the grid with the finger — header cells, all-day band and columns together, the hour axis stays put — and pages to the previous / next range on release past a quarter of the width or on a fast flick. Below that the grid settles back. A touch that never moves is a tap and reaches `onTimeClick` on release, so a swipe never starts with a stray slot click. Vertical pans stay native scrolling. Mouse and pen keep their click-on-press semantics.

While you drag, the **previous and next page** are drawn to the left and right of the current one — same columns, same events — so the gesture reads as paging between two visible pages; they are visual only and disappear once the grid settles. In loader mode the calendar pre-warms those two windows shortly after each page becomes visible (`builder.prefetchNeighbours(false)` switches that off; one extra fetch per neighbour), and `api.getEventsForWindow(window)` is the read behind it. In `events()` mode nothing needs fetching.

The **day-name strip** at the top is a paging handle for every pointer type: a mouse drag across the day names pages the grid the same way (grab cursor), because there is nothing else to drag or click up there. On the columns themselves the mouse keeps its click-on-press semantics.

`builder.swipeNavigation(false)` switches the gesture off. `prefers-reduced-motion` skips the settle animation and pages immediately. The same gesture is available on the Week and Work week grids.

## Builder setters

Full reference: see [the composer's API reference](./coar-calendar.md#api-reference). Highlights for the day view:

| Setter | Argument | Default | Notes |
|---|---|---|---|
| `timeRange(r)` | `MaybeRefOrGetter<{ startMinutes, endMinutes }>` | `{0, 1440}` | Visible hour range, in minutes from midnight. Events outside are still rendered into the all-day band when applicable. |
| `dayMode(m)` | `'single' \| 'multiDay'` | `'single'` | Fixed one-day column or width-aware multi-day range (the two Day presets of the time-grid model). |
| `timeGridRange(spec)` | `MaybeRefOrGetter<TimeGridRangeSpec \| null>` | `null` | Explicit anchor / span / filter / step for the Day view — see "One model for every time grid". |
| `dayColumnCount(n)` | `MaybeRefOrGetter<number>` | `1` | Minimum number of complete columns in Multi-day mode. |
| `dayColumnMinWidth(px)` | `MaybeRefOrGetter<number>` | `220` | Target width used to derive additional columns, capped at seven. |
| `slotDuration(d)` | `MaybeRefOrGetter<number>` | `30` | Slot subdivision (minutes). Also the snap step when dragging. |
| `pixelsPerHour(p)` | `MaybeRefOrGetter<number>` | `60` | Vertical density. `60` = 30 px per 30-min slot. |
| `eventRenderer(r)` | `EventRenderer<TMeta>` | — | Universal renderer. Branch on `ctx.layout?.kind === 'positioned'` (timed cards) vs `'allDayBar'` (all-day band). |
| `dayHeaderRenderer(r)` | `DayHeaderRenderer` | — | Per-day column header. |

## Imperative API

```ts
interface CalendarApi<TMeta> {
  goTo(date: Temporal.PlainDate): void;
  goToToday(): void;
  next(): void;                            // ±1 day in day-view
  prev(): void;
  getVisibleRange(): ViewWindow | null;
  getVisibleEvents(): CalendarEvent<TMeta>[];
  scrollToTime(time: Temporal.PlainTime): void;   // Day / Week only
  scrollToDate(date: Temporal.PlainDate): void;   // Agenda only
  refresh(): void;
  refreshRange(window: ViewWindow): void;
  readonly loading: Readonly<Ref<boolean>>;
  readonly visibleRange: Readonly<Ref<ViewWindow | null>>;
  readonly gridReady: Readonly<Ref<boolean>>;
}
```

## `<CoarDayView>` props + slots

| Prop | Type | Description |
|---|---|---|
| `builder` | `CalendarBuilder` | **Required.** From `useDayView()` (or share the one from `useCalendar()`). |

| Slot | Scope | Purpose |
|---|---|---|
| `event` | `{ event, layout }` | Per-event renderer. `layout` is the `PositionedEvent` (lane / startMinutes / endMinutes / clipping flags). |
| `allDayEvent` | `{ event, layout }` | All-day band renderer. `layout` is the `AllDayBar` (lane / startCol / endCol / clipping flags). |
| `dayHeader` | `{ date, isToday, isWeekend }` | Per-day column header. |
