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

## Playground

Flip every option on or off, switch density, filter, drag-reorder, rename, drive the imperative `api`, and watch the event log — the whole feature surface in one sandbox.

<preview path="./tree/demos/TreePlayground.vue" />

## Basic Tree

Pass a list of root nodes and four extractors: `getId`, `getChildren`, `getLabel`, and optionally `isExpandable`. Render the row body via the default slot. Two `v-model`s — `expanded` (a `Set<string>` of node ids) and `selected` (a single id or `null`) — let the consumer control state.

<preview path="./tree/demos/TreeBasic.vue" />

## Selection

`selectionMode` picks one of three behaviours (default `'single'`, fully back-compatible):

| Mode | Bound to | Interaction |
|------|----------|-------------|
| `'single'` | `v-model:selected` (`string \| null`) | One highlighted row |
| `'multiple'` | `v-model:selectedIds` (`Set<string>`) | Ctrl/Cmd-click toggles, Shift-click ranges, `Ctrl/Cmd+A` selects all, Shift+Arrow extends |
| `'checkbox'` | `v-model:checkedIds` (`Set<string>`) + `v-model:selectedIds` | A per-row tri-state checkbox **independent** of the highlight selection |

In **checkbox** mode the checkbox state (`checkedIds`) and the highlight (`selectedIds`) are separate models — a row can be focused/highlighted while a different set is checked. Checking a folder cascades to its descendants and a partially-checked folder shows the indeterminate (`mixed`) state; checking a folder whose children aren't loaded yet propagates the check to them once they arrive (lazy inheritance). Set `check-strictly` for independent parent/child checks with no cascade.

```vue
<script setup lang="ts">
const selectedIds = ref(new Set<string>())
const checkedIds = ref(new Set<string>())
</script>

<template>
  <CoarTree
    selection-mode="checkbox"
    v-model:selected-ids="selectedIds"
    v-model:checked-ids="checkedIds"
    :nodes="nodes" :get-id="n => n.id" :get-children="n => n.children"
  />
</template>
```

<preview path="./tree/demos/TreeSelection.vue" />

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

// readonly refs (multiple / checkbox modes)
api.selectedIds  // Ref<Set<string>>
api.checkedIds   // Ref<Set<string>>

// imperative (warn until mounted)
api.selectNode('some-id')       // highlight-select + focus (preferred)
api.focusNode('some-id')        // alias of selectNode (back-compat since 2.4.0)
api.expandTo('some-id')         // reveal a deep node
api.revealNode('some-id')       // scroll into view without stealing focus
api.moveNode('a', 'b', 'after') // accessible/programmatic move
api.getNode('some-id')          // resolve node by id, or null
api.reloadChildren('some-id')   // re-run loadChildren (retry / refresh)
api.startRename('some-id')      // enter inline-rename (needs `renamable`)
api.startCreate('some-id')      // open inline-create draft under a parent (needs `creatable`)
```

## Lazy loading (async children)

Fetch a node's children the first time it's expanded — for trees backed by an API where loading everything up front isn't an option. Two pieces:

- **`isExpandable`** must return `true` for a folder *before* its children exist (otherwise there's no chevron to expand). Derive it from the node's own "is a folder" flag, not from `getChildren`.
- **`loadChildren(node)`** fires on first expand of an unloaded folder. Return a `Promise` and the tree shows a spinner in the chevron until it settles; on rejection the row flips to an error state and `@load-error` fires. Your handler attaches the fetched children to your own `nodes` data — the tree re-renders and stops asking (a node counts as loaded once `getChildren` returns an array; `[]` is loaded-but-empty). Attach so `nodes` updates reactively — produce a **new root `nodes` reference** (`nodes.value = [...]`) or keep `nodes` deeply reactive; a pure in-place mutation on a shallow source leaves the spinner spinning. An unrelated `nodes` change never re-fires a node that already attempted-and-settled — retry is explicit (`api.reloadChildren(id)` or collapse + re-expand).

The demo below is interactive — dial in **latency** and a **failure rate** to watch the loading spinner, the error + **Retry** path, and the load-once-then-cache behaviour, then drill in to see each level load on its own. It renders the spinner at the row-icon position (the `hide-loading-spinner` + `isLoading` pattern below) rather than the built-in chevron spinner.

<preview path="./tree/demos/TreeLazyLoad.vue" />

```ts
const { builder, api } = useTree<FsNode>();
builder
  .nodes(tree)
  .getId(n => n.id)
  .getChildren(n => n.children)            // undefined until loaded; [] = loaded-but-empty
  .isExpandable(n => n.kind === 'folder')  // expandable BEFORE children exist
  .loadChildren(async (node, { signal }) => {
    const kids = await myApi.fetchChildren(node.id, { signal }); // aborts on collapse
    attachChildren(node.id, kids);         // mutate your own `nodes` data
  })
  .maxConcurrentLoads(6)                   // cap fan-out for rate-limited backends (0 = unlimited)
  .onLoadError(({ node, error }) => toast.error(`Couldn't open ${node.name}`));
