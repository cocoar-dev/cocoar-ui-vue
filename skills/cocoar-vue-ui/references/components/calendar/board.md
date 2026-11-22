<!-- Generated from apps/docs/components/calendar/board.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# `<CoarCalendarBoard>` — Board (Preview)

**Devices:** desktop ready · tablet ready · phone partial — The grid works on touch; on a phone seven columns are narrow, so a week usually reads better as rows of days.

A board is a grid of day cells with bars running across them. Its **rows** decide what it shows, so the same component draws a week by morning, afternoon and evening, a week with one row per resource, and a year wall planner. What a row means stays with your app.

**Demo — `calendar/demos/BoardWeek.vue`**

```vue
<template>
  <div style="border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarCalendarBoard :builder="builder" :rows="rows">
      <template #rowLabel="{ row }">{{ labels[row.key] }}</template>
      <template #cell="{ row, date }">
        <span v-if="row.key === 'meals'" style="color: var(--coar-text-subtle)">{{ meals[date.dayOfWeek - 1] }}</span>
      </template>
    </CoarCalendarBoard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  BOARD_ALL_DAY_ROW,
  CoarCalendarBoard,
  Temporal,
  useCalendar,
  weekBoardRows,
  type BoardRowsContext,
  type CalendarEvent,
  type CalendarPeriod,
} from '@cocoar/vue-calendar';

const periods: CalendarPeriod[] = [
  { key: 'morning', startMinutes: 0, endMinutes: 12 * 60 },
  { key: 'afternoon', startMinutes: 12 * 60, endMinutes: 18 * 60 },
  { key: 'evening', startMinutes: 18 * 60, endMinutes: 24 * 60 },
];
const labels: Record<string, string> = {
  [BOARD_ALL_DAY_ROW]: 'All day',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  meals: 'Dinner',
};
const meals = ['Soup', 'Pasta', 'Curry', 'Tacos', 'Fish', 'Pizza', 'Roast'];

const zdt = (iso: string) => Temporal.ZonedDateTime.from(`${iso}[Europe/Vienna]`);
const events = ref<CalendarEvent[]>([
  { id: 'camp', start: Temporal.PlainDate.from('2026-11-17'), end: Temporal.PlainDate.from('2026-11-20'), meta: { title: 'Project week', color: '#7c3aed' } },
  { id: 'dentist', start: zdt('2026-11-16T09:00'), end: zdt('2026-11-16T10:00'), meta: { title: 'Dentist', color: '#0891b2' } },
  { id: 'training', start: zdt('2026-11-19T15:30'), end: zdt('2026-11-19T17:00'), meta: { title: 'Training', color: '#2f855a' } },
  { id: 'parents', start: zdt('2026-11-19T19:00'), end: zdt('2026-11-19T20:30'), meta: { title: 'Parents evening', color: '#c05621' } },
  { id: 'hike', start: zdt('2026-11-22T10:00'), end: zdt('2026-11-22T15:00'), meta: { title: 'Hike', color: '#2563eb' } },
]);

const { builder } = useCalendar();
builder
  .view('week')
  .date(Temporal.PlainDate.from('2026-11-19'))
  .timezone('Europe/Vienna')
  .locale('en-GB')
  .firstDayOfWeek(1)
  .events(events);

const rows = (context: BoardRowsContext) =>
  weekBoardRows({ dates: context.dates, periods, timezone: context.timezone, extraRows: ['meals'] });
</script>
```

## A week by parts of the day

```vue
<script setup lang="ts">
import { CoarCalendarBoard, useCalendar, weekBoardRows, type BoardRowsContext } from '@cocoar/vue-calendar';

const { builder } = useCalendar();
const periods = [
  { key: 'morning', startMinutes: 0, endMinutes: 12 * 60 },
  { key: 'afternoon', startMinutes: 12 * 60, endMinutes: 18 * 60 },
  { key: 'evening', startMinutes: 18 * 60, endMinutes: 24 * 60 },
];
const rows = (context: BoardRowsContext) =>
  weekBoardRows({ dates: context.dates, periods, timezone: context.timezone, extraRows: ['meals'] });
</script>

<template>
  <CoarCalendarBoard :builder="builder" :rows="rows">
    <template #rowLabel="{ row }">{{ row.key }}</template>
    <template #cell="{ row, date }">
      <MealOfTheDay v-if="row.key === 'meals'" :date="date" />
    </template>
  </CoarCalendarBoard>
</template>
```

A timed event stands in the period it **starts** in. All-day and multi-day events run as bars in the all-day row (`BOARD_ALL_DAY_ROW`). A timed event outside every period goes to the next one, so it is never lost.

## A week per resource

```ts
const rows = (context: BoardRowsContext) =>
  resourceWeekRows({
    dates: context.dates,
    resources: ['emma', 'jonas'],
    resourcesOf: (event) => event.meta.personIds,
    extraRows: ['allFree'],
  });
```

