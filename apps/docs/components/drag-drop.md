---
description: "useDragDrop — HTML5 drag-and-drop composable with group, accept and canDrop matching rules for building custom drag surfaces like Kanban boards."
---

# Drag & Drop

`useDragDrop` is a small, framework-agnostic composable wrapping HTML5 drag-and-drop with the same group / accept / canDrop semantics used by [`CoarListbox`](/components/listbox#drag-drop-between-lists) — but usable from any Vue component. It takes care of the fiddly bits (module-level payload registry, group matching, directional whitelists, source-side cleanup on accept) so your component only needs to wire events.

```ts
import { useDragDrop } from '@cocoar/vue-ui';
```

## Standalone example — custom Kanban board

The demo below is built from plain `<div>` columns + cards, using `useDragDrop` directly — **no Listbox involved**. Cards flow **Backlog → In progress → Done**; Backlog accepts no drops (not a target), Done accepts from everywhere, In progress only accepts from Backlog:

<preview path="./drag-drop/demos/StandaloneKanban.vue" />

Each column is one component that wires the composable's `startDrag` / `endDrag` to its cards and `onDragOver` / `onDragLeave` / `onDrop` to itself:

```vue
<script setup lang="ts">
import { useDragDrop } from '@cocoar/vue-ui'

const dnd = useDragDrop<Card>({
  dragId: () => props.columnId,
  dragGroup: 'kanban',
  dragAccept: () => props.dragAccept,  // whitelist of upstream columns
  onDropAccept: ({ items }) => emit('items-add', { items }),
  onItemsRemove: ({ items }) => emit('items-remove', { items }),
})
</script>

<template>
  <div
    :class="{ 'over': dnd.isDragOver.value }"
    @dragover="dnd.onDragOver"
    @dragleave="dnd.onDragLeave"
    @drop="dnd.onDrop($event)"
  >
    <div
      v-for="card in cards"
      draggable="true"
      @dragstart="dnd.startDrag($event, [card])"
      @dragend="dnd.endDrag($event)"
    >{{ card.title }}</div>
  </div>
</template>
```

## Matching rules

A drop is accepted iff **all** of the following pass:

1. **`dragGroup`** on source and target is equal (or both unset). This is the fast coarse-matching layer.
2. **`dragAccept`** — if set on the target, the source's `dragId` must be in the list.
3. **`canDrop`** — if provided on the target, it must return `true` for the incoming payload.

Self-drops (drag within the same surface) bypass the group check but still honour `dragAccept` and `canDrop`. They also skip `onItemsRemove` — the source of truth already holds the item.

Visual feedback: when any rule fails during `dragover`, the composable sets `dropEffect = 'none'` (cursor shows "not allowed") and leaves `isDragOver` false — wire that ref to a CSS class for accurate hover highlighting.

## API

### `UseDragDropOptions<T>`

| Option | Type | Default | Description |
|---|---|---|---|
| `dragId` | `MaybeRefOrGetter<string \| undefined>` | — | Public identifier for this surface. Pair with another surface's `dragAccept` for directional flow. |
| `dragGroup` | `MaybeRefOrGetter<string \| undefined>` | — | Shared name linking compatible surfaces. Only surfaces sharing a group exchange items. |
| `dragAccept` | `MaybeRefOrGetter<string[] \| undefined>` | — | Whitelist of source `dragId`s this surface accepts. Unset = accept any source in the same `dragGroup`. |
| `canDrop` | `(payload) => boolean` | — | Runtime drop validation. `payload = { items, fromId, fromGroup, fromSelf }`. |
| `onDragStart` | `(items) => void` | — | Called after `startDrag` registers a drag. |
| `onDragEnd` | `({ items, dropped }) => void` | — | Called on `dragend` — `dropped: true` if a target consumed the payload. |
| `onDropAccept` | `(payload & { insertIndex }) => void` | — | Called on **this** surface when it accepts a drop. Update your source of truth here. |
| `onItemsRemove` | `({ items, toGroup }) => void` | — | Called on the **source** surface when another target consumed its payload — fires synchronously inside the target's `drop`. Update your source of truth here. |

### Return value

| Field | Type | Description |
|---|---|---|
| `instanceId` | `string` | Stable per-instance identifier (auto-generated). |
| `isDragOver` | `Ref<boolean>` | `true` while a compatible drag is hovering this surface. Wire to a CSS class. |
| `isDragging` | `Ref<boolean>` | `true` while this surface is the source of an in-flight drag. |
| `startDrag` | `(event, items) => boolean` | Call from `@dragstart` on a draggable element. Returns `false` for empty payloads. |
| `endDrag` | `(event) => void` | Call from `@dragend`. Cleans up the session and fires `onDragEnd`. |
| `onDragOver` | `(event) => void` | Call from the drop container's `@dragover`. |
| `onDragLeave` | `(event) => void` | Call from `@dragleave`. Ignores events whose relatedTarget is still inside the container. |
| `onDrop` | `(event, ctx?) => void` | Call from `@drop`. Optional `ctx.insertIndex` is forwarded to `onDropAccept`. |

## Engines

The same contract runs on two input engines. Pick one per surface with `engine`; the matching rules, `onDropAccept` / `onItemsRemove` and the registry are shared, so a source on one engine simply cannot reach a target on the other — but everything else stays identical.

| Engine | Input | Targets | Use when |
|---|---|---|---|
| `'native'` (default) | HTML5 drag events | any HTML5 drop target: other Cocoar components, the OS, other apps | desktop |
| `'pointer'` | Pointer Events — mouse, pen, touch (long-press) | surfaces using `useDragDrop` with the pointer engine | tablets, touch-first views |
| `'auto'` | picks `'pointer'` on coarse-pointer devices | — | one setting for both |

```ts
const dnd = useDragDrop<Row>({
  engine: 'auto',
  dragGroup: 'rows',
  pointer: {
    target: containerRef,                       // registered as a pointer drop surface
    onHover: (point, payload) => { insertAt.value = indexAt(point) },
    onLeave: () => { insertAt.value = null },
    onDrop: () => insertAt.value,               // becomes onDropAccept's insertIndex
  },
  onDropAccept, onItemsRemove,
})
```

```vue
<!-- source: wire pointerdown next to the native handlers; the engine decides which one acts -->
<div :draggable="dnd.engine.value === 'native' || undefined"
     @dragstart="dnd.startDrag($event, [row])" @dragend="dnd.endDrag"
     @pointerdown="dnd.onPointerDown($event, [row])">
```

`onPointerDown` accepts a getter for the items, resolved when the drag actually starts (after the mouse threshold or the touch long-press). Drags never start from interactive children (buttons, inputs, links). A ghost cloned from the source follows the pointer; pass `pointer.ghost` for your own element or `false` for none. `Escape` cancels. Accepting OS files is a plain `drop` listener and is unaffected by the engine. Components exposing this choice: `CoarDataList` (`dragEngine`), `CoarListbox` / `CoarDualListbox` (`dragEngine`).

## Patterns

**Two-way exchange** — both surfaces draggable + droppable + same `dragGroup`:

```ts
useDragDrop({ dragGroup: 'items', onDropAccept, onItemsRemove })
```

**One-way flow** — give each source a unique `dragId`, whitelist on the target:

```ts
// source (box1)
useDragDrop({ dragId: 'box1', dragGroup: 'flow' })
// target (box2) — only accepts from box1
useDragDrop({ dragGroup: 'flow', dragAccept: ['box1'], onDropAccept })
```

**Capacity limits** — reject in `canDrop`:

```ts
useDragDrop({
  dragGroup: 'roles',
  canDrop: ({ items }) => admins.value.length + items.length <= 5,
  onDropAccept,
})
```

**Integration with existing components** — `CoarListbox` uses this composable internally. If you're building a new component that needs the same drag semantics, reach for `useDragDrop` rather than reimplementing the registry.

## Custom drag ghosts

The browser's default drag image is a semi-transparent snapshot of the dragged element. That looks fine for small items but turns into a giant faded blob for a large card or a nested tree node. Two tiny helpers attached to the same package give you a styled ghost next to the cursor without the boilerplate of cloning, off-screen mounting, and cleanup.

```ts
import {
  setCoarDragImageFromElement,
  setCoarDragImageFromHtml,
} from '@cocoar/vue-ui';

function onDragStart(event: DragEvent) {
  setCoarDragImageFromElement(event, event.currentTarget as HTMLElement);
}
```

The helper clones the source element, sizes the clone to match the source's bounding box, mounts it off-screen (horizontally, because Chromium skips rendering elements that are entirely outside the viewport — and an unrendered ghost captures as an empty bitmap), calls `dataTransfer.setDragImage`, and removes the clone on the next macrotask so the browser has time to rasterise it.

For a free-form ghost that doesn't mirror an existing element, use the HTML variant:

```ts
setCoarDragImageFromHtml(event, `
  <div style="padding: 6px 10px; font-size: 12px;">
    Moving 3 items
  </div>
`);
```

### API

#### `setCoarDragImageFromElement(event, source, options?)`

| Argument | Type | Description |
|---|---|---|
| `event` | `DragEvent` | The `dragstart` event. Called synchronously inside the handler. |
| `source` | `HTMLElement` | Element to clone as the ghost. The live element is not visually disturbed. |
| `options` | `CoarDragImageOptions` | Optional styling overrides. See below. |

#### `setCoarDragImageFromHtml(event, html, options?)`

Same contract, but builds the ghost from a raw HTML string instead of cloning an element. Useful for "drag summary" previews (e.g. "Moving 3 items") that don't correspond to a single DOM node.

#### `CoarDragImageOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `offsetX` | `number` | `12` | Cursor offset within the ghost, in px. |
| `offsetY` | `number` | `12` | Cursor offset within the ghost, in px. |
| `className` | `string` | — | CSS class applied to the generated wrapper so consumers can theme the ghost. |
| `style` | `Partial<CSSStyleDeclaration>` | — | Inline styles merged onto the wrapper. Prefer `className` when possible. |
| `applyDefaultStyle` | `boolean` | `true` | Apply the default rounded-corner, drop-shadow, 0.9 opacity treatment. Set to `false` when the caller handles all styling via `className`. |
