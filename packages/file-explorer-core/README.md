# @cocoar/vue-file-explorer-core

VSCode-style file/asset explorer for Vue 3 — a single composable + a pluggable `AssetStore<T>` contract that decouples the UX from your backend (HTTP, IndexedDB, in-memory, whatever).

> **Status: Preview tier.** API is stable enough to consume, but small tweaks may land before the Preview marker drops. Full VitePress reference + live demos coming soon.

## Install

```bash
pnpm add @cocoar/vue-file-explorer-core @cocoar/vue-ui
```

`@cocoar/vue-ui` (for `CoarTree` + `CoarTreeNodeLabel`) is the only required peer. `@cocoar/vue-script-editor` is optional — it's only pulled if you want the resolver's Monaco-language-typed `language` field on `FileMeta`.

## What you get

| Piece | Role |
|---|---|
| `AssetStore<T>` | The data-plane contract a backend implements (load, mutate, conflict-resolve). |
| `createInMemoryAssetStore` | Default impl with reactive latency / failure / sortMode / lazy / conflict knobs — perfect for demos, tests, and rapid prototyping. |
| `useFileExplorer({store})` | The composable. Owns tree + tab state machine, async-loading bookkeeping, blob-URL leases, `beforeunload` warning, keyboard-driven UX. Returns refs to bind to `<CoarTree>` plus ops to call on user input. |
| `defaultFileMetaFromName` + `resolveFileMeta` | 3-stage fallback (`asset.editor` → `config.getFileMeta` → extension heuristic) that picks an editor + language for every file. Extension table covers ~40 Monaco-supported languages plus markdown / PDF / image. |

## Quick start

```ts
import {
  createInMemoryAssetStore,
  useFileExplorer,
  type Asset,
} from '@cocoar/vue-file-explorer-core';

const seed: Asset[] = [
  { id: 'src',     name: 'src',     kind: 'folder', parentId: null  },
  { id: 'utils',   name: 'utils.ts', kind: 'file', parentId: 'src'  },
  { id: 'docs',    name: 'docs',    kind: 'folder', parentId: null  },
  { id: 'readme',  name: 'README.md', kind: 'file', parentId: 'docs' },
];
const store = createInMemoryAssetStore({
  initialTree: seed,
  initialContent: {
    utils:  `export function clamp(...){}`,
    readme: `# Hello`,
  },
});

const fe = useFileExplorer({
  store,
  onError: (op, err, ctx) => console.warn(`[file-explorer] ${op}:`, err, ctx),
});
```

Then bind into `<CoarTree>` and your own tab bar + editor dispatch:

```vue
<CoarTree
  :nodes="fe.rootNodes.value"
  :get-id="fe.getId"
  :get-children="fe.getChildren"
  :get-label="fe.getLabel"
  :is-expandable="fe.isExpandable"
  v-model:expanded="fe.expanded.value"
  v-model:selected="fe.selectedId.value"
  draggable
  renamable
  @activate="fe.activateNode"
  @rename="({node, newName}) => fe.rename(node.id, newName)"
  @node-move="fe.moveNode"
>
  <template #default="{ node }">
    <CoarIcon :name="node.kind === 'folder' ? 'folder' : 'file'" />
    <CoarTreeNodeLabel :label="node.name" />
  </template>
</CoarTree>
```

The composable also returns `openTabs`, `activeTab`, `breadcrumbPath`, `loadingNodes`, `savingNodes`, `pathOf`, plus imperative ops `openFile` / `saveTab` / `closeTab` / `pinTab` / `unpinTab` / `reorderTab` / `addFolder` / `addFiles` / `deleteNode` / `move` / `moveNode` / `rename` / `setContent` / `refresh`.

`move(id, newParentId, position?)` is the programmatic move (optimistic + rollback) for sources that aren't a tree drag — a "move to folder" select, a grid card dropped on a folder, undo. `loadContent` / `save` / `createFile` are **optional** on the store: omit them for browse-only consumers (no editor tabs) and the composable skips the content/tab machinery + post-upload save.

## Wiring your own backend

Implement the `AssetStore<T>` methods — `createAssetStore(config)` returns the typed store:

```ts
import { createAssetStore, type AssetStore } from '@cocoar/vue-file-explorer-core';

interface MyAsset { mimeType: string; size: number }

const store: AssetStore<MyAsset> = createAssetStore({
  async loadTree() {
    return (await fetch('/api/assets').then(r => r.json())) as Asset<MyAsset>[];
  },
  async loadContent(id) { return await fetch(`/api/assets/${id}`).then(r => r.text()); },
  async createFolder(parentId, name) { /* … */ },
  async createFile(parentId, name)   { /* … */ },
  async uploadFile(parentId, file)   { /* … */ },
  async save(id, content)            { /* … */ },
  async rename(id, newName)          { /* … */ },
  async delete(id)                   { /* … */ },
  async move(id, parentId, position?) { /* … */ },
  // optional — opt into lazy loading
  async loadChildren(parentId)       { /* … */ },
  onError: (op, err, ctx) => myToast.error(err.message),
  getFileMeta: (asset) => asset.payload?.mimeType === 'application/pdf'
    ? { editor: 'pdf' }
    : null,
});
```

The composable's behavior is identical for any store implementation — eager / lazy mode is detected from the presence of `loadChildren`.

## v1 scope

- ✅ `AssetStore<T>` contract + `createAssetStore` passthrough + `createInMemoryAssetStore` reference impl
- ✅ Lazy mode (`loadChildren` opt-in)
- ✅ Sort modes: `'folders-first'` (default), `'alphabetical'`, `'manual'`, custom comparator
- ✅ Conflict policy: `'rename'` (default), `'overwrite'`, `'prompt'`, `'error'`, custom function
- ✅ Tab state machine: preview / pinned, auto-pin-on-edit, dirty marker, save flow, drag-to-reorder
- ✅ Composable-driven inline rename via `CoarTree :renamable` + `CoarTreeNodeLabel`
- ✅ Error funnel via single `onError(op, err, ctx)` callback
- ❌ `<CoarFileExplorer>` wrapper component — for v1, consumers compose the shell themselves (see the playground POC for a 1280-LoC worked example). A wrapper is a candidate for v2 once the API surface settles.
- ❌ Split-pane editors, find-in-files, ETag / optimistic-conflict — deferred to post-v1.
