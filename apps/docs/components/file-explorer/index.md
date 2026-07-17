---
description: "Headless VSCode-style file explorer engine for Vue 3 — useFileExplorer drives a pluggable AssetStore backend; you compose the layout from @cocoar/vue-ui primitives."
---

# File Explorer <Badge type="warning" text="Preview" />

`@cocoar/vue-file-explorer-core` is the **headless engine** for a VSCode-style file/asset explorer in Vue 3 — the **data + coordination**, not a finished UI. A single composable, `useFileExplorer({store})`, drives a pluggable `AssetStore<T>` backend and returns every ref + op a file explorer needs (tree + tab state machine, selection, async loading, blob-URL leases, dirty tracking, conflict resolution). It ships **no layout** — you compose the chrome with [`@cocoar/vue-ui`](/components/panel-layout) (`CoarPanelLayout`, `CoarSplitPane`, `CoarTree`, …). A batteries-included, layouted `<CoarFileExplorer>` component — under the bare `@cocoar/vue-file-explorer` name — is planned on top.

::: tip Mental model — engine, not UI
`useFileExplorer` is **headless**: it renders no editors, tabs, breadcrumbs, or layout — it returns reactive state + ops, and your view binds to `fe.*`. The composable IS the bus that wires the panels together: select in the tree → a tab opens → the editor and details panels react, all through one shared `fe.*` instance. For the **layout**, reach for the [panel-layout](/components/panel-layout) primitives; the demos below are worked examples to copy. A batteries-included `<CoarFileExplorer>` component is planned — it'll sit on exactly these pieces.
:::

```ts
import {
  useFileExplorer,
  createInMemoryAssetStore,
  type Asset,
} from '@cocoar/vue-file-explorer-core';
```

The required peer is [`@cocoar/vue-ui`](/components/tree) for `CoarTree` + `CoarTreeNodeLabel`. `@cocoar/vue-script-editor` is **optional** — only pulled in if you want the Monaco-typed `language` field on the file-meta resolver.

## Three building blocks

| Piece | Role | Doc |
|---|---|---|
| [`useFileExplorer({store})`](./use-file-explorer) | The composable. Tree state + tab state machine + async bookkeeping + every imperative op. | reference |
| [`AssetStore<T>`](./asset-store) | The data-plane contract a backend implements (HTTP, IndexedDB, in-memory, …). | contract |
| [`createInMemoryAssetStore`](./in-memory-store) | Reference implementation with reactive latency / failure / lazy / conflict knobs for demos and tests. | knobs |

## Full dispatch demo

A realistic shell — tree, tab bar (with preview/pinned), breadcrumb, and a dispatched editor area that swaps between `CoarScriptEditor` (Monaco) for code, `CoarMarkdownEditor` (Milkdown) for markdown, and `CoarDocumentViewer` for images. Click around, edit anything, **Ctrl+S** saves.

<preview path="./demos/FullDispatch.vue" />

Click a file to **preview** it (italic title) — clicking another file replaces the preview tab. **Double-click** to pin (italic clears). Editing a preview tab auto-pins it the moment it goes dirty — the impossible "italic + unsaved" state never exists.

::: tip Persistent viewer config across file swaps
Open `logo.svg`, click the thumbnails toggle to open the left rail, then switch to `README.md` and back. The rail stays open. Same for any tool config you pass.

That's because in the demo, `viewerSidebarOpen` / `viewerAnnotationsPanelOpen` / `viewerTools` live as refs **outside** the editor `v-if` branch — they're consumer-owned state, just passed into `CoarDocumentViewer` via `v-model` (for the panel toggles) and `:tools` (for toolbar config). When you switch from `.md` (Milkdown) back to `.svg` (DocumentViewer), the viewer is freshly mounted but the props it sees on mount are the persisted values — so the panel comes up open, the same tools are configured. No additional API needed on `useFileExplorer` — the shell owns it.
:::

## Minimal shell

Same composable, no heavy editors — useful as a starting point or for plain-text use cases:

<preview path="./demos/BasicUsage.vue" />

The composable returns refs (`rootNodes`, `selectedId`, `expanded`, `openTabs`, `activeTab`, `loadingNodes`, `savingNodes`, `breadcrumbPath`) and ops (`openFile`, `saveTab`, `closeTab`, `addFolder`, `addFiles`, `deleteNode`, `moveNode`, `rename`, `reorderTab`, …). Wire whichever you need into your shell.

::: tip Where's the `<CoarFileExplorer>` component?
Planned — and reserved under the bare `@cocoar/vue-file-explorer` name. It'll be built on these exact pieces: `useFileExplorer` + the [panel-layout](/components/panel-layout) primitives + `CoarTree`. The engine ships first because the **layout** is the part consumers most want to own (sidebar arrangement, tab bar styling, editor dispatch, context-menu shape); the hard-to-get-right bits (placeholder-then-fill open, optimistic rollback, blob-URL lifecycle, beforeunload warning, drag-to-reorder tabs) already live in the engine.
:::

