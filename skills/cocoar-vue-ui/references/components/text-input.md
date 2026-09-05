<!-- Generated from apps/docs/components/text-input.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Text Input

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
| `clearable` | `boolean` | `false` | Show clear button when input has value |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |
| `disabled` | `boolean` | `false` | Disable the input |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | HTML required attribute |

> **Tip**
>
> Label, hint, and error are provided by [`CoarFormField`](./form-field.md). Wrap inputs in a `CoarFormField` to add these features.

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.textInput.clear` | `'Clear'` | Clear button `aria-label` |