```

`loadChildren`'s second argument carries an `AbortSignal` that fires when the folder is collapsed or leaves the tree mid-flight — forward it to `fetch` so a cancelled load doesn't waste work or race a later reopen. A load that settles after being aborted is suppressed (no phantom error). `maxConcurrentLoads` (default `0` = unlimited) bounds simultaneous loads so an `expandAll()` / state-restore can't fan out unbounded.

The `default` slot exposes `isLoading` and `hasError` per row, and `api.reloadChildren(id)` forces a re-fetch — wire it to a retry button (or a "refresh folder" action):

```vue
<template #default="{ node, hasError }">
  <FileRow :node="node" />
  <button v-if="hasError" @click.stop="api.reloadChildren(node.id)">Retry</button>
</template>
```

::: tip Default loading + error visuals
By default the chevron shows a spinner while loading and a red **retry** icon on error (click it to re-fetch) — no extra markup needed. Set `hide-loading-spinner` to suppress **both** and render your own from `isLoading` / `hasError`. Collapsing then re-expanding an errored folder also retries.
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
| `↑` / `↓` | Move focus to previous / next visible row (skips disabled). Hold `Shift` (multi modes) to extend the selection |
| `→` / `←` | Expand / descend, collapse / ascend (inverted under RTL) |
| `Home` / `End` | First / last visible (enabled) row |
| `PageUp` / `PageDown` | Move focus by one viewport of rows |
| `*` | Expand all sibling folders at the focused row's level |
| `Enter` | Activate (emits `@activate`) — typically opens the node |
| `Space` | Checkbox mode: toggle the row's checkbox. Otherwise: expand a folder / select a leaf |
| `Ctrl`/`Cmd` + `A` | Select all visible rows (multiple / checkbox) |
| `Ctrl`/`Cmd` + `X` … `V` | Grab the focused row, then drop it relative to the focused target (accessible move); `Escape` cancels |
| `F2` | Start an inline rename on the focused row (needs `renamable`) |
| Letter | Type-ahead: jump to the next visible row whose label starts with the typed prefix (resets after 500 ms) |

### ARIA

- Root has `role="tree"` — give it an accessible name via `ariaLabel` / `ariaLabelledby`. `aria-multiselectable="true"` in multiple / checkbox modes.
- Each row has `role="treeitem"` with `aria-level`, `aria-posinset`, `aria-setsize`. `aria-selected` is set on **every** row (`true` on selected, `false` otherwise — the APG multi-select pattern). Checkbox rows also carry `aria-checked` (`true` / `false` / `mixed`); disabled rows `aria-disabled`; loading rows `aria-busy`.
- A polite **live region** announces drag / keyboard-move state (pick-up, dropped, cancelled) and lazy-load **errors**. All strings are overridable via [`labels`](#i18n-labels).
- **Flat rendering** — rows are a single DFS list, not nested `<ul role="group">`. Hierarchy is conveyed by `aria-level` (WAI-ARIA permits this and it's what enables flat virtualization; see [Virtualization](#virtualization)).

## Inline rename

Set `renamable` to opt into built-in inline editing. Drop `<CoarTreeNodeLabel>` into the default slot in place of your label span — it swaps to an `<input>` while its row is being renamed and picks up the rename machinery via injection (no extra wiring). Start a rename from a context-menu item or button with `api.startRename(id)`, or press **F2** on the focused row. Commit on Enter / blur fires `@rename`; Escape (or an empty name) fires `@rename-cancel`. Conflict handling / validation is the consumer's job — the tree is stateless about it, so on failure just call `api.startRename(id)` again.

```vue
<script setup lang="ts">
import { CoarTree, CoarTreeNodeLabel, useTree } from '@cocoar/vue-ui'
const { builder, api } = useTree<FsNode>()
builder
  .nodes(tree).getId(n => n.id).getChildren(n => n.children).getLabel(n => n.name)
  .renamable(true)
  .onRename(({ node, newName }) => applyRename(node.id, newName))
  .folderMenu(folder => [{ label: 'Rename', icon: 'pencil', onClick: () => api.startRename(folder.id) }])
