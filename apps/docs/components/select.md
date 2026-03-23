# Select

Select components for single and multiple value selection. Choose between Single Select, Multi Select, or Tag Select variants.

```ts
import { CoarSelect, CoarMultiSelect, CoarTagSelect } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';
```

## Single Select

Select a single option from a dropdown list.

<preview path="./select/demos/BasicSelect.vue" />

## States

Disabled, required, and error states.

<preview path="./select/demos/SelectStates.vue" />

## Multi Select & Tag Select

Select multiple values from a dropdown. Multi Select shows checkmarks, Tag Select shows removable tags inline.

<preview path="./select/demos/MultiSelect.vue" />

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
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana', disabled: true },
];
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `T \| null` | `null` | Selected value (the option's `value` field) |
| `options` | `CoarSelectOption<T>[]` | `[]` | Array of `{ value, label }` option objects |
| `placeholder` | `string` | `''` | Placeholder when empty |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `disabled` | `boolean` | `false` | Disable the select |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |
