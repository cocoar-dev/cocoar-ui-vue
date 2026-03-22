# Popover

Popovers display rich, interactive content anchored to a trigger element. Unlike tooltips (which are text-only and non-interactive), popovers can hold forms, menus, formatted text, and action buttons. They stay open until the user clicks away or presses Escape, giving people time to interact with the content inside.

```ts
import { CoarPopover } from '@cocoar/vue-ui';
```

## Basic Popover (Click)

Set `mode="click"` to open the popover on click. This is the best mode for action menus and content that users need to interact with. Click outside the popover or press Escape to dismiss it.

<preview path="./popover/demos/PopoverBasic.vue" />

## Hover Mode

The default `mode="hover"` opens the popover when the pointer enters the trigger. Use `mode="both"` to support both hover preview and click-to-pin behavior -- the popover opens on hover and stays pinned after a click.

<preview path="./popover/demos/PopoverHover.vue" />

## User Menu

A classic application pattern: clicking an avatar reveals a small card with the user's identity and quick actions like profile, settings, and sign-out.

<preview path="./popover/demos/PopoverUserMenu.vue" />

## Info Popover

Attach a hover popover to an icon button to provide contextual help without navigating the user away from their current task. This works well for explaining features, showing rate limits, or surfacing inline guidance.

<preview path="./popover/demos/PopoverInfo.vue" />

::: info Slot names
Place the trigger in the **default slot** and the content in **`#content`**. The popover auto-positions itself to stay within the viewport -- no placement prop needed.
:::

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