</script>

<template>
  <CoarTree :builder="builder">
    <template #default="{ node }">
      <CoarIcon :name="node.children ? 'folder' : 'file'" size="xs" />
      <CoarTreeNodeLabel :label="node.name" />
    </template>
  </CoarTree>
</template>
```

## Inline create

The counterpart to inline rename. Set `creatable` and call `api.startCreate(parentId, opts?)` to insert a **transient draft row** at its target position — `parentId: null` creates at the root, otherwise the parent auto-expands and the draft renders nested under it. The draft shows a focused `<input>` with the same blur-grace timer as rename; **Enter / blur** commits and fires `@create` with `{ parentId, name, kind }`, while **Escape** or an empty name fires `@create-cancel`. The draft is purely transient: persist the node in your `@create` handler and feed the real one back via your data source — the tree drops the draft on commit.

`opts`: `kind` (`'folder'` \| `'leaf'`, default `'folder'` — picks the default icon and is echoed back on `@create`), `initialName` (prefill, default `''`), `position` (`'first'` \| `'last'` within the parent, default `'last'`). Override the default draft icon with the optional `#draft` slot (`{ kind, depth }`).

```vue
<script setup lang="ts">
import { CoarTree, CoarTreeNodeLabel, useTree } from '@cocoar/vue-ui'
const { builder, api } = useTree<FsNode>()
builder
  .nodes(tree).getId(n => n.id).getChildren(n => n.children).getLabel(n => n.name)
  .creatable(true)
  .onCreate(({ parentId, name, kind }) => createNode(parentId, name, kind))
  .folderMenu(folder => [
    { label: 'New folder', icon: 'folder-plus', onClick: () => api.startCreate(folder.id, { kind: 'folder' }) },
  ])
  .viewportMenu(() => [
    { label: 'New folder', icon: 'folder-plus', onClick: () => api.startCreate(null) },
  ])
</script>

<template>
  <CoarTree :builder="builder">
    <template #default="{ node }">
      <CoarIcon :name="node.children ? 'folder' : 'file'" size="xs" />
      <CoarTreeNodeLabel :label="node.name" />
    </template>
    <!-- optional: custom draft icon -->
    <template #draft="{ kind }">
      <CoarIcon :name="kind === 'folder' ? 'folder' : 'file'" size="xs" />
    </template>
  </CoarTree>
</template>
```

Pairs with `@cocoar/vue-file-explorer-core`'s optimistic `addFolder` so the draft → real-node handoff has no flicker.

### Async validation — keep the draft open on rejection

If creation can fail server-side (a duplicate-name 409, a permission check), you don't want the user's typed name discarded. Two paths, depending on which API form you use:

- **Builder form** — return a `Promise` from `onCreate`. The tree keeps the draft mounted + focused (name intact) until it settles: it drops the draft on resolve and **reopens it on reject** so the user can fix the name and retry.

  ```ts
  builder.creatable(true).onCreate(async ({ parentId, name }) => {
    await api.createFolder(parentId, name) // throws on 409 → draft stays open
  })
  ```

- **Prop / event form** — Vue's `emit` can't return a value, so reopen imperatively: on a rejected `@create`, re-call `startCreate` with `initialName` to restore the draft with the typed text.

  ```ts
  async function onCreate({ parentId, name }) {
    try {
      await createFolder(parentId, name)
    } catch {
      treeRef.value?.startCreate(parentId, { initialName: name }) // reopen, name preserved
    }
  }
  ```

> Both `creatable` / `@create` / `@create-cancel` and `api.startCreate` work in **prop-mode** too (without `useTree()`): `startCreate` is on the component's template ref alongside `startRename`.

## Disabled nodes

