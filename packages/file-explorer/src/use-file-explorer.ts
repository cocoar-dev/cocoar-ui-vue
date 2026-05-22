/**
 * `useFileExplorer<T>(options)` — the medium-scope composable that powers
 * the file-explorer POC and (post-extraction) the `@cocoar/vue-file-explorer`
 * package.
 *
 * Owns:
 *   - the data plane: calls `store.loadTree()` on mount + `loadChildren()`
 *     on lazy expansion, patches an internal projection after each
 *     successful CRUD op. Stores that surface a reactive `_assets` ref
 *     (the in-memory reference impl) bypass the projection — their ref IS
 *     the source. CRUD ops, error funnel, loading / saving Sets, file-meta
 *     resolution all live here.
 *   - the tree state (`selectedId`, `expanded`)
 *   - the tab state machine (`openTabs`, `activeId`, dirty tracking,
 *     pinned/preview, auto-pin on edit, content load placeholder)
 *   - the OS-file → blob-URL lease tracking (revokes on delete + unmount)
 *   - the `beforeunload` warning while any tab is dirty
 *
 * Out of scope (the embedding owns these):
 *   - editor dispatch template / file icons
 *   - splitter, simulator, toasts presentation, context menus, rename UI
 *   - keyboard shortcut wiring (Ctrl+S, F2)
 *
 * Errors:
 *   Store failures funnel through `options.onError(op, err, ctx)`. The
 *   composable will already have rolled back the optimistic mutation by
 *   then (e.g. failed `loadContent` removes the placeholder tab). If no
 *   `onError` is supplied the failure is silently swallowed — pass one in
 *   the POC to drive toasts / dialogs.
 *
 * Prompts:
 *   `closeTab` + cascade closers prompt for confirmation when discarding
 *   dirty tabs. Native `window.confirm` by default; override via
 *   `options.confirm` for custom dialogs.
 */

