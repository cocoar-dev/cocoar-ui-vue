# AssetStore&lt;T&gt; contract

`AssetStore<T>` is the data-plane interface that decouples the file-explorer UX from any specific backend. Implement these methods over HTTP, IndexedDB, S3, the OPFS, an in-memory `ref` — the composable doesn't care. `createAssetStore(config)` returns a typed store from a flat config struct; this is the recommended factory because it gives future cross-cutting wrappers (request dedup, retry, telemetry) a place to land.

```ts
import {
  createAssetStore,
  type AssetStore,
  type AssetStoreConfig,
  type Asset,
} from '@cocoar/vue-file-explorer';
```

## The shape

```ts
interface AssetStore<T = unknown> {
  // read
  loadTree(): Promise<Asset<T>[]>;
  loadChildren?(parentId: string): Promise<Asset<T>[]>;   // optional — opts into lazy mode
  loadContent(id: string): Promise<string | Blob>;

  // write
  createFolder(parentId: string | null, name: string): Promise<Asset<T>>;
  createFile(parentId: string | null, name: string): Promise<Asset<T>>;
  uploadFile(parentId: string | null, file: File): Promise<Asset<T>>;
  save(id: string, content: string | Blob): Promise<void>;
  rename(id: string, newName: string): Promise<void>;
  delete(id: string): Promise<void>;
  move(id: string, newParentId: string | null, position?: number): Promise<void>;
}
```

::: tip Throw on failure
The composable funnels every store rejection through `onError(op, err, ctx)` and rolls back the optimistic local mutation before the callback fires. Throw — don't return a tagged error object. The composable interprets a resolved promise as success.
:::

## The asset shape

```ts
interface Asset<T = unknown> {
  id: string;                  // stable across mutations — used for tree identity
  name: string;
  kind: 'folder' | 'file';
  parentId: string | null;     // null = root; flat structure, NOT nested children[]
  hasChildren?: boolean;       // lazy hint — set on folders in loadTree() / loadChildren()
  editor?: FileEditor;         // optional explicit override (wins the 3-stage fallback)
  language?: CoarScriptEditorLanguage;
  payload?: T;                 // your domain data — MIME, size, owner, etc.
}
```

The hierarchy is flat with a `parentId` link, **not** nested with embedded `children[]`. That's deliberate: backends can return root + descendants in any order, the composable filters at render time, and mutations (move / delete / rename) operate on a single object instead of walking and re-stitching trees.

## Reading

### `loadTree(): Promise<Asset<T>[]>`

Called once on mount. Two contracts depending on whether `loadChildren` is present:

| `loadChildren` | What `loadTree` returns |
|---|---|
| absent | The **full hierarchy** — every asset the user can reach. Eager mode. |
| present | Just **root-level** entries. Mark folders with `hasChildren: true` if they have children that aren't yet loaded. Lazy mode. |

Folders with `hasChildren: false` (explicit) hide the chevron and are non-expandable. Leave it `undefined` to treat every folder as potentially-expandable.

### `loadChildren?(parentId): Promise<Asset<T>[]>`

Implement this to opt into lazy loading. Called on first expand of each folder. Subsequent expansions of the same folder don't re-call — the composable caches the loaded set per session.

Return one level of children. The composable merges them into the projection so siblings render in the correct sort order.

### `loadContent(id): Promise<string | Blob>`

Called when a file is opened in a tab. Return type depends on the editor — picked via the 3-stage fallback `asset.editor → config.getFileMeta(asset) → defaultFileMetaFromName(asset.name)`:

| Editor | Expected content |
|---|---|
| `'script'` | `string` — Monaco grammar is picked from `language`. |
| `'markdown'` | `string` — Milkdown WYSIWYG content. |
| `'pdf'` | `string` (URL) or `Blob` — handed to `pdfSource()`. |
| `'image'` | `string` (URL) or `Blob` — handed to `imageSource()`. |

The composable caches loaded content per tab; reopening a closed file re-calls `loadContent` (caches are tab-scoped, not session-scoped).

::: warning Placeholder-then-fill
A tab is pushed + activated **immediately** when the user clicks a file; `loadContent` runs concurrently and the editor only mounts when `loadingNodes.has(activeId)` flips false. A rejection rolls the placeholder back so the user isn't stranded on an empty editor for a file that never loaded.
:::

## Writing

All write ops are optimistic — the composable mutates local state synchronously, awaits the store, and rolls back on rejection. Each method emits a `savingNodes` entry while in flight so the row icon can swap to a spinner.

### `createFolder(parentId, name)` &middot; `createFile(parentId, name)`

Create an empty folder / file under `parentId` (`null` = root). Returns the persisted asset with its stable id assigned. Name collisions run through the conflict pipeline (see below).

### `uploadFile(parentId, file)`

Distinct from `createFile` so backends can pick multipart / signed-URL transports. **The store creates the entry only** — the composable owns the byte → string/Blob conversion (it knows the editor and when to use `URL.createObjectURL`) and follows up with `save(id, content)`. Keeps the store framework-agnostic over blob-URL leases.

### `save(id, content)`

Persist new file content. Called on `Ctrl+S` (via `saveTab` / `saveActive`) and after `uploadFile`. The composable blocks tab close while a save is in flight (`closeTab` bails early if `savingNodes.has(id)`).

### `rename(id, newName)`

Rename in-place. Throws on sibling-name collision — `rename` deliberately **bypasses** the conflict policy because the user just typed a name and silently changing it would be surprising.

### `delete(id)`

