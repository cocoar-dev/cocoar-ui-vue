/**
 * @cocoar/vue-file-explorer-core — `AssetStore<T>` design sketch.
 *
 * Types only. No logic. Pre-package draft: lives in the playground until the
 * interface settles, then lifts into `packages/file-explorer-core/` unchanged.
 *
 * Settled decisions (Session 2, 2026-05-21):
 *
 *   - **Hybrid lazy/eager.** `loadTree()` always returns the root. If the
 *     store also implements `loadChildren()`, the composable runs lazy
 *     (folders advertise `hasChildren`, expand triggers a fetch). If not,
 *     `loadTree()` is expected to return the full hierarchy eagerly.
 *
 *   - **Fine-grained mutations.** Separate methods for `createFolder`,
 *     `createFile`, `uploadFile`, `save`, `rename`, `delete`, `move`. Lets
 *     each backend pick the right transport (e.g. multipart for upload).
 *
 *   - **Optimistic UI, rollback on error.** The composable mutates its
 *     local tree synchronously, then awaits the store. On rejection it
 *     reverts and calls `onError`.
 *
 *   - **`onError` callback in the store config.** All errors funnel
 *     through one channel — consumer decides toast / dialog / inline.
 *
 *   - **3-stage `FileMeta` fallback.** `Asset.editor` (explicit) →
 *     `config.getFileMeta(asset)` (consumer override) →
 *     `defaultFileMetaFromName(asset.name)` (extension heuristic from POC).
 *
 *   - **Granular loading state.** Global `loading` Ref<boolean> for
 *     initial-load; `loadingNodes` Ref<Set<id>> for per-folder lazy load
 *     and per-file content load; `savingNodes` Ref<Set<id>> for in-flight
 *     mutations.
 *
 *   - **Sort mode is a composable concern, not a store concern.** A
 *     filesystem-backed store can't persist per-entry order (the FS has no
 *     such concept) — that's why VSCode's explorer doesn't support drag-
 *     reorder between siblings, only move-into-folder. So `sortMode` lives
 *     on `FileExplorerConfig` (default `'folders-first'`, VSCode-style):
 *
 *       - `'manual'`         — array order = visual order, drag-reorder
 *                              between siblings persists via `position`
 *       - `'folders-first'`  — folders alphabetical, then files alphabetical
 *       - `'alphabetical'`   — all entries mixed alphabetical (Finder-style)
 *       - `(a, b) => number` — custom comparator
 *
 *     In any non-manual mode the composable disables drop-between-siblings
 *     at the tree level and never passes `position` to `store.move()`.
 *     `store.move()` always accepts a `position?` arg so the same store
 *     contract works for both worlds; the store may ignore it.
 */

import type { CoarScriptEditorLanguage } from '@cocoar/vue-script-editor';
import type { Ref } from 'vue';

// ─── domain ────────────────────────────────────────────────────────────────

/**
 * Which built-in editor renders an asset.
 *   - `script`   — `<CoarScriptEditor>` (Monaco); `language` picks the grammar.
 *   - `markdown` — `<CoarMarkdownEditor>` (Milkdown WYSIWYG).
 *   - `pdf`      — `<CoarDocumentViewer>` with `pdfSource()`.
 *   - `image`    — `<CoarDocumentViewer>` with `imageSource()`.
 */
export type FileEditor = 'script' | 'markdown' | 'pdf' | 'image';

/** Editor dispatch metadata for one file. */
export interface FileMeta {
  editor: FileEditor;
  /** Only meaningful when `editor === 'script'`. */
  language?: CoarScriptEditorLanguage;
}

/**
 * The canonical shape the file-explorer works with.
 *
 * Hierarchy + name + kind live at the top level — the framework needs them.
 * `payload` is the consumer's bag of domain data, fully generic.
 *
 * `editor` / `language` are optional escape hatches: when present they win
 * over `config.getFileMeta` and the extension-based default.
 */
export interface Asset<T = unknown> {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  parentId: string | null;
  /**
   * Lazy-load hint. When present and the store implements `loadChildren`,
   * the folder renders as expandable even before its children are fetched.
   * Ignored in eager mode.
   */
  hasChildren?: boolean;
  editor?: FileEditor;
  language?: CoarScriptEditorLanguage;
  /** Consumer's domain payload — anything not in the framework's contract. */
  payload?: T;
}

// ─── conflict policy ───────────────────────────────────────────────────────

