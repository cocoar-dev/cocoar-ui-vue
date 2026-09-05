<!-- Generated from apps/docs/components/password-input.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Password Input

A text input tailored for passwords. It masks characters by default and provides a built-in eye toggle so users can temporarily reveal what they typed -- reducing frustration without sacrificing security.

```ts
import { CoarPasswordInput } from '@cocoar/vue-ui';
```

## Basic Usage

Works just like a text input, but the value is masked. Click the eye icon to peek at the password.

**Demo — `password-input/demos/BasicPasswordInput.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Password">
      <CoarPasswordInput
        v-model="password"
        placeholder="Enter your password"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Length: {{ password.length }} characters</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPasswordInput, CoarFormField } from '@cocoar/vue-ui';

const password = ref('');
</script>
```

## With Validation

Wrap in `CoarFormField` to add labels, hints, and error messages. The component reads the error state from the field context automatically.

**Demo — `password-input/demos/PasswordInputValidation.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField
      label="New Password"
      hint="Use a mix of letters, numbers, and symbols"
      :error="password.length > 0 && password.length < 8 ? 'Password must be at least 8 characters' : ''"
      required
    >
      <CoarPasswordInput
        v-model="password"
        placeholder="Min 8 characters"
        :required="true"
      />
    </CoarFormField>
    <CoarFormField
      label="Confirm Password"
      :error="confirm.length > 0 && confirm !== password ? 'Passwords do not match' : ''"
    >
      <CoarPasswordInput
        v-model="confirm"
        placeholder="Repeat your password"
      />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPasswordInput, CoarFormField } from '@cocoar/vue-ui';

const password = ref('');
const confirm = ref('');
</script>
```

## States

Use `disabled` for locked accounts or `readonly` when displaying a masked placeholder that the user cannot modify.

**Demo — `password-input/demos/PasswordInputStates.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Disabled">
      <CoarPasswordInput :model-value="'secret123'" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarPasswordInput :model-value="'readonly-pass'" :readonly="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPasswordInput, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Sizes

Four sizes to keep password fields visually consistent with the rest of your form.

**Demo — `password-input/demos/PasswordInputSizes.vue`**

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarPasswordInput size="xs" placeholder="xs" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarPasswordInput size="s" placeholder="s" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarPasswordInput size="m" placeholder="m" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarPasswordInput size="l" placeholder="l" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPasswordInput, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to input / toggle button |
| `Enter` / `Space` | Toggle password visibility (on eye icon) |

> **Info**
>
> The visibility toggle button has an accessible label that updates based on the current state ("Show password" / "Hide password").

### Screen Reader Support

- Label text announces on focus
- Password visibility toggle state is communicated
- Error messages linked via `aria-describedby`
- Input type switches between `password` and `text`

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `string` | `''` | Password value |
| `placeholder` | `string` | `''` | Placeholder text |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `disabled` | `boolean` | `false` | Disable the input |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `clearable` | `boolean` | `false` | Show clear button when input has value |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.passwordInput.showPassword` | `'Show password'` | Toggle visibility button `aria-label` |
| `coar.ui.passwordInput.hidePassword` | `'Hide password'` | Toggle visibility button `aria-label` (when visible) |
| `coar.ui.passwordInput.clear` | `'Clear'` | Clear button `aria-label` |
