<!-- Generated from apps/docs/components/calendar/day-view.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# `<CoarDayView>` — Day View (Preview)

**Devices:** desktop ready · tablet partial · phone planned — Taps, swipe paging and long-press selection work on touch; event resize handles are only 6 px tall.

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

## Days as rows (horizontal orientation)

> **Warning: Preview — new in 3.2**
>
> The horizontal orientation is new in 3.2 and still a Preview: the API may change before it loses this mark. It already runs in production apps; feedback is welcome.

`builder.timeGridOrientation('horizontal')` turns Day, Multi-day, Week and Work week by 90°: **one row per day, time running left → right** on one shared axis. It is a presentation knob like `dayMode` — the window, paging, `onRangeChange`, the loaders and every hook stay the same — and suits time tracking, shifts and attendance, where start, end and gaps of several days are compared at a glance.

```ts
builder
  .view('week')                       // or 'workWeek' / 'day'
  .timeGridOrientation('horizontal')  // default 'vertical'
  .timeRange({ startMinutes: 7 * 60, endMinutes: 19 * 60 })
  .pixelsPerHour(120);                // now along the horizontal axis

api.setTimeGridOrientation('vertical'); // two-way when bound to a Ref
```

```
            07:00   08:00   09:00   10:00   11:00   12:00
Mo., 19.  │ [ Entwicklung   ][Daily][ Entwicklung      ]
Di., 20.  │ [ Entwicklung   ][Daily][ Entwicklung      ]
          │                  [ Review ]                    ← second lane
Mi., 21.  │         [ Meeting    ]        [ Entwicklung ]
```

