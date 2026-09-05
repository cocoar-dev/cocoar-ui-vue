<!-- Generated from apps/docs/components/popover.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Popover

Popovers display rich, interactive content anchored to a trigger element. Unlike tooltips (which are text-only and non-interactive), popovers can hold forms, menus, formatted text, and action buttons. They stay open until the user clicks away or presses Escape, giving people time to interact with the content inside.

```ts
import { CoarPopover } from '@cocoar/vue-ui';
```

## Basic Popover (Click)

Set `mode="click"` to open the popover on click. This is the best mode for action menus and content that users need to interact with. Click outside the popover or press Escape to dismiss it.

**Demo — `popover/demos/PopoverBasic.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopover mode="click">
      <CoarButton>Open Popover</CoarButton>
      <template #content>
        <div style="padding: 16px; max-width: 240px;">
          <h4 style="margin: 0 0 4px;">Popover Title</h4>
          <p style="margin: 0; font-size: 13px;">This is rich content inside a popover. It can contain forms, lists, and other interactive components.</p>
          <CoarButton variant="primary" size="s" style="margin-top: 8px;">Action</CoarButton>
        </div>
      </template>
    </CoarPopover>

    <CoarPopover mode="click">
      <CoarButton variant="secondary">More options</CoarButton>
      <template #content>
        <div style="display: flex; flex-direction: column; padding: 4px; gap: 2px; min-width: 140px;">
          <CoarButton variant="ghost" size="s">Edit</CoarButton>
          <CoarButton variant="ghost" size="s">Duplicate</CoarButton>
          <CoarButton variant="ghost" size="s">Archive</CoarButton>
          <CoarButton variant="danger" size="s">Delete</CoarButton>
        </div>
      </template>
    </CoarPopover>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, CoarPopover } from '@cocoar/vue-ui';
</script>
```

## Hover Mode

The default `mode="hover"` opens the popover when the pointer enters the trigger. Use `mode="both"` to support both hover preview and click-to-pin behavior -- the popover opens on hover and stays pinned after a click.

**Demo — `popover/demos/PopoverHover.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopover mode="hover">
      <CoarButton variant="ghost">Hover me</CoarButton>
      <template #content>
        <div style="padding: 16px; max-width: 240px;">
          <p style="margin: 0; font-size: 13px;">This popover opens on hover. Great for supplementary information.</p>
        </div>
      </template>
    </CoarPopover>

    <CoarPopover mode="both">
      <CoarButton variant="secondary">Hover or click</CoarButton>
      <template #content>
        <div style="padding: 16px; max-width: 240px;">
          <p style="margin: 0; font-size: 13px;">Opens on hover. Click to pin it open — then click again to close.</p>
        </div>
      </template>
    </CoarPopover>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, CoarPopover } from '@cocoar/vue-ui';
</script>
```

## User Menu

A classic application pattern: clicking an avatar reveals a small card with the user's identity and quick actions like profile, settings, and sign-out.

**Demo — `popover/demos/PopoverUserMenu.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopover mode="click">
      <CoarAvatar name="John Doe" size="s" style="cursor: pointer" />
      <template #content>
        <div style="min-width: 180px;">
          <div style="padding: 8px 16px; border-bottom: 1px solid var(--coar-border-neutral-secondary); margin-bottom: 4px;">
            <p style="margin: 0; font-weight: 600; font-size: 13px;">John Doe</p>
            <p style="margin: 0; font-size: 13px; color: var(--coar-text-neutral-secondary);">john@example.com</p>
          </div>
          <div style="display: flex; flex-direction: column; padding: 4px; gap: 2px;">
            <CoarButton variant="ghost" size="s">Profile</CoarButton>
            <CoarButton variant="ghost" size="s">Settings</CoarButton>
            <CoarButton variant="danger" size="s">Sign Out</CoarButton>
          </div>
        </div>
      </template>
    </CoarPopover>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, CoarPopover, CoarAvatar } from '@cocoar/vue-ui';
</script>
```

## Info Popover

Attach a hover popover to an icon button to provide contextual help without navigating the user away from their current task. This works well for explaining features, showing rate limits, or surfacing inline guidance.

**Demo — `popover/demos/PopoverInfo.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopover mode="hover">
      <CoarButton variant="ghost" icon-start="circle-help" aria-label="More information" />
      <template #content>
        <div style="padding: 16px; max-width: 240px;">
          <h4 style="margin: 0 0 4px;">How it works</h4>
          <p style="margin: 0; font-size: 13px;">This feature uses your account's default timezone. You can change this in Settings &rarr; Preferences.</p>
        </div>
      </template>
    </CoarPopover>

    <CoarPopover mode="hover">
      <CoarButton variant="ghost" icon-start="triangle-alert" aria-label="Warning details" />
      <template #content>
        <div style="padding: 16px; max-width: 240px;">
          <h4 style="margin: 0 0 4px;">Rate limit approaching</h4>
          <p style="margin: 0; font-size: 13px;">You've used 80% of your monthly API limit. Upgrade to increase your quota.</p>
        </div>
      </template>
    </CoarPopover>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, CoarPopover } from '@cocoar/vue-ui';
</script>
```

> **Info: Slot names**
>
> Place the trigger in the **default slot** and the content in **`#content`**. The popover auto-positions itself to stay within the viewport -- no placement prop needed.

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `'hover' \| 'click' \| 'both'` | `'hover'` | How the popover is triggered |
| `disabled` | `boolean` | `false` | Prevent the popover from opening |
| `interactive` | `boolean` | `true` | Whether the panel receives pointer events |
| `offset` | `number` | `6` | Gap in px between trigger and panel |

### Slots

| Slot | Description |
|------|-------------|
| `default` | The trigger element that opens the popover |
| `#content` | The popover panel content |
