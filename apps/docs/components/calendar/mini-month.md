---
description: "CoarMiniMonth — a small month for picking a day, with its own paging, week highlight and keyboard navigation, without a builder"
devices: { desktop: ready, tablet: ready, phone: ready }
---

# `<CoarMiniMonth>` — Mini Month <Badge type="warning" text="Preview" />

A small month for picking a day, for example in a sidebar next to the calendar. It needs no builder, leafs through months on its own and follows `v-model` when that moves to another month. It always shows six rows, so nothing below it jumps.

<preview path="./demos/MiniMonthBasic.vue" />

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

The arrow keys move between days and `Page Up` / `Page Down` between months. `--coar-calendar-mini-month-day-size` (`26px`) and `--coar-calendar-mini-month-max-width` (`280px`) set its size.