**Demo — `calendar/demos/WeekViewRows.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px">
    <div style="display: flex; gap: 8px; align-items: center">
      <CoarButton
        size="s"
        :variant="orientation === 'horizontal' ? 'primary' : 'secondary'"
        @click="orientation = 'horizontal'"
      >
        Days as rows
      </CoarButton>
      <CoarButton
        size="s"
        :variant="orientation === 'vertical' ? 'primary' : 'secondary'"
        @click="orientation = 'vertical'"
      >
        Days as columns
      </CoarButton>
      <span style="font-size: 12px; color: var(--coar-text-neutral-secondary)">{{ last }}</span>
    </div>
    <div
      style="
        height: 420px;
        border: 1px solid var(--coar-border-neutral-tertiary);
        border-radius: var(--coar-radius-xs);
        overflow: hidden;
      "
    >
      <CoarWeekView :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarWeekView,
  useWeekView,
  Temporal,
  type CalendarEvent,
  type CalendarTimeGridOrientation,
} from '@cocoar/vue-calendar';

const zone = 'Europe/Vienna';
const at = (date: string, time: string) => Temporal.ZonedDateTime.from(`${date}T${time}[${zone}]`);
const block = (
  id: string,
  date: string,
  from: string,
  to: string,
  title: string,
  color: string,
): CalendarEvent => ({
  id,
  start: at(date, from),
  end: at(date, to),
  meta: { title, color },
});

// A time-tracking week: start, end and gaps of every day at a glance.
const events = ref<CalendarEvent[]>([
  block('mo-1', '2026-04-13', '07:30', '09:30', 'Development', '#93c5fd'),
  block('mo-2', '2026-04-13', '09:30', '09:45', 'Daily', '#f59e0b'),
  block('mo-3', '2026-04-13', '09:45', '12:00', 'Development', '#93c5fd'),
  block('mo-4', '2026-04-13', '12:30', '16:00', 'Learning', '#10b981'),
  block('tu-1', '2026-04-14', '08:00', '09:30', 'Development', '#93c5fd'),
  block('tu-2', '2026-04-14', '09:30', '09:45', 'Daily', '#f59e0b'),
  block('tu-3', '2026-04-14', '09:45', '12:00', 'Development', '#93c5fd'),
  block('tu-4', '2026-04-14', '10:30', '11:30', 'Review', '#a78bfa'),
  block('tu-5', '2026-04-14', '13:00', '17:00', 'Backlog', '#f87171'),
  block('we-1', '2026-04-15', '08:30', '10:00', 'Meeting', '#38bdf8'),
  block('we-2', '2026-04-15', '10:30', '15:30', 'Development', '#93c5fd'),
  block('th-1', '2026-04-16', '07:00', '12:00', 'Support', '#fbbf24'),
  block('fr-1', '2026-04-17', '08:00', '12:30', 'Development', '#93c5fd'),
  {
    id: 'sat-off',
    start: Temporal.PlainDate.from('2026-04-18'),
    end: Temporal.PlainDate.from('2026-04-20'),
    meta: { title: 'Weekend trip', color: '#ec4899' },
  },
]);

const orientation = ref<CalendarTimeGridOrientation>('horizontal');
const last = ref('Drag a block onto another day, or its right edge to make it longer.');

const { builder } = useWeekView();
builder
  .events(events)
  .date(Temporal.PlainDate.from('2026-04-15'))
  .timezone(zone)
  .firstDayOfWeek(1)
  .timeGridOrientation(orientation)
  .timeRange({ startMinutes: 6 * 60, endMinutes: 19 * 60 })
  .pixelsPerHour(80)
  .slotDuration(15)
  .onTimeClick(({ date, time }) => {
    last.value = `onTimeClick: ${date} ${time.toString().slice(0, 5)}`;
  })
  .onEventDrop(({ event, next, target }) => {
    last.value = `onEventDrop: ${(event.meta as { title?: string }).title} → ${target.date}`;
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

- **Axis.** `pixelsPerHour` sets the horizontal density; a range narrower than the container is stretched to its width (a small value such as `30` always fills the width). The hour header sticks to the top, the day column to the left, and the grid scrolls on both axes inside its own scroller — give it a sized parent (inside `<CoarCalendar>` it fills the body). The end of the axis gets its hour label left of the line when the hour is wide enough, none otherwise — a stretched axis never overflows.
- **Day column.** `builder.dayLabelWidth(px)` sets its width (default 132, at least 48); the time axis gets the rest. A day without all-day chips gives the `#dayHeader` slot (or `dayHeaderRenderer`) the row's whole height, room for two lines such as weekday and day total; with chips the header keeps one 20 px line above them.
- **Overlaps** become lanes stacked downwards; a row grows with its lanes, nothing is covered. A timed event over midnight shows as one segment in each of its rows, as in the vertical grid.
- **All-day events** are chips in the day cell of every day they cover — click / double-click reach `onEventClick` / `onEventDoubleClick`; they are not draggable here.
- **Hooks** as in the vertical grid: `onTimeClick` / `onTimeDoubleClick` from a row's track (x → slot), `onDateClick` / `onDateDoubleClick` from the day cell, `onEventClick` / `onEventDoubleClick` / hover from the cards. Touch goes through the same tap gate.
- **Drag & drop**: move along the axis and onto another row (another day), resize at the left / right edge, `canDrop`, `dstPolicy` and the drop payload are unchanged. Keyboard: → / ← move by a slot, ↓ / ↑ by a day, Shift+→ / ← resize the end, Enter commits, Escape cancels.
- **No touch paging** in this orientation — a horizontal swipe scrolls the time axis. Page with the header buttons or `api.next()` / `api.prev()`.
- **Multi-day** shows `dayColumnCount` rows, at least 3 (the container width says nothing about how many rows fit).
- Custom renderers get `ctx.orientation === 'horizontal'` for these wide, short cards; the `#allDayEvent` slot is not used (chips).

Web only for now: the iOS and Android calendars draw the vertical grid.

## Touch paging

On touch devices a horizontal pan on the day columns moves the grid with the finger — header cells, all-day band and columns together, the hour axis stays put — and pages to the previous / next range on release past a quarter of the width or on a fast flick. Below that the grid settles back. A touch that never moves is a tap and reaches `onTimeClick` right after the click that follows the lift, so a swipe never starts with a stray slot click and an overlay the handler opens is not hit by that click. Vertical pans stay native scrolling. A mouse keeps its click-on-press semantics; a pen tap counts like a finger tap.

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
| `pixelsPerHour(p)` | `MaybeRefOrGetter<number>` | `60` | Density along the time axis. `60` = 30 px per 30-min slot. |
| `timeGridOrientation(o)` | `MaybeRefOrGetter<'vertical' \| 'horizontal'>` | `'vertical'` | Days as columns, or as rows on a horizontal time axis — see "Days as rows". |
| `dayLabelWidth(px)` | `MaybeRefOrGetter<number>` | `132` | Days as rows: width of the sticky day column. |
| `timeRangeSelect(b)` / `onTimeRangeSelect(fn)` | `MaybeRefOrGetter<boolean>` / handler | `false` | Select time ranges by dragging, clicking or a long press — see [Selecting time](./time-selection.md). |
| `hoverIndicator(b)`, `draft(d)`, `backgrounds(fn)` | — | off / `null` / — | Time under the mouse, a host draft above the events, per-day bands — same page. |
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