Recursive — folder deletes cascade. The composable closes any open tab for the deleted asset (or any descendant) and revokes blob URLs it owns for those assets.

### `move(id, newParentId, position?)`

Reparent. `position` is the destination index inside the new parent's children; `undefined` means append. `newParentId === null` moves to root.

The composable only passes `position` when `sortMode === 'manual'` — in non-manual modes the comparator decides where the moved node lands, so `position` is silently dropped. Implementations should still accept the optional arg for forwards compatibility.

## Conflict policy

Create + upload run through a conflict policy on sibling-name collision. The policy is configured on the store (see [`createInMemoryAssetStore`'s `onConflict` knob](./in-memory-store#onconflict)) and resolves to one of:

```ts
type ConflictResolution =
  | { action: 'overwrite' }
  | { action: 'rename'; newName: string }
  | { action: 'cancel' };
```

Built-in policies:

| Policy | Behavior |
|---|---|
| `'rename'` (default) | Auto-suffix: `foo.txt` → `foo (2).txt` → `foo (3).txt`. Matches Finder / VSCode. |
| `'overwrite'` | Delete the existing entry (recursively) and proceed with the requested name. |
| `'prompt'` | `window.prompt` for an alternative name, default to the auto-suggestion. Cancel → throws. |
| `'error'` | Never resolves — always throws the conflict error. |
| `(info) => ConflictResolution \| Promise<ConflictResolution>` | Custom resolver. Async OK. |

The function form receives a `ConflictInfo<T>`:

```ts
interface ConflictInfo<T = unknown> {
  existing: Asset<T>;
  incoming: { name: string; kind: 'folder' | 'file' };
  parentId: string | null;
  suggestedRename: string;       // 'foo (2).txt'
}
```

::: info Policy runs BEFORE latency
Resolution runs synchronously (relative to the store's own simulated latency in the in-memory impl), so a `'prompt'` dialog isn't blocked behind an artificial 1-second wait.
:::

## Error funnel

All store rejections funnel through one consumer-supplied callback:

```ts
type AssetOp =
  | 'loadTree' | 'loadChildren' | 'loadContent'
  | 'createFolder' | 'createFile' | 'uploadFile'
  | 'save' | 'rename' | 'delete' | 'move';

interface AssetOpContext {
  id?: string;                   // affected asset id
  parentId?: string | null;      // for create / move
  name?: string;                 // for create / rename
  file?: File;                   // for uploadFile
}

onError?: (op: AssetOp, error: unknown, ctx: AssetOpContext) => void;
```

By the time `onError` fires the composable has already rolled back the optimistic mutation (e.g. a failed `loadContent` removes the placeholder tab, a failed `uploadFile` skips the follow-up `save`). The callback's job is presentation — toast, dialog, inline banner. No return value.

## File-meta resolution

The store can supply a `getFileMeta(asset)` override that runs in the middle of a 3-stage fallback chain:

```ts
getFileMeta?: (asset: Asset<T>) => FileMeta | null;

interface FileMeta {
  editor: 'script' | 'markdown' | 'pdf' | 'image';
  language?: CoarScriptEditorLanguage;     // only meaningful when editor === 'script'
}
```

| Stage | Source | Use when |
|---|---|---|
| 1 | `asset.editor` (+ `asset.language`) on the asset itself | The backend knows the editor authoritatively (e.g. a typed asset DB). |
| 2 | `config.getFileMeta(asset)` | The editor choice depends on something other than the filename — MIME, a `type` field, user preferences. Return `null` to fall through. |
| 3 | `defaultFileMetaFromName(asset.name)` | Extension heuristic — handles ~40 Monaco grammars + markdown + pdf + common image formats. |

`resolveFileMeta(asset, {getFileMeta})` is exported if you need to run the same fallback outside the composable.

## Wiring a real backend

```ts
import { createAssetStore, type Asset } from '@cocoar/vue-file-explorer';

interface MyAsset { mimeType: string; size: number }

const store = createAssetStore<MyAsset>({
  async loadTree() {
    const res = await fetch('/api/assets');
    return await res.json() as Asset<MyAsset>[];
  },
  async loadContent(id) {
    return await fetch(`/api/assets/${id}/content`).then(r => r.text());
  },
  async createFolder(parentId, name) {
    return await api.post('/api/folders', { parentId, name });
  },
  async createFile(parentId, name) {
    return await api.post('/api/files', { parentId, name });
  },
  async uploadFile(parentId, file) {
    const body = new FormData();
    body.set('parentId', parentId ?? '');
    body.set('file', file);
    return await api.post('/api/files/upload', body);
  },
  async save(id, content) { await api.put(`/api/files/${id}`, content); },
  async rename(id, newName) { await api.patch(`/api/assets/${id}`, { name: newName }); },
  async delete(id) { await api.delete(`/api/assets/${id}`); },
  async move(id, parentId, position) {
    await api.patch(`/api/assets/${id}`, { parentId, position });
  },

  // optional — opt into lazy loading
  async loadChildren(parentId) {
    return await fetch(`/api/assets?parent=${parentId}`).then(r => r.json());
  },

  onError: (op, err, ctx) => toast.error(`${op} failed: ${(err as Error).message}`),

  getFileMeta: (asset) =>
    asset.payload?.mimeType === 'application/pdf'
      ? { editor: 'pdf' }
      : null,
});
```

That's the entire seam. Hand `store` to `useFileExplorer({store})` and the UX is identical to the in-memory demo — lazy / sort / conflict behaviors are all driven from the composable + store config.