`isDisabled(node)` marks rows non-interactive: they can't be selected, activated, directly checked, focused by keyboard, matched by type-ahead, or dragged, and they render `aria-disabled` + dimmed. The `isDisabled` slot prop lets you adjust your own row content. Cascade from a *checked ancestor* still flows through a disabled descendant — disabled blocks **direct** interaction, not bulk parent operations.

```ts
builder.isDisabled(n => n.readonly)
```

## Search / filter

Pass the matching ids as `matchedIds` and the tree handles the rest. Two modes:

- **Highlight (default):** every row stays visible; the slot gets `isMatch` / `isMatchAncestor` for styling, and the ancestors of each match auto-expand so deep hits are revealed (add-only — your manual collapses survive).
- **Filter** (`filter` prop / `.filter()`): non-matches are hidden — but the **ancestor path of each match stays visible as "virtual parents"** (flagged `isMatchAncestor`, so you can de-emphasize them). The tree never collapses into a contextless flat list; you always see *where* a hit lives. Computing `matchedIds` itself stays yours (any fuzzy / regex / field match you like).

  `filterMode` (mirrors PrimeVue) decides what a matched **folder** keeps:
  - **`'strict'`** (default) — matches + ancestor path only; a matched folder's non-matching children stay hidden. This is the VS Code / react-arborist "filter down to what I searched for" convention.
  - **`'lenient'`** — a matched folder reveals its whole subtree.

```vue
<script setup>
const matchedIds = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return undefined
  return new Set(allNodes.value.filter(n => n.name.toLowerCase().includes(q)).map(n => n.id))
})
</script>

<template>
  <CoarTree :builder="builder" :matched-ids="matchedIds" :filter="hideNonMatches">
    <template #default="{ node, isMatch, isMatchAncestor }">
      <span :class="{ hit: isMatch, 'virtual-parent': isMatchAncestor }">{{ node.name }}</span>
    </template>
  </CoarTree>
</template>
```

## Density & theming

`density` (`xs` / `s` / `m` / `l`, default `m`) scales the **whole** row — font, padding, indent, **and** the built-in chevron + checkbox (box and glyph) together. Under the hood it sets CSS variables you can also override directly to retheme without forking:

| Variable | Default (`m`) | Controls |
|----------|---------------|----------|
| `--coar-tree-indent` | `14px` | Per-level indent step |
| `--coar-tree-indent-base` | `8px` | Base (level-0) indent |
| `--coar-tree-row-pad-y` / `-x` | `3px` / `4px` | Row padding |
| `--coar-tree-row-font` | inherits body-small | Row font size |
| `--coar-tree-control-size` | `16px` | Chevron + checkbox box size |
| `--coar-tree-icon-size` | `12px` | Glyph inside (checkmark / dash / chevron) |

The icons **you** render in the slot are still yours to size — but `--coar-tree-icon-size` cascades into the slot, so you can scale them with the tree:

```vue
<template #default="{ node }">
  <CoarIcon :name="node.children ? 'folder' : 'file'" size="var(--coar-tree-icon-size)" />
  <span>{{ node.name }}</span>
</template>
```

::: warning
When virtualizing, set `virtualize.itemSize` to match your density's row height — the virtualizer is fixed-size and doesn't auto-measure.
:::

## i18n / labels {#i18n-labels}

Every built-in string (chevron Expand / Collapse, the loading spinner, the retry button, and all the polite drag / move / load-error announcements) is overridable via `labels` for localization. Unset fields fall back to the English `DEFAULT_TREE_LABELS`.