## Details panel

The explorer hands you the **data** for a details / info panel; **where** it renders is your layout's call. `useFileExplorer` exposes **`selectedAsset`** (the selected node, resolved reactively from `selectedId`) and **`describeAsset(asset)`** (its framework-known property rows). Drop the panel below the tree, into a [`CoarPanelLayout`](/components/panel-layout) region — wherever.

<preview path="./demos/InfoPanel.vue" />

`describeAsset` returns only what the framework can know from the `Asset` shape + resolved file-meta — **Name, Type, Language** (script files), **Extension**, and **Path**:

```ts
const fe = useFileExplorer({ store });
// fe.selectedAsset: Readonly<Ref<Asset<T> | null>>
// fe.describeAsset(asset) → [{ key, label, value }, …]
```

```vue
<dl v-if="fe.selectedAsset.value">
  <div v-for="p in fe.describeAsset(fe.selectedAsset.value)" :key="p.key">
    <dt>{{ p.label }}</dt><dd>{{ p.value }}</dd>
  </div>
</dl>
```

Domain fields (size, modified date, author, …) live in your generic `payload<T>` — the framework can't know them, so **append your own rows**: `[...fe.describeAsset(asset), ...myPayloadRows(asset)]`. Need full control? Skip `describeAsset` and build the panel straight off `selectedAsset`.

::: tip Resizable tree-over-details sidebar
Want the tree stacked above the details panel with a draggable divider (VS-Code style)? Nest a [`CoarSplitPane`](/components/panel-layout) in your sidebar — tree in `#first`, the `selectedAsset` / `describeAsset` panel in `#second`. See the [panel layout](/components/panel-layout) docs.
:::

## Lazy mode

Stores that implement `loadChildren(parentId)` opt into lazy loading. The composable detects the capability automatically — no flag needed.

<preview path="./demos/LazyMode.vue" />

`hasChildren` hints control which folders show a chevron before their kids load. `loadingNodes` exposes the per-row spinner state so consumers can swap icon → spinner during a fetch.

## Conflict policies

Uploads and creates run through a per-store conflict policy. Default `'rename'` mirrors Finder / VSCode auto-suffixing (`foo.txt` → `foo (2).txt`).

<preview path="./demos/ConflictPolicies.vue" />

`move` and `rename` deliberately **bypass** the policy — those are explicit user intent, not file additions, so silently changing the requested name would be surprising.

## Sort modes

Sibling ordering lives on the composable (not the store), because filesystem backends can't persist per-entry order. Pick one of three built-in strategies or pass a comparator.

<preview path="./demos/SortModes.vue" />

| Mode | Behavior |
|---|---|
| `'folders-first'` (default) | Folders alphabetical, then files alphabetical — VSCode / Windows Explorer pattern. |
| `'alphabetical'` | All entries mixed alphabetical — Finder pattern. |
| `'manual'` | Array order = visual order. Drop-between-siblings positions persist via `store.move(id, parentId, position)`. |
| `(a, b) => number` | Custom comparator (e.g. by extension, by mtime). |

In any non-manual mode the composable silently drops the `position` argument when forwarding to `store.move()` — the comparator decides the final position after the parent change. `api.reorderable: Ref<boolean>` is reactive, so a toolbar can flip drag modes at runtime.

## Architecture

```
useFileExplorer({store})
├── AssetStore<T>                           ← your backend
│     loadTree / loadChildren / loadContent
│     createFolder / createFile / uploadFile
│     save / rename / delete / move
├── tree state                              ← rootNodes, selectedId, expanded
├── tab state machine                       ← openTabs, activeTab, dirty, pin/preview
├── async state                             ← loadingNodes, savingNodes
├── blob-URL leases                         ← revoked on delete + unmount
├── beforeunload warning                    ← active while any tab is dirty
└── 3-stage file-meta fallback              ← asset.editor → getFileMeta → ext heuristic
```

The composable knows nothing about HTTP / IndexedDB / multipart — the `AssetStore<T>` contract is the seam. Swap implementations without touching the view.

## What's next

| Page | Covers |
|------|--------|
| [`useFileExplorer`](./use-file-explorer) | Options, return surface, tab state machine, navigation helpers, lifecycle |
| [`AssetStore<T>` contract](./asset-store) | Every method's signature + semantics, conflict pipeline, lazy opt-in, error funnel |
| [In-memory store](./in-memory-store) | `createInMemoryAssetStore` knobs — latency / failure / sort / lazy / conflict |
