---
description: 'CoarMarkdownForm renders a fixed Markdown template with registered fill controls, separate typed values, validation and readonly output.'
---

# Markdown Form

`CoarMarkdownForm` turns a Markdown string into a form-like document. Headings,
labels, lists and explanatory text stay fixed; only explicit field directives
can be changed. Field values live in a separate object and never rewrite the
template.

The package currently renders and fills an existing template. It does not yet
contain a visual template designer. Templates can be constants in the app,
separate `.md` assets, or strings loaded from an API or database.

## Smallest complete example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarMarkdownForm, type MarkdownFormValues } from '@cocoar/vue-markdown-form';
import '@cocoar/vue-markdown-form/styles';

const template = `# Meeting protocol

**Name:** :field{id=name type=text layout=row width=fill required placeholder="Full name"}

**Date:** :field{id=date type=date required}

## Summary

:::field{id=summary type=markdown required placeholder="What was discussed?"}
`;

const values = ref<MarkdownFormValues>({
  name: '',
  date: '',
  summary: '',
});
</script>

<template>
  <CoarMarkdownForm v-model:values="values" :template="template" mode="fill" />
</template>
```

The template and values are deliberately independent:

```ts
// The reusable, fixed document structure
const template = '# Protocol\n\n**Name:** :field{id=name type=text}';

// The data belonging to one filled document
const values = { name: 'Ada Lovelace' };
```

## Copyable protocol template

This example uses every built-in field type and can be copied directly into a
JavaScript or TypeScript template string:

```md
# Gesprächsprotokoll

**Name:** :field{id=personName type=text layout=row width=fill required placeholder="Vor- und Nachname"}

**Datum:** :field{id=meetingDate type=datetime width=14.5rem required placeholder="Datum und Uhrzeit"}  
**Rolle:** :field{id=role type=select width=large options="po:Product Owner|dev:Developer|design:Design" placeholder="Rolle"}  
**Dauer:** :field{id=durationMinutes type=number width=10rem min=15 max=240 step=15 suffix="Min."}

**Thema:** :field{id=topic type=text layout=stacked width=full required placeholder="Thema des Gesprächs"}

**Freigegeben:** :field{id=approved type=boolean trueLabel="Ja" falseLabel="Nein"}

## Zusammenfassung

:::field{id=summary type=markdown label="Gesprächszusammenfassung" required placeholder="Was wurde besprochen?"}

## Nächste Schritte

:::field{id=actions type=markdown label="Vereinbarte Schritte" placeholder="- [ ] Aufgabe ergänzen …"}
```

Its initial values object can look like this:

```ts
const values = ref<MarkdownFormValues>({
  personName: '',
  meetingDate: '',
  role: null,
  durationMinutes: null,
  topic: '',
  approved: false,
  summary: '',
  actions: '',
});
```

## Field syntax

### Inline field

Use `:field{...}` for a short control inside a normal Markdown paragraph:

```md
**Duration:** :field{id=duration type=number min=15 step=15 suffix="min"}
```

The directive can appear next to ordinary Markdown, including bold labels.
Attribute values containing spaces must be quoted.

### Block field

Use `:::field{...}` on its own line for a Markdown editor:

```md
## Decisions

:::field{id=decisions type=markdown required placeholder="Add decisions …"}
```

A block field is a single directive line. It has no closing `:::` marker and no
editable content inside the template. Its content comes from
`values.decisions`.

The legacy POC spelling `:::markdown-field{id=decisions}` remains readable, but
new templates should use `:::field{type=markdown ...}`.

### Attribute rules

- Attributes are separated by whitespace.
- Quote values containing whitespace: `placeholder="Full name"`.
- Flags do not need a value: `required` is the same as `required=true`.
- `required=false`, `required=0`, `required=no` and `required=off` disable the
  flag.
- IDs must be present and unique within a template. Prefer stable identifiers
  such as `personName`; changing an ID also changes the key in `values`.
- An escaped `\:field{...}` is rendered as ordinary Markdown text instead of a
  field directive.

## Common attributes

| Attribute     | Values / default                                 | Description                                                                         |
| ------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `id`          | required                                         | Stable, unique key in the values object.                                            |
| `type`        | registered type; default `text`                  | Selects the field control.                                                          |
| `label`       | string                                           | Accessible name and validation label. Visible labels can remain normal Markdown.    |
| `required`    | boolean flag; default `false`                    | Enables validation. For a boolean field this means that it must be checked.         |
| `placeholder` | string                                           | Hint shown while the control is empty.                                              |
| `layout`      | `inline`, `row`, `stacked`, `block`              | Arranges the field and its surrounding Markdown paragraph.                          |
| `width`       | `small`, `medium`, `large`, `fill`, `full`, unit | Named, flexible, or fixed width. Fixed widths accept bounded `ch` and `rem` values. |

`small`, `medium` and `large` default to `10ch`, `18ch` and `32ch`. Apps can
replace those values through the typed context.

## Layout cookbook

### Keep a small value in the text flow

```md
**Age:** :field{id=age type=number width=small}
```

`layout=inline` is the default for `:field`. It behaves like an inline part of
the paragraph.

### Label on the left, field uses the remaining row

```md
**Full name:** :field{id=fullName type=text layout=row width=fill}
```

`layout=row` turns the paragraph into a label/value row. For predictable
results, use one `row` field per paragraph.

### Label above a full-width field

```md
**Topic:** :field{id=topic type=text layout=stacked width=full}
```

`layout=stacked` places the Markdown text above the control. `width=full` makes
the field use the complete row.

### Markdown editor below a fixed heading

```md
## Notes

