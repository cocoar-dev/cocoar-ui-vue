<!-- Generated from apps/docs/components/checkbox.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Checkbox

Checkboxes let users pick one or more options from a list, or flip a single boolean on or off. Reach for a checkbox when the choice does not take effect until the user explicitly submits -- for instant toggles, consider a [Switch](./switch.md) instead.

```ts
import { CoarCheckbox } from '@cocoar/vue-ui';
```

## Basic Usage

Bind a boolean with `v-model` and provide a `label`. That is all you need for a working checkbox.

**Demo — `checkbox/demos/BasicCheckbox.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarCheckbox v-model="checked" label="Accept terms and conditions" />
    <span style="font-size: 13px; color: #64748b;">Checked: {{ checked }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox } from '@cocoar/vue-ui';

const checked = ref(false);
</script>
```

## States

Checkboxes support `required`, `disabled`, and `error` states, giving you full control over form validation flows.

**Demo — `checkbox/demos/CheckboxStates.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarCheckbox v-model="required" label="Required checkbox" :required="true" />
    <CoarCheckbox :model-value="true" label="Disabled (checked)" :disabled="true" />
    <CoarCheckbox :model-value="false" label="Disabled (unchecked)" :disabled="true" />
    <CoarFormField error="This field is required">
      <CoarCheckbox :model-value="false" label="With error" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';

const required = ref(false);
</script>
```

## Indeterminate

The indeterminate state shows a dash instead of a checkmark -- handy for "select all" controls where only some children are checked.

**Demo — `checkbox/demos/CheckboxIndeterminate.vue`**

```vue
<template>
  <div>
    <CoarCheckbox v-model="checked" :indeterminate="true" label="Select all (partial)" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox } from '@cocoar/vue-ui';

const checked = ref(false);
</script>
```

## Sizes

Four sizes to match different information densities, from compact data tables to spacious settings pages.

**Demo — `checkbox/demos/CheckboxSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarCheckbox :model-value="true" size="xs" label="Extra-small checkbox" />
    <CoarCheckbox :model-value="true" size="s" label="Small checkbox" />
    <CoarCheckbox :model-value="true" size="m" label="Medium checkbox (default)" />
    <CoarCheckbox :model-value="true" size="l" label="Large checkbox" />
  </div>
</template>

<script setup lang="ts">
import { CoarCheckbox } from '@cocoar/vue-ui';
</script>
```

## Hint Text

Wrap in `CoarFormField` with a `hint` prop to give users extra context without cluttering the label itself. When the form field owns the label, use `layout="inline"` for checkbox and switch rows.

**Demo — `checkbox/demos/CheckboxHint.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px">
    <CoarFormField
      label="Subscribe to newsletter"
      hint="Receive weekly updates about new features."
      layout="inline"
      label-position="after"
    >
      <CoarCheckbox :model-value="false" />
    </CoarFormField>
    <CoarFormField
      label="Enable analytics"
      hint="Help us improve the product by sharing usage data."
      layout="inline"
      label-position="after"
    >
      <CoarCheckbox :model-value="false" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Label Position

Place the label before or after the checkbox with the `labelPosition` prop. Defaults to `'after'`.

**Demo — `checkbox/demos/CheckboxLabelPosition.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarCheckbox v-model="a" label="Label after (default)" label-position="after" />
    <CoarCheckbox v-model="b" label="Label before" label-position="before" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox } from '@cocoar/vue-ui';

const a = ref(true);
const b = ref(true);
</script>
```

## Long Labels

Checkbox labels may wrap naturally. These deliberately narrow examples show both label positions and a mixed-length group.

**Demo — `checkbox/demos/CheckboxLongLabel.vue`**

```vue
<template>
  <div class="long-label-demo">
    <section>
      <h4>Label after</h4>
      <CoarCheckbox
        v-model="after"
        label="Send me a weekly summary of activity, security events, and account changes"
      />
    </section>

    <section>
      <h4>Label before</h4>
      <CoarCheckbox
        v-model="before"
        label="Send me a weekly summary of activity, security events, and account changes"
        label-position="before"
      />
    </section>

    <section>
      <h4>Inside a group</h4>
      <CoarCheckboxGroup v-model="selected">
        <CoarCheckbox
          value="security"
          label="Notify me when a security-sensitive setting is changed by another administrator"
        />
        <CoarCheckbox value="product" label="Receive occasional product announcements" />
      </CoarCheckboxGroup>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox, CoarCheckboxGroup } from '@cocoar/vue-ui';

const after = ref(false);
const before = ref(false);
const selected = ref<string[]>([]);
</script>

<style scoped>
.long-label-demo {
  display: grid;
  gap: var(--coar-spacing-l);
  width: min(100%, 320px);
}

.long-label-demo section {
  display: grid;
  gap: var(--coar-spacing-xs);
}

.long-label-demo h4 {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: 12px;
  font-weight: 500;
}
</style>
```

## Without Label

For table rows or tight custom layouts you can omit the visible label -- just make sure to pass an `aria-label` so the checkbox remains accessible.

**Demo — `checkbox/demos/CheckboxWithoutLabel.vue`**

```vue
<template>
  <div style="display: flex; gap: 16px; align-items: center;">
    <CoarCheckbox :model-value="false" aria-label="Select row 1" />
    <CoarCheckbox :model-value="true" aria-label="Select row 2" />
    <CoarCheckbox :model-value="false" :indeterminate="true" aria-label="Select all" />
  </div>
</template>

<script setup lang="ts">
import { CoarCheckbox } from '@cocoar/vue-ui';
</script>
```

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to checkbox |
| `Space` | Toggle checked state |

> **Info**
>
> The indeterminate state is visual only. Clicking an indeterminate checkbox toggles it to checked. Always provide `aria-label` when no visible label is used.

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
| `labelPosition` | `'before' \| 'after'` | `'after'` | Label position relative to the checkbox |
| `indeterminate` | `boolean` | `false` | Show indeterminate (dash) state |
| `disabled` | `boolean` | `false` | Disable the checkbox |
| `required` | `boolean` | `false` | Mark as required |
