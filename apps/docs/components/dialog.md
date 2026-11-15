---
description: "useDialog — promise-based modal dialogs for confirm, alert and custom components, with configurable buttons, sizes and localized labels."
devices: { desktop: ready, tablet: ready, phone: partial }
devicesNote: "On a phone use the bottom sheet (Preview); not yet checked on real devices, and Android's back button does not close it."
---

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

## Bottom sheet <Badge type="warning" text="Preview" /> {#sheet}

With `presentation: 'sheet'` a dialog opens as a sheet docked to the bottom of the screen,
closer to the thumb on a phone. It works for `open`, `confirm` and `alert`:

```ts
dialog.open(EditContact, { title: 'Contact', presentation: 'sheet' });
dialog.confirm({ title: 'Delete the entry?', message: '…', confirmVariant: 'danger', presentation: 'sheet' });
dialog.alert('Saved', '…', { presentation: 'sheet' });
```

<preview path="./dialog/demos/SheetDialog.vue" />

In phone size, with a form longer than the screen:

<PhoneFrame src="sheet" title="Dialogs as bottom sheets" />

The presentation is chosen per call and never derived from `coar-mobile` or the window
width: without `presentation` a dialog stays the centered dialog. Under `coar-mobile` the
sheet's buttons and fields get the mobile sizes, like any other overlay.

What the sheet does:

- **Layout**: full width, rounded top corners, as high as its content and at most the visible
  height minus 24 px. From a 640 px wide window on it keeps the width of its `size`,
  centered. A drag handle and the header (title, close button) on top; the content scrolls
  inside; the footer stays put.
- **Buttons**: the footer buttons span the full width, stacked with the confirming one on top,
  clear of the home indicator (`env(safe-area-inset-bottom)`).
- **On-screen keyboard**: the sheet follows `window.visualViewport`. It sits above the keyboard,
  shrinks with it, and the focused field is scrolled into the visible part.
- **Page behind**: does not scroll while a sheet is open. The centered dialog does not lock the
  page.
- **Closing**: the close button, a tap on the backdrop, Escape, and dragging down — the same
  switches as the dialog (`closeOnBackdropClick`, `closeOnEscape`, `showCloseButton`) plus
  `dragToClose`.
- **Drag**: only at the handle and the header, with finger, pen or mouse. Released after more
  than 30 % of its height or with a flick down, it closes; otherwise it springs back. Dragging
  the content scrolls it and never closes the sheet.
- **Focus**: trapped inside and returned on close, `role="dialog"` with `aria-modal`, as in the
  dialog. It slides in from below, without animation under `prefers-reduced-motion`.

### `CoarDialogFooter` <Badge type="warning" text="Preview" />

The buttons of a body component opened with `dialog.open()` go into `<CoarDialogFooter>`. It
moves them into the fixed footer of the dialog or sheet, so they stay visible while the content
scrolls; in a sheet they get the full width and the safe-area spacing of the confirm buttons.
Put the confirming button last. Outside a dialog or sheet it renders its content in place.

```vue
<script setup lang="ts">
import { CoarButton, CoarDialogFooter } from '@cocoar/vue-ui';

const props = defineProps<{ close: (result?: string) => void }>();
</script>

<template>
  <!-- fields … -->
  <CoarDialogFooter>
    <CoarButton variant="secondary" @click="props.close()">Cancel</CoarButton>
    <CoarButton @click="props.close('saved')">Save</CoarButton>
  </CoarDialogFooter>
</template>
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

::: warning Dialog vs Popconfirm
Use **Dialog** for modal confirmations that block the entire UI. Use **Popconfirm** for lightweight inline confirmations anchored near the trigger element. Dialogs are appropriate for higher-stakes, less frequent actions.
:::

## API

### `useDialog()` Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `dialog.confirm(options)` | `ConfirmOptions` | `DialogRef<boolean>` | Show a confirm/cancel dialog |
| `dialog.alert(title, message, config?)` | `string, string, { context?: Element, presentation?: DialogPresentation }?` | `DialogRef<void>` | Show an acknowledgement dialog. `config.context` and `config.presentation` <Badge type="warning" text="Preview" />: see [context](#context), [Bottom sheet](#sheet) |
| `dialog.open(component, config?, props?)` | `Component, DialogConfig?, Record?` | `DialogRef<T>` | Open a custom component inside the dialog |

### `DialogConfig`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | `''` | Dialog title |
| `size` | `'s' \| 'm' \| 'l' \| 'xl'` | `'m'` | Dialog width |
| `closeOnBackdropClick` | `boolean` | `true` | Close when the backdrop is clicked |
| `closeOnEscape` | `boolean` | `true` | Close on Escape |
| `showCloseButton` | `boolean` | `true` | Show the close (×) button |
| `context` <Badge type="warning" text="Preview" /> | `Element` | the calling component | Element the dialog belongs to, see [context](#context) |
| `presentation` <Badge type="warning" text="Preview" /> | `'dialog' \| 'sheet'` | `'dialog'` | Centered dialog or [bottom sheet](#sheet). With `'sheet'`, `size` only caps the width from a 640 px window on |
| `dragToClose` <Badge type="warning" text="Preview" /> | `boolean` | `closeOnBackdropClick` | Sheet only: whether dragging it down closes it |

### `ConfirmOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | — | Dialog title |
| `message` | `string` | — | Confirmation message body |
| `confirmText` | `string` | `'Confirm'` | Confirm button label |
| `cancelText` | `string` | `'Cancel'` | Cancel button label |
| `confirmVariant` | `'primary' \| 'danger'` | `'primary'` | Confirm button color variant |
| `size` | `'s' \| 'm' \| 'l'` | `'s'` | Dialog width |
| `context` <Badge type="warning" text="Preview" /> | `Element` | the calling component | Element the dialog belongs to, see [context](#context) |
| `presentation` <Badge type="warning" text="Preview" /> | `'dialog' \| 'sheet'` | `'dialog'` | Centered dialog or [bottom sheet](#sheet); a confirm sheet can always be dragged away |

### `DialogRef`

| Property | Type | Description |
|----------|------|-------------|
| `result` | `Promise<T \| undefined>` | Resolves when the dialog closes |
| `close(result?)` | `(val?: T) => void` | Programmatically close the dialog |

### `context` <Badge type="warning" text="Preview" /> {#context}

A dialog opened from a local `coar-mobile` area keeps the mobile presentation
of that area (see [Overlays from a local area](/guide/mobile#overlays)). Called
in a component's `setup()`, `useDialog()` uses that component's element as the
context. Outside `setup()` (stores, plain functions) pass it yourself:

```ts
useDialog().open(Body, { title: 'Edit', context: someEl });
```

An explicit `context` always wins. A local `CoarThemeScope` is not taken over
through `context`.

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.dialog.close` | `'Close dialog'` | Close button `aria-label` |
| `coar.ui.dialog.dialog` | `'Dialog'` | Fallback dialog `aria-label` (when no title) |
