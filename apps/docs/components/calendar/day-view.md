---
description: "CoarDayView — single-day time-grid calendar view with hour axis, all-day band, configurable time range and slot duration, usable standalone via useDayView"
---

# `<CoarDayView>` — Day View <Badge type="warning" text="Preview" />

Single-day time-grid surface — one hour-axis on the left, one day column on the right. Multi-day all-day events that touch the visible day appear in the all-day band that pins under the day header. Use it standalone via [`useDayView()`](#usedayview) when you need just the day view without the [`<CoarCalendar>`](/components/calendar/coar-calendar) shell.

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

## Builder setters

Full reference: see [the composer's API reference](/components/calendar/coar-calendar#api-reference). Highlights for the day view:

| Setter | Argument | Default | Notes |
|---|---|---|---|
| `timeRange(r)` | `MaybeRefOrGetter<{ startMinutes, endMinutes }>` | `{0, 1440}` | Visible hour range, in minutes from midnight. Events outside are still rendered into the all-day band when applicable. |
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
