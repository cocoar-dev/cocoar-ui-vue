---
description: "CoarDayView — one-day or width-aware multi-day time grid with hour axis, all-day band, configurable columns, time range and slot duration"
---

# `<CoarDayView>` — Day View <Badge type="warning" text="Preview" />

Time-grid surface with two display choices: **One day** renders one fixed column, while **Multi-day** derives 1–7 complete columns from the available container width. Multi-day all-day events that touch the visible range appear in the all-day band pinned under the day headers. Use it standalone via [`useDayView()`](#usedayview) when you need the surface without the [`<CoarCalendar>`](/components/calendar/coar-calendar) shell.

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

The Day view shares its builder type, `CalendarBuilder`, with the [Week view](/components/calendar/week-view) — they differ only in the days array the wrapper computes (Day uses `[date]`, Week uses `weekDates(date, fdow)`).

## One day and Multi-day

The shell presents both as variations under Day. Multi-day never squeezes partial columns into the available width: it calculates the number of full columns from `dayColumnMinWidth`, clamps the result to `1…7`, and honours `dayColumnCount` as its minimum.

```ts
builder
  .dayMode('multiDay')
  .dayColumnCount(1)
  .dayColumnMinWidth(220);

api.setDayMode('single');
```

For fixed seven-day and configured-workday grids, use [Week](/components/calendar/week-view) and [Work Week](/components/calendar/work-week-view). They share the same time-grid renderer.

<preview path="./demos/DayViewBasic.vue" />

## Working hours

Constrain the visible hour range via `timeRange([startHour, endHour])` and tighten drag-snap precision via `slotDuration(15)` for a 15-minute grid. Events outside the visible window are still in the data set but invisible.

<preview path="./demos/DayViewWorkingHours.vue" />

## Point events (timed, no `end`)

A timed event without `end` keeps the default 30-minute slot geometry but renders distinguishably from a real 30-minute event: a solid start edge in the event color sits exactly on the start time, and the card body drops to ~38 % fill opacity — the title stays fully opaque. Resize handles are suppressed (there is no `end` to grab). Month and Agenda render point events unchanged. The look matches the SwiftUI port; tune it via `--coar-calendar-point-edge-height` / `--coar-calendar-point-body-opacity` (see [Theming](/components/calendar/#theming)).

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

The **day-name strip** at the top is a paging handle for every pointer type: a mouse drag across the day names pages the grid the same way (grab cursor), because there is nothing else to drag or click up there. On the columns themselves the mouse keeps its click-on-press semantics.

`builder.swipeNavigation(false)` switches the gesture off. `prefers-reduced-motion` skips the settle animation and pages immediately. The same gesture is available on the Week and Work week grids.

## Builder setters

Full reference: see [the composer's API reference](/components/calendar/coar-calendar#api-reference). Highlights for the day view:

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
