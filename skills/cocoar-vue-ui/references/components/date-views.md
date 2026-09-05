<!-- Generated from apps/docs/components/date-views.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Date Views (New in 2.0)

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

**Demo — `date-views/demos/BasicDateViews.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">CoarPlainDateView</div>
      <CoarPlainDateView :value="date" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">CoarPlainDateTimeView</div>
      <CoarPlainDateTimeView :value="dateTime" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">CoarZonedDateTimeView</div>
      <CoarZonedDateTimeView :value="zoned" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Empty value with placeholder</div>
      <CoarPlainDateView :value="null" placeholder="No date set" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarPlainDateView,
  CoarPlainDateTimeView,
  CoarZonedDateTimeView,
} from '@cocoar/vue-ui';

const date = Temporal.PlainDate.from('2026-05-12');
const dateTime = Temporal.PlainDateTime.from('2026-05-12T14:30:00');
const zoned = Temporal.ZonedDateTime.from('2026-05-12T14:30:00[Europe/Vienna]');
</script>
```

Pass a `Temporal` value via `:value`. `null` renders the placeholder text (empty string by default). Use anywhere you'd show a date without an editor — cards, dialogs, list rows, table cells. The `@cocoar/vue-data-grid` date columns wrap these viewers internally.

## Locale resolution

The display format reacts to the consumer-app locale via `useL10n()` — switching language at runtime updates the view automatically. Pass `:locale="..."` to override per-instance.

**Demo — `date-views/demos/DateViewsLocale.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; gap: 8px; align-items: center;">
      <span style="font-size: 13px; color: #64748b;">Locale:</span>
      <CoarSegmentedControl v-model="locale" :options="locales" size="s" />
    </div>
    <div style="display: grid; grid-template-columns: 200px 1fr; gap: 8px 16px; font-size: 14px;">
      <span style="color: #64748b;">PlainDate</span>
      <CoarPlainDateView :value="date" :locale="locale" />
      <span style="color: #64748b;">PlainDateTime (24h auto)</span>
      <CoarPlainDateTimeView :value="dateTime" :locale="locale" />
      <span style="color: #64748b;">ZonedDateTime</span>
      <CoarZonedDateTimeView :value="zoned" :locale="locale" />
    </div>
    <div style="font-size: 12px; color: #64748b;">
      The format pattern (DD.MM.YYYY vs MM/DD/YYYY) and the 12h/24h clock are both derived from the locale via <code>useDatePickerBase</code> — same resolution chain the editor pickers use.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarPlainDateView,
  CoarPlainDateTimeView,
  CoarZonedDateTimeView,
  CoarSegmentedControl,
} from '@cocoar/vue-ui';

const locale = ref('de-AT');
const locales = [
  { value: 'de-AT', label: 'de-AT' },
  { value: 'de-DE', label: 'de-DE' },
  { value: 'en-US', label: 'en-US' },
  { value: 'en-GB', label: 'en-GB' },
  { value: 'fr-FR', label: 'fr-FR' },
];

const date = Temporal.PlainDate.from('2026-05-12');
const dateTime = Temporal.PlainDateTime.from('2026-05-12T14:30:00');
const zoned = Temporal.ZonedDateTime.from('2026-05-12T14:30:00[Europe/Vienna]');
</script>
```

## Cross-zone projection

By default, each `CoarZonedDateTimeView` renders its value **in that value's own zone** — a Tokyo event shows Tokyo wallclock, a Vienna event shows Vienna wallclock. Pass `displayTimeZone="..."` to project every value into a single zone (useful for cross-zone coordination views like "show every team's meeting in my zone").

**Demo — `date-views/demos/DateViewsCrossZone.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
        Each row's value lives in its own zone — the view renders each in its own zone by default:
      </div>
      <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px 16px; font-size: 14px;">
        <span style="color: #64748b;">EU sync</span>
        <CoarZonedDateTimeView :value="eu" />
        <span style="color: #64748b;">US sync</span>
        <CoarZonedDateTimeView :value="us" />
        <span style="color: #64748b;">AP sync</span>
        <CoarZonedDateTimeView :value="ap" />
      </div>
    </div>
    <div>
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 13px; color: #64748b;">…or project everything into one zone via <code>displayTimeZone</code>:</span>
        <CoarSegmentedControl v-model="projectInto" :options="zones" size="s" />
      </div>
      <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px 16px; font-size: 14px;">
        <span style="color: #64748b;">EU sync</span>
        <CoarZonedDateTimeView :value="eu" :display-time-zone="projectInto" />
        <span style="color: #64748b;">US sync</span>
        <CoarZonedDateTimeView :value="us" :display-time-zone="projectInto" />
        <span style="color: #64748b;">AP sync</span>
        <CoarZonedDateTimeView :value="ap" :display-time-zone="projectInto" />
      </div>
    </div>
    <div style="font-size: 12px; color: #64748b;">
      All three values point at the same wallclock-in-its-own-zone (10:00 / 15:00 / 09:00), but the underlying instants differ. Projecting into one zone shows the comparable wallclock for that observer.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarZonedDateTimeView, CoarSegmentedControl } from '@cocoar/vue-ui';

const eu = Temporal.ZonedDateTime.from('2026-05-13T10:00:00[Europe/Vienna]');
const us = Temporal.ZonedDateTime.from('2026-05-13T15:00:00[America/New_York]');
const ap = Temporal.ZonedDateTime.from('2026-05-14T09:00:00[Asia/Tokyo]');

const projectInto = ref('Europe/Vienna');
const zones = [
  { value: 'Europe/Vienna',    label: 'Vienna' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'Asia/Tokyo',       label: 'Tokyo' },
];
</script>
```

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
