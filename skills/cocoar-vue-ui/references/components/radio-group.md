<!-- Generated from apps/docs/components/radio-group.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Radio Group

When users must pick exactly one option from a small set of mutually exclusive choices, a radio group is the right tool. Each option is visible at a glance, unlike a select dropdown, which makes radios ideal when the list is short (roughly 2--5 items).

```ts
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';
```

## Horizontal

Switch to `orientation="horizontal"` when labels are short and there are only a few choices.

**Demo — `radio-group/demos/RadioGroupHorizontal.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarRadioGroup v-model="size" name="button-size" label="Button Size" orientation="horizontal">
      <CoarRadioButton value="xs">XS</CoarRadioButton>
      <CoarRadioButton value="s">S</CoarRadioButton>
      <CoarRadioButton value="m">M</CoarRadioButton>
      <CoarRadioButton value="l">L</CoarRadioButton>
    </CoarRadioGroup>
    <span style="font-size: 13px; color: #64748b;">Selected: {{ size }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const size = ref('m');
</script>
```

## Vertical (Default)

The default vertical layout stacks options for easy scanning -- works well with longer labels or more than 4 choices.

**Demo — `radio-group/demos/RadioGroupVertical.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarRadioGroup v-model="color" name="preferred-color" label="Preferred Color">
      <CoarRadioButton value="red">Red — Passionate and energetic</CoarRadioButton>
      <CoarRadioButton value="blue">Blue — Calm and trustworthy</CoarRadioButton>
      <CoarRadioButton value="green">Green — Fresh and natural</CoarRadioButton>
      <CoarRadioButton value="purple">Purple — Creative and luxurious</CoarRadioButton>
    </CoarRadioGroup>
    <span style="font-size: 13px; color: #64748b;">Selected: {{ color || 'none' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const color = ref('');
</script>
```

## States

Mark the group as `required` to show an asterisk. Wrap in `CoarFormField` to display validation messages.

**Demo — `radio-group/demos/RadioGroupStates.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarRadioGroup :model-value="'a'" name="required-group" label="Required Group" :required="true">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
    <CoarFormField error="Please select an option">
      <CoarRadioGroup :model-value="''" name="with-error" label="With Error">
        <CoarRadioButton value="a">Option A</CoarRadioButton>
        <CoarRadioButton value="b">Option B</CoarRadioButton>
      </CoarRadioGroup>
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarRadioGroup, CoarRadioButton, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Label Position

Place the label text before or after the radio control with the `labelPosition` prop on the group. All radio buttons inherit the setting.

**Demo — `radio-group/demos/RadioGroupLabelPosition.vue`**

```vue
<template>
  <div style="display: flex; gap: 48px;">
    <CoarRadioGroup v-model="a" name="pos-after" label="Label after (default)">
      <CoarRadioButton value="email">Email</CoarRadioButton>
      <CoarRadioButton value="sms">SMS</CoarRadioButton>
      <CoarRadioButton value="push">Push</CoarRadioButton>
    </CoarRadioGroup>

    <CoarRadioGroup v-model="b" name="pos-before" label="Label before" label-position="before">
      <CoarRadioButton value="email">Email</CoarRadioButton>
      <CoarRadioButton value="sms">SMS</CoarRadioButton>
      <CoarRadioButton value="push">Push</CoarRadioButton>
    </CoarRadioGroup>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const a = ref('email');
const b = ref('email');
</script>
```

## Disabled Buttons

Individual `CoarRadioButton` options can be disabled while the rest of the group stays interactive -- useful for temporarily unavailable plans or tiers.

**Demo — `radio-group/demos/RadioGroupDisabled.vue`**

```vue
<template>
  <div>
    <CoarRadioGroup v-model="plan" name="plan" label="Plan">
      <CoarRadioButton value="free">Free</CoarRadioButton>
      <CoarRadioButton value="pro">Pro</CoarRadioButton>
      <CoarRadioButton value="enterprise" :disabled="true">Enterprise (Coming Soon)</CoarRadioButton>
    </CoarRadioGroup>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const plan = ref('free');
</script>
```

## Sizes

Four sizes that stay in step with every other Cocoar form control.

**Demo — `radio-group/demos/RadioGroupSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarRadioGroup :model-value="'a'" name="size-xs" label="Extra-small" size="xs">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
    <CoarRadioGroup :model-value="'a'" name="size-s" label="Small" size="s">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
    <CoarRadioGroup :model-value="'a'" name="size-m" label="Medium (default)" size="m">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
    <CoarRadioGroup :model-value="'a'" name="size-l" label="Large" size="l">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
  </div>
</template>

<script setup lang="ts">
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';
</script>
```

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus into / out of radio group |
| `Arrow Left` / `Arrow Up` | Select previous option |
| `Arrow Right` / `Arrow Down` | Select next option |
| `Space` | Select focused option |

> **Info**
>
> Only one radio button in a group receives tab focus. Arrow keys move selection between options within the group.

### Screen Reader Support

- Group label announced when entering the group
- Each option's label announces on focus
- Selected state properly communicated
- Disabled options announced as unavailable

## API

### CoarRadioGroup Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `unknown` | `undefined` | Currently selected value |
| `name` | `string` | — | **Required.** HTML name for the radio inputs |
| `label` | `string` | `''` | Group accessible label |
| `orientation` | `'horizontal' \| 'vertical'` | `'vertical'` | Layout direction |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Radio button size |
| `labelPosition` | `'before' \| 'after'` | `'after'` | Label position for all radio buttons |
| `disabled` | `boolean` | `false` | Disable all radio buttons |
| `required` | `boolean` | `false` | Mark as required |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |

### CoarRadioButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `unknown` | -- | Value emitted when selected |
| `disabled` | `boolean` | `false` | Disable this option |
