---
description: "CoarPopconfirm — inline confirmation bubble anchored to a trigger element, with confirm/cancel actions, danger variant, custom labels and placement control"
---

# Popconfirm

A lightweight confirmation bubble that appears right next to the trigger element. Use it for quick "are you sure?" moments -- deleting a row, removing a team member, or publishing a change -- without pulling the user out of context with a full-screen modal dialog.

```ts
import { CoarPopconfirm } from '@cocoar/vue-ui';
```

## Basic Usage

Wrap any button (or other trigger) in `CoarPopconfirm`. When the trigger is clicked, a small confirmation panel appears nearby with confirm and cancel actions.

<preview path="./popconfirm/demos/PopconfirmBasic.vue" />

## Variants

Use `confirmVariant="danger"` for destructive operations to make the risk visually clear. The `"primary"` variant (default) suits non-destructive confirmations like publishing or saving.

<preview path="./popconfirm/demos/PopconfirmVariants.vue" />

## Custom Labels

Replace the default "OK" / "Cancel" labels with language that describes the actual action. Specific labels like "Yes, remove" and "Keep member" help users make confident decisions.

<preview path="./popconfirm/demos/PopconfirmLabels.vue" />

## Placement

Control which side of the trigger the confirmation panel appears on. Pick the placement that best avoids clipping against viewport edges in your layout.

<preview path="./popconfirm/demos/PopconfirmPlacement.vue" />

::: info Popconfirm vs Dialog
Use **Popconfirm** for quick inline confirmations that keep the user in context. Use **Dialog** when the confirmation needs a longer explanation, additional form fields, or when the action affects multiple items.
:::

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
