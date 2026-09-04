---
description: "CoarWeekView — 7-day time-grid calendar view with hour axis, all-day band, locale-aware first day of week and a customizable day-header slot"
---

# `<CoarWeekView>` — Week View <Badge type="warning" text="Preview" />

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

The Week view shares its builder type, `CalendarBuilder`, with the [Day view](/components/calendar/day-view) — they differ only in the days array the wrapper computes (Week uses `weekDates(date, fdow)` to expand the cursor to the 7-day window).

<preview path="./demos/WeekViewBasic.vue" />

## Custom day header

The `#dayHeader` slot replaces the default per-column header. Receives `{ date, isToday, isWeekend }` so you can render whatever fits your design — the example below stacks day-of-week + day-of-month with a today indicator and weekend muting.

<preview path="./demos/WeekViewCustomDayHeader.vue" />

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

Full reference: see [the composer's API reference](/components/calendar/coar-calendar#api-reference). Highlights that matter for the week view:

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

A timed event without `end` keeps the default 30-minute slot geometry but renders distinguishably from a real 30-minute event: a solid start edge in the event color sits exactly on the start time, and the card body drops to ~38 % fill opacity — the title stays fully opaque. Resize handles are suppressed (there is no `end` to grab). Month and Agenda render point events unchanged. The look matches the SwiftUI port; tune it via `--coar-calendar-point-edge-height` / `--coar-calendar-point-body-opacity` (see [Theming](/components/calendar/#theming)).

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
