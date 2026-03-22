# DateTime Picker

Combines a calendar date picker with a time input and returns a `Temporal.PlainDateTime` -- a date and time without any timezone attached. Use this when the timezone is implicit (the user's local time) or irrelevant (an alarm, a reminder). If you need timezone awareness, reach for the [Zoned DateTime Picker](/components/zoned-date-time-picker) instead.

```ts
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';
```

## Basic Usage

Select a date from the calendar, then adjust the time. The bound value is a `Temporal.PlainDateTime` you can format, compare, or serialize as needed.

<preview path="./date-time-picker/demos/BasicDateTimePicker.vue" />

## States

Supports `required`, `error`, `disabled`, and `readonly` -- the same set of states you will find on every Cocoar form control.

<preview path="./date-time-picker/demos/DateTimePickerStates.vue" />

## Sizes

Four sizes to match surrounding inputs and keep your forms visually balanced.

<preview path="./date-time-picker/demos/DateTimePickerSizes.vue" />

::: info
**PlainDateTime vs ZonedDateTime:** Choose `PlainDateTime` when the timezone is always the user's local time or when it simply does not matter (alarm clocks, recurring events). Choose `ZonedDateTime` when you need to pin a specific instant in time and derive UTC for storage or sharing across timezones.
:::

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus between date and time inputs |
| `Enter` | Open calendar / confirm selection |
| `Escape` | Close calendar dropdown |
| `Arrow Keys` | Navigate within the calendar |

### Screen Reader Support

- Label text announces on focus
- Date and time portions are independently accessible
- Required and error states announced
- Calendar navigation is keyboard accessible

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `Temporal.PlainDateTime \| null` | `null` | Selected date+time |
| `label` | `string` | `''` | Label text |
| `placeholder` | `string` | `''` | Placeholder text |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `disabled` | `boolean` | `false` | Disable the picker |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `string` | `''` | Error message |
