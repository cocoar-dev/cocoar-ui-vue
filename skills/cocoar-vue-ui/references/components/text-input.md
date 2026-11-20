<!-- Generated from apps/docs/components/text-input.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Text Input

**Devices:** desktop ready · tablet ready · phone partial — Mobile sizes under .coar-mobile; the mobile presentation is still Preview.

The go-to component for collecting short text from users -- names, emails, search queries, and more. It handles labels, validation, prefix/suffix decorations, and can even stretch into a textarea when you need longer content.

```ts
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';
```

## Basic Usage

Wire up a text input with `v-model` and wrap it in a `CoarFormField` to add a label, placeholder, and optional hint to guide the user.

**Demo — `text-input/demos/BasicTextInput.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Username" hint="Choose a unique username">
      <CoarTextInput
        v-model="value"
        placeholder="Enter your username"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Value: {{ value || 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const value = ref('');
</script>
```

## Validation States

Add `required` to both `CoarFormField` (for the asterisk) and the input (for the HTML attribute). Pass an `error` string to `CoarFormField` to surface validation feedback beneath the input.

**Demo — `text-input/demos/TextInputValidation.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Email" hint="Required field" required>
      <CoarTextInput
        v-model="email"
        placeholder="your@email.com"
        :required="true"
      />
    </CoarFormField>
    <CoarFormField label="Email" error="Please enter a valid email address">
      <CoarTextInput
        value="invalid-email"
      />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const email = ref('');
</script>
```

## Disabled & Readonly

Use `disabled` when the field should be completely non-interactive, and `readonly` when users should be able to see and copy the value but not change it.

**Demo — `text-input/demos/TextInputDisabledReadonly.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Disabled">
      <CoarTextInput value="Cannot edit" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarTextInput value="View only" :readonly="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Prefix & Suffix

Prefix and suffix slots help users understand the expected format -- think currency symbols, units, or domain names.

**Demo — `text-input/demos/TextInputPrefixSuffix.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Website">
      <CoarTextInput v-model="website" placeholder="example.com" prefix="https://" />
    </CoarFormField>
    <CoarFormField label="Price">
      <CoarTextInput v-model="price" placeholder="0.00" suffix="EUR" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const website = ref('');
const price = ref('');
</script>
```

## Prefix & Suffix Actions (Preview) {#actions}

`#prefixAction` and `#suffixAction` hold interactive content at the outer edges of the field, such as an inline
select for the protocol of a web address. Unlike `#prefix` and `#suffix`, which show muted text, an action keeps the
text style of the field. An inline select there runs to the edge: its fill on hover reaches the border and follows
the field's corner. Both slots get `{ disabled, readonly }` of the field, so the action can follow its state.

**Demo — `text-input/demos/TextInputActions.vue`**

```vue
<template>
  <CoarFormField label="Website" style="max-width: 360px;">
    <CoarTextInput v-model="host" placeholder="example.com">
      <template #prefixAction="{ disabled, readonly }">
        <CoarSelect
          v-model="scheme"
          :options="schemes"
          aria-label="Protocol"
          appearance="inline"
          width="content"
          :disabled="disabled"
          :readonly="readonly"
        />
      </template>
    </CoarTextInput>
  </CoarFormField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarFormField, CoarSelect, CoarTextInput } from '@cocoar/vue-ui';

const host = ref('cocoar.dev');
const scheme = ref<string | null>('https://');
const schemes = [
  { value: 'https://', label: 'https://' },
  { value: 'http://', label: 'http://' },
];
</script>
```

An action is a field of its own: a select in it does not take the label, hint or error of the surrounding
`CoarFormField`, so give it its own name with `aria-label`.

## Clear Button

When `clearable` is enabled, a small X button appears on hover or focus so users can quickly reset the field. It's **off by default** — set `clearable` to opt in.

**Demo — `text-input/demos/TextInputClearable.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Search">
      <CoarTextInput
        v-model="search"
        placeholder="Type to search..."
        :clearable="true"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Value: {{ search || 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const search = ref('');
</script>
```

## Sizes

Four sizes let you match the input to its surroundings -- compact toolbars, standard forms, or spacious layouts.

**Demo — `text-input/demos/TextInputSizes.vue`**

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarTextInput size="xs" placeholder="27px" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarTextInput size="s" placeholder="32px" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarTextInput size="m" placeholder="40px" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarTextInput size="l" placeholder="48px" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Multiline (Textarea)

Set `rows` to 2 or more and the input switches to a textarea, perfect for descriptions, notes, or any free-form content.

**Demo — `text-input/demos/TextInputMultiline.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
    <CoarFormField label="Bio" hint="Max 500 characters">
      <CoarTextInput
        v-model="bio"
        placeholder="Tell us about yourself..."
        :rows="4"
      />
    </CoarFormField>
    <CoarFormField label="6 Rows">
      <CoarTextInput :rows="6" placeholder="Taller textarea..." />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const bio = ref('');
</script>
```

