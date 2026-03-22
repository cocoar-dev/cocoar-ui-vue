# Radio Group

When users must pick exactly one option from a small set of mutually exclusive choices, a radio group is the right tool. Each option is visible at a glance, unlike a select dropdown, which makes radios ideal when the list is short (roughly 2--5 items).

```ts
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';
```

## Horizontal (Default)

The default horizontal layout keeps options side by side -- works best when labels are short and there are only a few choices.

<preview path="./radio-group/demos/RadioGroupHorizontal.vue" />

## Vertical

Switch to `orientation="vertical"` when labels are longer or you have more options. The stacked layout is easier to scan.

<preview path="./radio-group/demos/RadioGroupVertical.vue" />

## States

Mark the group as `required` to show an asterisk, and pass an `error` string to display validation feedback.

<preview path="./radio-group/demos/RadioGroupStates.vue" />

## Disabled Buttons

Individual `CoarRadioButton` options can be disabled while the rest of the group stays interactive -- useful for temporarily unavailable plans or tiers.

<preview path="./radio-group/demos/RadioGroupDisabled.vue" />

## Sizes

Three sizes that stay in step with every other Cocoar form control.

<preview path="./radio-group/demos/RadioGroupSizes.vue" />

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus into / out of radio group |
| `Arrow Left` / `Arrow Up` | Select previous option |
| `Arrow Right` / `Arrow Down` | Select next option |
| `Space` | Select focused option |

::: info
Only one radio button in a group receives tab focus. Arrow keys move selection between options within the group.
:::

### Screen Reader Support

- Group label announced when entering the group
- Each option's label announces on focus
- Selected state properly communicated
- Disabled options announced as unavailable

## API

### CoarRadioGroup Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `unknown` | `undefined` | Currently selected value |
| `label` | `string` | `''` | Group label |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `size` | `'s' \| 'm' \| 'l'` | `'m'` | Radio button size |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `string` | `''` | Error message |

### CoarRadioButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `unknown` | -- | Value emitted when selected |
| `disabled` | `boolean` | `false` | Disable this option |
