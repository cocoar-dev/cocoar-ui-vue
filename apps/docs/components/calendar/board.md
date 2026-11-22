---
description: "CoarCalendarBoard — rows of day cells with bars running across: a week by parts of the day, a week per resource, a year wall planner"
devices: { desktop: ready, tablet: ready, phone: partial }
devicesNote: "The grid works on touch; on a phone seven columns are narrow, so a week usually reads better as rows of days."
---

# `<CoarCalendarBoard>` — Board <Badge type="warning" text="Preview" />

A board is a grid of day cells with bars running across them. Its **rows** decide what it shows, so the same component draws a week by morning, afternoon and evening, a week with one row per resource, and a year wall planner. What a row means stays with your app.

<preview path="./demos/BoardWeek.vue" />

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

A shared event stands in the row of each of its resources. Events of no listed resource get the row `BOARD_UNASSIGNED_ROW`, which appears only when there are any. For "who is free", use [`computeOccupancy`](/components/calendar/coar-calendar#occupancy).

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

Events use the event tokens of the [month view](/components/calendar/month-view#styling-tokens).
