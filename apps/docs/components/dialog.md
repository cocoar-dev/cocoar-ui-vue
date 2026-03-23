# Dialog

Modal dialogs demand attention. They block interaction with the rest of the page until the user makes a decision, making them the right choice for destructive actions, important confirmations, and messages that must be acknowledged before proceeding. Use them sparingly -- when the stakes are high enough to justify interrupting the user's flow.

```ts
import { useDialog } from '@cocoar/vue-ui';
```

## Confirm Dialog

Use `dialog.confirm()` when you need an explicit yes-or-no decision before proceeding. The returned promise resolves with `true` (confirmed) or `false` / `undefined` (cancelled / dismissed).

<preview path="./dialog/demos/ConfirmDialog.vue" />

## Alert Dialog

Use `dialog.alert()` for one-way messages that require acknowledgement -- session expirations, permission errors, or completion notices. The user can only dismiss it; there is no secondary action.

<preview path="./dialog/demos/AlertDialog.vue" />

## Setup

Register the overlay plugin once in your app entry point:

```ts
// main.ts
import { CoarOverlayPlugin } from '@cocoar/vue-ui';

createApp(App)
  .use(CoarOverlayPlugin)
  .mount('#app');
```

::: warning Dialog vs Popconfirm
Use **Dialog** for modal confirmations that block the entire UI. Use **Popconfirm** for lightweight inline confirmations anchored near the trigger element. Dialogs are appropriate for higher-stakes, less frequent actions.
:::

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

These keys can be translated via [`@cocoar/vue-localization`](/guide/i18n).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.dialog.close` | `'Close dialog'` | Close button `aria-label` |
