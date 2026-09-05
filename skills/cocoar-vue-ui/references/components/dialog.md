<!-- Generated from apps/docs/components/dialog.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Dialog

Modal dialogs demand attention. They block interaction with the rest of the page until the user makes a decision, making them the right choice for destructive actions, important confirmations, and messages that must be acknowledged before proceeding. Use them sparingly -- when the stakes are high enough to justify interrupting the user's flow.

```ts
import { useDialog } from '@cocoar/vue-ui';
```

## Confirm Dialog

Use `dialog.confirm()` when you need an explicit yes-or-no decision before proceeding. The returned promise resolves with `true` (confirmed) or `false` / `undefined` (cancelled / dismissed).

**Demo — `dialog/demos/ConfirmDialog.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="danger" icon-start="trash-2" @click="openConfirm">Delete Item</CoarButton>
    <CoarButton variant="primary" @click="openConfirmPrimary">Publish Changes</CoarButton>
    <CoarButton variant="secondary" @click="openLarge">Terms & Conditions</CoarButton>
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
    Last result: {{ lastResult || 'none' }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, useDialog } from '@cocoar/vue-ui';

const dialog = useDialog();
const lastResult = ref('');

function openConfirm() {
  dialog.confirm({
    title: 'Delete item?',
    message: 'This action cannot be undone. Are you sure you want to delete this item?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmVariant: 'danger',
  }).result.then((confirmed) => {
    lastResult.value = confirmed ? 'deleted' : 'cancelled';
  });
}

function openConfirmPrimary() {
  dialog.confirm({
    title: 'Publish changes?',
    message: 'This will make your changes visible to all users.',
    confirmText: 'Publish',
    cancelText: 'Not yet',
    confirmVariant: 'primary',
  }).result.then((confirmed) => {
    lastResult.value = confirmed ? 'published' : 'kept draft';
  });
}

function openLarge() {
  dialog.confirm({
    title: 'Terms & Conditions',
    message: 'By continuing, you agree to our Terms of Service and Privacy Policy. Please review the full terms before accepting. This agreement governs your use of the platform and all associated services.',
    confirmText: 'I Agree',
    cancelText: 'Decline',
    size: 'm',
  }).result.then((confirmed) => {
    lastResult.value = confirmed ? 'agreed' : 'declined';
  });
}
</script>
```

## Alert Dialog

Use `dialog.alert()` for one-way messages that require acknowledgement -- session expirations, permission errors, or completion notices. The user can only dismiss it; there is no secondary action.

**Demo — `dialog/demos/AlertDialog.vue`**

```vue
<template>
  <CoarButton variant="secondary" @click="openAlert">Show Alert</CoarButton>
</template>

<script setup lang="ts">
import { CoarButton, useDialog } from '@cocoar/vue-ui';

const dialog = useDialog();

function openAlert() {
  dialog.alert('Session expired', 'Your session has expired. Please sign in again to continue.');
}
</script>
```

## Setup

Register the overlay plugin once in your app entry point:

```ts
// main.ts
import { CoarOverlayPlugin } from '@cocoar/vue-ui';

createApp(App)
  .use(CoarOverlayPlugin)
  .mount('#app');
```

> **Warning: Dialog vs Popconfirm**
>
> Use **Dialog** for modal confirmations that block the entire UI. Use **Popconfirm** for lightweight inline confirmations anchored near the trigger element. Dialogs are appropriate for higher-stakes, less frequent actions.

## API

### `useDialog()` Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `dialog.confirm(options)` | `ConfirmOptions` | `DialogRef<boolean>` | Show a confirm/cancel dialog |
| `dialog.alert(title, message)` | `string, string` | `DialogRef<void>` | Show an acknowledgement dialog |
| `dialog.open(component, config?, props?)` | `Component, DialogConfig?, Record?` | `DialogRef<T>` | Open a custom component inside the dialog |

### `ConfirmOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | — | Dialog title |
| `message` | `string` | — | Confirmation message body |
| `confirmText` | `string` | `'Confirm'` | Confirm button label |
| `cancelText` | `string` | `'Cancel'` | Cancel button label |
| `confirmVariant` | `'primary' \| 'danger'` | `'primary'` | Confirm button color variant |
| `size` | `'s' \| 'm' \| 'l'` | `'s'` | Dialog width |

### `DialogRef`

| Property | Type | Description |
|----------|------|-------------|
| `result` | `Promise<T \| undefined>` | Resolves when the dialog closes |
| `close(result?)` | `(val?: T) => void` | Programmatically close the dialog |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.dialog.close` | `'Close dialog'` | Close button `aria-label` |
| `coar.ui.dialog.dialog` | `'Dialog'` | Fallback dialog `aria-label` (when no title) |
