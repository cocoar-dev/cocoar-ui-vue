---
description: "CoarRadioGroup and CoarRadioButton — single-choice selection with horizontal or vertical layout, four sizes, label positioning, keyboard navigation and form-field integration"
---

# Radio Group

When users must pick exactly one option from a small set of mutually exclusive choices, a radio group is the right tool. Each option is visible at a glance, unlike a select dropdown, which makes radios ideal when the list is short (roughly 2--5 items).

```ts
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';
```

## Horizontal

Switch to `orientation="horizontal"` when labels are short and there are only a few choices.

<preview path="./radio-group/demos/RadioGroupHorizontal.vue" />

## Vertical (Default)

The default vertical layout stacks options for easy scanning -- works well with longer labels or more than 4 choices.

<preview path="./radio-group/demos/RadioGroupVertical.vue" />

## States

Mark the group as `required` to show an asterisk. Wrap in `CoarFormField` to display validation messages.

<preview path="./radio-group/demos/RadioGroupStates.vue" />

## Label Position

Place the label text before or after the radio control with the `labelPosition` prop on the group. All radio buttons inherit the setting.

<preview path="./radio-group/demos/RadioGroupLabelPosition.vue" />

## Disabled Buttons

Individual `CoarRadioButton` options can be disabled while the rest of the group stays interactive -- useful for temporarily unavailable plans or tiers.

<preview path="./radio-group/demos/RadioGroupDisabled.vue" />

## Sizes

Four sizes that stay in step with every other Cocoar form control.

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
| `name` | `string` | — | **Required.** HTML name for the radio inputs |
| `label` | `string` | `''` | Group accessible label |
| `orientation` | `'horizontal' \| 'vertical'` | `'vertical'` | Layout direction |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Radio button size |
| `labelPosition` | `'before' \| 'after'` | `'after'` | Label position for all radio buttons |
| `disabled` | `boolean` | `false` | Disable all radio buttons |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |

### CoarRadioButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `unknown` | -- | Value emitted when selected |
| `disabled` | `boolean` | `false` | Disable this option |