```ts
builder.labels({
  expand: 'Aufklappen',
  collapse: 'Zuklappen',
  loading: 'Lädt …',
  retry: 'Erneut',
  moveCancelled: 'Verschieben abgebrochen.',
})
```

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
| `isDisabled` | `(node: T) => boolean` | `undefined` | Mark nodes non-interactive: no select / activate / check / keyboard-focus, `aria-disabled`, dimmed. See [Disabled nodes](#disabled-nodes) |
| `loadChildren` | `(node: T, ctx: { signal: AbortSignal }) => void \| Promise<void>` | `undefined` | Lazily fetch a node's children on first expand. Pair with `isExpandable`. `ctx.signal` aborts on collapse / removal. See [Lazy loading](#lazy-loading-async-children) |
| `maxConcurrentLoads` | `number` | `0` | Cap simultaneous in-flight `loadChildren` calls (extra ones queue). `0` = unlimited. Set a small number (e.g. `6`) for rate-limited backends |
| `hideLoadingSpinner` | `boolean` | `false` | Suppress the built-in chevron spinner **and** retry affordance. Set it when you render your own from `isLoading` / `hasError` |
| `selectionMode` | `'single' \| 'multiple' \| 'checkbox'` | `'single'` | See [Selection](#selection). `single` → `v-model:selected`; `multiple`/`checkbox` → `v-model:selectedIds` (+ `v-model:checkedIds` for checkbox) |
| `checkStrictly` | `boolean` | `false` | Checkbox mode only: independent parent/child checks, no cascade / indeterminate |
| `draggable` | `boolean \| ((n: T) => boolean)` | `false` | Allow internal drag-to-reorder. Pass a function to enable per-node |
| `canDrop` | `(source: T, target: T \| null, position: 'before' \| 'inside' \| 'after') => boolean` | `undefined` | Veto drops on top of the built-in cycle guard. Advisory — `source` is the dragstart snapshot; integrity is guaranteed regardless |
| `getDragImage` | `(node: T) => HTMLElement \| string \| null \| undefined` | `undefined` | Custom drag ghost (element or HTML string); falls back to the default row image |
| `activateOnClick` | `boolean` | `false` | Fire `activate` on a single click too (not only double-click / Enter) |
| `renamable` | `boolean` | `false` | Opt into built-in inline rename (`api.startRename` / F2 / `@rename`). See [Inline rename](#inline-rename) |
| `creatable` | `boolean` | `false` | Opt into built-in inline create (`api.startCreate` / `@create`). See [Inline create](#inline-create) |
| `acceptsFiles` | `boolean` | `false` | Accept OS file drops onto folder rows / the background |
| `autoExpandDelay` | `number` | `700` | Milliseconds the cursor must hover before a collapsed folder auto-expands during a drag |
| `virtualize` | `boolean \| { itemSize?, overscan? }` | `false` | Enable row virtualization. `true` uses defaults (28-px rows, 5-row overscan); pass an object to customize |
| `density` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Row spacing preset (sets the spacing CSS vars). With virtualization, match `virtualize.itemSize` to the density's row height |
| `ariaLabel` | `string` | `undefined` | Accessible name on the `role="tree"` element |
| `ariaLabelledby` | `string` | `undefined` | Id of an external label element for the `role="tree"` element |
| `labels` | `Partial<CoarTreeLabels>` | English defaults | Override built-in / screen-reader strings (chevron, spinner, retry, announcements) for i18n |
| `matchedIds` | `Set<string>` | `undefined` | Search hits — drives `isMatch` / `isMatchAncestor` slot props + auto-expand-to-match. See [Search / filter](#search-filter) |
| `filter` | `boolean` | `false` | With `matchedIds`, hide non-matches but keep the matches + their ancestor path ("virtual parents"). See [Search / filter](#search-filter) |
| `filterMode` | `'strict' \| 'lenient'` | `'strict'` | What a matched **folder** keeps when filtering. `strict` = matches + path only; `lenient` = the matched folder's whole subtree. See [Search / filter](#search-filter) |
| `v-model:expanded` | `Set<string>` | empty `Set` | Ids of expanded folders. Replaced with a fresh `Set` on each change to trigger reactivity |
| `v-model:selected` | `string \| null` | `null` | Selected row id (**single** mode) |
| `v-model:selectedIds` | `Set<string>` | empty `Set` | Highlight selection (**multiple** / **checkbox** modes) |
| `v-model:checkedIds` | `Set<string>` | empty `Set` | Checkbox selection (**checkbox** mode), independent of the highlight |

### Events

| Event | Payload | Fires |
|-------|---------|-------|
| `activate` | `(node: T)` | Double-click on a row or `Enter` on the focused row (also single click if `activateOnClick`) |
| `select` | `({ node: T \| null, ids: readonly string[], via: 'user' \| 'api' })` | The highlight selection changed. `node` = the row acted on, `ids` = the full selection after, `via` = user gesture vs `api` call |
| `context-menu` | `(node: T \| null, ev: MouseEvent)` | Right-click on a row (`node` set) or background (`node` is `null`). The default action is suppressed automatically by `useContextMenu().open(ev)` |
| `files-drop` | `({ files: FileList, target: T \| null })` | OS files dropped on a folder (`target` set) or empty background (`target` is `null`). Only fires when `accepts-files` is `true` |
| `node-move` | `({ source: T, target: T \| null, position })` | Internal drag-drop OR keyboard move / `api.moveNode`. `position` is `'before'`, `'inside'`, or `'after'`. `target: null` + `'inside'` means "move to root" |
| `rename` | `({ node: T, newName: string })` | An inline rename committed (Enter / blur, non-empty). Needs `renamable`. See [Inline rename](#inline-rename) |
| `rename-cancel` | `(node: T)` | An inline rename cancelled (Escape, or committed empty) |
| `create` | `({ parentId: string \| null, name: string, kind: 'folder' \| 'leaf' })` | An inline create committed (Enter / blur, non-empty). Needs `creatable`. See [Inline create](#inline-create) |
| `create-cancel` | — | An inline create cancelled (Escape, or committed empty) |
| `load-error` | `({ node: T, error: unknown })` | A lazy `loadChildren` promise rejected. Only fires when `loadChildren` is set |
| `update:expanded` | `(Set<string>)` | Folder expanded / collapsed |
| `update:selected` | `(string \| null)` | Selection changed (single mode) |
| `update:selectedIds` | `(Set<string>)` | Highlight selection changed (multiple / checkbox modes) |
| `update:checkedIds` | `(Set<string>)` | Checkbox selection changed (checkbox mode) |

### Slots

| Slot | Props | Description |
|------|-------|-------------|
| `default` | `{ node, depth, isExpanded, isSelected, isChecked, isIndeterminate, isFocused, isExpandable, isMatch, isMatchAncestor, isDisabled, isRenaming, isLoading, hasError }` | Row body. The tree renders indentation, chevron, checkbox (checkbox mode), focus ring and drop indicators; you render the icon, label, inline action buttons, dirty markers, etc. |
| `empty` | — | Shown when `nodes` is empty. Defaults to nothing — provide your own empty-state copy |
| `draft` | `{ kind: 'folder' \| 'leaf', depth }` | Leading content (icon) for the inline-create draft row. Defaults to a folder/file icon. Needs `creatable`. See [Inline create](#inline-create) |

The `default` slot props in full:

| Prop | Meaning |
|------|---------|
| `isSelected` | In the highlight selection (`selected` / `selectedIds`) |
| `isChecked` / `isIndeterminate` | Checkbox fully / partially checked (checkbox mode) |
| `isMatch` / `isMatchAncestor` | A search hit / an ancestor of one (see [Search / filter](#search-filter)) |
| `isDisabled` | `isDisabled(node)` returned true |
| `isRenaming` | This row is in inline-rename mode |
| `isLoading` / `hasError` | Lazy `loadChildren` in flight / failed |

### Exposed methods

Available on both the **template ref** and the builder **`api`** (the `api` warns if called before mount; `getNode` returns `null`):

| Method | Description |
|--------|-------------|
| `selectNode(id)` | Highlight-select **and** focus a node (the "reveal & select" action) — preferred |
| `focusNode(id)` | Builder `api`: alias of `selectNode` (selects + focuses, back-compat since 2.4.0). Template ref: focus-only. Prefer `selectNode` / `revealNode` for explicit intent |
| `expandAll()` / `collapseAll()` | Expand every loaded, expandable node / collapse everything |
| `expandTo(id)` | Expand all loaded ancestors of `id` so its row becomes visible |
| `revealNode(id)` | Scroll a node into view **without** stealing focus (expands ancestors first) |
| `getNode(id)` | Resolve a node by id from the loaded tree, or `null` |
| `moveNode(sourceId, targetId, position)` | Move a node (keyboard / a11y equivalent of a drop); runs the cycle + `canDrop` guards; returns whether it emitted |
| `reloadChildren(id)` | Force `loadChildren` to (re)run — retry after an error or refresh a loaded folder |
| `startRename(id)` | Enter inline-rename mode on a node (needs `renamable`) |
| `startCreate(parentId, opts?)` | Open an inline-create draft under `parentId` (`null` = root); needs `creatable`. `opts`: `{ kind?, initialName?, position? }` |

### Constants

| Constant | Value | Use |
|----------|-------|-----|
| `COAR_TREE_DRAG_MIME` | `'application/x-coar-tree-node'` | Mime type set on `DataTransfer` for internal drags. Read it on `drop` if you're orchestrating drags between two trees that share an outer container |
