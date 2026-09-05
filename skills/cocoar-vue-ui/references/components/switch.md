<!-- Generated from apps/docs/components/switch.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Switch

A toggle for boolean settings that take effect immediately -- think "Enable notifications" or "Dark mode". Unlike a [Checkbox](./checkbox.md), a switch signals instant action rather than a deferred choice that requires a submit button.

```ts
import { CoarSwitch } from '@cocoar/vue-ui';
```

## Basic Usage

Bind a boolean with `v-model` and provide a `label`. The switch flips on click or keyboard activation.

**Demo — `switch/demos/BasicSwitch.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarSwitch v-model="darkMode" label="Dark mode" />
    <span style="font-size: 13px; color: #64748b;">Value: {{ darkMode }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSwitch } from '@cocoar/vue-ui';

const darkMode = ref(false);
</script>
```

## With Hint Text

Wrap in `CoarFormField` with a `hint` prop to add a brief explanation, helping users understand the consequence of toggling.

**Demo — `switch/demos/SwitchHint.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarFormField hint="Receive notifications about account activity.">
      <CoarSwitch v-model="notifications" label="Push notifications" />
    </CoarFormField>
    <CoarFormField hint="Automatically save changes every 5 minutes.">
      <CoarSwitch v-model="autoSave" label="Auto-save" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSwitch, CoarFormField } from '@cocoar/vue-ui';

const notifications = ref(true);
const autoSave = ref(false);
</script>
```

## States

Supports `disabled` (both on and off), `required`, and `error` states for complete form validation coverage.

**Demo — `switch/demos/SwitchStates.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarSwitch :model-value="true" label="Disabled (on)" :disabled="true" />
    <CoarSwitch :model-value="false" label="Disabled (off)" :disabled="true" />
    <CoarSwitch :model-value="false" label="Required switch" :required="true" />
    <CoarFormField error="This setting must be enabled">
      <CoarSwitch :model-value="false" label="With error" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarSwitch, CoarFormField } from '@cocoar/vue-ui';
</script>
```

## Sizes

Four sizes so the switch fits naturally alongside other controls at any density.

**Demo — `switch/demos/SwitchSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarSwitch :model-value="true" size="xs" label="Extra-small switch" />
    <CoarSwitch :model-value="true" size="s" label="Small switch" />
    <CoarSwitch :model-value="true" size="m" label="Medium switch (default)" />
    <CoarSwitch :model-value="true" size="l" label="Large switch" />
  </div>
</template>

<script setup lang="ts">
import { CoarSwitch } from '@cocoar/vue-ui';
</script>
```

## Label Position

Place the label before or after the switch with the `labelPosition` prop. Defaults to `'after'`.

**Demo — `switch/demos/SwitchLabelPosition.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarSwitch v-model="a" label="Label after (default)" label-position="after" />
    <CoarSwitch v-model="b" label="Label before" label-position="before" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSwitch } from '@cocoar/vue-ui';

const a = ref(true);
const b = ref(true);
</script>
```

## Settings Panel Example

Switches shine in settings panels where each row controls an independent feature. Here is a typical layout pattern.

**Demo — `switch/demos/SwitchSettingsPanel.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; max-width: 360px;">
    <div v-for="(item, i) in settings" :key="item.label" :style="{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: i < settings.length - 1 ? '1px solid var(--coar-border-neutral-secondary)' : 'none'
    }">
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <span style="font-size: 14px; font-weight: 600;">{{ item.label }}</span>
        <span style="font-size: 13px; color: #64748b;">{{ item.description }}</span>
      </div>
      <CoarSwitch :model-value="item.enabled" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarSwitch } from '@cocoar/vue-ui';

const settings = [
  { label: 'Email notifications', description: 'Get emails about activity', enabled: true },
  { label: 'Marketing emails', description: 'Promotions and updates', enabled: false },
  { label: 'Two-factor auth', description: 'Enhanced security', enabled: true },
];
</script>
```

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to switch |
| `Space` | Toggle on/off state |
| `Enter` | Toggle on/off state |

> **Info**
>
> Switches use `role="switch"` with `aria-checked` to properly communicate state to screen readers.

### Screen Reader Support

- Label text announces on focus
- On/off state properly communicated via `aria-checked`
- Hint text accessible via `aria-describedby`
- Error messages announced when present

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `boolean` | `false` | Switch on/off state |
| `label` | `string` | `''` | Label text |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Switch size |
| `disabled` | `boolean` | `false` | Disable the switch |
| `labelPosition` | `'before' \| 'after'` | `'after'` | Label position relative to the switch |
