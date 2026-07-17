---
description: "CoarDataGrid date columns — col.plainDate/plainDateTime/zonedDateTime render Temporal values locale-aware and edit via the matching Cocoar date-time picker."
---

# Date Columns <Badge type="tip" text="New in 2.0" />

Three Temporal-typed column shortcuts for date / date-time / zoned-date-time cells. All three follow the same pattern: a renderer that formats locale-aware via `toLocaleString`, an editor that wraps the matching `<CoarPlainDatePicker>` / `<CoarPlainDateTimePicker>` / `<CoarZonedDateTimePicker>` component.

| | Cell value | Renderer format | Editor |
|--|--|--|--|
| **`col.plainDate()`** | `Temporal.PlainDate \| null` | `15. Mai 2026` (date-style: medium) | `CoarPlainDatePicker` |
| **`col.plainDateTime()`** | `Temporal.PlainDateTime \| null` | `15. Mai 2026, 14:30` (date-style: medium + time-style: short) | `CoarPlainDateTimePicker` |
| **`col.zonedDateTime()`** | `Temporal.ZonedDateTime \| null` | `15. Mai 2026, 14:30 GMT+2` (+ short zone-name suffix) | `CoarZonedDateTimePicker` |

```ts
import { CoarGridBuilder } from '@cocoar/vue-data-grid';
import { Temporal } from '@js-temporal/polyfill';

CoarGridBuilder.create<Task>().columns([
  (col) => col.plainDate('startsOn', d => d.highlightWeekends())
              .editable(true),

  (col) => col.plainDateTime('reminderAt')
              .editable(true),

  (col) => col.zonedDateTime('eventAt', d => d.timeZone('Europe/Vienna'))
              .editable(true),
])
```

::: info Temporal-only contract
All three column shortcuts require the cell value to be the matching `Temporal` type (or `null`). ISO strings, native `Date`, floating `Temporal.PlainDateTime` in a `zonedDateTime` column — all rejected: the renderer shows empty, the editor falls back to `null`. Convert at the data layer (typically in the row mapper that turns API responses into grid rows). This matches `@cocoar/vue-calendar`'s Temporal-only contract — when a row's date round-trips between the grid and the calendar, both sides agree on the type.

The legacy `col.date(field, config?)` shortcut (display-only, accepts `Date | string`) is unchanged for back-compat with existing consumer columns.
:::

## Edit-mode flow

| Action | Result |
|--------|--------|
| Double-click cell (or Enter / F2) | Opens the editor and focuses the picker's trigger. The picker handles its own open / navigate / select keystrokes. |
| Click outside / Tab / Enter (after selection) | AG Grid commits via `getValue()` — `Temporal.PlainDate` / `PlainDateTime` / `ZonedDateTime` (or `null` if cleared). |
| Escape | Cancels (no commit). |

Focus-preservation (capture-phase `mousedown` listener that `preventDefault`s on `.coar-overlay-host` targets) prevents AG Grid from committing prematurely while the user navigates the body-teleported picker panel.

## `col.plainDate(field, configurator?)`

<preview path="./demos/GridPlainDate.vue" />

| Configurator method | Type | Description |
|---|---|---|
| `.size(value)` | `'xs' \| 's' \| 'm' \| 'l'` | Trigger size (default: `'s'`) |
| `.clearable(value?)` | `boolean = true` | Show a clear button inside the picker (default: `true`) |
| `.min(value)` | `Temporal.PlainDate \| null` | Minimum selectable date |
| `.max(value)` | `Temporal.PlainDate \| null` | Maximum selectable date |
| `.showWeekNumbers(value?)` | `boolean = true` | Show ISO week numbers in the calendar panel |
| `.highlightWeekends(value?)` | `boolean = true` | Visually highlight Saturday + Sunday |
| `.markers(value)` | `CoarDateMarker[] \| (row) => CoarDateMarker[]` | Date markers (dot / ring / underline) |
| `.locale(value)` | `string` | Locale override (defaults to consumer-app locale via `useL10n()`) |

## `col.plainDateTime(field, configurator?)`

<preview path="./demos/GridPlainDateTime.vue" />

Same configurator surface as `col.plainDate()`, but `min` / `max` accept `Temporal.PlainDateTime`.

Use this when the time-of-day matters but the event has no fixed zone (calendar-local reminders, scheduled-locally tasks). For cross-zone events, use `col.zonedDateTime()`.

## `col.zonedDateTime(field, configurator?)`

<preview path="./demos/GridZonedDateTime.vue" />

| Configurator method | Type | Description |
|---|---|---|
| `.size(value)` | `'xs' \| 's' \| 'm' \| 'l'` | Trigger size (default: `'s'`) |
| `.clearable(value?)` | `boolean = true` | Show a clear button inside the picker (default: `true`) |
| `.min(value)` | `Temporal.ZonedDateTime \| null` | Minimum selectable instant |
| `.max(value)` | `Temporal.ZonedDateTime \| null` | Maximum selectable instant |
| `.showWeekNumbers(value?)` | `boolean = true` | Show ISO week numbers |
| `.highlightWeekends(value?)` | `boolean = true` | Highlight Saturday + Sunday |
| `.markers(value)` | `CoarDateMarker[] \| (row) => CoarDateMarker[]` | Date markers |
| `.locale(value)` | `string` | Locale override |
| `.timeZone(value)` | `string` | **Default IANA zone** for newly-created values (cell was empty before the edit). Existing values keep their own zone. |
| `.timezoneFilter(value)` | `string[]` | Wildcard filter patterns for the zone selector (e.g. `['Europe/*', 'America/*']`) |
| `.displayTimeZone(value)` | `string` | **Renderer-only.** Project every row's instant into this zone for display (e.g. `'Europe/Vienna'` to render every event in Vienna time for cross-zone coordination views). When omitted, each row renders in its own value's zone. |

The renderer formats each cell in its own zone — a row whose value lives in `America/New_York` displays the New York wallclock + a `GMT-5` (or `GMT-4` in summer) suffix, regardless of the user's browser zone. Cross-zone columns stay unambiguous at a glance.

## Row-aware markers

`markers` accepts a function for per-row decorations — useful when the calendar should highlight different dates depending on the row:

```ts
col.plainDate('startsOn', d =>
  d.markers(row => [
    { date: row.deadline, variant: 'underline', color: 'var(--coar-color-warning-bold)' },
  ])
).editable(true)
```

## Layered overrides

Same escape-hatches as the other column shortcuts:

```ts
col.plainDate('startsOn', d => d.size('s'))
   .editable(true)
   .cellEditorConfig(MyCustomDateEditor, { /* ... */ })
```
