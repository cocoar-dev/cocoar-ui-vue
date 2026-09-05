<!-- Generated from apps/docs/components/popconfirm.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Popconfirm

A lightweight confirmation bubble that appears right next to the trigger element. Use it for quick "are you sure?" moments -- deleting a row, removing a team member, or publishing a change -- without pulling the user out of context with a full-screen modal dialog.

```ts
import { CoarPopconfirm } from '@cocoar/vue-ui';
```

## Basic Usage

Wrap any button (or other trigger) in `CoarPopconfirm`. When the trigger is clicked, a small confirmation panel appears nearby with confirm and cancel actions.

**Demo — `popconfirm/demos/PopconfirmBasic.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopconfirm
      title="Delete item?"
      message="This action cannot be undone."
      @confirmed="lastAction = 'deleted'"
      @cancelled="lastAction = 'cancelled'"
    >
      <CoarButton variant="danger" icon-start="trash-2">Delete</CoarButton>
    </CoarPopconfirm>
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
    Last action: {{ lastAction || 'none' }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarPopconfirm } from '@cocoar/vue-ui';

const lastAction = ref('');
</script>
```

## Variants

Use `confirmVariant="danger"` for destructive operations to make the risk visually clear. The `"primary"` variant (default) suits non-destructive confirmations like publishing or saving.

**Demo — `popconfirm/demos/PopconfirmVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopconfirm
      title="Are you sure?"
      message="This is a destructive action."
      confirmVariant="danger"
      @confirmed="lastAction = 'danger-confirmed'"
    >
      <CoarButton variant="danger">Danger</CoarButton>
    </CoarPopconfirm>

    <CoarPopconfirm
      title="Confirm action"
      message="This will apply the changes."
      confirmVariant="primary"
      @confirmed="lastAction = 'primary-confirmed'"
    >
      <CoarButton variant="primary">Primary</CoarButton>
    </CoarPopconfirm>
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
    Last action: {{ lastAction || 'none' }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarPopconfirm } from '@cocoar/vue-ui';

const lastAction = ref('');
</script>
```

## Custom Labels

Replace the default "OK" / "Cancel" labels with language that describes the actual action. Specific labels like "Yes, remove" and "Keep member" help users make confident decisions.

**Demo — `popconfirm/demos/PopconfirmLabels.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopconfirm
      title="Remove from team?"
      message="The user will lose access immediately."
      confirmText="Yes, remove"
      cancelText="Keep member"
      confirmVariant="danger"
      @confirmed="lastAction = 'removed'"
    >
      <CoarButton variant="danger">Remove Member</CoarButton>
    </CoarPopconfirm>

    <CoarPopconfirm
      title="Publish changes?"
      message="This will be visible to all users."
      confirmText="Publish now"
      cancelText="Not yet"
      @confirmed="lastAction = 'published'"
    >
      <CoarButton variant="primary">Publish</CoarButton>
    </CoarPopconfirm>
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
    Last action: {{ lastAction || 'none' }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarPopconfirm } from '@cocoar/vue-ui';

const lastAction = ref('');
</script>
```

## Placement

Control which side of the trigger the confirmation panel appears on. Pick the placement that best avoids clipping against viewport edges in your layout.

**Demo — `popconfirm/demos/PopconfirmPlacement.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopconfirm title="Top placement" message="Appears above the trigger." placement="top" @confirmed="lastAction = 'top'">
      <CoarButton variant="secondary">Top</CoarButton>
    </CoarPopconfirm>
    <CoarPopconfirm title="Bottom placement" message="Appears below the trigger." placement="bottom" @confirmed="lastAction = 'bottom'">
      <CoarButton variant="secondary">Bottom</CoarButton>
    </CoarPopconfirm>
    <CoarPopconfirm title="Right placement" message="Appears to the right." placement="right" @confirmed="lastAction = 'right'">
      <CoarButton variant="secondary">Right</CoarButton>
    </CoarPopconfirm>
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
    Last action: {{ lastAction || 'none' }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarPopconfirm } from '@cocoar/vue-ui';

const lastAction = ref('');
</script>
```

> **Info: Popconfirm vs Dialog**
>
> Use **Popconfirm** for quick inline confirmations that keep the user in context. Use **Dialog** when the confirmation needs a longer explanation, additional form fields, or when the action affects multiple items.

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | required | Confirmation message body |
| `title` | `string` | `''` | Optional title above the message |
| `confirmText` | `string` | `'OK'` | Confirm button label |
| `cancelText` | `string` | `'Cancel'` | Cancel button label |
| `confirmVariant` | `'primary' \| 'danger'` | `'primary'` | Confirm button color variant |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Preferred placement |
| `disabled` | `boolean` | `false` | Disable the popconfirm trigger |

### Events

| Event | Description |
|-------|-------------|
| `confirmed` | Emitted when the confirm button is clicked |
| `cancelled` | Emitted when the cancel button is clicked or overlay is dismissed |

### Slots

| Slot | Description |
|------|-------------|
| `default` | The trigger element that opens the popconfirm |
