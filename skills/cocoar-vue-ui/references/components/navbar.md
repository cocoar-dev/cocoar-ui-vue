<!-- Generated from apps/docs/components/navbar.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Navbar

A top-level navigation bar that anchors your application layout. It provides three flexible content slots -- start, center, and end -- so you can place a logo, navigation links, and user actions exactly where they belong. By default it uses a subtle shadow for visual elevation; switch to `bordered` for a flat look with a bottom border instead.

```ts
import { CoarNavbar } from '@cocoar/vue-ui';
```

## Basic Usage (Elevated)

The default navbar casts a light shadow to separate it from the page content below. Use all three slots for a complete navigation layout: brand on the left, links in the center, and call-to-action buttons on the right.

**Demo — `navbar/demos/NavbarBasic.vue`**

```vue
<template>
  <div style="border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden;">
    <CoarNavbar>
      <template #start>
        <strong style="font-size: var(--coar-body-base-size)">MyApp</strong>
      </template>
      <template #center>
        <nav style="display: flex; gap: 16px;">
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Home</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Features</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Pricing</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Docs</a>
        </nav>
      </template>
      <template #end>
        <CoarButton variant="ghost" size="s">Sign In</CoarButton>
        <CoarButton variant="primary" size="s">Get Started</CoarButton>
      </template>
    </CoarNavbar>
  </div>
</template>

<script setup lang="ts">
import { CoarNavbar, CoarButton } from '@cocoar/vue-ui';
</script>
```

## App Navbar with User Avatar

A common pattern for authenticated applications. The start slot holds the brand mark, the center slot contains primary navigation, and the end slot pairs notification controls with a user avatar.

**Demo — `navbar/demos/NavbarAvatar.vue`**

```vue
<template>
  <div style="border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden;">
    <CoarNavbar>
      <template #start>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 28px; height: 28px; background: var(--coar-background-accent-primary); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">C</div>
          <strong style="font-size: var(--coar-body-base-size)">cocoar</strong>
        </div>
      </template>
      <template #center>
        <nav style="display: flex; gap: 16px;">
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Dashboard</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Projects</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Team</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Reports</a>
        </nav>
      </template>
      <template #end>
        <CoarButton variant="ghost" icon-start="triangle-alert" size="s" aria-label="Notifications" />
        <CoarAvatar name="John Doe" size="s" />
      </template>
    </CoarNavbar>
  </div>
</template>

<script setup lang="ts">
import { CoarNavbar, CoarButton, CoarAvatar } from '@cocoar/vue-ui';
</script>
```

## Logo Only (Start Slot)

Not every navbar needs all three slots. For landing pages or simple tools, use just the start and end slots for a clean, minimal header.

**Demo — `navbar/demos/NavbarMinimal.vue`**

```vue
<template>
  <div style="border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden;">
    <CoarNavbar>
      <template #start>
        <strong>Brand</strong>
      </template>
      <template #end>
        <CoarButton variant="primary" size="s">Open App</CoarButton>
      </template>
    </CoarNavbar>
  </div>
</template>

<script setup lang="ts">
import { CoarNavbar, CoarButton } from '@cocoar/vue-ui';
</script>
```

## Bordered (No Shadow)

Prefer a flat aesthetic? The `bordered` prop swaps the drop shadow for a thin bottom border, giving the navbar a lighter visual weight that works well in dense dashboards.

**Demo — `navbar/demos/NavbarBordered.vue`**

```vue
<template>
  <div style="border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden;">
    <CoarNavbar bordered>
      <template #start>
        <strong>App</strong>
      </template>
      <template #end>
        <CoarButton variant="ghost" size="s">Menu</CoarButton>
      </template>
    </CoarNavbar>
  </div>
</template>

<script setup lang="ts">
import { CoarNavbar, CoarButton } from '@cocoar/vue-ui';
</script>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `elevated` | `boolean` | `true` | Show subtle box-shadow elevation |
| `bordered` | `boolean` | `false` | Show bottom border instead of shadow |

### Slots

| Slot | Description |
|------|-------------|
| `#start` | Left-aligned content (logo, brand name) |
| `#center` | Centered content (navigation links) |
| `#end` | Right-aligned content (actions, user menu) |
