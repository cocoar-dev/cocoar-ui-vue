<!-- Generated from apps/docs/components/segmented-control.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Segmented Control

Switch between a small fixed set of mutually-exclusive options like view modes, filters, density, or time ranges. A segmented control reads as a button-bar for view-state — same semantics as a radio group (single selection from N options), different visual register: it belongs in toolbars and headers, not in forms.

```ts
import { CoarSegmentedControl } from '@cocoar/vue-ui';
```

## Basic Usage

Pass an array of `{ value, label }` options and bind the active value via `v-model`. The control is generic over the option's value type, so the model and event payloads stay strongly typed.

**Demo — `segmented-control/demos/SegmentedControlBasic.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
    <CoarSegmentedControl
      v-model="view"
      :options="options"
      aria-label="Calendar view"
    />
    <p style="margin: 0; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Active view: <strong>{{ view }}</strong>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, type CoarSegmentedControlOption } from '@cocoar/vue-ui';

type CalendarView = 'day' | 'week' | 'month' | 'agenda';

const view = ref<CalendarView>('week');
const options: CoarSegmentedControlOption<CalendarView>[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'agenda', label: 'Agenda' },
];
</script>
```

## Sizes

Heights and font sizes line up with `CoarButton`'s `xs / s / m / l` so the segmented control sits naturally next to other buttons in a toolbar. Default is `s`.

**Demo — `segmented-control/demos/SegmentedControlSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
    <CoarSegmentedControl v-model="density" :options="options" size="xs" aria-label="Density xs" />
    <CoarSegmentedControl v-model="density" :options="options" size="s" aria-label="Density s" />
    <CoarSegmentedControl v-model="density" :options="options" size="m" aria-label="Density m" />
    <CoarSegmentedControl v-model="density" :options="options" size="l" aria-label="Density l" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, type CoarSegmentedControlOption } from '@cocoar/vue-ui';

const density = ref<'comfortable' | 'compact'>('comfortable');
const options: CoarSegmentedControlOption<'comfortable' | 'compact'>[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];
</script>
```

## With Icons

Each option accepts an optional `icon` (`CoarIcon` name) rendered before the label. Icon-only segments work too — pass `ariaLabel` on the option for screen-reader text when the visible label is empty.

**Demo — `segmented-control/demos/SegmentedControlIcons.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
    <CoarSegmentedControl
      v-model="layout"
      :options="options"
      aria-label="Layout mode"
    />
    <p style="margin: 0; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Layout: <strong>{{ layout }}</strong>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, type CoarSegmentedControlOption } from '@cocoar/vue-ui';

type Layout = 'list' | 'grid' | 'columns';

const layout = ref<Layout>('list');
const options: CoarSegmentedControlOption<Layout>[] = [
  { value: 'list', label: 'List', icon: 'list' },
  { value: 'grid', label: 'Grid', icon: 'layout-grid' },
  { value: 'columns', label: 'Columns', icon: 'columns' },
];
</script>
```

## Disabled

Disable a single option to hide a state that's currently unavailable, or disable the whole control when the surrounding context is read-only.

**Demo — `segmented-control/demos/SegmentedControlDisabled.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
    <div>
      <p style="margin: 0 0 6px 0; font-size: 13px; color: var(--coar-text-neutral-secondary);">
        Whole control disabled
      </p>
      <CoarSegmentedControl
        v-model="status"
        :options="options"
        :disabled="true"
        aria-label="Disabled"
      />
    </div>
    <div>
      <p style="margin: 0 0 6px 0; font-size: 13px; color: var(--coar-text-neutral-secondary);">
        Single option disabled (Archived)
      </p>
      <CoarSegmentedControl
        v-model="status"
        :options="optionsWithDisabled"
        aria-label="Per-option disabled"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, type CoarSegmentedControlOption } from '@cocoar/vue-ui';

type Status = 'open' | 'closed' | 'archived';

const status = ref<Status>('open');
const options: CoarSegmentedControlOption<Status>[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
];
const optionsWithDisabled: CoarSegmentedControlOption<Status>[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived', disabled: true },
];
</script>
```

## Full Width

Set `fullWidth` to make the control fill its container; segments share the available width equally. Useful in narrow side panels and mobile layouts.

**Demo — `segmented-control/demos/SegmentedControlFullWidth.vue`**

```vue
<template>
  <div style="max-width: 480px;">
    <CoarSegmentedControl
      v-model="period"
      :options="options"
      :full-width="true"
      aria-label="Reporting period"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, type CoarSegmentedControlOption } from '@cocoar/vue-ui';

type Period = '1d' | '7d' | '30d' | '90d' | '1y';

const period = ref<Period>('7d');
const options: CoarSegmentedControlOption<Period>[] = [
  { value: '1d', label: '1 Day' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
];
</script>
```

## When to Use

| Use a segmented control when… | Use a radio group instead when… |
|---|---|
| The choices are 2–6 view-state options | The choices are part of a form being submitted |
| The control sits in a toolbar / header | The control sits in a labelled form field |
| Choosing should switch the UI immediately | Choosing should be confirmed by a Submit |

## Accessibility

The control is exposed as `role="group"` with the `ariaLabel` you pass; each segment is a `<button type="button">` with `aria-pressed` reflecting the active state. Screen readers announce both the group label and the pressed state of the active segment. Disabled segments use the native `disabled` attribute.

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `T` (required) | — | Active option's `value`. |
| `options` | `CoarSegmentedControlOption<T>[]` | — | List of segments. |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'s'` | Sizes match `CoarButton`. |
| `disabled` | `boolean` | `false` | Disable the entire control. |
| `fullWidth` | `boolean` | `false` | Stretch to fill the parent's width. |
| `ariaLabel` | `string` | — | Screen-reader label for the group. |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `T` | Standard v-model update. |
| `change` | `(value: T, option: CoarSegmentedControlOption<T>)` | Fired only when the user picks a *different* option. |

### `CoarSegmentedControlOption<T>`

| Field | Type | Description |
|-------|------|-------------|
| `value` | `T` | Bound to `v-model`. |
| `label` | `string` | Visible label. May be empty for icon-only segments. |
| `icon` | `string` | Optional `CoarIcon` name rendered before the label. |
| `disabled` | `boolean` | Disable just this segment. |
| `ariaLabel` | `string` | Override aria-label for the segment (typical for icon-only). |
