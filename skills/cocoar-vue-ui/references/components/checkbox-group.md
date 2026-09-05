<!-- Generated from apps/docs/components/checkbox-group.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Checkbox Group

`CoarCheckboxGroup` turns multiple keyed checkboxes into one field value. Each child keeps its own visible label and DOM id; the group owns selection state, layout, shared form name, disabled/error state, and accessibility semantics.

```ts
import { CoarCheckbox, CoarCheckboxGroup } from '@cocoar/vue-ui';
```

## Array and Object Models

Use `value` as the stable domain key of each checkbox. An array model contains the selected keys. Object mode contains every registered key with an explicit Boolean value. External model changes immediately update the visible checkboxes in both modes.

**Demo — `checkbox-group/demos/CheckboxGroupModels.vue`**

```vue
<template>
  <div class="group-models">
    <CoarFormField label="Array model" hint="The model contains only selected values.">
      <CoarCheckboxGroup v-model="arrayValue" name="array-permissions">
        <CoarCheckbox value="read" label="Read" />
        <CoarCheckbox value="write" label="Write" />
        <CoarCheckbox value="admin" label="Admin" />
      </CoarCheckboxGroup>
    </CoarFormField>
    <pre>{{ arrayValue }}</pre>

    <CoarFormField
      label="Object model"
      hint="Every registered value is represented by an explicit Boolean."
    >
      <CoarCheckboxGroup v-model="objectValue" model-type="object" name="object-permissions">
        <CoarCheckbox value="read" label="Read" />
        <CoarCheckbox value="write" label="Write" />
        <CoarCheckbox value="admin" label="Admin" />
      </CoarCheckboxGroup>
    </CoarFormField>
    <pre>{{ objectValue }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox, CoarCheckboxGroup, CoarFormField } from '@cocoar/vue-ui';

const arrayValue = ref<string[]>(['read']);
const objectValue = ref<Record<string, boolean>>({
  read: true,
  write: false,
  admin: false,
});
</script>

<style scoped>
.group-models {
  display: grid;
  gap: var(--coar-spacing-m);
}

.group-models pre {
  margin: 0;
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-background-neutral-secondary);
  font-size: 12px;
}
</style>
```

## With Form Field

Wrap the complete group in one `CoarFormField`. The FormField label describes the group; the child labels describe the individual options.

```vue
<CoarFormField
  label="Permissions"
  hint="Select every permission this role should receive."
>
  <CoarCheckboxGroup v-model="permissions">
    <CoarCheckbox value="read" label="Read" />
    <CoarCheckbox value="write" label="Write" />
  </CoarCheckboxGroup>
</CoarFormField>
```

## API

### CoarCheckboxGroup props

| Prop | Type | Default | Description |
|---|---|---|---|
| `v-model` | `readonly string[] \| Readonly<Record<string, boolean>>` | `undefined` | Complete group value |
| `modelType` | `'array' \| 'object'` | inferred, then `'array'` | Output shape, especially useful before a model has a value |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Child layout |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Size inherited by every child checkbox |
| `name` | `string` | `undefined` | Native form name shared by all child inputs |
| `disabled` | `boolean` | `false` | Disables all children |
| `error` | `boolean` | `false` | Marks the group and all children invalid |

> **Info: Group keys**
>
> Inside a group, every `CoarCheckbox` must have a non-empty, unique `value`. `id` remains a DOM/accessibility identifier and is never used as application data.