:::field{id=notes type=markdown placeholder="Add notes …"}
```

`markdown` supports block layout only. The heading remains part of the fixed
template even when the Markdown value is completely empty.

## Built-in field reference

| Type       | Stored value                         | Default empty value | Control                               |
| ---------- | ------------------------------------ | ------------------- | ------------------------------------- |
| `text`     | `string`                             | `''`                | `CoarTextInput`                       |
| `number`   | `number \| null`                     | `null`              | `CoarNumberInput`                     |
| `date`     | `YYYY-MM-DD` string                  | `''`                | `CoarPlainDatePicker`                 |
| `datetime` | `YYYY-MM-DDTHH:mm` local-time string | `''`                | `CoarPlainDateTimePicker`             |
| `boolean`  | `boolean`                            | `false`             | `CoarCheckbox`                        |
| `select`   | `string \| null`                     | `null`              | `CoarSelect`                          |
| `markdown` | Markdown string                      | `''`                | `CoarMarkdownEditor` / `CoarMarkdown` |

### `text`

```md
:field{id=email type=text inputType=email maxLength=120 placeholder="name@example.com"}
```

| Attribute          | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `inputType`        | `text`, `email`, `url`, `tel` or `search`; default `text`. |
| `rows`             | Text rows. Values greater than `1` render a text area.     |
| `minLength`        | Minimum length used by form validation.                    |
| `maxLength`        | Maximum length used by the control and form validation.    |
| `minLengthMessage` | Optional custom validation message.                        |
| `maxLengthMessage` | Optional custom validation message.                        |

For formatted long text, prefer `type=markdown` instead of `rows`.

### `number`

```md
:field{id=duration type=number min=15 max=240 step=15 decimals=0 suffix="Min."}
```

| Attribute       | Description                                     |
| --------------- | ----------------------------------------------- |
| `min`           | Minimum accepted value.                         |
| `max`           | Maximum accepted value.                         |
| `step`          | Stepper increment; default `1`.                 |
| `decimals`      | Displayed decimal places; default `0`.          |
| `suffix`        | Display suffix, for example `kg` or `Min.`.     |
| `numberMessage` | Message for a value that is not a valid number. |
| `minMessage`    | Optional custom minimum validation message.     |
| `maxMessage`    | Optional custom maximum validation message.     |

### `date`

```md
:field{id=birthday type=date min=1900-01-01 max=2030-12-31}
```

`min` and `max` use ISO dates (`YYYY-MM-DD`). The stored value is also an ISO
date string; readonly mode formats it using `context.locale`.

### `datetime`

```md
:field{id=startsAt type=datetime minuteStep=15 min="2026-01-01T08:00" max="2026-12-31T18:00"}
```

`min` and `max` use local ISO date-times. `minuteStep` accepts `1`, `5`, `10` or
`15` and defaults to `15`. The value intentionally has no timezone because the
control stores a local date and time.

### `boolean`

```md
:field{id=approved type=boolean trueLabel="Approved" falseLabel="Not approved"}
```

`trueLabel` and `falseLabel` control readonly output. A `required` boolean is
valid only when its value is `true`.

### `select`

```md
:field{id=role type=select options="po:Product Owner|dev:Developer|design:Design" placeholder="Select a role"}
```

Options are `value:label` entries separated by `|`. The stored value is the
part before the colon (`po`, `dev` or `design` in this example). Escape literal
separators as `\|` and label colons as `\:`. `optionMessage` overrides the
validation message for a value not present in the option list.

### `markdown`

```md
:::field{id=summary type=markdown required placeholder="Write a summary …"}
```

Markdown fields must use the block syntax. Fill mode renders a
`CoarMarkdownEditor`; readonly mode renders the saved value through
`CoarMarkdown`.

## Shared Markdown toolbar

Markdown block fields use `toolbar-mode="external"`. Wrap the form and one
toolbar in `CoarMarkdownEditorGroup`; the toolbar automatically targets the
focused Markdown field and stays disabled when no Markdown field is active.

```vue
<script setup lang="ts">
import { CoarMarkdownEditorGroup, CoarMarkdownToolbar } from '@cocoar/vue-markdown-editor';
import { CoarMarkdownForm } from '@cocoar/vue-markdown-form';
</script>

