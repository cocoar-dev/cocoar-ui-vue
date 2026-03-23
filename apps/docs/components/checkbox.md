# Checkbox

Checkboxes let users pick one or more options from a list, or flip a single boolean on or off. Reach for a checkbox when the choice does not take effect until the user explicitly submits -- for instant toggles, consider a [Switch](/components/switch) instead.

```ts
import { CoarCheckbox } from '@cocoar/vue-ui';
```

## Basic Usage

Bind a boolean with `v-model` and provide a `label`. That is all you need for a working checkbox.

<preview path="./checkbox/demos/BasicCheckbox.vue" />

## States

Checkboxes support `required`, `disabled`, and `error` states, giving you full control over form validation flows.

<preview path="./checkbox/demos/CheckboxStates.vue" />

## Indeterminate

The indeterminate state shows a dash instead of a checkmark -- handy for "select all" controls where only some children are checked.

<preview path="./checkbox/demos/CheckboxIndeterminate.vue" />

## Sizes

Four sizes to match different information densities, from compact data tables to spacious settings pages.

<preview path="./checkbox/demos/CheckboxSizes.vue" />

## Hint Text

Wrap in `CoarFormField` with a `hint` prop to give users extra context without cluttering the label itself.

<preview path="./checkbox/demos/CheckboxHint.vue" />

## Without Label

For table rows or tight custom layouts you can omit the visible label -- just make sure to pass an `aria-label` so the checkbox remains accessible.

<preview path="./checkbox/demos/CheckboxWithoutLabel.vue" />

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to checkbox |
| `Space` | Toggle checked state |

::: info
The indeterminate state is visual only. Clicking an indeterminate checkbox toggles it to checked. Always provide `aria-label` when no visible label is used.
:::

### Screen Reader Support

- Label text or `aria-label` announces on focus
- Checked / unchecked state communicated
- Required and error states announced
- Hint text accessible via `aria-describedby`

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `boolean` | `false` | Checked state |
| `label` | `string` | `''` | Label text |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Checkbox size |
| `indeterminate` | `boolean` | `false` | Show indeterminate (dash) state |
| `disabled` | `boolean` | `false` | Disable the checkbox |
| `required` | `boolean` | `false` | Mark as required |
