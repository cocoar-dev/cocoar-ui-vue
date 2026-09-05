<!-- Generated from apps/docs/components/select.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Select

Select components for single and multiple value selection. Choose between Single Select, Multi Select, or Tag Select variants.

```ts
import { CoarSelect, CoarMultiSelect, CoarTagSelect } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';
```

## Single Select

Select a single option from a dropdown list. Toggle props to explore all options.

**Demo — `select/demos/SelectPlayground.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <CoarCheckbox v-model="grouped" label="grouped" />
      <CoarCheckbox v-model="searchable" label="searchable" />
      <CoarCheckbox v-model="clearable" label="clearable" />
      <CoarCheckbox v-model="disabled" label="disabled" />
      <CoarCheckbox v-model="readonly" label="readonly" />
      <CoarCheckbox v-model="error" label="error" />
      <CoarSelect v-model="size" :options="sizeOptions" :searchable="false" size="s" style="width: 90px;" />
      <CoarSelect v-model="appearance" :options="appearanceOptions" :searchable="false" size="s" style="width: 120px;" />
      <CoarSelect v-model="position" :options="positionOptions" :searchable="false" size="s" style="width: 110px;" />
      <CoarSelect v-model="sortGroups" :options="sortPresetOptions" :searchable="false" size="s" style="width: 160px;" placeholder="sortGroups" />
      <CoarSelect v-model="sortOptions" :options="sortPresetOptions" :searchable="false" size="s" style="width: 160px;" placeholder="sortOptions" />
    </div>

    <div style="max-width: 320px;">
      <CoarFormField label="Country">
        <CoarSelect
          v-model="value"
          :options="activeOptions"
          :searchable="searchable"
          :clearable="clearable"
          :disabled="disabled"
          :readonly="readonly"
          :error="error"
          :size="size"
          :appearance="appearance"
          :dropdown-position="position"
          :sort-groups="sortGroups"
          :sort-options="sortOptions"
          placeholder="Select a country..."
        />
      </CoarFormField>
      <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
        Selected: {{ value || 'none' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarSelect, CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';
import type { CoarSelectOption, CoarSelectSortGroups, CoarSelectSortOptions } from '@cocoar/vue-ui';

const value = ref<string | null>(null);
const grouped = ref(true);
const searchable = ref(false);
const clearable = ref(false);
const disabled = ref(false);
const readonly = ref(false);
const error = ref(false);
const size = ref<'xs' | 's' | 'm' | 'l'>('m');
const appearance = ref<'outline' | 'inline'>('outline');
const position = ref<'auto' | 'top' | 'bottom'>('auto');
const sortGroups = ref<CoarSelectSortGroups>('asc');
const sortOptions = ref<CoarSelectSortOptions>('none');

const groupedOptions: CoarSelectOption<string>[] = [
  { value: 'at', label: 'Austria', group: 'Central Europe' },
  { value: 'de', label: 'Germany', group: 'Central Europe' },
  { value: 'ch', label: 'Switzerland', group: 'Central Europe' },
  { value: 'fr', label: 'France', group: 'Western Europe' },
  { value: 'nl', label: 'Netherlands', group: 'Western Europe' },
  { value: 'be', label: 'Belgium', group: 'Western Europe' },
  { value: 'es', label: 'Spain', group: 'Southern Europe' },
  { value: 'it', label: 'Italy', group: 'Southern Europe' },
  { value: 'pt', label: 'Portugal', group: 'Southern Europe' },
  { value: 'se', label: 'Sweden', group: 'Northern Europe' },
  { value: 'no', label: 'Norway', group: 'Northern Europe' },
  { value: 'dk', label: 'Denmark', group: 'Northern Europe' },
];

const flatOptions: CoarSelectOption<string>[] = groupedOptions.map(({ group, ...rest }) => rest);

const activeOptions = computed(() => grouped.value ? groupedOptions : flatOptions);

const sizeOptions: CoarSelectOption<string>[] = [
  { value: 'xs', label: 'xs' },
  { value: 's', label: 's' },
  { value: 'm', label: 'm' },
  { value: 'l', label: 'l' },
];

const appearanceOptions: CoarSelectOption<string>[] = [
  { value: 'outline', label: 'outline' },
  { value: 'inline', label: 'inline' },
];

const positionOptions: CoarSelectOption<string>[] = [
  { value: 'auto', label: 'auto' },
  { value: 'top', label: 'top' },
  { value: 'bottom', label: 'bottom' },
];

const sortPresetOptions: CoarSelectOption<string>[] = [
  { value: 'asc', label: 'asc' },
  { value: 'desc', label: 'desc' },
  { value: 'none', label: 'none' },
];
</script>
```