## Inline (Preview) {#inline}

`appearance="inline"` lets a field sit in a sentence or a table row without looking like a form. At rest only the
value shows; hovering fills the box lightly to show what a click activates, and while the field is edited the fill
is stronger. Size, padding, radius and font stay those of the outlined field, so the value does not move when the
field is focused. An error keeps its red border, and disabled and readonly look as usual. Only the box itself
reacts to a click: the free space next to it activates nothing.

`width="content"` makes a single-line field as wide as its value (or its placeholder when it is empty) plus its
prefix, suffix and clear button, at most the available width. A multiline field keeps the full width.

**Demo — `text-input/demos/TextInputInline.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 480px;">
    <p style="margin: 0; line-height: 2.4;">
      The
      <CoarTextInput v-model="product" appearance="inline" width="content" placeholder="product" />
      ships from
      <CoarTextInput v-model="city" appearance="inline" width="content" placeholder="city" />
      · in stock
    </p>
    <CoarFormField label="Description">
      <CoarTextInput v-model="description" appearance="inline" :rows="2" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const product = ref('Cocoar Desk Lamp');
const city = ref('');
const description = ref('Dimmable LED lamp with a warm white setting.');
</script>
```

The same props work on [Number Input](./number-input.md#inline), [Select](./select.md#inline),
[Date Picker](./date-picker.md#inline) and the other date pickers. Together they make a property list
that is edited where it is read:

**Demo — `text-input/demos/InlineProperties.vue`**

```vue
<template>
  <div class="inline-properties">
    <div class="inline-properties__row">
      <span class="inline-properties__label">Name</span>
      <div><CoarTextInput v-model="name" appearance="inline" width="content" placeholder="–" /></div>
    </div>
    <div class="inline-properties__row">
      <span class="inline-properties__label">Price</span>
      <div>
        <CoarNumberInput v-model="price" appearance="inline" width="content" :decimals="2" suffix="EUR" />
      </div>
    </div>
    <div class="inline-properties__row">
      <span class="inline-properties__label">Category</span>
      <div>
        <CoarSelect v-model="category" :options="categories" appearance="inline" width="content" searchable />
      </div>
    </div>
    <div class="inline-properties__row">
      <span class="inline-properties__label">Available from</span>
      <div><CoarPlainDatePicker v-model="availableFrom" appearance="inline" width="content" /></div>
    </div>
    <div class="inline-properties__row">
      <span class="inline-properties__label">Stock</span>
      <div>
        <CoarNumberInput v-model="stock" appearance="inline" width="content" :min="0" stepper-buttons="both" />
      </div>
    </div>
    <div class="inline-properties__row">
      <span class="inline-properties__label">SKU</span>
      <div><CoarTextInput v-model="sku" appearance="inline" width="content" error /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarTextInput, CoarNumberInput, CoarSelect, CoarPlainDatePicker } from '@cocoar/vue-ui';

const name = ref('Cocoar Desk Lamp');
const price = ref<number | null>(49.9);
const category = ref<string | null>('lighting');
const categories = [
  { value: 'lighting', label: 'Lighting' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'office', label: 'Office supplies' },
  { value: 'decoration', label: 'Decoration' },
];
const availableFrom = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-12-01'));
const stock = ref<number | null>(12);
const sku = ref('LAMP 01');
</script>

<style scoped>
.inline-properties {
  display: grid;
  max-width: 520px;
}
.inline-properties__row {
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--coar-radius-s);
}
.inline-properties__label {
  color: var(--coar-text-neutral-secondary);
}
/* A row hover in the colour the fills must stand out from. */
.inline-properties__row:hover {
  background: var(--coar-background-neutral-secondary);
}
</style>
```

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

> **Info**
>
> Labels are automatically associated with their inputs. The required asterisk is announced by screen readers.

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
| `appearance` (Preview) | `'outline' \| 'inline'` | `'outline'` | `inline`: no border or surface until hovered or edited, see [Inline](#inline) |
| `width` (Preview) | `'fill' \| 'content'` | `'fill'` | `content`: as wide as the value or placeholder (single line only) |
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
| `prefixAction` (Preview) | `{ disabled: boolean, readonly: boolean }` | Interactive content at the start edge, see [Actions](#actions) |
| `suffixAction` | `{ disabled: boolean, readonly: boolean }` | Interactive content at the end edge, see [Actions](#actions) |

> **Tip**
>
> Label, hint, and error are provided by [`CoarFormField`](./form-field.md). Wrap inputs in a `CoarFormField` to add these features.

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.textInput.clear` | `'Clear'` | Clear button `aria-label` |
