# Text Input

The go-to component for collecting short text from users -- names, emails, search queries, and more. It handles labels, validation, prefix/suffix decorations, and can even stretch into a textarea when you need longer content.

```ts
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';
```

## Basic Usage

Wire up a text input with `v-model` and wrap it in a `CoarFormField` to add a label, placeholder, and optional hint to guide the user.

<preview path="./text-input/demos/BasicTextInput.vue" />

## Validation States

Add `required` to both `CoarFormField` (for the asterisk) and the input (for the HTML attribute). Pass an `error` string to `CoarFormField` to surface validation feedback beneath the input.

<preview path="./text-input/demos/TextInputValidation.vue" />

## Disabled & Readonly

Use `disabled` when the field should be completely non-interactive, and `readonly` when users should be able to see and copy the value but not change it.

<preview path="./text-input/demos/TextInputDisabledReadonly.vue" />

## Prefix & Suffix

Prefix and suffix slots help users understand the expected format -- think currency symbols, units, or domain names.

<preview path="./text-input/demos/TextInputPrefixSuffix.vue" />

## Clear Button

When `clearable` is enabled (the default), a small X button appears on hover or focus so users can quickly reset the field.

<preview path="./text-input/demos/TextInputClearable.vue" />

## Sizes

Four sizes let you match the input to its surroundings -- compact toolbars, standard forms, or spacious layouts.

<preview path="./text-input/demos/TextInputSizes.vue" />

## Multiline (Textarea)

Set `rows` to 2 or more and the input switches to a textarea, perfect for descriptions, notes, or any free-form content.

<preview path="./text-input/demos/TextInputMultiline.vue" />

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to input |
| `Shift + Tab` | Move focus backward |
| `Escape` | Clear input (when clearable) |

::: info
Labels are automatically associated with their inputs. The required asterisk is announced by screen readers.
:::

### Screen Reader Support

- Label text announces on focus
- Required state properly communicated
- Error messages are linked via `aria-describedby`
- Hint text is accessible to assistive technology

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `string` | `''` | Current input value (two-way binding) |
| `placeholder` | `string` | `''` | Placeholder text when empty |
| `prefix` | `string` | `''` | Prefix text before the input |
| `suffix` | `string` | `''` | Suffix text after the input |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `rows` | `number` | `1` | Rows >= 2 enables textarea mode |
| `clearable` | `boolean` | `true` | Show clear button when input has value |
| `disabled` | `boolean` | `false` | Disable the input |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | HTML required attribute |

::: tip
Label, hint, and error are provided by [`CoarFormField`](/components/form-field). Wrap inputs in a `CoarFormField` to add these features.
:::