## Multi Select

Select multiple values with checkmarks. Toggle props to explore options.

**Demo — `select/demos/MultiSelectPlayground.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <CoarCheckbox v-model="grouped" label="grouped" />
      <CoarCheckbox v-model="searchable" label="searchable" />
      <CoarCheckbox v-model="clearable" label="clearable" />
      <CoarCheckbox v-model="showSelectAll" label="showSelectAll" />
      <CoarCheckbox v-model="disabled" label="disabled" />
      <CoarCheckbox v-model="readonly" label="readonly" />
      <CoarCheckbox v-model="error" label="error" />
      <CoarSelect v-model="size" :options="sizeOptions" :searchable="false" size="s" style="width: 90px;" />
      <CoarSelect v-model="appearance" :options="appearanceOptions" :searchable="false" size="s" style="width: 120px;" />
      <CoarSelect v-model="sortGroups" :options="sortPresetOptions" :searchable="false" size="s" style="width: 160px;" placeholder="sortGroups" />
      <CoarSelect v-model="sortOptions" :options="sortPresetOptions" :searchable="false" size="s" style="width: 160px;" placeholder="sortOptions" />
    </div>

    <div style="max-width: 320px;">
      <CoarFormField label="Countries">
        <CoarMultiSelect
          v-model="value"
          :options="activeOptions"
          :searchable="searchable"
          :clearable="clearable"
          :show-select-all="showSelectAll"
          :disabled="disabled"
          :readonly="readonly"
          :error="error"
          :size="size"
          :appearance="appearance"
          :sort-groups="sortGroups"
          :sort-options="sortOptions"
          placeholder="Select countries..."
        />
      </CoarFormField>
      <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
        Selected: {{ value.join(', ') || 'none' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarMultiSelect, CoarSelect, CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';
import type { CoarSelectOption, CoarSelectSortGroups, CoarSelectSortOptions } from '@cocoar/vue-ui';

const value = ref<string[]>([]);
const grouped = ref(true);
const searchable = ref(false);
const clearable = ref(false);
const showSelectAll = ref(false);
const disabled = ref(false);
const readonly = ref(false);
const error = ref(false);
const size = ref<'xs' | 's' | 'm' | 'l'>('m');
const appearance = ref<'outline' | 'inline'>('outline');
const sortGroups = ref<CoarSelectSortGroups>('asc');
const sortOptions = ref<CoarSelectSortOptions>('none');

const groupedOptions: CoarSelectOption<string>[] = [
  { value: 'at', label: 'Austria', group: 'Central Europe' },
  { value: 'de', label: 'Germany', group: 'Central Europe' },
  { value: 'ch', label: 'Switzerland', group: 'Central Europe' },
  { value: 'fr', label: 'France', group: 'Western Europe' },
  { value: 'nl', label: 'Netherlands', group: 'Western Europe' },
  { value: 'be', label: 'Belgium', group: 'Western Europe' },
  { value: 'es', label: 'Spain', group: 'Southern Europe' },
  { value: 'it', label: 'Italy', group: 'Southern Europe' },
  { value: 'pt', label: 'Portugal', group: 'Southern Europe' },
  { value: 'se', label: 'Sweden', group: 'Northern Europe' },
  { value: 'no', label: 'Norway', group: 'Northern Europe' },
  { value: 'dk', label: 'Denmark', group: 'Northern Europe' },
];

const flatOptions: CoarSelectOption<string>[] = groupedOptions.map(({ group, ...rest }) => rest);

const activeOptions = computed(() => grouped.value ? groupedOptions : flatOptions);

const sizeOptions: CoarSelectOption<string>[] = [
  { value: 'xs', label: 'xs' },
  { value: 's', label: 's' },
  { value: 'm', label: 'm' },
  { value: 'l', label: 'l' },
];

const appearanceOptions: CoarSelectOption<string>[] = [
  { value: 'outline', label: 'outline' },
  { value: 'inline', label: 'inline' },
];

const sortPresetOptions: CoarSelectOption<string>[] = [
  { value: 'asc', label: 'asc' },
  { value: 'desc', label: 'desc' },
  { value: 'none', label: 'none' },
];
</script>
```

## Tag Select

