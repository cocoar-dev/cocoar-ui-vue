---
description: "CoarWorkWeekView — week view filtered to a configurable working-day set (default Mon-Fri), supporting 6-day, 4-day and Sun-Thu weeks on the same time grid"
---

# `<CoarWorkWeekView>` — Work Week View <Badge type="warning" text="Preview" />

The week view with weekend columns filtered out. Configurable working-day set via `builder.workDays(...)` — defaults to Mon–Fri but adapts to 6-day operations (Mon–Sat), 4-day weeks (Mon–Thu), Sun–Thu Middle-East work weeks, or any other DayOfWeek subset.

Mechanically the work-week view is a preset of the one time-grid model shared with [`<CoarDayView>`](/components/calendar/day-view#one-model-for-every-time-grid) and [`<CoarWeekView>`](/components/calendar/week-view): anchor `weekStart`, span 7, filter `workDays`, step 7. Same time-grid, same DnD pipeline, same slot rendering, same all-day band, same touch paging. The visible-range `ViewWindow` stays the full Mon–Sun span — only the columns rendered differ. Loaders see weekend events the same way they do for the full week.

```html
<CoarWorkWeekView :builder="builder" />
```

## Standalone usage

```ts
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarWorkWeekView,
  useWorkWeekView,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[Europe/Vienna]'),
    end:   Temporal.ZonedDateTime.from('2026-04-15T09:30:00[Europe/Vienna]'),
  },
]);
const date = ref('2026-04-15');

const { builder } = useWorkWeekView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .firstDayOfWeek(1)            // Monday — overrides locale default
  .workDays([1, 2, 3, 4, 5]);   // Mon–Fri (default — shown for clarity)
```

```html
<CoarWorkWeekView :builder="builder" />
```

## Working-day conventions

`workDays(d)` accepts any subset of `0..6` (`0` = Sunday, `6` = Saturday). The order in the array doesn't matter — internally it's used as a Set. The rendered columns appear in calendar order, anchored to `firstDayOfWeek`.

```ts
builder.workDays([1, 2, 3, 4, 5]);        // Mon–Fri (default)
builder.workDays([1, 2, 3, 4, 5, 6]);     // Mon–Sat (retail / hospitality)
builder.workDays([1, 2, 3, 4]);           // Mon–Thu (4-day week experiments)
builder.workDays([0, 1, 2, 3, 4]);        // Sun–Thu (Middle East, parts of South Asia)
```

::: tip Reactive `workDays`
`workDays(d)` accepts `MaybeRefOrGetter`, so a `ref<DayOfWeek[]>` flips the rendered columns live. Useful for "show Saturday too" toggles in operations dashboards without a full reload.
:::

## Window vs render set

`builder.api.getVisibleRange()` for the work-week view returns the **full Mon–Sun span**, not the filtered weekday subset. Two reasons:

- **`eventsLoader(window)` and `seriesLoader(window)`** should fetch weekend events too. Consumers may want to keep them in the database, filter them in the data layer, or rely purely on the view to suppress weekend columns; the loader doesn't need to know the column set.
- **`api.getVisibleEvents()`** returns events that touch any day in the full span, including weekends. A Saturday client demo still shows up in the event list (e.g. for "what did we work on this week?" summaries), just not as a rendered pill in the grid.

If your use case needs the rendered-columns date set, call `workWeekDates(cursor, firstDayOfWeek, workDays)` from `@cocoar/vue-calendar` directly.

## Navigation

`prev()` / `next()` step by 7 days, same as the [Week view](/components/calendar/week-view) — *not* by the count of working days. Stepping by 5 days would leave the cursor on a weekend on alternate clicks, breaking the "this week / next week" mental model. The workday filter is a render concern, not a navigation one.

## Inside `<CoarCalendar>`

When `<CoarCalendar>` is active and the user clicks the "Work week" view-switcher button, the shell mounts `<CoarWorkWeekView>` and the same builder feeds it — view-specific settings (`timeRange`, `slotDuration`, `pixelsPerHour`) apply identically to Week and WorkWeek.

```ts
const { builder } = useCalendar();
builder
  .timeRange({ startMinutes: 8 * 60, endMinutes: 18 * 60 })
  .workDays([1, 2, 3, 4, 5]);
```

The shell's default `availableViews` includes `'workWeek'`, so the view-switcher gets a "Work week" button automatically. Hide it by setting your own list:

```ts
builder.availableViews(['month', 'week', 'day', 'agenda']);
```

## `useWorkWeekView<TMeta>()`

```ts
function useWorkWeekView<TMeta>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
};
```

Returns a fresh standalone builder + its imperative api. Pre-sets `view: 'workWeek'` and `availableViews: ['workWeek']` so the standalone view doesn't render an inactive view-switcher.

## Builder setters

Full reference: see [the composer's API reference](/components/calendar/coar-calendar#api-reference). Highlights specific to the work-week view:

| Setter | Argument | Default | Notes |
|---|---|---|---|
| `workDays(d)` | `MaybeRefOrGetter<readonly DayOfWeek[]>` | `[1, 2, 3, 4, 5]` | `0` = Sunday … `6` = Saturday. Empty array renders zero columns. |
| `firstDayOfWeek(d)` | `0..6 \| undefined` | locale-aware | Affects the underlying week's anchor; the workDays filter is applied on top. |
| `timeRange(r)` | `MaybeRefOrGetter<{ startMinutes, endMinutes }>` | `{0, 1440}` | Visible hour range, in minutes from midnight. |
| `slotDuration(d)` | `MaybeRefOrGetter<number>` | `30` | Slot subdivision (minutes). Also the snap step when dragging. |
| `pixelsPerHour(p)` | `MaybeRefOrGetter<number>` | `60` | Vertical density. |
| `dayHeaderRenderer(r)` | `DayHeaderRenderer` | — | Per-day column header — same slot as Week. |
| `eventRenderer(r)` | `EventRenderer<TMeta>` | — | Universal renderer. Same `ctx.layout?.kind` discriminator as Week (`'positioned'` for time-grid events, `'allDayBar'` for the all-day band). |

## `workWeekDates(date, firstDayOfWeek, workDays)`

Pure helper exported from `@cocoar/vue-calendar`. Returns the subset of `weekDates(date, firstDayOfWeek)` whose day-of-week is in `workDays`, in calendar order.

```ts
import { workWeekDates, Temporal } from '@cocoar/vue-calendar';

const dates = workWeekDates(
  Temporal.PlainDate.from('2026-06-10'),
  1,                                          // Monday-first
  [1, 2, 3, 4, 5],                            // Mon–Fri
);
// → [2026-06-08, 2026-06-09, 2026-06-10, 2026-06-11, 2026-06-12]
```

## Imperative API

Same surface as the Week view — see [`<CoarWeekView>` Imperative API](/components/calendar/week-view#imperative-api). `next()` / `prev()` step by 7 days; `getVisibleRange()` returns the full Mon–Sun window.

## `<CoarWorkWeekView>` props + slots

| Prop | Type | Description |
|---|---|---|
| `builder` | `CalendarBuilder` | **Required.** From `useWorkWeekView()` (or share the one from `useCalendar()`). |

| Slot | Scope | Purpose |
|---|---|---|
| `event` | `{ event, layout }` | Per-event renderer. `layout` is the `PositionedEvent` (lane / startMinutes / endMinutes / clipping flags). |
| `allDayEvent` | `{ event, layout }` | All-day band renderer. `layout` is the `AllDayBar`. |
| `dayHeader` | `{ date, isToday, isWeekend }` | Per-day column header. `isWeekend` is true for Sat/Sun columns *even if hidden by `workDays`* — useful for custom renderers that compute their own styling. |