/**
 * What to do with the conflict the policy resolved.
 *
 *   - `'overwrite'`         — replace the existing entry; the store recursively
 *                             deletes it and then performs the create/upload.
 *   - `'rename'` + newName  — create with the supplied alternative name.
 *   - `'cancel'`            — abort the op; the store throws a conflict error.
 */
export type ConflictResolution =
  | { action: 'overwrite' }
  | { action: 'rename'; newName: string }
  | { action: 'cancel' };

/** Context handed to a function-shaped policy so it can build a smart response. */
export interface ConflictInfo<T = unknown> {
  /** The colliding existing asset. */
  existing: Asset<T>;
  /** What the caller asked to add (name + kind only — no id yet). */
  incoming: { name: string; kind: 'folder' | 'file' };
  /** Where the new entry would have lived. */
  parentId: string | null;
  /** Auto-rename candidate ("foo.txt" → "foo (2).txt"). */
  suggestedRename: string;
}

/**
 * How the store should handle a sibling-name collision on create / upload.
 * Default: `'rename'` (silent auto-suffix — matches macOS Finder / VSCode).
 *
 *   - `'rename'`    — auto-rename: "foo.txt" → "foo (2).txt", etc.
 *   - `'overwrite'` — delete the existing entry (recursively) and proceed.
 *   - `'prompt'`    — `window.prompt` for an alternative name, default to
 *                     the auto-rename suggestion. Cancel → throws conflict.
 *   - `'error'`     — never resolve; always throw the conflict error.
 *   - `(info) => …` — custom resolver; sync or async.
 *
 * `move` and `rename` deliberately bypass the policy — they're explicit
 * user intent, not file additions, so silently changing the requested
 * name would be surprising.
 */
export type ConflictPolicy<T = unknown> =
  | 'rename'
  | 'overwrite'
  | 'prompt'
  | 'error'
  | ((info: ConflictInfo<T>) => ConflictResolution | Promise<ConflictResolution>);

/** Operation tag passed to `onError` so the consumer can format its message. */
export type AssetOp =
  | 'loadTree'
  | 'loadChildren'
  | 'loadContent'
  | 'createFolder'
  | 'createFile'
  | 'uploadFile'
  | 'save'
  | 'rename'
  | 'delete'
  | 'move';

/** Context object passed alongside `op` + `error` to `onError`. */
export interface AssetOpContext {
  /** Affected asset id, when known. */
  id?: string;
  /** Target parent id, for create/move ops. */
  parentId?: string | null;
  /** Asset name, for create/rename ops. */
  name?: string;
  /** Original file, for uploadFile. */
  file?: File;
}

// ─── store interface (the data plane) ──────────────────────────────────────

/**
 * The contract a backend implements. The composable calls these and adapts
 * the result into reactive state. Implementations should throw on failure;
 * the composable funnels throws through `onError`.
 *
 * Returned `Asset<T>` objects on create/upload MUST have a stable `id`
 * already assigned by the backend — optimistic UI uses that id to reconcile.
 */
export interface AssetStore<T = unknown> {
  // — read —

  /**
   * Eager: full hierarchy. Lazy: just root-level entries; mark folders with
   * `hasChildren: true` so the tree knows they're expandable.
   */
  loadTree(): Promise<Asset<T>[]>;

  /**
   * Present → store opts into lazy loading. Called on first expand of each
   * folder. Absent → composable runs fully eager off `loadTree()`.
   */
  loadChildren?(parentId: string): Promise<Asset<T>[]>;

  /**
   * Fetch the content of a file. Return value depends on the editor:
   *   - `script` / `markdown` → `string`
   *   - `pdf` / `image`       → `string` (URL) OR `Blob`
   *
   * Composable caches the result; subsequent opens hit cache until invalidated.
   *
   * **Optional (browse-only mode).** Omit it when the consumer never opens
   * files in editor tabs (e.g. an image library that only edits metadata). The
   * composable then treats `openFile` as a no-op instead of forcing a stub that
   * throws — see also {@link save}.
   */
  loadContent?(id: string): Promise<string | Blob>;

  // — write —

  createFolder(parentId: string | null, name: string): Promise<Asset<T>>;

  /**
   * Create a new empty file. The editor + language are derived from `name`
   * via the standard fallback chain (or carried on the returned `Asset` if
   * the backend wants explicit control).
   *
   * **Optional.** The composable never calls this itself (it uploads via
   * `uploadFile`); it exists for consumers that wire a "new file" action.
   * Browse-only stores can omit it.
   */
  createFile?(parentId: string | null, name: string): Promise<Asset<T>>;