Select multiple values as removable tags. Search is always active — type to filter or create new tags.

**Demo — `select/demos/TagSelectPlayground.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <CoarCheckbox v-model="grouped" label="grouped" />
      <CoarCheckbox v-model="allowCreate" label="allowCreate" />
      <CoarCheckbox v-model="disabled" label="disabled" />
      <CoarCheckbox v-model="readonly" label="readonly" />
      <CoarCheckbox v-model="error" label="error" />
      <CoarSelect v-model="size" :options="sizeOptions" :searchable="false" size="s" style="width: 90px;" />
      <CoarSelect v-model="appearance" :options="appearanceOptions" :searchable="false" size="s" style="width: 120px;" />
      <CoarSelect v-model="sortGroups" :options="sortPresetOptions" :searchable="false" size="s" style="width: 160px;" placeholder="sortGroups" />
      <CoarSelect v-model="sortOptions" :options="sortPresetOptions" :searchable="false" size="s" style="width: 160px;" placeholder="sortOptions" />
    </div>

    <div style="max-width: 320px;">
      <CoarFormField label="Countries">
        <CoarTagSelect
          v-model="value"
          :options="activeOptions"
          :allow-create="allowCreate"
          :disabled="disabled"
          :readonly="readonly"
          :error="error"
          :size="size"
          :appearance="appearance"
          :sort-groups="sortGroups"
          :sort-options="sortOptions"
          placeholder="Type to search..."
        />
      </CoarFormField>
      <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
        Selected: {{ value.join(', ') || 'none' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarTagSelect, CoarSelect, CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';
import type { CoarSelectOption, CoarSelectSortGroups, CoarSelectSortOptions } from '@cocoar/vue-ui';

const value = ref<string[]>([]);
const grouped = ref(true);
const allowCreate = ref(false);
const disabled = ref(false);
const readonly = ref(false);
const error = ref(false);
const size = ref<'xs' | 's' | 'm' | 'l'>('m');
const appearance = ref<'outline' | 'inline'>('outline');
const sortGroups = ref<CoarSelectSortGroups>('asc');
const sortOptions = ref<CoarSelectSortOptions>('none');

const groupedOptions: CoarSelectOption<string>[] = [
  { value: 'at', label: 'Austria', group: 'Central Europe' },
  { value: 'de', label: 'Germany', group: 'Central Europe' },
  { value: 'ch', label: 'Switzerland', group: 'Central Europe' },
  { value: 'fr', label: 'France', group: 'Western Europe' },
  { value: 'nl', label: 'Netherlands', group: 'Western Europe' },
  { value: 'be', label: 'Belgium', group: 'Western Europe' },
  { value: 'es', label: 'Spain', group: 'Southern Europe' },
  { value: 'it', label: 'Italy', group: 'Southern Europe' },
  { value: 'pt', label: 'Portugal', group: 'Southern Europe' },
  { value: 'se', label: 'Sweden', group: 'Northern Europe' },
  { value: 'no', label: 'Norway', group: 'Northern Europe' },
  { value: 'dk', label: 'Denmark', group: 'Northern Europe' },
];

const flatOptions: CoarSelectOption<string>[] = groupedOptions.map(({ group, ...rest }) => rest);

const activeOptions = computed(() => grouped.value ? groupedOptions : flatOptions);

const sizeOptions: CoarSelectOption<string>[] = [
  { value: 'xs', label: 'xs' },
  { value: 's', label: 's' },
  { value: 'm', label: 'm' },
  { value: 'l', label: 'l' },
];

const appearanceOptions: CoarSelectOption<string>[] = [
  { value: 'outline', label: 'outline' },
  { value: 'inline', label: 'inline' },
];

const sortPresetOptions: CoarSelectOption<string>[] = [
  { value: 'asc', label: 'asc' },
  { value: 'desc', label: 'desc' },
  { value: 'none', label: 'none' },
];
</script>
```

## Options Format

Options must follow the `CoarSelectOption<T>` interface:

```ts
interface CoarSelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
  icon?: string;
}

const options: CoarSelectOption<string>[] = [
  { value: 'apple', label: 'Apple', group: 'Fruits' },
  { value: 'banana', label: 'Banana', group: 'Fruits', disabled: true },
  { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
];
```

## Sorting

Control the order of groups and options via `sortGroups` and `sortOptions`. Both accept preset strings or a custom comparator function.

