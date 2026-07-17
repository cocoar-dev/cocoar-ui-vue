---
description: "CoarPlainDateView, CoarPlainDateTimeView and CoarZonedDateTimeView — read-only, locale-aware displays for Temporal date values with cross-zone projection."
---

# Date Views <Badge type="tip" text="New in 2.0" />

The read-only display siblings of the picker family. When you have a `Temporal.PlainDate` / `Temporal.PlainDateTime` / `Temporal.ZonedDateTime` value and just want to show it (no editor, no panel) — use these.

```ts
import {
  CoarPlainDateView,
  CoarPlainDateTimeView,
  CoarZonedDateTimeView,
} from '@cocoar/vue-ui';
```

| | Value type | Renders |
|--|--|--|
| **`CoarPlainDateView`** | `Temporal.PlainDate \| null` | `12.05.2026` (locale-resolved format) |
| **`CoarPlainDateTimeView`** | `Temporal.PlainDateTime \| null` | `12.05.2026 14:30` (locale + 12h/24h auto) |
| **`CoarZonedDateTimeView`** | `Temporal.ZonedDateTime \| null` | `12.05.2026 14:30 GMT+2` (+ short zone label) |

Each view mirrors its picker's `formatValue` logic exactly — same `useDatePickerBase` for locale + date-format resolution, same `coarFormatPlainDate` + `coarFormatTime` helpers. A read-only display and the editor's resting state look identical.

## Basic Usage

<preview path="./date-views/demos/BasicDateViews.vue" />

Pass a `Temporal` value via `:value`. `null` renders the placeholder text (empty string by default). Use anywhere you'd show a date without an editor — cards, dialogs, list rows, table cells. The `@cocoar/vue-data-grid` date columns wrap these viewers internally.

## Locale resolution

The display format reacts to the consumer-app locale via `useL10n()` — switching language at runtime updates the view automatically. Pass `:locale="..."` to override per-instance.

<preview path="./date-views/demos/DateViewsLocale.vue" />

## Cross-zone projection

By default, each `CoarZonedDateTimeView` renders its value **in that value's own zone** — a Tokyo event shows Tokyo wallclock, a Vienna event shows Vienna wallclock. Pass `displayTimeZone="..."` to project every value into a single zone (useful for cross-zone coordination views like "show every team's meeting in my zone").

<preview path="./date-views/demos/DateViewsCrossZone.vue" />

Use `:show-time-zone="false"` to hide the trailing zone label entirely (compact contexts where the zone is already clear from surrounding UI).

## Cross-realm safety

All three views check the value's type via `Symbol.toStringTag` (matched against `"Temporal.PlainDate"` etc.), not `instanceof Temporal.X`. Why this matters: under pnpm's isolated dependency tree, two packages can resolve different physical copies of `@js-temporal/polyfill` — a `Temporal.PlainDate` instance constructed against one copy fails `instanceof Temporal.PlainDate` checked against another copy. The `Symbol.toStringTag` is part of the Temporal spec and identical across copies (and would be identical against the native `Temporal` once browsers ship it), so the views render correctly no matter which package created the value.

Non-matching values (e.g. an ISO string, a `Date`, or a `PlainDateTime` passed into a `CoarPlainDateView`) render as the placeholder. Convert at your data layer — the views are strict by design.

## API

### `CoarPlainDateView`

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `Temporal.PlainDate \| null` | `null` | The value to display |
| `locale` | `string` | _consumer locale_ | BCP-47 tag override |
| `dateFormat` | `DateFormatConfig` | _resolved_ | Format pattern override |
| `placeholder` | `string` | `''` | Shown when value is null / wrong type |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Font-size token |

### `CoarPlainDateTimeView`

Same as `CoarPlainDateView` plus:

| Prop | Type | Default | Description |
|---|---|---|---|
| `use24Hour` | `boolean \| 'auto'` | `'auto'` | 12h/24h clock; `'auto'` derives from locale |

### `CoarZonedDateTimeView`

Same as `CoarPlainDateTimeView` plus:

| Prop | Type | Default | Description |
|---|---|---|---|
| `displayTimeZone` | `string` | _value's own zone_ | IANA zone to project every value into |
| `showTimeZone` | `boolean` | `true` | Append the `GMT+1`-style zone label |