import { computed, nextTick, onScopeDispose, ref, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';
import type { CoarTreeNodeMoveEvent } from '@cocoar/vue-ui';
import type { CoarScriptEditorLanguage } from '@cocoar/vue-script-editor';

import type {
  Asset,
  AssetComparator,
  AssetOp,
  AssetOpContext,
  AssetStore,
  AssetStoreConfig,
  FileEditor,
  FileMeta,
  SortMode,
} from './asset-store';
import { resolveFileMeta } from './file-meta';

/**
 * A tab open in the editor area. Held in `shallowRef` so swaps trigger
 * re-renders without Vue having to track every keystroke inside `content`.
 */
export interface OpenTab {
  id: string;
  name: string;
  editor: FileEditor;
  language?: CoarScriptEditorLanguage;
  /** Current editor buffer. */
  content: string;
  /** Last persisted content. `content !== savedContent` ⇒ dirty. */
  savedContent: string;
  /**
   * Preview tabs (false) render in italic; opening another file in
   * preview mode replaces them. Editing auto-promotes to pinned.
   */
  pinned: boolean;
}

export interface UseFileExplorerOptions<T = unknown> {
  store: AssetStore<T>;
  /** Single funnel for every store failure. Composable has already rolled back. */
  onError?: (op: AssetOp, error: unknown, ctx: AssetOpContext) => void;
  /** 3-stage fallback override slot (`asset.editor` → here → extension default). */
  getFileMeta?: AssetStoreConfig<T>['getFileMeta'];
  /** Discard-dirty / delete confirmations. Default: `window.confirm`. */
  confirm?: (message: string) => boolean;
  /** Folder ids to seed `expanded` with. Default: top-level folders. */
  initialExpandedIds?: readonly string[];
  /**
   * Sibling ordering strategy. Default `'folders-first'` (VSCode pattern).
   * Reactive via `Ref` / getter so a toolbar can swap modes at runtime.
   * In any non-manual mode the composable silently drops the `position` arg
   * on `move` — the comparator decides where the moved node lands.
   */
  sortMode?: MaybeRefOrGetter<SortMode<T>>;
}

export interface UseFileExplorerReturn<T = unknown> {
  // ── tree state ─────────────────────────────────────────────────────────
  /** Flat reactive asset list (the store's underlying ref). */
  readonly assets: Readonly<Ref<readonly Asset<T>[]>>;
  /** Root-level slice — pass directly to `<CoarTree :nodes>`. */
  readonly rootNodes: Readonly<Ref<readonly Asset<T>[]>>;
  selectedId: Ref<string | null>;
  expanded: Ref<Set<string>>;

  // ── CoarTree wiring helpers ────────────────────────────────────────────
  getId: (a: Asset<T>) => string;
  getChildren: (a: Asset<T>) => readonly Asset<T>[] | undefined;
  getLabel: (a: Asset<T>) => string;
  isExpandable: (a: Asset<T>) => boolean;

  /**
   * `true` when `sortMode === 'manual'`. Reactive so a sort-mode toolbar
   * can flip it at runtime. Drives whether `move` honors a `position` arg —
   * future hook for CoarTree's drag mode when the prop is exposed.
   */
  readonly reorderable: Readonly<Ref<boolean>>;

  // ── async state ────────────────────────────────────────────────────────
  /**
   * `true` during the initial `store.loadTree()` call. Stays `false` for
   * stores that surface their own reactive `_assets` (they own their load
   * lifecycle). Per-folder lazy loads + per-file content loads live on
   * `loadingNodes` instead — `loading` is strictly the initial-load signal.
   */
  readonly loading: Readonly<Ref<boolean>>;
  /** Files whose content is being loaded via `store.loadContent`. */
  readonly loadingNodes: Readonly<Ref<ReadonlySet<string>>>;
  /** Assets with an in-flight save/rename/delete/move. */
  readonly savingNodes: Readonly<Ref<ReadonlySet<string>>>;

  // ── tabs ───────────────────────────────────────────────────────────────
  readonly openTabs: Readonly<Ref<readonly OpenTab[]>>;
  activeId: Ref<string | null>;
  readonly activeTab: Readonly<Ref<OpenTab | null>>;
  readonly anyDirty: Readonly<Ref<boolean>>;
  isDirty: (tab: OpenTab) => boolean;
  /**
   * Update a tab's editor buffer. Auto-pins preview tabs the moment they
   * go dirty (VSCode pattern — dirty preview tabs never exist).
   */
  setContent: (id: string, content: string) => void;

  // ── CRUD ops (optimistic; awaited resolves when backend confirms) ──────
  /** `name` is required — the embedding handles the prompt UI. */
  addFolder: (parentId: string | null, name: string) => Promise<Asset<T> | null>;
  addFiles: (parentId: string | null, files: FileList | readonly File[]) => Promise<void>;
  deleteNode: (asset: Asset<T>) => Promise<void>;
  /** Translates CoarTree's drop event → `store.move(id, parentId, position?)`. */
  moveNode: (e: CoarTreeNodeMoveEvent<Asset<T>>) => Promise<void>;
  rename: (id: string, newName: string) => Promise<void>;
  /**
   * Re-fetch the tree (or one folder's children) from the store. No-op for
   * stores that surface a reactive `_assets` directly — they're already
   * live. Pass a `folderId` to refresh just that folder in lazy mode;
   * `undefined` / `null` runs a full `loadTree()`.
   */
  refresh: (folderId?: string | null) => Promise<void>;

  // ── tab ops ────────────────────────────────────────────────────────────
  openFile: (asset: Asset<T>, opts?: { pinned: boolean }) => Promise<void>;
  /** Pin (`{pinned: true}`); use on dblclick / Enter / "Open" menu item. */
  activateNode: (asset: Asset<T>) => void;
  saveTab: (id: string) => Promise<boolean>;
  saveActive: () => Promise<void>;
  closeTab: (id: string) => void;
  closeOthers: (keepId: string) => void;
  closeToRight: (anchorId: string) => void;
  closeAll: () => void;
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  /**
   * Move tab `sourceId` to be immediately `before` or `after` `targetId`
   * in the tab bar. No-op for self-drop or unknown ids. Pinned vs. preview
   * status is preserved on the moved tab — consumers that want pinned-only-
   * left ordering should validate before calling.
   */
  reorderTab: (sourceId: string, targetId: string, position: 'before' | 'after') => void;

  // ── navigation ─────────────────────────────────────────────────────────
  /** Walk parentId chain → expand all ancestors → focus + select. */
  revealInTree: (id: string, focusNode?: (id: string) => void) => void;
  /** Asset-name path from root to active file. Empty when no active tab. */
  readonly breadcrumbPath: Readonly<Ref<readonly string[]>>;
  /**
   * Name path from root to `id`, inclusive. Empty when the id isn't found.
   * Drives breadcrumb-style displays for arbitrary nodes (quick-open,
   * recent-files, etc.) — `breadcrumbPath` is the active-tab special case.
   */
  pathOf: (id: string) => string[];

  // ── meta ───────────────────────────────────────────────────────────────
  fileMeta: (asset: Asset<T>) => FileMeta | null;
}

/**
 * `useFileExplorer<T>(options)` — see file docblock for the contract.
 */
export function useFileExplorer<T = unknown>(
  options: UseFileExplorerOptions<T>,
): UseFileExplorerReturn<T> {
  const { store, onError, getFileMeta, confirm = window.confirm.bind(window) } = options;

  // ── helpers ───────────────────────────────────────────────────────────
  const reportError = (op: AssetOp, error: unknown, ctx: AssetOpContext = {}) => {
    onError?.(op, error, ctx);
  };

  // ── state: tree projection ────────────────────────────────────────────
  // Two paths:
  //   - `store._assets` present (in-memory reference impl): use it directly —
  //     mutations the store applies to its own ref drive reactivity for free.
  //   - `store._assets` absent (HTTP/IndexedDB/any-real-backend store
  //     conforming to the typed `AssetStore<T>` contract): we maintain
  //     `internal`, seed it with `store.loadTree()` on mount, and patch it
  //     after each successful CRUD op. `refresh()` re-fetches.
  const internal = ref<Asset<T>[]>([]) as Ref<Asset<T>[]>;
  const storeAssetsRef = (store as { _assets?: Ref<Asset<T>[]> })._assets;
  const usesStoreRef = storeAssetsRef !== undefined;
  const assets: Ref<Asset<T>[]> = storeAssetsRef ?? internal;

  // True only during the initial `loadTree()`. Per-folder lazy loads + per-file
  // content loads live on `loadingNodes` instead. Stays `false` for stores
  // that surface `_assets` (they own their load state).
  const loading = ref(false);

  /**
   * Merge fresh assets into `internal` by id — preserves order for existing
   * entries, appends new ones at the end. No-op when the store provides its
   * own reactive `_assets` (the store's own mutations are the source).
   */
  const mergeAssets = (fresh: readonly Asset<T>[]): void => {
    if (usesStoreRef || fresh.length === 0) return;
    const byId = new Map<string, Asset<T>>();
    for (const a of internal.value) byId.set(a.id, a);
    for (const a of fresh) byId.set(a.id, a);
    internal.value = Array.from(byId.values());
  };
  const replaceAssets = (fresh: readonly Asset<T>[]): void => {
    if (usesStoreRef) return;
    internal.value = [...fresh];
  };
  const removeAssets = (ids: ReadonlySet<string>): void => {
    if (usesStoreRef || ids.size === 0) return;
    internal.value = internal.value.filter((a) => !ids.has(a.id));
  };
  const patchAsset = (id: string, patch: Partial<Asset<T>>): void => {
    if (usesStoreRef) return;
    internal.value = internal.value.map((a) =>
      a.id === id ? { ...a, ...patch } : a,
    );
  };

  // ── sort mode resolution ──────────────────────────────────────────────
  // `folders-first` matches VSCode + Windows Explorer; `alphabetical` is the
  // Finder-style mixed sort; `manual` preserves the store's array order so
  // drag-reorder between siblings sticks. Custom comparator is the escape
  // hatch. All evaluated per-render via `toValue` so the simulator panel
  // can toggle modes live.
  const sortModeRef = computed(() => toValue(options.sortMode) ?? 'folders-first');
  const reorderable = computed(() => sortModeRef.value === 'manual');

  const comparatorFor = (mode: SortMode<T>): AssetComparator<T> | null => {
    if (mode === 'manual') return null;
    if (typeof mode === 'function') return mode;
    if (mode === 'alphabetical') return (a, b) => a.name.localeCompare(b.name);
    // folders-first: folders before files, then by name within each group.
    return (a, b) => {
      const folderDelta = Number(b.kind === 'folder') - Number(a.kind === 'folder');
      return folderDelta !== 0 ? folderDelta : a.name.localeCompare(b.name);
    };
  };

  /**
   * Children of `parentId` (or null for root), sorted per the current mode.
   * `.filter()` already returns a new array — we sort in place on that.
   */
  const childrenOf = (parentId: string | null): Asset<T>[] => {
    const kids = assets.value.filter((a) => a.parentId === parentId);
    const cmp = comparatorFor(sortModeRef.value);
    return cmp ? kids.sort(cmp) : kids;
  };

  const rootNodes = computed(() => childrenOf(null));

  const getId = (a: Asset<T>) => a.id;
  const getChildren = (a: Asset<T>): readonly Asset<T>[] | undefined =>
    a.kind === 'folder' ? childrenOf(a.id) : undefined;
  const getLabel = (a: Asset<T>) => a.name;
  /**
   * Folders are expandable unless their `hasChildren` hint says otherwise.
   * Lazy stores set `hasChildren: false` for known-empty folders so the
   * tree hides the chevron; eager stores leave it `undefined` and every
   * folder is treated as expandable (same as the old behaviour).
   */
  const isExpandable = (a: Asset<T>) => a.kind === 'folder' && a.hasChildren !== false;

  // ── state: tree UI (selection + expansion) ────────────────────────────
  // Default initial-expanded: top-level folders in eager mode (welcome the
  // user with content showing), nothing in lazy mode (otherwise every page
  // load would fire a flurry of loadChildren and the user wouldn't get the
  // canonical click-to-expand lazy UX).
  const storeIsLazy = 'loadChildren' in store && typeof store.loadChildren === 'function';
  const initialExpandedIds =
    options.initialExpandedIds ??
    (storeIsLazy
      ? []
      : assets.value.filter((a) => a.parentId === null && a.kind === 'folder').map((a) => a.id));
  const expanded = ref<Set<string>>(new Set(initialExpandedIds));
  const selectedId = ref<string | null>(null);

  // ── state: async ──────────────────────────────────────────────────────
  const loadingNodes = ref<Set<string>>(new Set());
  const savingNodes = ref<Set<string>>(new Set());

  /** Clone-then-mutate Set so Vue's reactivity fires (it doesn't track add/delete). */
  const setBusy = (target: Ref<Set<string>>, id: string, busy: boolean) => {
    const next = new Set(target.value);
    if (busy) next.add(id);
    else next.delete(id);
    target.value = next;
  };

  // ── state: tabs ───────────────────────────────────────────────────────
  const openTabs = shallowRef<OpenTab[]>([]);
  const activeId = ref<string | null>(null);
  const activeTab = computed(() => openTabs.value.find((t) => t.id === activeId.value) ?? null);
  const isDirty = (tab: OpenTab): boolean => tab.content !== tab.savedContent;
  const anyDirty = computed(() => openTabs.value.some(isDirty));

  // ── helpers: lookups ──────────────────────────────────────────────────
  const findAsset = (id: string): Asset<T> | null =>
    assets.value.find((a) => a.id === id) ?? null;

  /** BFS descendants of `rootId`, inclusive. */
  const descendantIds = (rootId: string): Set<string> => {
    const out = new Set<string>([rootId]);
    let added = true;
    while (added) {
      added = false;
      for (const a of assets.value) {
        if (a.parentId && out.has(a.parentId) && !out.has(a.id)) {
          out.add(a.id);
          added = true;
        }
      }
    }
    return out;
  };

  const fileMeta = (asset: Asset<T>): FileMeta | null =>
    resolveFileMeta(asset, { getFileMeta });

  // ── owned blob-URL leases ─────────────────────────────────────────────
  // OS-file uploads get a Blob URL (so PDF/image editors can fetch them).
  // We track them so they're revoked on delete + on the explorer unmount.
  const ownedBlobUrls = new Set<string>();

  const readFileContent = async (
    file: File,
  ): Promise<{ content: string; editor: FileEditor } | null> => {
    const meta = resolveFileMeta<T>(
      { id: '', name: file.name, kind: 'file', parentId: null } as Asset<T>,
      { getFileMeta },
    );
    if (!meta) {
      console.warn(`[file-explorer] Unsupported file type: ${file.name}`);
      return null;
    }
    if (meta.editor === 'pdf' || meta.editor === 'image') {
      const url = URL.createObjectURL(file);
      ownedBlobUrls.add(url);
      return { content: url, editor: meta.editor };
    }
    return { content: await file.text(), editor: meta.editor };
  };

  // ── CRUD ──────────────────────────────────────────────────────────────
  const addFolder = async (
    parentId: string | null,
    name: string,
  ): Promise<Asset<T> | null> => {
    try {
      const created = await store.createFolder(parentId, name);
      mergeAssets([created]);
      if (parentId) expanded.value = new Set(expanded.value).add(parentId);
      return created;
    } catch (e) {
      reportError('createFolder', e, { parentId, name });
      return null;
    }
  };

  const addFiles = async (
    parentId: string | null,
    files: FileList | readonly File[],
  ): Promise<void> => {
    const list = Array.from(files);
    let created = false;
    for (const file of list) {
      const read = await readFileContent(file);
      if (!read) continue;
      let asset: Asset<T>;
      try {
        asset = await store.uploadFile(parentId, file);
      } catch (e) {
        reportError('uploadFile', e, { parentId, file });
        continue;
      }
      mergeAssets([asset]);
      setBusy(savingNodes, asset.id, true);
      try {
        await store.save(asset.id, read.content);
        created = true;
      } catch (e) {
        reportError('save', e, { id: asset.id, name: asset.name });
      } finally {
        setBusy(savingNodes, asset.id, false);
      }
    }
    if (created && parentId) {
      expanded.value = new Set(expanded.value).add(parentId);
    }
  };

  const deleteNode = async (node: Asset<T>): Promise<void> => {
    // Snapshot descendants BEFORE the store deletes them — we still need
    // the ids to revoke blob URLs and close any open tabs.
    const doomed = descendantIds(node.id);
    for (const id of doomed) {
      const c = (store as { _contents?: Map<string, string | Blob> })._contents?.get(id);
      if (typeof c === 'string' && ownedBlobUrls.has(c)) {
        URL.revokeObjectURL(c);
        ownedBlobUrls.delete(c);
      }
    }
    if (doomed.size > 0) {
      openTabs.value = openTabs.value.filter((t) => !doomed.has(t.id));
      if (activeId.value && doomed.has(activeId.value)) {
        activeId.value = openTabs.value[0]?.id ?? null;
      }
    }
    setBusy(savingNodes, node.id, true);
    try {
      await store.delete(node.id);
      removeAssets(doomed);
    } catch (e) {
      reportError('delete', e, { id: node.id, name: node.name });
    } finally {
      setBusy(savingNodes, node.id, false);
    }
  };

  const moveNode = async (
    e: CoarTreeNodeMoveEvent<Asset<T>>,
  ): Promise<void> => {
    const { source, target, position } = e;
    // In non-manual sort modes `position` is silently dropped — the
    // comparator decides where the moved node lands. The drop-between-
    // siblings affordance is still active at the tree level (CoarTree
    // doesn't currently expose a flag to disable it), so a drop "before
    // foo.txt" in folders-first mode just means "move into foo.txt's
    // parent" and the sort handles the rest.
    const honorPosition = reorderable.value;
    setBusy(savingNodes, source.id, true);
    try {
      if (!target) {
        await store.move(source.id, null);
        patchAsset(source.id, { parentId: null });
        return;
      }
      if (position === 'inside') {
        if (target.kind !== 'folder') return;
        await store.move(source.id, target.id);
        patchAsset(source.id, { parentId: target.id });
        expanded.value = new Set(expanded.value).add(target.id);
        return;
      }
      // 'before' / 'after' — only compute an explicit position when manual.
      if (!honorPosition) {
        await store.move(source.id, target.parentId);
        patchAsset(source.id, { parentId: target.parentId });
        return;
      }
      const siblings = assets.value.filter(
        (a) => a.parentId === target.parentId && a.id !== source.id,
      );
      const targetIdx = siblings.findIndex((a) => a.id === target.id);
      const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
      await store.move(source.id, target.parentId, insertAt);
      // Manual sort: re-fetch authoritative order from the backend. The local
      // patchAsset above would mark parentId correctly but not the new
      // sibling order, which is the whole point of manual mode.
      if (!usesStoreRef) {
        await reloadTree();
      }
    } catch (err) {
      reportError('move', err, { id: source.id, name: source.name });
    } finally {
      setBusy(savingNodes, source.id, false);
    }
  };

  const rename = async (id: string, newName: string): Promise<void> => {
    const asset = findAsset(id);
    if (!asset || asset.name === newName) return;
    setBusy(savingNodes, id, true);
    try {
      await store.rename(id, newName);
      patchAsset(id, { name: newName });
    } catch (e) {
      reportError('rename', e, { id, name: newName });
      return;
    } finally {
      setBusy(savingNodes, id, false);
    }
    // Re-resolve meta + mirror into any open tab so the editor swaps if
    // needed (foo.txt → foo.py flips Monaco's grammar).
    if (asset.kind === 'file') {
      const tabIdx = openTabs.value.findIndex((t) => t.id === id);
      if (tabIdx >= 0) {
        const meta = resolveFileMeta(asset, { getFileMeta });
        const copy = openTabs.value.slice();
        copy[tabIdx] = {
          ...copy[tabIdx]!,
          name: newName,
          editor: meta?.editor ?? copy[tabIdx]!.editor,
          language: meta?.language,
        };
        openTabs.value = copy;
      }
    }
  };

  // ── tab ops ──────────────────────────────────────────────────────────
  const pinTab = (id: string): void => {
    const idx = openTabs.value.findIndex((t) => t.id === id);
    if (idx < 0 || openTabs.value[idx]!.pinned) return;
    const copy = openTabs.value.slice();
    copy[idx] = { ...copy[idx]!, pinned: true };
    openTabs.value = copy;
  };
  const reorderTab = (
    sourceId: string,
    targetId: string,
    position: 'before' | 'after',
  ): void => {
    if (sourceId === targetId) return;
    const tabs = openTabs.value;
    const fromIdx = tabs.findIndex((t) => t.id === sourceId);
    const toIdx = tabs.findIndex((t) => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = tabs.slice();
    const [moved] = next.splice(fromIdx, 1);
    // Adjust target index: splicing out a lower index shifted everything left.
    const base = fromIdx < toIdx ? toIdx - 1 : toIdx;
    const insertAt = position === 'before' ? base : base + 1;
    next.splice(insertAt, 0, moved!);
    openTabs.value = next;
  };

  const unpinTab = (id: string): void => {
    const idx = openTabs.value.findIndex((t) => t.id === id);
    if (idx < 0 || !openTabs.value[idx]!.pinned) return;
    // Demoting a pinned tab to preview replaces any existing preview slot
    // (there's only ever one preview at a time, by design).
    const next = openTabs.value.filter((t) => t.pinned || t.id === id);
    const targetIdx = next.findIndex((t) => t.id === id);
    next[targetIdx] = { ...next[targetIdx]!, pinned: false };
    openTabs.value = next;
  };

  const setContent = (id: string, content: string): void => {
    const idx = openTabs.value.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const copy = openTabs.value.slice();
    const wasPreview = !copy[idx]!.pinned;
    const changed = content !== copy[idx]!.savedContent;
    // Auto-pin preview tabs the moment they go dirty — VSCode pattern.
    // Eliminates the impossible "italic title + dirty dot" state.
    copy[idx] = {
      ...copy[idx]!,
      content,
      pinned: wasPreview && changed ? true : copy[idx]!.pinned,
    };
    openTabs.value = copy;
  };

  const openFile = async (
    file: Asset<T>,
    opts: { pinned: boolean } = { pinned: false },
  ): Promise<void> => {
    const existingIdx = openTabs.value.findIndex((t) => t.id === file.id);
    if (existingIdx >= 0) {
      if (opts.pinned && !openTabs.value[existingIdx]!.pinned) pinTab(file.id);
      activeId.value = file.id;
      return;
    }
    const meta = resolveFileMeta(file, { getFileMeta });
    if (!meta) {
      console.warn(`[file-explorer] No editor available for ${file.name}`);
      return;
    }

    // Placeholder-then-fill — push the tab + activate IMMEDIATELY so the
    // editor-area loading overlay shows over the right pane. Otherwise
    // activeTab stays on the previous file and the overlay never appears.
    const placeholder: OpenTab = {
      id: file.id,
      name: file.name,
      editor: meta.editor,
      language: meta.language,
      content: '',
      savedContent: '',
      pinned: opts.pinned,
    };
    if (opts.pinned) {
      openTabs.value = [...openTabs.value, placeholder];
    } else {
      const previewIdx = openTabs.value.findIndex((t) => !t.pinned);
      const next = openTabs.value.slice();
      if (previewIdx >= 0) next.splice(previewIdx, 1, placeholder);
      else next.push(placeholder);
      openTabs.value = next;
    }
    activeId.value = file.id;

    let content: string | Blob;
    setBusy(loadingNodes, file.id, true);
    try {
      content = await store.loadContent(file.id);
    } catch (e) {
      reportError('loadContent', e, { id: file.id, name: file.name });
      // Roll the placeholder back so the user isn't stranded on an empty
      // editor for a file that never loaded.
      openTabs.value = openTabs.value.filter((t) => t.id !== file.id);
      if (activeId.value === file.id) {
        activeId.value = openTabs.value[openTabs.value.length - 1]?.id ?? null;
      }
      return;
    } finally {
      setBusy(loadingNodes, file.id, false);
    }
    const contentStr = typeof content === 'string' ? content : '';
    const fillIdx = openTabs.value.findIndex((t) => t.id === file.id);
    if (fillIdx >= 0) {
      const copy = openTabs.value.slice();
      copy[fillIdx] = { ...copy[fillIdx]!, content: contentStr, savedContent: contentStr };
      openTabs.value = copy;
    }
  };

  const activateNode = (asset: Asset<T>): void => {
    // `activate` fires on dblclick / Enter — both pin the tab.
    if (asset.kind === 'file') void openFile(asset, { pinned: true });
  };

  const saveTab = async (id: string): Promise<boolean> => {
    const idx = openTabs.value.findIndex((t) => t.id === id);
    if (idx < 0) return false;
    const tab = openTabs.value[idx]!;
    if (!isDirty(tab)) return true;
    setBusy(savingNodes, id, true);
    try {
      await store.save(tab.id, tab.content);
    } catch (e) {
      reportError('save', e, { id, name: tab.name });
      return false;
    } finally {
      setBusy(savingNodes, id, false);
    }
    const copy = openTabs.value.slice();
    copy[idx] = { ...tab, savedContent: tab.content };
    openTabs.value = copy;
    return true;
  };
  const saveActive = async (): Promise<void> => {
    if (activeId.value) await saveTab(activeId.value);
  };

  const closeTab = (id: string): void => {
    const idx = openTabs.value.findIndex((t) => t.id === id);
    if (idx < 0) return;
    // Block close during in-flight save — closing would orphan the mutation.
    if (savingNodes.value.has(id)) return;
    const tab = openTabs.value[idx]!;
    if (isDirty(tab) && !confirm(`Discard unsaved changes to "${tab.name}"?`)) return;
    const next = openTabs.value.filter((t) => t.id !== id);
    openTabs.value = next;
    if (activeId.value === id) {
      activeId.value = next[idx]?.id ?? next[idx - 1]?.id ?? null;
    }
  };

  const closeOthers = (keepId: string): void => {
    // Filter to: the kept tab + any dirty tabs (we never lose unsaved work
    // without prompting — strictly the close-other-dirty would prompt-per-tab,
    // but keeping them open is the simpler safe behaviour).
    const dirtySurvivors = openTabs.value.filter((t) => t.id !== keepId && isDirty(t));
    if (
      dirtySurvivors.length > 0 &&
      !confirm(
        `Close ${openTabs.value.length - 1 - dirtySurvivors.length} other tabs? ${
          dirtySurvivors.length
        } unsaved tab(s) will be kept open.`,
      )
    )
      return;
    const keep = new Set([keepId, ...dirtySurvivors.map((t) => t.id)]);
    openTabs.value = openTabs.value.filter((t) => keep.has(t.id));
    activeId.value = keepId;
  };

  const closeToRight = (anchorId: string): void => {
    const anchorIdx = openTabs.value.findIndex((t) => t.id === anchorId);
    if (anchorIdx < 0) return;
    const toClose = openTabs.value.slice(anchorIdx + 1);
    const dirty = toClose.filter(isDirty);
    if (
      dirty.length > 0 &&
      !confirm(`Close ${toClose.length} tab(s)? ${dirty.length} have unsaved changes.`)
    )
      return;
    openTabs.value = openTabs.value.slice(0, anchorIdx + 1);
    if (activeId.value && !openTabs.value.some((t) => t.id === activeId.value)) {
      activeId.value = anchorId;
    }
  };

  const closeAll = (): void => {
    const dirty = openTabs.value.filter(isDirty);
    if (
      dirty.length > 0 &&
      !confirm(
        `Close all ${openTabs.value.length} tabs? ${dirty.length} have unsaved changes.`,
      )
    )
      return;
    openTabs.value = [];
    activeId.value = null;
  };

  // ── navigation ────────────────────────────────────────────────────────
  const revealInTree = (id: string, focusNode?: (id: string) => void): void => {
    // Walk up the parentId chain and expand each ancestor. One new Set so
    // the v-model triggers exactly one re-render.
    const next = new Set(expanded.value);
    let cur = findAsset(id)?.parentId ?? null;
    while (cur) {
      next.add(cur);
      cur = findAsset(cur)?.parentId ?? null;
    }
    expanded.value = next;
    // Selection + focus happens after Vue flushes the expand state to DOM.
    void nextTick(() => {
      selectedId.value = id;
      focusNode?.(id);
    });
  };

  function pathOf(id: string): string[] {
    const names: string[] = [];
    let cur: Asset<T> | null = findAsset(id);
    while (cur) {
      names.unshift(cur.name);
      cur = cur.parentId ? findAsset(cur.parentId) : null;
    }
    return names;
  }

  const breadcrumbPath = computed<string[]>(() => {
    if (!activeId.value) return [];
    return pathOf(activeId.value);
  });

  // ── watcher: single-click in tree opens preview ───────────────────────
  watch(selectedId, (id) => {
    if (!id) return;
    const asset = findAsset(id);
    if (asset && asset.kind === 'file') void openFile(asset, { pinned: false });
  });

  // ── lazy mode: fetch children on first expand ─────────────────────────
  // Capability probe — eager stores leave `loadChildren` undefined and this
  // watcher is dead code. With `loadChildren` present, every new entry in
  // `expanded` triggers a fetch (idempotent — already-loaded folders cache
  // in `loadedFolderIds` so re-expanding a previously-collapsed folder
  // doesn't re-hit the backend).
  const loadedFolderIds = ref<Set<string>>(new Set());

  if (storeIsLazy) {
    watch(
      expanded,
      async (next, prev) => {
        const newlyExpanded: string[] = [];
        next.forEach((id) => {
          if (!prev?.has(id)) newlyExpanded.push(id);
        });
        for (const id of newlyExpanded) {
          if (loadedFolderIds.value.has(id)) continue;
          setBusy(loadingNodes, id, true);
          try {
            const kids = await store.loadChildren!(id);
            mergeAssets(kids);
            loadedFolderIds.value = new Set(loadedFolderIds.value).add(id);
          } catch (e) {
            reportError('loadChildren', e, { id });
          } finally {
            setBusy(loadingNodes, id, false);
          }
        }
      },
      // Fire on mount too — if the consumer supplied a non-empty
      // `initialExpandedIds`, those folders should pre-load their kids.
      { deep: true, immediate: true },
    );
  }

  // ── initial load + refresh ────────────────────────────────────────────
  /**
   * Re-fetch via `store.loadTree()` and replace the internal projection.
   * No-op when the store provides its own reactive `_assets` — those stores
   * are expected to keep their ref live themselves. The first call (on mount)
   * also seeds `expanded` with top-level folders when the consumer didn't
   * pass an explicit `initialExpandedIds` — same opt-in welcome behaviour
   * the in-memory path has always had.
   */
  let initialLoadDone = false;
  const reloadTree = async (): Promise<void> => {
    if (usesStoreRef) return;
    loading.value = !initialLoadDone;
    try {
      const tree = await store.loadTree();
      replaceAssets(tree);
      if (!initialLoadDone) {
        initialLoadDone = true;
        // Auto-expand root folders on first load when consumer didn't override
        // (matches the in-memory eager path). Lazy mode opts out — its UX is
        // click-to-expand.
        if (options.initialExpandedIds === undefined && !storeIsLazy) {
          const rootFolderIds = tree
            .filter((a) => a.parentId === null && a.kind === 'folder')
            .map((a) => a.id);
          if (rootFolderIds.length > 0) {
            expanded.value = new Set([...expanded.value, ...rootFolderIds]);
          }
        }
      }
    } catch (e) {
      reportError('loadTree', e, {});
    } finally {
      loading.value = false;
    }
  };

  /**
   * Public re-fetch. Without args (or `null`), refreshes the whole tree via
   * `loadTree()`. With a folder id, refreshes just that folder via
   * `loadChildren(id)` if the store opted into lazy mode — otherwise falls
   * back to a full `loadTree()`.
   *
   * Use this when upstream state can change out-of-band (server push,
   * another tab uploads a file, retention sweep). For stores that surface
   * `_assets` directly, this is a no-op: they're already reactive.
   */
  const refresh = async (folderId?: string | null): Promise<void> => {
    if (usesStoreRef) return;
    if (folderId == null) return reloadTree();
    if (storeIsLazy) {
      setBusy(loadingNodes, folderId, true);
      try {
        const kids = await store.loadChildren!(folderId);
        // Drop existing children of folderId, replace with fresh. Descendants
        // beyond one level stay until that level is itself refreshed.
        internal.value = [
          ...internal.value.filter((a) => a.parentId !== folderId),
          ...kids,
        ];
        loadedFolderIds.value = new Set(loadedFolderIds.value).add(folderId);
      } catch (e) {
        reportError('loadChildren', e, { id: folderId });
      } finally {
        setBusy(loadingNodes, folderId, false);
      }
      return;
    }
    return reloadTree();
  };

  // Kick off the initial load. We don't await — the composable returns its
  // surface synchronously, and `loading: Ref<boolean>` is the consumer's
  // signal that the tree is being populated.
  void reloadTree();

  // ── beforeunload warning while any tab is dirty ───────────────────────
  const onBeforeUnload = (e: BeforeUnloadEvent): void => {
    if (anyDirty.value) {
      e.preventDefault();
      // Modern browsers ignore the returnValue text but require the prop set.
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', onBeforeUnload);

  // ── cleanup ───────────────────────────────────────────────────────────
  onScopeDispose(() => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    for (const url of ownedBlobUrls) URL.revokeObjectURL(url);
    ownedBlobUrls.clear();
  });

  return {
    // tree state
    assets,
    rootNodes,
    selectedId,
    expanded,
    // CoarTree helpers
    getId,
    getChildren,
    getLabel,
    isExpandable,
    reorderable,
    // async state
    loading,
    loadingNodes,
    savingNodes,
    // tabs
    openTabs,
    activeId,
    activeTab,
    anyDirty,
    isDirty,
    setContent,
    // CRUD
    addFolder,
    addFiles,
    deleteNode,
    moveNode,
    rename,
    refresh,
    // tab ops
    openFile,
    activateNode,
    saveTab,
    saveActive,
    closeTab,
    closeOthers,
    closeToRight,
    closeAll,
    pinTab,
    unpinTab,
    reorderTab,
    // navigation
    revealInTree,
    breadcrumbPath,
    pathOf,
    // meta
    fileMeta,
  };
}
