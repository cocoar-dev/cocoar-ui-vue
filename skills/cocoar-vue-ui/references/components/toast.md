<!-- Generated from apps/docs/components/toast.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Toast

Non-blocking notification messages that slide in, deliver a brief update, and dismiss themselves. Toasts are perfect for confirming background actions -- a file uploaded, a record saved, or a network error encountered -- without interrupting the user's current workflow.

```ts
import { useToast } from '@cocoar/vue-ui';
```

## Variants

Four semantic variants communicate the nature of the notification at a glance. Click each button below to see the corresponding toast.

**Demo — `toast/demos/ToastVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="primary" @click="showSuccess">Success</CoarButton>
    <CoarButton variant="danger" @click="showError">Error</CoarButton>
    <CoarButton variant="secondary" @click="showWarning">Warning</CoarButton>
    <CoarButton variant="ghost" @click="showInfo">Info</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, useToast } from '@cocoar/vue-ui';

const toast = useToast();

function showSuccess() {
  toast.success('Changes saved successfully!', { title: 'Saved' });
}
function showError() {
  toast.error('Something went wrong. Please try again.', { title: 'Error' });
}
function showWarning() {
  toast.warning('Your session will expire in 5 minutes.', { title: 'Warning' });
}
function showInfo() {
  toast.info('A new version is available. Refresh to update.', { title: 'Update Available' });
}
</script>
```

## Without Title

For straightforward messages, skip the title entirely. A single-line toast keeps the notification compact and fast to read.

**Demo — `toast/demos/ToastNoTitle.vue`**

```vue
<template>
  <CoarButton @click="showNoTitle">Simple message</CoarButton>
</template>

<script setup lang="ts">
import { CoarButton, useToast } from '@cocoar/vue-ui';

const toast = useToast();

function showNoTitle() {
  toast.success('File uploaded successfully.');
}
</script>
```

## Duration Control

By default, toasts dismiss after 5 seconds (error toasts stay until dismissed). Pass a custom `duration` in milliseconds for longer messages, or set `duration: 0` to create a persistent toast that stays visible until the user explicitly dismisses it.

**Demo — `toast/demos/ToastDuration.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="secondary" @click="showLong">Long duration (6s)</CoarButton>
    <CoarButton variant="secondary" @click="showPersistent">Persistent (no auto-dismiss)</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, useToast } from '@cocoar/vue-ui';

const toast = useToast();

function showLong() {
  toast.info('This is a longer notification message that contains more detailed information about what just happened in the application.', {
    title: 'Detailed Message',
    duration: 6000,
  });
}

function showPersistent() {
  toast.warning('This notification stays until dismissed.', {
    title: 'Persistent',
    duration: 0,
  });
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

Then add the toast container to your `App.vue`:

```vue
<template>
  <RouterView />
  <CoarToastContainer />
</template>
```

`<CoarToastContainer />` needs no props — its `service` defaults to the `getToastService()` singleton that `CoarOverlayPlugin` registers (the same one `useToast()` wraps). Pass an explicit `:service` only for a non-singleton instance (e.g. an isolated test harness). If the plugin isn't installed it throws a clear "install `CoarOverlayPlugin`" error rather than rendering nothing.

## API

### `useToast()` Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `toast.show(config)` | `ToastConfig` | Show a fully custom toast |
| `toast.success(message, config?)` | `string, Partial<ToastConfig>?` | Show success toast |
| `toast.error(message, config?)` | `string, Partial<ToastConfig>?` | Show error toast (persistent by default) |
| `toast.warning(message, config?)` | `string, Partial<ToastConfig>?` | Show warning toast |
| `toast.info(message, config?)` | `string, Partial<ToastConfig>?` | Show info toast |
| `toast.dismissAll()` | — | Dismiss all visible toasts |

### `ToastConfig`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `message` | `string` | — | Toast message (required for `show()`) |
| `title` | `string` | `undefined` | Optional toast title |
| `duration` | `number` | `5000` (errors: `0`) | Duration in ms (0 = persistent) |
| `position` | `'top-right' \| 'top-left' \| 'top-center' \| 'bottom-right' \| 'bottom-left' \| 'bottom-center'` | `'top-right'` | Screen position |
| `dismissible` | `boolean` | `true` | Show close button |
| `showProgress` | `boolean` | `true` | Show progress bar |
| `action` | `{ label: string; callback: () => void }` | `undefined` | Optional action button |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.toast.dismiss` | `'Dismiss notification'` | Dismiss button `aria-label` |
| `coar.ui.toast.notifications` | `'Notifications'` | Toast container region `aria-label` |
