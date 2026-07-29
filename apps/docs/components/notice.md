---
description: "CoarNotice — compact inline notices and application banners with six semantic variants"
---

# Notice

Notices communicate short, timely status information. They are deliberately more compact than [Notes](./note): use a Notice for a sentence near a control or directly below an application header, and a Note for rich supporting content inside a page.

```ts
import { CoarNotice } from '@cocoar/vue-ui';
```

## Variants

Every variant has its own semantic color and default icon. The icon can be replaced with the `icon` prop.

<preview path="./notice/demos/NoticeVariants.vue" />

## Banner

`placement="banner"` removes the radius and side borders so the Notice can sit flush below a header. The component is not sticky by itself—the surrounding application layout decides where it stays.

<preview path="./notice/demos/NoticeBanner.vue" />

Banner text always wraps. For compact inline use, `truncate` can deliberately keep a message on one line.

## Details and actions

Keep the primary message short. Optional long-form information belongs in the `details` slot and opens in a popover. Put links or buttons in the `cta` slot; the Notice itself is intentionally not clickable.

<preview path="./notice/demos/NoticeActions.vue" />

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
