# Select

Select components for single and multiple value selection. Choose between Single Select, Multi Select, or Tag Select variants.

```ts
import { CoarSelect, CoarMultiSelect, CoarTagSelect } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';
```

## Single Select

Select a single option from a dropdown list. Toggle props to explore all options.

<preview path="./select/demos/SelectPlayground.vue" />

## Multi Select

Select multiple values with checkmarks. Toggle props to explore options.

<preview path="./select/demos/MultiSelectPlayground.vue" />

## Tag Select

Select multiple values as removable tags. Search is always active — type to filter or create new tags.

<preview path="./select/demos/TagSelectPlayground.vue" />

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

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations).

These keys apply to `CoarSelect`, `CoarMultiSelect`, and `CoarTagSelect`.

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.select.clearSelection` | `'Clear selection'` | Clear button `aria-label` |
| `coar.ui.select.options` | `'Options'` | Options listbox `aria-label` |
| `coar.ui.select.noResults` | `'No results found'` | Empty state text when search returns no matches |
| `coar.ui.select.noOptions` | `'No options available'` | Empty state text when options list is empty |
| `coar.ui.tagSelect.remove` | `'Remove'` | Tag remove button `aria-label` |
| `coar.ui.tagSelect.options` | `'Options'` | Tag select listbox `aria-label` |