**Demo — `select/demos/SortingDemo.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <CoarSelect v-model="sortGroups" :options="sortPresetOptions" :searchable="false" size="s" style="width: 150px;" placeholder="sortGroups" />
      <CoarSelect v-model="sortOptions" :options="sortPresetOptions" :searchable="false" size="s" style="width: 150px;" placeholder="sortOptions" />
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 640px;">
      <CoarFormField label="With groups">
        <CoarSelect
          v-model="value1"
          :options="groupedOptions"
          :sort-groups="sortGroups"
          :sort-options="sortOptions"
          clearable
          searchable
          placeholder="Select..."
        />
      </CoarFormField>

      <CoarFormField label="Without groups">
        <CoarSelect
          v-model="value2"
          :options="flatOptions"
          :sort-options="sortOptions"
          clearable
          searchable
          placeholder="Select..."
        />
      </CoarFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSelect, CoarFormField } from '@cocoar/vue-ui';
import type { CoarSelectOption, CoarSelectSortGroups, CoarSelectSortOptions } from '@cocoar/vue-ui';

const value1 = ref<string | null>(null);
const value2 = ref<string | null>(null);
const sortGroups = ref<CoarSelectSortGroups>('asc');
const sortOptions = ref<CoarSelectSortOptions>('none');

const sortPresetOptions: CoarSelectOption<string>[] = [
  { value: 'asc', label: 'asc' },
  { value: 'desc', label: 'desc' },
  { value: 'none', label: 'none' },
];

const groupedOptions: CoarSelectOption<string>[] = [
  { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
  { value: 'broccoli', label: 'Broccoli', group: 'Vegetables' },
  { value: 'spinach', label: 'Spinach', group: 'Vegetables' },
  { value: 'banana', label: 'Banana', group: 'Fruits' },
  { value: 'apple', label: 'Apple', group: 'Fruits' },
  { value: 'cherry', label: 'Cherry', group: 'Fruits' },
  { value: 'salmon', label: 'Salmon', group: 'Protein' },
  { value: 'chicken', label: 'Chicken', group: 'Protein' },
  { value: 'tofu', label: 'Tofu', group: 'Protein' },
];

const flatOptions: CoarSelectOption<string>[] = groupedOptions.map(({ group, ...rest }) => rest);
</script>
```

- `sortOptions` works **with and without groups** — it sorts all options, or within each group respectively
- `sortGroups` only applies when options have a `group` property
- `'none'` preserves the order as passed — giving you full control from the consumer side
- Pass a custom comparator `(a, b) => number` for special sorting (e.g. by priority, numeric values)

```ts
import type { CoarSelectSortGroups, CoarSelectSortOptions } from '@cocoar/vue-ui';
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `T \| null` | `null` | Selected value (the option's `value` field) |
| `options` | `CoarSelectOption<T>[]` | `[]` | Array of `{ value, label }` option objects |
| `placeholder` | `string` | `''` | Placeholder when empty |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `searchable` | `boolean` | `false` | Enable inline search to filter options by typing |
| `clearable` | `boolean` | `false` | Show a clear button when a value is selected |
| `disabled` | `boolean` | `false` | Disable the select |
| `readonly` | `boolean` | `false` | Read-only state |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |
| `appearance` | `'outline' \| 'inline'` | `'outline'` | Visual appearance variant |
| `compareWith` | `(a: T, b: T) => boolean` | `===` | Custom comparison function for matching values |
| `dropdownPosition` | `'auto' \| 'top' \| 'bottom'` | `'auto'` | Dropdown position preference |
| `sortGroups` | `'asc' \| 'desc' \| 'none' \| (a, b) => number` | `'asc'` | Sort order for groups |
| `sortOptions` | `'asc' \| 'desc' \| 'none' \| (a, b) => number` | `'none'` | Sort order for options (within each group, or all if ungrouped) |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

These keys apply to `CoarSelect`, `CoarMultiSelect`, and `CoarTagSelect`.

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.select.clearSelection` | `'Clear selection'` | Clear button `aria-label` |
| `coar.ui.select.options` | `'Options'` | Options listbox `aria-label` |
| `coar.ui.select.noResults` | `'No results found'` | Empty state text when search returns no matches |
| `coar.ui.select.noOptions` | `'No options available'` | Empty state text when options list is empty |
| `coar.ui.tagSelect.remove` | `'Remove'` | Tag remove button `aria-label` |
| `coar.ui.tagSelect.options` | `'Options'` | Tag select listbox `aria-label` |
