# Tree

A generic, keyboard-navigable, drag-drop-aware tree primitive. Identity, children and label are extracted via prop functions — render any node shape (file systems, navigation, settings, categories, …) without forcing a common base type.

```ts
import {
  CoarTree,
  useTree,
  type CoarTreeNodeMoveEvent,
  type CoarTreeFilesDropEvent,
} from '@cocoar/vue-ui';
```

::: info Two APIs
`<CoarTree>` works in two modes:

- **Props-mode** — pass `nodes`, `getId`, `getChildren`, etc. as props; wire `<CoarContextMenu>` yourself. Good for simple cases.
- **Builder-mode** — `useTree()` returns a fluent builder. Declarative per-target context menus are rendered internally, the imperative `api` lets you focus nodes from outside the component. Recommended for anything beyond the basics.

The two compose — but pick one per `<CoarTree>` instance; mixing props and builder on the same instance is a footgun.
:::

::: tip Desktop-first
`<CoarTree>` is an explicit exception to the library's tablet-first principle. Right-click context menus and hover-revealed UI on rows (⋮ buttons, inline actions) are part of the intended UX. The component still works on touch devices but isn't tuned for them — use it for power-user surfaces (file managers, settings explorers, asset trees) rather than mobile navigation.
:::

## Basic Tree

Pass a list of root nodes and four extractors: `getId`, `getChildren`, `getLabel`, and optionally `isExpandable`. Render the row body via the default slot. Two `v-model`s — `expanded` (a `Set<string>` of node ids) and `selected` (a single id or `null`) — let the consumer control state.

<preview path="./tree/demos/TreeBasic.vue" />

## Drag-and-Drop Reorder

Set `draggable` to allow internal moves. Drop **between** sibling rows to reorder; drop **into** a folder (middle 50 % of the row) to move it inside. The tree rejects self-onto-descendant drops, draws a 2-pixel indicator line for `before`/`after` and a dashed outline for `inside`, and auto-expands collapsed folders after a short hover.

The consumer handles the actual mutation in `@node-move` — splice the source out of its current parent and re-insert it at the target's location.

<preview path="./tree/demos/TreeDragReorder.vue" />

## OS File Drop

Set `accepts-files` to receive operating-system file drops onto folder rows or the empty background. The tree emits `@files-drop` with the raw `FileList` plus the target folder (or `null` when dropped on the background). Use this for asset uploaders, image inboxes, or any flow where the user drags files in from outside the browser.

<preview path="./tree/demos/TreeFileDrop.vue" />

## Context Menu + ⋮ Button

`@context-menu` fires on right-click of any row and on background right-click (`node` is `null`). Wire it to a single `useContextMenu()` controller — the menu's contents adapt to whether a folder, file, or background was hit. The same controller doubles as the click handler for a hover-revealed `⋮` button per row, giving keyboard / left-click users equal access.

<preview path="./tree/demos/TreeContextMenu.vue" />

## Builder API

`useTree<T>()` returns `{ builder, api }`. Configure data, behavior, handlers and three context menus in a single fluent chain — the tree renders the `<CoarContextMenu>` itself, so the template is just `<CoarTree :builder>`.

<preview path="./tree/demos/TreeBuilderApi.vue" />

### Context menus per target

Three setters, one per target type. Each callback returns an array of menu entries (`{ label, icon?, danger?, disabled?, onClick }` or the literal string `'divider'`):

```ts
builder
  .folderMenu(folder => [
    { label: 'Upload here', icon: 'upload', onClick: () => upload(folder.id) },
    { label: 'New subfolder', icon: 'plus', onClick: () => newFolder(folder.id) },
    'divider',
    { label: 'Delete', icon: 'trash-2', danger: true, onClick: () => del(folder) },
  ])
  .leafMenu(leaf => [
    { label: 'Open', icon: 'file', onClick: () => openFile(leaf) },
    { label: 'Delete', icon: 'trash-2', danger: true, onClick: () => del(leaf) },
  ])
  .viewportMenu(() => [
    { label: 'New folder', icon: 'plus', onClick: () => newFolder(null) },
  ]);
```

| Setter | Fires on | Receives |
|--------|----------|----------|
| `.folderMenu(folder => [])` | Right-click an expandable node | The folder node |
| `.leafMenu(leaf => [])` | Right-click a non-expandable node | The leaf node |
| `.viewportMenu(() => [])` | Right-click empty tree background | Nothing (`null` target) |

If a setter is omitted for a target, no menu opens on that target. Items without an `icon` align flush left; the tree allocates the icon column when *any* item in the menu uses an icon.

### Escape hatch — raw events

When you want a fully custom popover (form inputs, async sub-menus, third-party menu component) instead of the standard menu, use the event variants. They **override** the declarative setters for that target:

```ts
builder.onLeafContextMenu((leaf, ev) => {
  ev.preventDefault();
  myCustomPopover.openAt(ev.clientX, ev.clientY, leaf);
});
```

| Event setter | Overrides |
|--------------|-----------|
| `.onFolderContextMenu((folder, ev) => …)` | `.folderMenu` |
| `.onLeafContextMenu((leaf, ev) => …)` | `.leafMenu` |
| `.onViewportContextMenu((ev) => …)` | `.viewportMenu` |

### The `api`

`useTree()`'s second return value is a narrow imperative interface — call from anywhere without needing a template ref:

```ts
const { builder, api } = useTree<MyNode>();

// readonly refs (suitable for watch / computed)
api.selectedId   // Ref<string | null>
api.expandedIds  // Ref<Set<string>>

// imperative
api.focusNode('some-id')        // selects + focuses the node; warns until mounted
api.reloadChildren('some-id')   // re-run loadChildren for a node (retry / refresh)
```

## Lazy loading (async children)

Fetch a node's children the first time it's expanded — for trees backed by an API where loading everything up front isn't an option. Two pieces:

- **`isExpandable`** must return `true` for a folder *before* its children exist (otherwise there's no chevron to expand). Derive it from the node's own "is a folder" flag, not from `getChildren`.
- **`loadChildren(node)`** fires on first expand of an unloaded folder. Return a `Promise` and the tree shows a spinner in the chevron until it settles; on rejection the row flips to an error state and `@load-error` fires. Your handler attaches the fetched children to your own `nodes` data — the tree re-renders and stops asking (a node counts as loaded once `getChildren` returns an array; `[]` is loaded-but-empty). Attach so `nodes` updates reactively — produce a **new root `nodes` reference** (`nodes.value = [...]`) or keep `nodes` deeply reactive; a pure in-place mutation on a shallow source leaves the spinner spinning. An unrelated `nodes` change never re-fires a node that already attempted-and-settled — retry is explicit (`api.reloadChildren(id)` or collapse + re-expand).

<preview path="./tree/demos/TreeLazyLoad.vue" />

```ts
const { builder, api } = useTree<FsNode>();
builder
  .nodes(tree)
  .getId(n => n.id)
  .getChildren(n => n.children)            // undefined until loaded; [] = loaded-but-empty
  .isExpandable(n => n.kind === 'folder')  // expandable BEFORE children exist
  .loadChildren(async (node) => {
    const kids = await myApi.fetchChildren(node.id);
    attachChildren(node.id, kids);         // mutate your own `nodes` data
  })
  .onLoadError(({ node, error }) => toast.error(`Couldn't open ${node.name}`));
```

The `default` slot exposes `isLoading` and `hasError` per row, and `api.reloadChildren(id)` forces a re-fetch — wire it to a retry button (or a "refresh folder" action):

```vue
<template #default="{ node, hasError }">
  <FileRow :node="node" />
  <button v-if="hasError" @click.stop="api.reloadChildren(node.id)">Retry</button>
</template>
```

::: tip
The chevron spinner is the only default loading visual; there is no default **error** visual — render your own from `hasError` (a retry button, an alert icon). Collapsing then re-expanding an errored folder also retries.
:::

::: tip Render your own loading indicator
Prefer a spinner that replaces the row icon (or anything else)? Set `hide-loading-spinner` to suppress the built-in chevron spinner and render your own from the `isLoading` slot prop — the tree still owns the *when* (expand-trigger, dedupe, error state), you own the *look*:

```vue
<CoarTree :builder="builder" hide-loading-spinner>
  <template #default="{ node, isLoading }">
    <Spinner v-if="isLoading" />
    <Icon v-else :name="node.icon" />
    <span>{{ node.label }}</span>
  </template>
</CoarTree>
```
:::

## Virtualization

For trees with hundreds or thousands of visible rows, enable virtualization to mount only the rows actually inside the viewport. The component is built on `useVirtualList` — fixed-known-size virtualizer, no DOM auto-measure — so you declare the row height once.

<preview path="./tree/demos/TreeVirtualization.vue" />

### Scale (50 000 nodes)

Virtualization plus the flat-render pipeline scales to tens of thousands of nodes. Hit **Expand all** to flatten ~51 200 rows into the visible list — only ~30 row components stay mounted, and selecting / arrow-keying / dragging stays smooth. Expand-all is O(1) in the virtualizer for the constant row height, and a selection or drag-over re-renders only the rows that actually change.

<preview path="./tree/demos/TreeStress.vue" />

**Configuration:**

```ts
// builder mode
builder.virtualize(true);                                      // defaults: itemSize 28, overscan 5
builder.virtualize({ itemSize: 32 });                          // uniform 32-px rows
builder.virtualize({ itemSize: (i) => myHeights[i] });         // variable per visible-row
builder.virtualize({ itemSize: 28, overscan: 10 });            // larger scroll buffer

// props mode
<CoarTree :virtualize="true" ... />
<CoarTree :virtualize="{ itemSize: 32 }" ... />
```

**Requirements + caveats:**

- **Explicit height.** The tree owns its scroll container when virtualized. Put it in a sized parent (fixed `height`, flex with `flex: 1` + `min-height: 0`, grid cell with `1fr`, etc.). Without a measurable viewport `useVirtualList` produces an empty render.
- **Row height must match.** The configured `itemSize` is what the spacer + absolute positioning use. If your slot renders a row taller than `itemSize`, content overflows; shorter and there's empty space. Measure your row in DevTools and configure accordingly.
- **No auto-measurement.** This is a fixed-known-size virtualizer (unlike TanStack Virtual's `measureElement`). For trees with truly dynamic row heights (e.g. wrapping multi-line labels), keep virtualization off — performance is fine up to ~500 visible rows even without it.
- **Both modes use flat rendering.** Whether virtualized or not, the tree renders rows as a flat DFS list (depth via `padding-left`, ARIA hierarchy via `aria-level`). `<ul role="group">` nesting was dropped on purpose — it's optional under WAI-ARIA and incompatible with flat virtualization.

## Accessibility

### Keyboard

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move focus to previous / next visible row |
| `→` | Expand a collapsed folder; otherwise descend to first child |
| `←` | Collapse an expanded folder; otherwise ascend to parent |
| `Home` / `End` | First / last visible row |
| `Enter` | Activate (emits `@activate`) — typically opens the node |
| `Space` | Toggle expand on a folder; select otherwise |
| Letter | Type-ahead: jump to next visible row whose label starts with the typed prefix (resets after 500 ms) |

### ARIA

- Root has `role="tree"`
- Each row has `role="treeitem"` with `aria-level`, `aria-posinset`, `aria-setsize`
- Folder rows expose `aria-expanded`; selected rows expose `aria-selected="true"`
- **Flat rendering** — rows are a single DFS list, not nested `<ul role="group">`. Hierarchy is conveyed by `aria-level` (WAI-ARIA permits this and it's what enables flat virtualization; see [Virtualization](#virtualization))

## Recipes

### Truncation in narrow sidebars

The tree owns indentation and the chevron but doesn't render the label — the consumer does, via the default slot. The standard pattern is **ellipsis + `v-tooltip` with `onlyOnOverflow: true`** on the label span — the styled Coar tooltip appears only when the text is actually clipped, and stays out of the way when the full label is visible:

```vue
<script setup lang="ts">
import { vTooltip } from '@cocoar/vue-ui';
</script>

<template #default="{ node }">
  <!--
    The tooltip lives on a wrapper around the icon + label — NOT the label
    alone. When the row gets so narrow that the label collapses to 0 px
    (deep nesting in a slim sidebar), the icon still has a hit area and the
    tooltip remains reachable. The string form of `onlyOnOverflow` tells the
    directive to gate on the *child label's* overflow, not the wrapper's.
  -->
  <span
    v-tooltip="{ content: node.label, onlyOnOverflow: '.label' }"
    class="row-main"
  >
    <CoarIcon :name="node.children ? 'folder' : 'file'" size="xs" />
    <span class="label">{{ node.label }}</span>
  </span>
</template>

<style>
.row-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.label {
  flex: 1;
  min-width: 0;            /* allow shrink inside the flex row */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
```

`onlyOnOverflow` accepts three forms — all evaluated lazily on hover/focus, no `ResizeObserver` overhead:

| Form | Meaning |
|------|---------|
| `true` | Check `scrollWidth > clientWidth` on the trigger element itself |
| `string` (CSS selector) | Check overflow on the matched descendant — use when the tooltip is on a wrapper but only an inner element is what gets truncated |
| `function: (el) => boolean` | Custom predicate; return `true` to show the tooltip |

::: tip Scale
A tree with hundreds of mounted rows means hundreds of `v-tooltip` directive listeners. Combine this pattern with [virtualization](#virtualization) for very large trees — only the ~visible rows hold listeners. For low-overhead plain-text fallback (e.g. mobile / embedded contexts where the overlay system isn't installed), use the native `:title` attribute instead — same UX, zero JS.
:::

### File-explorer shell

Combine `<CoarTree>` with `CoarTabGroup`, `CoarScriptEditor`, `CoarMarkdownEditor`, and `CoarDocumentViewer` to get a VS-Code-style document explorer. The tree owns the asset hierarchy and DnD; tabs hold the open editors; per-row `⋮` and right-click expose CRUD actions through a single `<CoarContextMenu>`.

### Multi-tree drag

Two `<CoarTree>` instances on the same page can exchange nodes via the shared `application/x-coar-tree-node` MIME type. Each tree's `@node-move` only fires when the drop lands on one of its own rows — you decide on the consumer side how to coordinate the source/target trees (e.g. a parent component that owns both data stores).

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `builder` | `TreeBuilder<T>` | `undefined` | Fluent builder from `useTree()`. When set, the other config props are ignored. Recommended for non-trivial cases |
| `nodes` | `readonly T[]` | — | Root nodes (required in props-mode; ignored when `builder` is set) |
| `getId` | `(node: T) => string` | — | Identity extractor. Must be unique across the entire visible tree (required in props-mode) |
| `getChildren` | `(node: T) => readonly T[] \| null \| undefined` | `undefined` | Returns the children of a node — return `undefined` or `null` for leaves. Without it, the tree is a flat list |
| `getLabel` | `(node: T) => string` | `undefined` | Used by type-ahead navigation. Optional but recommended for keyboard UX |
| `isExpandable` | `(node: T) => boolean` | derived from `getChildren` | Override branch detection — useful when a folder should always render as expandable even if its children are lazy-loaded |
| `loadChildren` | `(node: T) => void \| Promise<void>` | `undefined` | Lazily fetch a node's children on first expand. Pair with `isExpandable`. The tree shows a chevron spinner while pending and an error state on rejection. See [Lazy loading](#lazy-loading-async-children) |
| `hideLoadingSpinner` | `boolean` | `false` | Suppress the built-in chevron loading spinner. Set it when you render your own indicator from the `isLoading` slot prop (e.g. replacing the row icon) |
| `draggable` | `boolean \| ((n: T) => boolean)` | `false` | Allow internal drag-to-reorder. Pass a function to enable per-node |
| `canDrop` | `(source: T, target: T \| null, position: 'before' \| 'inside' \| 'after') => boolean` | `undefined` | Custom validation on top of the built-in self-into-descendant guard |
| `acceptsFiles` | `boolean` | `false` | Accept OS file drops onto folder rows / the background |
| `autoExpandDelay` | `number` | `700` | Milliseconds the cursor must hover before a collapsed folder auto-expands during a drag |
| `virtualize` | `boolean \| { itemSize?, overscan? }` | `false` | Enable row virtualization. `true` uses defaults (28-px rows, 5-row overscan); pass an object to customize |
| `v-model:expanded` | `Set<string>` | empty `Set` | Ids of expanded folders. Replaced with a fresh `Set` on each change to trigger reactivity |
| `v-model:selected` | `string \| null` | `null` | Id of the currently selected row |

### Events

| Event | Payload | Fires |
|-------|---------|-------|
| `activate` | `(node: T)` | Double-click on a row or `Enter` on the focused row |
| `context-menu` | `(node: T \| null, ev: MouseEvent)` | Right-click on a row (`node` set) or background (`node` is `null`). The default action is suppressed automatically by `useContextMenu().open(ev)` |
| `files-drop` | `({ files: FileList, target: T \| null })` | OS files dropped on a folder (`target` set) or empty background (`target` is `null`). Only fires when `accepts-files` is `true` |
| `node-move` | `({ source: T, target: T \| null, position })` | Internal drag-drop. `position` is `'before'`, `'inside'`, or `'after'`. `target: null` + `'inside'` means "move to root". Only fires when `draggable` is truthy |
| `load-error` | `({ node: T, error: unknown })` | A lazy `loadChildren` promise rejected. Only fires when `loadChildren` is set |
| `update:expanded` | `(Set<string>)` | Folder expanded / collapsed |
| `update:selected` | `(string \| null)` | Selection changed |

### Slots

| Slot | Props | Description |
|------|-------|-------------|
| `default` | `{ node, depth, isExpanded, isSelected, isFocused, isExpandable, isRenaming, isLoading, hasError }` | Row body. The tree renders indentation, chevron, focus ring and drop indicators; you render the icon, label, inline action buttons, dirty markers, etc. `isLoading` / `hasError` reflect lazy [`loadChildren`](#lazy-loading-async-children) state |
| `empty` | — | Shown when `nodes` is empty. Defaults to nothing — provide your own empty-state copy |

### Exposed methods

| Method | Description |
|--------|-------------|
| `focusNode(id)` | Programmatically move focus to a node (call via template ref) |
| `reloadChildren(id)` | Force `loadChildren` to (re)run for a node — retry after an error or refresh an already-loaded folder |

### Constants

| Constant | Value | Use |
|----------|-------|-----|
| `COAR_TREE_DRAG_MIME` | `'application/x-coar-tree-node'` | Mime type set on `DataTransfer` for internal drags. Read it on `drop` if you're orchestrating drags between two trees that share an outer container |
