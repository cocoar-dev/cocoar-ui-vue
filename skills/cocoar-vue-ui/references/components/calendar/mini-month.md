<!-- Generated from apps/docs/components/calendar/mini-month.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# `<CoarMiniMonth>` — Mini Month (Preview)

**Devices:** desktop ready · tablet ready · phone ready

A small month for picking a day, for example in a sidebar next to the calendar. It needs no builder, leafs through months on its own and follows `v-model` when that moves to another month. It always shows six rows, so nothing below it jumps.

**Demo — `calendar/demos/MiniMonthBasic.vue`**

```vue
<template>
  <CoarMiniMonth v-model="day" locale="en-GB" :first-day-of-week="1" />
  <p>Selected: {{ day }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMiniMonth, Temporal } from '@cocoar/vue-calendar';

const day = ref(Temporal.PlainDate.from('2026-11-19'));
</script>
```

```vue
<CoarMiniMonth v-model="day" />
```

To drive a calendar with it, pass the day to `api.goTo(day)`.

## Props, events and slots

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `Temporal.PlainDate \| null` | `null` | The selected day. |
| `locale` | `string` | the app's localization | Month and weekday names. |
| `firstDayOfWeek` | `0..6` | from the locale | `0` = Sunday. |
| `timezone` | `string` | the system's | Decides which day is today. |
| `highlightWeek` | `boolean` | `true` | Tints the week of the selected day. |

| Event | Payload | Description |
|---|---|---|
| `update:modelValue` | `Temporal.PlainDate` | A day was picked. |

| Slot | Scope | Purpose |
|---|---|---|
| `day` | `{ date, isToday, isSelected, isOtherMonth }` | The content of a day, for example with a mark. |
| `title` | `{ month, label }` | The heading. `month` is a `Temporal.PlainYearMonth`, `label` the month and year in the locale. |

The arrow keys move between days and `Page Up` / `Page Down` between months.

| Token | Default | Sets |
|---|---|---|
| `--coar-calendar-mini-month-day-size` | `26px` | The size of a day. |
| `--coar-calendar-mini-month-max-width` | `280px` | The width of the month. |
| `--coar-calendar-mini-month-day-font-size` | inherited | The type size of the days. |
| `--coar-calendar-mini-month-weekday-font-size` | inherited | The type size of the weekdays. |
| `--coar-calendar-mini-month-weekday-font-weight` | inherited | The weight of the weekdays. |
| `--coar-calendar-mini-month-week-radius` | `0` | The corners of each day in the highlighted week. |