<template>
  <CoarMarkdownEditorGroup>
    <CoarMarkdownToolbar position="top" />
    <CoarMarkdownForm v-model:values="values" :template="template" />
  </CoarMarkdownEditorGroup>
</template>
```

The toolbar is optional. Without a group and external toolbar, Markdown values
can still be typed, but formatting commands are not shown.

## Fill and readonly modes

```vue
<CoarMarkdownForm
  v-model:values="values"
  :template="template"
  :mode="editing ? 'fill' : 'readonly'"
/>
```

- `fill` renders registered controls and allows only field values to change.
- `readonly` formats the values as a finished document. No field is editable.
- Fixed Markdown is never editable in either mode.

## Validation

Validation is always calculated, while `show-errors` controls its visual
presentation. The component emits `validation` and exposes `validate()`.

```vue
<CoarMarkdownForm
  ref="form"
  v-model:values="values"
  :template="template"
  :show-errors="submitted"
  @validation="validation = $event"
/>
```

Template analysis reports missing IDs, duplicate IDs, unknown types and layouts
unsupported by their registered type. Built-ins validate required values;
`text`, `number` and `select` additionally validate their type-specific
constraints.

```ts
interface MarkdownFormValidationResult {
  valid: boolean;
  errors: Readonly<Record<string, string>>;
  issues: readonly MarkdownFormTemplateIssue[];
}
```

`errors` are instance-value errors keyed by field ID. `issues` are structural
problems in the template itself.

## Typed context

`context` controls presentation without coupling field controls to a specific
app. Nested properties are merged with package defaults.

```ts
const context = {
  design: 'coar',
  locale: 'de-AT',
  widths: {
    small: '10ch',
    medium: '20ch',
    large: '36ch',
  },
  decorations: {
    markdownFrame: true,
    inlineUnderline: false,
  },
};
```

`design` is either `coar` or `basic`. Readonly decorations affect only
`mode="readonly"`; fill mode always keeps the Markdown editor frame visible.
The context can also replace validation messages and the tools available to
Markdown fields.

## Custom field controls

`fields` merges additively over the built-in registry. A field definition owns
the fill control, value semantics, supported layouts, validation and optional
readonly rendering.

```ts
import type { MarkdownFormFieldRegistry } from '@cocoar/vue-markdown-form';
import RatingControl from './RatingControl.vue';

const fields: MarkdownFormFieldRegistry = {
  rating: {
    control: RatingControl,
    valueType: 'number',
    layouts: ['inline', 'row'],
    defaultValue: () => null,
    isEmpty: (value) => value == null,
  },
};
```

```vue
<CoarMarkdownForm :fields="fields" :template="template" v-model:values="values" />
```

The matching template syntax is then:

```md
**Rating:** :field{id=rating type=rating}
```

A control receives `field`, `modelValue`, the resolved typed `context`, and an
optional `error`; it writes through `update:modelValue`. This is deliberately
separate from Markdown's `EmbedDefinition.editor`: embed editors rewrite
directive attributes in Markdown, while form controls update the external
values object.

## Props and events

| API                        | Type                        | Description                                                 |
| -------------------------- | --------------------------- | ----------------------------------------------------------- |
| `template`                 | `string`                    | Fixed Markdown template.                                    |
| `values` / `update:values` | `MarkdownFormValues`        | Separate typed instance values.                             |
| `mode`                     | `'fill' \| 'readonly'`      | Interactive controls or formatted output.                   |
| `fields`                   | `MarkdownFormFieldRegistry` | Consumer field registrations/overrides.                     |
| `context`                  | `MarkdownFormContextInput`  | Typed presentation context.                                 |
| `embeds`                   | `EmbedRegistry`             | Additional ordinary block embeds in fixed template content. |
| `showErrors`               | `boolean`                   | Show current validation messages.                           |
| `validation`               | event                       | Reactive `MarkdownFormValidationResult`.                    |

## Template checklist

Before shipping a template:

1. Give every field a stable, unique `id`.
2. Initialize every field key in the instance values object with its documented
   empty value.
3. Use `:field{...}` for inline controls and `:::field{type=markdown ...}` for
   Markdown blocks.
4. Quote attribute values containing whitespace.
5. Use `layout=row width=fill` when a control should take the rest of a label
   row.
6. Use `layout=stacked width=full` when the label should sit above a full-width
   control.
7. Run `validate()` or handle the `validation` event before saving.
