# Toast

Non-blocking notification messages that slide in, deliver a brief update, and dismiss themselves. Toasts are perfect for confirming background actions -- a file uploaded, a record saved, or a network error encountered -- without interrupting the user's current workflow.

```ts
import { useToast } from '@cocoar/vue-ui';
```

## Variants

Four semantic variants communicate the nature of the notification at a glance. Click each button below to see the corresponding toast.

<preview path="./toast/demos/ToastVariants.vue" />

## Without Title

For straightforward messages, skip the title entirely. A single-line toast keeps the notification compact and fast to read.

<preview path="./toast/demos/ToastNoTitle.vue" />

## Duration Control

By default, toasts dismiss after 5 seconds (error toasts stay until dismissed). Pass a custom `duration` in milliseconds for longer messages, or set `duration: 0` to create a persistent toast that stays visible until the user explicitly dismisses it.

<preview path="./toast/demos/ToastDuration.vue" />

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

These keys can be translated via [`@cocoar/vue-localization`](/guide/i18n).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.toast.dismiss` | `'Dismiss notification'` | Dismiss button `aria-label` |