  /**
   * Upload an OS File (from drop or `<input type=file>`). Distinct from
   * `createFile` so backends can pick multipart / signed-URL transports.
   */
  uploadFile(parentId: string | null, file: File): Promise<Asset<T>>;

  /**
   * Persist new file content. Composable calls this on Ctrl+S and once after
   * each `uploadFile` to seed the uploaded bytes.
   *
   * **Optional (browse-only mode).** Omit it when uploads already persist their
   * own bytes (multipart `uploadFile`) and the consumer never edits file
   * content. The composable then skips the post-upload save — which previously
   * surfaced a spurious "saving not supported" error toast through `onError`.
   */
  save?(id: string, content: string | Blob): Promise<void>;

  rename(id: string, newName: string): Promise<void>;

  delete(id: string): Promise<void>;

  /**
   * Move `id` under `newParentId`. `position` is the destination index
   * inside the new parent's children. When `undefined`, append at end.
   * `newParentId === null` means "to the root".
   */
  move(id: string, newParentId: string | null, position?: number): Promise<void>;
}

// ─── store config (what consumers actually pass) ───────────────────────────

/**
 * `createAssetStore(config)` produces an `AssetStore<T>`. The config is
 * just a struct of the same method signatures plus framework-level concerns
 * (`onError`, `getFileMeta`).
 *
 * Splitting `AssetStoreConfig` from `AssetStore` lets us add cross-cutting
 * helpers (debouncing, retry, optimistic flags) inside `createAssetStore`
 * without leaking them into the runtime interface every consumer of the
 * store sees.
 */
export interface AssetStoreConfig<T = unknown> {
  loadTree: AssetStore<T>['loadTree'];
  loadChildren?: AssetStore<T>['loadChildren'];
  /** Optional — omit for browse-only consumers (no editor tabs). See {@link AssetStore.loadContent}. */
  loadContent?: AssetStore<T>['loadContent'];
  createFolder: AssetStore<T>['createFolder'];
  /** Optional — the composable never calls this itself. See {@link AssetStore.createFile}. */
  createFile?: AssetStore<T>['createFile'];
  uploadFile: AssetStore<T>['uploadFile'];
  /** Optional — omit when uploads self-persist and content is never edited. See {@link AssetStore.save}. */
  save?: AssetStore<T>['save'];
  rename: AssetStore<T>['rename'];
  delete: AssetStore<T>['delete'];
  move: AssetStore<T>['move'];

  /**
   * Called whenever any store operation throws. The composable will already
   * have rolled back the optimistic mutation by the time this fires.
   * No return value — consumer decides what to show.
   */
  onError?: (op: AssetOp, error: unknown, ctx: AssetOpContext) => void;

  /**
   * Per-asset editor/language override. Runs AFTER `asset.editor` is
   * checked but BEFORE the extension-based default. Use this when the
   * editor choice depends on something other than the filename — MIME
   * type, a backend `type` field, user preferences.
   *
   * Return `null` to fall through to the default heuristic.
   */
  getFileMeta?: (asset: Asset<T>) => FileMeta | null;
}

// ─── composable contract (what the component consumes) ────────────────────

/**
 * Comparator for two siblings, used in non-manual `sortMode`. Returns the
 * standard `< 0 / 0 / > 0` semantics. Folders and files arrive mixed — the
 * comparator decides any grouping (e.g. folders-first).
 */
export type AssetComparator<T = unknown> = (a: Asset<T>, b: Asset<T>) => number;

/**
 * How siblings inside a folder are ordered. Default `'folders-first'`
 * matches VSCode's explorer; pick `'manual'` when you have a backend that
 * can persist per-entry order (asset DB, CMS, etc.).
 *
 * In any non-manual mode the composable disables drop-between-siblings at
 * the tree level — only drop-INTO-folder works.
 */
export type SortMode<T = unknown> =
  | 'manual'
  | 'folders-first'
  | 'alphabetical'
  | AssetComparator<T>;

/**
 * Top-level config for `useFileExplorer(...)`. The store is the only
 * required input — everything else is presentation polish.
 */
export interface FileExplorerConfig<T = unknown> {
  store: AssetStore<T>;
  /**
   * Sibling ordering strategy. Default `'folders-first'` (VSCode-style).
   * See the `SortMode` docs for the trade-offs.
   */
  sortMode?: SortMode<T>;
  /** Initial selection, if any. Pass the id of a file to preselect-and-open. */
  initialSelectionId?: string;
  /** Folder ids that should start expanded. Default: root-level folders. */
  initialExpandedIds?: readonly string[];
}

