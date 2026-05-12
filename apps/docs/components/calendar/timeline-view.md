# `<CoarTimelineView>` — Timeline View <Badge type="warning" text="Preview" />

Gantt-lite layout: **one row per logical event**, horizontal time-axis. The left pane lists event titles; the right pane renders bars positioned by `[start, end)` against the visible window. Same `CalendarEvent` data as Day / Week / Month / Agenda — just rendered as a project-plan timeline instead of a calendar grid.

**Recurring series collapse to one row.** All occurrences of a recurring series (those with `meta.__recurrence.seriesId`) share a single row with one bar per occurrence — a weekly stand-up with 26 instances in the visible window renders as ONE row labelled "Standup ×26", not 26 separate rows. Standalone events (no recurrence metadata) keep one row per event. The grouping is automatic; consumer code doesn't need to do anything.

```html
<CoarTimelineView :builder="builder" />
```

::: tip Gantt-lite vs. full Gantt
This view covers the **timeline-of-events** half of project planning: bars on a time-axis, sorted, with window-clamping and continues-indicators. It does **not** yet include the rest of a full Gantt: task hierarchy (parent / sub-task collapse), dependencies (arrows between bars), critical-path computation, milestones, or resource lanes. Those land in a separate `@cocoar/vue-gantt` package later, building on this view's primitives.
:::

## Standalone usage

```ts
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarTimelineView,
  useTimelineView,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const events = ref<CalendarEvent[]>([
  {
    id: 'design',
    start: Temporal.PlainDate.from('2026-06-01'),
    end:   Temporal.PlainDate.from('2026-06-08'),
    meta: { title: 'Design phase', color: '#4f46e5' },
  },
  {
    id: 'build',
    start: Temporal.PlainDate.from('2026-06-08'),
    end:   Temporal.PlainDate.from('2026-06-22'),
    meta: { title: 'Build phase', color: '#06b6d4' },
  },
  {
    id: 'demo',
    start: Temporal.ZonedDateTime.from('2026-06-22T14:00:00[Europe/Vienna]'),
    end:   Temporal.ZonedDateTime.from('2026-06-22T15:30:00[Europe/Vienna]'),
    meta: { title: 'Client demo', color: '#f59e0b' },
  },
]);
const date = ref('2026-06-01');

const { builder } = useTimelineView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .timelineRangeDays(45)
  .timelinePixelsPerDay(40);
```

```html
<CoarTimelineView :builder="builder" />
```

## How bars are positioned

Each logical event becomes one row, sorted by its FIRST bar's `start` ascending (group id ascending as tie-break — `meta.__recurrence.seriesId` for recurring events, `event.id` for standalone). The bar's geometry comes from:

- **Left** = `(event.start − windowStart) days × pixelsPerDay`. Cross-zone timed events project into the calendar's `timezone` (display zone) before their date is taken, so a meeting scheduled at 23:00 Tokyo viewed from Vienna still lands on the correct visual day (~16:00 Vienna).
- **Width** = duration in days × `pixelsPerDay`. All-day events use their `[start, end)` date range; timed events use `start..end` projected into the display zone; missing `end` defaults to start + 30 min (same fallback as the other views).
- **Top** = row index × `rowHeight`.

Single-day all-day events get a one-day-wide bar (not zero). Multi-day all-day events span their full range. Timed events that fall entirely within one day in the display zone also get a one-day bar — sub-day precision is intentionally not in this view (use Day / Week for hour-grained scheduling).

## Window clamping

The visible window is `[cursor, cursor + timelineRangeDays)`. Events that fall outside are filtered out entirely; events that **straddle** the window get a `clippedStart` or `clippedEnd` flag on their row + a squared-off bar edge (no rounded corner on the clipped side). Renderers can use the flags to overlay a "continues" chevron.

```ts
// In a custom #bar slot:
<template #bar="{ event, row }">
  <span v-if="row.clippedStart">←</span>
  <span>{{ event.meta?.title }}</span>
  <span v-if="row.clippedEnd">→</span>
</template>
```

## Panning

