---
description: "CoarTextInput — text field with validation states, prefix/suffix decorations, clearable option, four sizes and multiline textarea mode"
devices: { desktop: ready, tablet: ready, phone: partial }
devicesNote: "Mobile sizes under .coar-mobile; the mobile presentation is still Preview."
---

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

## Prefix & Suffix Actions <Badge type="warning" text="Preview" /> {#actions}

`#prefixAction` and `#suffixAction` hold interactive content at the outer edges of the field, such as an inline
select for the protocol of a web address. Unlike `#prefix` and `#suffix`, which show muted text, an action keeps the
text style of the field. An inline select there runs to the edge: its fill on hover reaches the border and follows
the field's corner. Both slots get `{ disabled, readonly }` of the field, so the action can follow its state.

<preview path="./text-input/demos/TextInputActions.vue" />

An action is a field of its own: a select in it does not take the label, hint or error of the surrounding
`CoarFormField`, so give it its own name with `aria-label`.

## Clear Button

When `clearable` is enabled, a small X button appears on hover or focus so users can quickly reset the field. It's **off by default** — set `clearable` to opt in.

<preview path="./text-input/demos/TextInputClearable.vue" />

## Sizes

Four sizes let you match the input to its surroundings -- compact toolbars, standard forms, or spacious layouts.

<preview path="./text-input/demos/TextInputSizes.vue" />

## Multiline (Textarea)

Set `rows` to 2 or more and the input switches to a textarea, perfect for descriptions, notes, or any free-form content.

<preview path="./text-input/demos/TextInputMultiline.vue" />

## Inline <Badge type="warning" text="Preview" /> {#inline}

`appearance="inline"` lets a field sit in a sentence or a table row without looking like a form. At rest only the
value shows; hovering fills the box lightly to show what a click activates, and while the field is edited the fill
is stronger. Size, padding, radius and font stay those of the outlined field, so the value does not move when the
field is focused. An error keeps its red border, and disabled and readonly look as usual. Only the box itself
reacts to a click: the free space next to it activates nothing.

`width="content"` makes a single-line field as wide as its value (or its placeholder when it is empty) plus its
prefix, suffix and clear button, at most the available width. A multiline field keeps the full width.

<preview path="./text-input/demos/TextInputInline.vue" />

The same props work on [Number Input](/components/number-input#inline), [Select](/components/select#inline),
[Date Picker](/components/date-picker#inline) and the other date pickers. Together they make a property list
that is edited where it is read:

<preview path="./text-input/demos/InlineProperties.vue" />

The two fills are the theme roles `--coar-surface-input-inline-hover` and `--coar-surface-input-inline-active`,
which the Theme Editor lists as "Inline field, hover" and "Inline field, editing". By default they mix the text
colour into transparency, so they show on any surface, also on a hovered row and in dark mode. Where a background
needs other values, set the roles on its container:

```css
.my-editor {
  --coar-surface-input-inline-hover: rgb(0 0 0 / 8%);
  --coar-surface-input-inline-active: rgb(0 0 0 / 14%);
}
```

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
| `appearance` <Badge type="warning" text="Preview" /> | `'outline' \| 'inline'` | `'outline'` | `inline`: no border or surface until hovered or edited, see [Inline](#inline) |
| `width` <Badge type="warning" text="Preview" /> | `'fill' \| 'content'` | `'fill'` | `content`: as wide as the value or placeholder (single line only) |
| `clearable` | `boolean` | `false` | Show clear button when input has value |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |
| `disabled` | `boolean` | `false` | Disable the input |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | HTML required attribute |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `prefix` | — | Muted content before the value, after a prefix action |
| `suffix` | — | Muted content after the value |
| `prefixAction` <Badge type="warning" text="Preview" /> | `{ disabled: boolean, readonly: boolean }` | Interactive content at the start edge, see [Actions](#actions) |
| `suffixAction` | `{ disabled: boolean, readonly: boolean }` | Interactive content at the end edge, see [Actions](#actions) |

::: tip
Label, hint, and error are provided by [`CoarFormField`](/components/form-field). Wrap inputs in a `CoarFormField` to add these features.
:::

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.textInput.clear` | `'Clear'` | Clear button `aria-label` |
