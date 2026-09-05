<!-- Generated from apps/docs/components/notice.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Notice

Notices communicate short, timely status information. They are deliberately more compact than [Notes](./note.md): use a Notice for a sentence near a control or directly below an application header, and a Note for rich supporting content inside a page.

```ts
import { CoarNotice } from '@cocoar/vue-ui';
```

## Variants

Every variant has its own semantic color and default icon. The icon can be replaced with the `icon` prop.

**Demo — `notice/demos/NoticeVariants.vue`**

```vue
<script setup lang="ts">
import { CoarNotice } from '@cocoar/vue-ui';
</script>

<template>
  <div class="notice-stack">
    <CoarNotice variant="info" label="Information">A newer version is available.</CoarNotice>
    <CoarNotice variant="success" label="Saved">All changes were stored successfully.</CoarNotice>
    <CoarNotice variant="warning" label="Temporary storage">Uploaded files are removed on restart.</CoarNotice>
    <CoarNotice variant="error" label="Connection failed">The service could not be reached.</CoarNotice>
    <CoarNotice variant="neutral">Scheduled maintenance starts tonight at 22:00.</CoarNotice>
    <CoarNotice variant="accent" label="New">Explore the updated workspace experience.</CoarNotice>
  </div>
</template>

<style scoped>
.notice-stack {
  display: grid;
  gap: 8px;
}
</style>
```

## Banner

`placement="banner"` removes the radius and side borders so the Notice can sit flush below a header. The component is not sticky by itself—the surrounding application layout decides where it stays.

**Demo — `notice/demos/NoticeBanner.vue`**

```vue
<script setup lang="ts">
import { CoarLink, CoarNotice } from '@cocoar/vue-ui';
</script>

<template>
  <div class="banner-frame">
    <div class="fake-header">Application header</div>
    <CoarNotice placement="banner" variant="warning" label="Temporary storage">
      Uploaded files are retained until the next restart.
      <template #cta>
        <CoarLink size="s">Configure storage →</CoarLink>
      </template>
    </CoarNotice>
    <div class="fake-content">Application content</div>
  </div>
</template>

<style scoped>
.banner-frame {
  overflow: hidden;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-s);
}

.fake-header {
  padding: 14px 24px;
  background: var(--coar-background-semantic-info-bold);
  color: var(--coar-text-on-bold);
  font-weight: 600;
}

.fake-content {
  min-height: 92px;
  padding: 24px;
  color: var(--coar-text-neutral-secondary);
}
</style>
```

Banner text always wraps. For compact inline use, `truncate` can deliberately keep a message on one line.

## Details and actions

Keep the primary message short. Optional long-form information belongs in the `details` slot and opens in a popover. Put links or buttons in the `cta` slot; the Notice itself is intentionally not clickable.

**Demo — `notice/demos/NoticeActions.vue`**

```vue
<script setup lang="ts">
import { CoarLink, CoarNotice } from '@cocoar/vue-ui';
</script>

<template>
  <CoarNotice variant="info" label="Indexing">
    Three files are still being processed.
    <template #details>
      Search results may be incomplete until all uploaded files have been indexed.
    </template>
    <template #cta>
      <CoarLink size="s">View files</CoarLink>
    </template>
  </CoarNotice>
</template>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'neutral' \| 'info' \| 'success' \| 'warning' \| 'error' \| 'accent'` | `'info'` | Semantic color and default icon |
| `placement` | `'inline' \| 'banner'` | `'inline'` | Bordered callout or edge-to-edge banner |
| `label` | `string` | — | Bold lead-in; a colon is added |
| `icon` | `string` | variant default | Custom icon name |
| `truncate` | `boolean` | `false` | Single-line inline content; ignored for banners |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Short primary message |
| `details` | Long-form content shown in a popover |
| `cta` | Link or button aligned to the right |