Click-and-drag anywhere on the timeline (empty grid cells, the date axis, label column, or row whitespace — anything that isn't an interactive child like an event bar) to pan both axes at once. The cursor switches to `grab` over empty areas and to `grabbing` during the active pan. Pointer-capture keeps the pan alive even when the cursor leaves the timeline element (e.g. drags up into the page chrome).

Bar clicks are NOT hijacked — clicking an event bar still fires `onEventClick`. The pan handler walks up from `e.target` to check for `button` / `a` / `input` / `select` / `textarea` / `role="button"` and exits early when it finds one. Custom slots that render their own interactive elements inherit this behavior automatically.

Touch panning uses the same pointer pipeline (`touch-action: none` on the container), so finger-drag on tablets feels identical to mouse-drag on desktop.

## Sizing the view

Three knobs control the visual density:

| Setter | Default | Effect |
|---|---|---|
| `timelineRangeDays(n)` | `60` | How many days the view spans starting from `cursor`. `next()` / `prev()` step by this much. |
| `timelinePixelsPerDay(p)` | `56` | Horizontal density. `24` = quarter overview, `56` = month (date labels readable on one line), `96` = sprint detail. |
| `timelineRowHeight(h)` | `32` | Vertical row height — pick to match your bar content + density theme. |
| `timelineLabelWidth(w)` | `200` | Left-pane label-column width. |

```ts
// Quarter overview: 90 days, narrow bars
builder.timelineRangeDays(90).timelinePixelsPerDay(16);

// Sprint detail: 14 days, wide bars
builder.timelineRangeDays(14).timelinePixelsPerDay(64);
```

## Slots

`<CoarTimelineView>` exposes three slots for custom rendering — all optional, with sensible plain-text defaults:

| Slot | Scope | Default |
|---|---|---|
| `label` | `{ row, event }` | `meta.title ?? id` of `row.bars[0].event` + occurrence-count badge (e.g. `×26`) when `row.isRecurring`. |
| `bar` | `{ row, bar, event }` | `meta.title` over a `meta.color`-tinted bar. Fires once per bar (N times for recurring rows). |
| `dateHeader` | `{ date, isToday, isWeekend }` | `Intl.DateTimeFormat` "MMM d" in the header axis. |

The `row` payload is a `TimelineRow` with `{ id, top, height, isRecurring, bars[] }`. Each `bar` is a `TimelineBar` with `{ event, left, width, clippedStart, clippedEnd }`. The `event` prop on the `bar` slot is a convenience alias for `bar.event`. For a recurring row, the `label` slot sees `row.bars[0].event` — the first occurrence in the window, which carries the series-level meta (title, color).

## Inside `<CoarCalendar>`

The view-switcher includes a "Timeline" button by default. Same builder feeds the embedded `<CoarTimelineView>`; the timeline-specific setters (`timelineRangeDays` etc.) live on the shared builder and are no-ops outside the timeline view, same convention as `timeRange` for day/week.

```ts
const { builder } = useCalendar();
builder
  .timelineRangeDays(90)
  .timelinePixelsPerDay(24);
```

## `useTimelineView<TMeta>()`

```ts
function useTimelineView<TMeta>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
};
```

Returns a fresh standalone builder + its imperative api. Pre-sets `view: 'timeline'` and `availableViews: ['timeline']` so the standalone view doesn't render an inactive view-switcher.

## Builder setters (timeline-specific)

| Setter | Argument | Default | Notes |
|---|---|---|---|
| `timelineRangeDays(n)` | `MaybeRefOrGetter<number>` | `60` | Days the view spans starting from the cursor. Also the `next()` / `prev()` step. |
| `timelinePixelsPerDay(p)` | `MaybeRefOrGetter<number>` | `56` | Horizontal density. |
| `timelineRowHeight(h)` | `MaybeRefOrGetter<number>` | `32` | Per-event row height in pixels. |
| `timelineLabelWidth(w)` | `MaybeRefOrGetter<number>` | `200` | Left-pane label-column width. |
| `eventRenderer(r)` | `EventRenderer<TMeta>` | — | Universal renderer — fires for timeline bars too (no per-layout discriminator here yet — use the dedicated `#bar` slot if you need the `row` geometry). |

Universal setters (`events`, `eventsLoader`, `series`, `seriesLoader`, `recurrenceEngine`, `timezone`, `locale`, …) work identically to the other views.

## `layoutTimeline(events, options)`

Pure layout helper exported from `@cocoar/vue-calendar`. Returns the same row geometry the view uses internally — useful for custom timeline implementations or tests:

```ts
import { layoutTimeline, Temporal } from '@cocoar/vue-calendar';

const { rows, totalWidth, totalHeight } = layoutTimeline(events, {
  windowStart: Temporal.PlainDate.from('2026-06-01'),
  windowEnd:   Temporal.PlainDate.from('2026-08-01'),
  pixelsPerDay: 56,
  rowHeight: 32,
  displayZone: 'Europe/Vienna',
});

for (const row of rows) {
  // row: { id, top, height, isRecurring, bars[] }
  for (const bar of row.bars) {
    // bar: { event, left, width, clippedStart, clippedEnd }
  }
}
```

## Imperative API

Same surface as the other views — see [`<CoarWeekView>` Imperative API](/components/calendar/week-view#imperative-api). `next()` / `prev()` step by `timelineRangeDays`; `getVisibleRange()` returns the `[cursor, cursor + timelineRangeDays)` window.

## `<CoarTimelineView>` props

| Prop | Type | Description |
|---|---|---|
| `builder` | `CalendarBuilder` | **Required.** From `useTimelineView()` (or share the one from `useCalendar()`). |