A shared event stands in the row of each of its resources. Events of no listed resource get the row `BOARD_UNASSIGNED_ROW`, which appears only when there are any. For "who is free", use [`computeOccupancy`](./coar-calendar.md#occupancy).

## A year wall planner

Twelve rows of 31 columns keep holidays readable as continuous bands, which twelve small month grids would tear apart.

```vue
<CoarCalendarBoard
  :builder="builder"
  range="year"
  :columns="yearWallColumns()"
  :rows="(context) => yearWallRows({ year: context.year, locale: 'de-AT' })"
>
  <template #cell="{ events }">
    <span v-if="events.length" class="dot" />
  </template>
</CoarCalendarBoard>
```

Multi-day events run as bands through each month and show their title where it fits. Single-day events are not drawn; they reach the `#cell` slot, so you decide what a dot means. A month's missing days stay as empty cells.

## Moving, selecting, paging

Dragging an event runs through the same drop pipeline as the other views: `onEventDrop`, `canDrop` and the DST policy apply. On another day the event keeps its time. In another part of the day it starts where that part starts, or at the period's `dropMinutes`, which you want for a morning that begins at 00:00. The duration always stays.

The payload's `target.rowKey` and `target.sourceRowKey` say which rows were involved, and `canDrop` gets `rowKey`. What a change of row means, such as another person, is for your `onEventDrop` to apply.

With `selectable`, dragging across the days of a row emits `rangeSelect` with `{ rowKey, start, end, native }`, both days inclusive. A mouse selects at once, a touch after a long press. A horizontal swipe turns the page unless `swipeNavigation(false)` is set.

## Your own rows

A row is plain data, so you can build any set:

```ts
interface BoardRow<TMeta> {
  key: string;
  dates: (Temporal.PlainDate | null)[]; // one per column, null = no day here
  kind: 'cells' | 'bars' | 'custom';
  match?: (event: CalendarEvent<TMeta>) => boolean;
  hideWhenEmpty?: boolean;
  period?: CalendarPeriod; // a drop onto this row starts in this period
  label?: string; // default: key
  class?: string; // extra class, to set tokens for this row
  showCellEvents?: boolean; // false: single-day events only reach #cell
}
```

`cells` puts single-day events into their cell and runs multi-day events as bars. `bars` runs every event as a bar. `custom` shows no events and leaves the cells to the `#cell` slot.

## Props and slots

| Prop | Type | Description |
|---|---|---|
| `builder` | `CalendarBuilder` | **Required.** Events, cursor, zone, locale and the click handlers. |
| `rows` | `BoardRow[] \| (context) => BoardRow[]` | **Required.** The function form gets the visible `dates`, `year` and `timezone`. |
| `range` | `'week' \| 'year'` | The window to load and page. Default `week`. |
| `columns` | `{ key, label }[]` | Column headers. Default: the dates of the first row. |
| `selectable` | `boolean` | Drag across days to select them. Default `false`. |
| `fill` | `boolean` | Take the parent's height; rows of cells share what the others leave. Default `false`. |
| `hideHeader` | `boolean` | Leave out the column headers, for rows that name their own day. Default `false`. |

| Event | Payload | Description |
|---|---|---|
| `rangeSelect` | `{ rowKey, start, end, native }` | Days selected in one row, both inclusive. |

| Slot | Scope | Purpose |
|---|---|---|
| `rowLabel` | `{ row }` | The label at the start of a row. |
| `columnHeader` | `{ date, column, index, isToday }` | A column header. |
| `event` | `{ event, row, date }` | An event in a cell. |
| `bar` | `{ event, row, bar }` | A bar. |
| `cell` | `{ row, date, events, isToday, isPast }` | All of a `custom` cell, or content above the events of the others. |

## Styling tokens

| Token | Default |
|---|---|
| `--coar-calendar-board-label-width` | `88px` |
| `--coar-calendar-board-label-padding` | `8px` |
| `--coar-calendar-board-column-min-width` | `0` |
| `--coar-calendar-board-cell-min-height` | `48px` |
| `--coar-calendar-board-cell-padding` | `3px` |
| `--coar-calendar-board-bar-row-min-height` | `8px` |
| `--coar-calendar-board-cell-gap` / `-cell-bg` / `-cell-today-bg` | `2px` / none / today's tint |
| `--coar-calendar-board-line` / `-row-line` | the calendar border |
| `--coar-calendar-board-header-bg` / `-today-bg` / `-padding` / `-line` | none / same / weekday padding / the line |
| `--coar-calendar-board-header-direction` / `-align` / `-justify` | `column` / `center` / `flex-start` |
| `--coar-calendar-board-label-font-size` / `-font-weight` / `-color` / `-letter-spacing` / `-transform` / `-align` | caption role, `stretch` |
| `--coar-calendar-board-bar-margin` / `-padding` / `-radius` / `-font-size` / `-font-weight` / `-gap` | `0` / event padding / pill radius / inherited / inherited / `2px` |
| `--coar-calendar-board-bars-padding` | `2px 0` |
| `--coar-calendar-board-row-gap` / `-column-gap` | `0` |

Events use the event tokens of the [month view](./month-view.md#styling-tokens).