/**
 * Imperative + reactive surface returned by `useFileExplorer`. Mirrors the
 * shape of `useTree`'s api (loading refs first, then methods).
 *
 * Tabs / breadcrumb / context-menu plumbing builds on top of this — they're
 * not part of the data plane and don't belong here.
 */
export interface FileExplorerApi<T = unknown> {
  // — reactive state —

  /** True while `store.loadTree()` is in flight (initial load only). */
  readonly loading: Readonly<Ref<boolean>>;
  /** Folder + file ids currently fetching children or content. */
  readonly loadingNodes: Readonly<Ref<ReadonlySet<string>>>;
  /** Ids with an in-flight save/rename/delete/move. */
  readonly savingNodes: Readonly<Ref<ReadonlySet<string>>>;

  /** Reactive tree, ordered. Pass directly to `<CoarTree :builder>`. */
  readonly tree: Readonly<Ref<readonly Asset<T>[]>>;

  /**
   * Whether sibling reordering is honored by the configured `sortMode`.
   * Read by the tree wiring to flip CoarTree between `'reorder'` and
   * `'move'` draggable modes. Reactive so consumers can toggle sort modes
   * at runtime (e.g. a "manual reorder" toggle in the toolbar).
   */
  readonly reorderable: Readonly<Ref<boolean>>;

  // — imperative ops (optimistic; resolve when backend confirms) —

  createFolder(parentId: string | null, name: string): Promise<Asset<T>>;
  createFile(parentId: string | null, name: string): Promise<Asset<T>>;
  uploadFiles(parentId: string | null, files: readonly File[]): Promise<Asset<T>[]>;
  save(id: string, content: string | Blob): Promise<void>;
  rename(id: string, newName: string): Promise<void>;
  delete(id: string): Promise<void>;
  /**
   * `position` is honored only when `sortMode === 'manual'`; otherwise it
   * is silently dropped (the comparator decides the final position after
   * the parent change).
   */
  move(id: string, newParentId: string | null, position?: number): Promise<void>;

  // — meta —

  /**
   * Resolve a file's editor/language using the 3-stage fallback chain.
   * Returns `null` for unsupported / likely-binary files (caller logs +
   * skips, same as the POC does today).
   */
  fileMeta(asset: Asset<T>): FileMeta | null;

  /** Force a re-fetch of the tree (or one folder). */
  refresh(folderId?: string | null): Promise<void>;
}

// ─── factory signatures (sketch — bodies live in `create-asset-store.ts`) ──

/**
 * Wraps a config into a fully-typed `AssetStore<T>`. Today this is a thin
 * passthrough; the wrapper exists so future cross-cutting concerns
 * (request dedup, retry, telemetry) have a home.
 */
export declare function createAssetStore<T = unknown>(
  config: AssetStoreConfig<T>,
): AssetStore<T>;

/**
 * Browser-only default implementation. Backed by a `ref<Asset<T>[]>` plus
 * an `id → content` map. Used by the playground POC and by any consumer
 * that wants offline / demo behaviour.
 */
export declare function createInMemoryAssetStore<T = unknown>(options?: {
  /** Seed data. Optimistic ops mutate this ref in place. */
  initialTree?: readonly Asset<T>[];
  /** Seed file contents by id. */
  initialContent?: Readonly<Record<string, string | Blob>>;
  /** Artificial latency per op, for visualising loading states. Default 0. */
  latencyMs?: number;
  /** Random-failure rate (0..1), for exercising the error path. Default 0. */
  failureRate?: number;
}): AssetStore<T>;

// ─── still open (do NOT bake in yet) ──────────────────────────────────────
//
// - **Upload conflict policy.** Drop a file whose name collides with an
//   existing sibling. Today the POC lets both exist. Likely shape:
//   `config.onConflict?: 'overwrite' | 'rename' | 'prompt' | ((existing,incoming)=>...)`.
// - **`CoarTree` ownership of inline rename.** User flagged this last
//   session: tree should expose `api.startRename(id)` + emit a `rename`
//   event, so context-menu items just delegate. Tracked in the handoff
//   doc; handle during package extraction.
// - **Optimistic conflict / ETag.** Out of scope for v1; add when a real
//   backend asks for it.
