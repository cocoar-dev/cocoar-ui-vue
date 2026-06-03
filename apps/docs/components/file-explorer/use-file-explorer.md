# useFileExplorer

`useFileExplorer<T>({store, ...})` is the composable. It wires a configured [`AssetStore<T>`](./asset-store) into reactive tree + tab state, owns the async / dirty / blob-URL bookkeeping, and returns every ref and op a file-explorer shell needs.

```ts
import {
  useFileExplorer,
  type UseFileExplorerOptions,
  type UseFileExplorerReturn,
  type OpenTab,
} from '@cocoar/vue-file-explorer-core';
```

## Options

```ts
interface UseFileExplorerOptions<T = unknown> {
  store: AssetStore<T>;
  onError?: (op: AssetOp, err: unknown, ctx: AssetOpContext) => void;
  getFileMeta?: (asset: Asset<T>) => FileMeta | null;
  confirm?: (message: string) => boolean;
  initialExpandedIds?: readonly string[];
  sortMode?: MaybeRefOrGetter<SortMode<T>>;
}
```

| Option | Default | Notes |
|---|---|---|
| `store` | _required_ | Anything implementing [`AssetStore<T>`](./asset-store). The single seam between view and backend. |
| `onError` | _no-op_ | Single funnel for every store rejection. The composable has already rolled back by the time this fires. |
| `getFileMeta` | _none_ | Stage-2 of the file-meta fallback chain. Returns `null` to fall through to the extension heuristic. |
| `confirm` | `window.confirm` | Used by `closeTab` / `closeOthers` / `closeToRight` / `closeAll` to confirm discarding dirty tabs. Override for custom dialogs. |
| `initialExpandedIds` | top-level folders (eager) / `[]` (lazy) | Folder ids to seed `expanded` with. Defaults to root folders in eager mode so the user sees content immediately; defaults to empty in lazy mode so the canonical click-to-expand UX appears. |
| `sortMode` | `'folders-first'` | Sibling ordering strategy. `MaybeRefOrGetter` so a toolbar can flip it live. See [sort modes](./#sort-modes). |

## Return surface

The return is organized into four groups: tree state, tab state, ops, navigation.

### Tree state

```ts
readonly assets: Readonly<Ref<readonly Asset<T>[]>>;
readonly rootNodes: Readonly<Ref<readonly Asset<T>[]>>;
selectedId: Ref<string | null>;
readonly selectedAsset: Readonly<Ref<Asset<T> | null>>;
expanded: Ref<Set<string>>;
readonly loading: Readonly<Ref<boolean>>;
readonly loadingNodes: Readonly<Ref<ReadonlySet<string>>>;
readonly savingNodes: Readonly<Ref<ReadonlySet<string>>>;
readonly reorderable: Readonly<Ref<boolean>>;
```

| Ref | Notes |
|---|---|
| `assets` | Flat reactive list — the store's underlying projection. Read-only from the consumer's perspective. |
| `rootNodes` | Already filtered + sorted children of `null`. Pass directly to `<CoarTree :nodes>`. |
| `selectedId` | Two-way. Single-click on a row sets this; a watcher then opens the file as a preview tab. |
| `selectedAsset` | Read-only. `selectedId` resolved to the `Asset` (or `null`). Pair with `describeAsset` for a [details panel](./#details-panel). |
| `expanded` | Two-way `Set<string>` of expanded folder ids. Lazy loading is driven by CoarTree's `loadChildren` hook (bind `:load-children="fe.loadChildren"`) — the tree fires the fetch on first expand. |
| `loading` | `true` during the **initial** `store.loadTree()` call only. Per-file content loads live on `loadingNodes`; per-folder lazy loads are owned by the tree (`isLoading` slot prop). Stays `false` for stores that surface their own reactive `_assets`. |
| `loadingNodes` | Per-id Set of files being `loadContent`-fetched. (Folder lazy-loads moved to CoarTree's per-row `isLoading` slot prop.) Bind to row-icon → spinner swap. |
| `savingNodes` | Per-id Set: any in-flight save / rename / delete / move. Same spinner channel as `loadingNodes`. |
| `reorderable` | `true` when `sortMode === 'manual'`. Reactive — read it in your CoarTree wiring to gate drop-between-siblings. |

### CoarTree wiring helpers

```ts
getId: (a: Asset<T>) => string;
getChildren: (a: Asset<T>) => readonly Asset<T>[] | undefined;
getLabel: (a: Asset<T>) => string;
isExpandable: (a: Asset<T>) => boolean;
loadChildren?: (node: Asset<T>) => Promise<void>; // lazy stores only — bind to <CoarTree :load-children>
```

These mirror `<CoarTree>`'s prop signatures so you can pass them straight through:

```vue
<CoarTree
  :nodes="fe.rootNodes.value"
  :get-id="fe.getId"
  :get-children="fe.getChildren"
  :get-label="fe.getLabel"
  :is-expandable="fe.isExpandable"
  :load-children="fe.loadChildren"
  v-model:expanded="fe.expanded.value"
  v-model:selected="fe.selectedId.value"
  draggable
  renamable
  @activate="fe.activateNode"
  @rename="({ node, newName }) => fe.rename(node.id, newName)"
  @node-move="fe.moveNode"
/>
```

`isExpandable` returns `false` for folders the store reports as `hasChildren: false` — keeps the chevron off known-empty folders in lazy mode.

For **lazy stores**, bind `:load-children="fe.loadChildren"` (`undefined` for eager stores, so the binding is a no-op there). CoarTree calls it on first expand of an unloaded folder and owns the loading state (`isLoading` slot prop), the error state (`hasError` + `@load-error`) and retry (`api.reloadChildren`); the composable just supplies the fetch body and caches loaded folders so re-expand never re-fetches. Render the spinner where you like from `isLoading` (e.g. swap the row icon) and pass `hide-loading-spinner` to drop the tree's built-in chevron spinner. See the [tree lazy-loading docs](/components/tree#lazy-loading-async-children). Lazy-load failures reach **both** `onError('loadChildren', …)` (log/toast) and the tree's `@load-error` / `hasError` (row UX) — pick one channel for user-facing messaging to avoid duplicates.

### Tab state

```ts
readonly openTabs: Readonly<Ref<readonly OpenTab[]>>;
activeId: Ref<string | null>;
readonly activeTab: Readonly<Ref<OpenTab | null>>;
readonly anyDirty: Readonly<Ref<boolean>>;
isDirty: (tab: OpenTab) => boolean;
setContent: (id: string, content: string) => void;

interface OpenTab {
  id: string;
  name: string;
  editor: FileEditor;
  language?: CoarScriptEditorLanguage;
  content: string;          // current editor buffer
  savedContent: string;     // last persisted — content !== savedContent ⇒ dirty
  pinned: boolean;          // false = preview (italic, replaced on next preview)
}
```

The tab state machine implements the VSCode pattern:

| Trigger | Result |
|---|---|
| Single-click on a file row | Push a **preview** tab (italic title). At most one preview exists at a time — opening another preview replaces it. |
| Double-click / Enter / "Open" menu | Open as **pinned**. Existing previews are upgraded in place. |
| User edits → `setContent` differs from `savedContent` | Auto-pin the tab. Eliminates the impossible "italic + dirty" state. |
| `closeTab` while dirty | Calls `options.confirm` ("Discard unsaved changes to '{name}'?"). |
| `closeTab` while `savingNodes.has(id)` | Bails — closing would orphan the in-flight save. |

### Imperative ops

```ts
// CRUD — optimistic; resolve when the backend confirms
addFolder(parentId: string | null, name: string): Promise<Asset<T> | null>;
addFiles(parentId: string | null, files: FileList | readonly File[]): Promise<void>;
deleteNode(asset: Asset<T>): Promise<void>;
moveNode(e: CoarTreeNodeMoveEvent<Asset<T>>): Promise<void>;
rename(id: string, newName: string): Promise<void>;
refresh(folderId?: string | null): Promise<void>;

// Tab ops
openFile(asset: Asset<T>, opts?: { pinned: boolean }): Promise<void>;
activateNode(asset: Asset<T>): void;          // dblclick / Enter — opens pinned
saveTab(id: string): Promise<boolean>;
saveActive(): Promise<void>;
closeTab(id: string): void;
closeOthers(keepId: string): void;
closeToRight(anchorId: string): void;
closeAll(): void;
pinTab(id: string): void;
unpinTab(id: string): void;
reorderTab(sourceId: string, targetId: string, position: 'before' | 'after'): void;
```

Notes on the trickier ones:

- **`addFiles`** is the OS-drop entry point. The composable derives content per file (text or `URL.createObjectURL` for PDF / image), calls `store.uploadFile()`, then `store.save(id, content)`. Blob URLs are tracked and revoked on delete + unmount.
- **`moveNode`** consumes `<CoarTree>`'s `CoarTreeNodeMoveEvent`. For `position: 'inside'`, it auto-expands the target folder. For `'before' / 'after'`, it forwards `position?` only when `reorderable.value`.
- **`openFile`** is the placeholder-then-fill flow. The placeholder tab is pushed + activated immediately; on `loadContent` rejection the placeholder rolls back so the user isn't stranded.
- **`activateNode`** is meant for `<CoarTree @activate>`. Files open pinned; folders are a no-op (CoarTree itself toggles expansion).
- **`reorderTab`** is for drag-to-reorder. No-op on self-drop or unknown ids; pinned status is preserved on the moved tab.
- **`refresh()`** re-runs `store.loadTree()` (or `store.loadChildren(folderId)` in lazy mode when given a folder id). Use it when upstream state can change out-of-band — a SignalR push from the backend, another tab uploading a file, a server-side retention sweep. No-op for stores that surface a reactive `_assets` directly: those are already live.

### Navigation

```ts
revealInTree(id: string, focusNode?: (id: string) => void): void;
readonly breadcrumbPath: Readonly<Ref<readonly string[]>>;
pathOf(id: string): string[];
fileMeta(asset: Asset<T>): FileMeta | null;
describeAsset(asset: Asset<T>): AssetProperty[]; // { key, label, value }
```

| Helper | Notes |
|---|---|
| `revealInTree` | Walks the parentId chain, expands every ancestor in one batch, sets `selectedId`, then calls `focusNode?.(id)` after Vue flushes. Pass the tree's `api.focusNode` if you have it. |
| `breadcrumbPath` | Name-path of the **active tab**. Drives the editor-area breadcrumb. |
| `pathOf(id)` | Name-path of any asset. Used for quick-open / recent-files matchers. |
| `fileMeta(asset)` | Runs the 3-stage fallback. Returns `null` for unrecognised binary types — caller skips with a warning. |
| `describeAsset(asset)` | Framework-known property rows (Name, Type, Language, Extension, Path) for a [details panel](./#details-panel). Append your own `payload`-derived rows. Pure helper also exported as `buildAssetProperties`. |

## Persistent viewer config across file swaps

When the consumer's shell mounts different editors via `v-if` based on `activeTab.editor`, each editor component is freshly mounted on every editor-type swap (e.g. `.md` → `.ts` → `.md` unmounts + remounts Monaco the second time). Any internal editor state — Monaco's scroll position, `CoarDocumentViewer`'s sidebar open / closed, Milkdown's toolbar collapse — **resets on remount** unless the consumer's shell holds that state as refs and passes them in.

The cleanest pattern: hold whatever you want to persist as refs **outside the `v-if` branch**, bind them via `v-model` or pass them via props.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarDocumentViewer, type CoarDocumentViewerTool } from '@cocoar/vue-document-viewer';

// These live in the shell, not inside the v-if branch — they survive editor swaps.
const viewerSidebarOpen = ref(false);
const viewerAnnotationsPanelOpen = ref(false);
const viewerTools: CoarDocumentViewerTool[] = [
  'sidebar-toggle', 'annotations-panel', 'separator',
  'zoom-out', 'zoom-reset', 'zoom-in', 'separator',
  'fit-width', 'fit-page',
];
</script>

<template>
  <CoarDocumentViewer
    v-if="fe.activeTab.value?.editor === 'image' && imageSrc"
    :source="imageSrc"
    :tools="viewerTools"
    :show-thumbnails="true"
    :show-annotations-panel="true"
    v-model:sidebar-open="viewerSidebarOpen"
    v-model:annotations-panel-open="viewerAnnotationsPanelOpen"
  />
</template>
```

::: tip This is shell-level state, not composable-level
The composable deliberately knows nothing about editors — `useFileExplorer` doesn't render them or hold their config. That keeps it independent of any specific editor package, and lets every consumer's shell define its own dispatch logic (which editor for which file type, fall-through to plain text, custom editors for proprietary asset payload types, …). The trade-off: editor persistence is a shell concern. The pattern above is the canonical way to handle it.
:::

This works for every editor: hold a Monaco view-state ref outside the `v-if` and restore it in `onMounted`; hold a Milkdown collapsed-toolbar boolean outside and pass it via prop; hold the position memory ref outside and bind it to `v-model:position`. The composable doesn't care — its job is the tree + tab state, not the editor's internals.

## Lifecycle

- **Mount** — Lazy loading is driven by CoarTree's `loadChildren` hook (bind `:load-children="fe.loadChildren"`): the tree fires the fetch on first expand and on mount for any seeded `initialExpandedIds` (cascading as parents publish). The composable supplies only the fetch body and caches loaded folders so re-expand never re-fetches.
- **Eager open** — Single-click `selectedId` change is watched; file selections fire `openFile(file, { pinned: false })`.
- **Unmount** — `onScopeDispose` removes the `beforeunload` listener and revokes every blob URL the composable owns. Consumer doesn't need to clean up.
- **`beforeunload`** — Active while `anyDirty.value` is true. Browser shows its native "leave site?" prompt.

## Example consumer shell

A minimal shell — tree + breadcrumb + a single-tab editor area — to show what the composable's surface looks like in practice:

```vue
<script setup lang="ts">
import {
  createInMemoryAssetStore,
  useFileExplorer,
  type Asset,
} from '@cocoar/vue-file-explorer-core';
import { CoarTree, CoarTreeNodeLabel, CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';

const seed: Asset[] = [
  { id: 's', name: 'src', kind: 'folder', parentId: null },
  { id: 'u', name: 'utils.ts', kind: 'file', parentId: 's' },
];
const store = createInMemoryAssetStore({
  initialTree: seed,
  initialContent: { u: 'export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));' },
});
const fe = useFileExplorer({
  store,
  onError: (op, err) => console.warn(`[file-explorer] ${op}:`, err),
});
</script>

<template>
  <div class="shell">
    <aside>
      <CoarTree
        :nodes="fe.rootNodes.value"
        :get-id="fe.getId"
        :get-children="fe.getChildren"
        :get-label="fe.getLabel"
        :is-expandable="fe.isExpandable"
        :load-children="fe.loadChildren"
        v-model:expanded="fe.expanded.value"
        v-model:selected="fe.selectedId.value"
        renamable
        @activate="fe.activateNode"
        @rename="({ node, newName }) => fe.rename(node.id, newName)"
      >
        <template #default="{ node }">
          <CoarTreeNodeLabel :label="node.name" />
        </template>
      </CoarTree>
    </aside>
    <main>
      <CoarBreadcrumb v-if="fe.activeTab.value">
        <CoarBreadcrumbItem v-for="seg in fe.breadcrumbPath.value" :key="seg">
          {{ seg }}
        </CoarBreadcrumbItem>
      </CoarBreadcrumb>
      <textarea
        v-if="fe.activeTab.value"
        :value="fe.activeTab.value.content"
        @input="e => fe.setContent(fe.activeTab.value!.id, (e.target as HTMLTextAreaElement).value)"
      />
    </main>
  </div>
</template>
```

The full POC (`apps/playground/src/views/FileExplorerPocView.vue` — ~1280 LoC) wires every feature: tab bar with drag-to-reorder, context menus, `Ctrl+P` quick-open, simulator panel for latency / failure / sort / conflict, editor dispatch across Monaco / Milkdown / `CoarDocumentViewer`, OS file drop, reveal-in-tree. Treat it as the worked reference.
