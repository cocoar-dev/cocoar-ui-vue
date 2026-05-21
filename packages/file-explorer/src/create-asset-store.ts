/**
 * Reference implementations of `AssetStore<T>`.
 *
 *   - `createAssetStore(config)` — thin wrapper that turns a flat config
 *     struct into a fully-typed store. Today it's a passthrough; cross-cutting
 *     concerns (request dedup, retry, telemetry) will land here later
 *     without touching consumer code.
 *
 *   - `createInMemoryAssetStore(options?)` — browser-only default backed by
 *     a flat `ref<Asset<T>[]>` plus an `id → content` map. Used by the
 *     playground POC and by any consumer that wants offline / demo behaviour.
 */

import { computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';

import type { Asset, AssetStore, AssetStoreConfig, ConflictPolicy, ConflictResolution } from './asset-store';

// ─── thin passthrough ──────────────────────────────────────────────────────

export function createAssetStore<T = unknown>(config: AssetStoreConfig<T>): AssetStore<T> {
  const store: AssetStore<T> = {
    loadTree: config.loadTree,
    loadContent: config.loadContent,
    createFolder: config.createFolder,
    createFile: config.createFile,
    uploadFile: config.uploadFile,
    save: config.save,
    rename: config.rename,
    delete: config.delete,
    move: config.move,
  };
  // Lazy mode is opt-in: only attach `loadChildren` when the consumer supplied
  // one, so `'loadChildren' in store` stays a reliable capability probe.
  if (config.loadChildren) store.loadChildren = config.loadChildren;
  return store;
}

// ─── in-memory reference implementation ────────────────────────────────────

export interface InMemoryAssetStoreOptions<T = unknown> {
  /** Seed data. Mutations replace this ref's contents in place. */
  initialTree?: readonly Asset<T>[];
  /** Seed file contents by id. */
  initialContent?: Readonly<Record<string, string | Blob>>;
  /**
   * Artificial latency per op, for visualising loading states. Default 0.
   * Reactive: pass a `Ref<number>` / getter to retune at runtime (the
   * playground simulator dropdown does exactly that).
   */
  latencyMs?: MaybeRefOrGetter<number>;
  /**
   * Random-failure rate (0..1), for exercising the error path. Default 0.
   * Reactive (see `latencyMs`).
   */
  failureRate?: MaybeRefOrGetter<number>;
  /**
   * ID factory. Default: `crypto.randomUUID()`. Override for tests that
   * need stable ids.
   */
  idFactory?: () => string;
  /**
   * What to do when a create / upload collides with an existing sibling
   * name. Default `'rename'` (auto-suffix, macOS Finder pattern). Reactive
   * via `Ref` / getter so the simulator can flip policies live.
   */
  onConflict?: MaybeRefOrGetter<ConflictPolicy<T>>;
  /**
   * Opt into lazy loading. When `true`:
   *   - `loadTree()` only returns root-level entries, enriched with
   *     `hasChildren: boolean` so the tree knows which folders are
   *     expandable without their kids loaded.
   *   - `loadChildren(parentId)` is exposed and returns one level deep.
   *   - `_assets` is a computed projection over a `_publishedIds` Set —
   *     only the published subset is visible to the composable. The full
   *     dataset still lives in `_complete` for the store's own bookkeeping.
   * Default: `false` (eager — composable sees everything from the start).
   */
  lazy?: boolean;
}

/**
 * In-memory store + a peek at its raw state. Returned together so the POC
 * (and tests) can inspect / mutate the underlying ref without going through
 * the async API — useful for seeding, debugging, snapshotting.
 *
 * `_assets` is a reactive projection. In eager mode it equals the full data
 * set; in lazy mode it equals only the published subset (root + whatever
 * has been fetched on expand).
 */
export interface InMemoryAssetStore<T = unknown> extends AssetStore<T> {
  /** Published subset (computed in lazy mode, equals everything in eager). */
  readonly _assets: Ref<Asset<T>[]> | ComputedRef<Asset<T>[]>;
  /** The raw content map. Mutate at your own risk. */
  readonly _contents: Map<string, string | Blob>;
}

export function createInMemoryAssetStore<T = unknown>(
  options: InMemoryAssetStoreOptions<T> = {},
): InMemoryAssetStore<T> {
  const {
    initialTree = [],
    initialContent = {},
    latencyMs = 0,
    failureRate = 0,
    idFactory = () => crypto.randomUUID(),
    lazy = false,
    onConflict = 'rename',
  } = options;

  // _complete is the source of truth — every asset the store knows about.
  // _publishedIds tracks which ids are visible via the public `_assets`
  // projection. In eager mode it starts with everything; in lazy mode it
  // starts with root-level entries only.
  const complete: Ref<Asset<T>[]> = ref([...initialTree]) as Ref<Asset<T>[]>;
  const publishedIds = ref<Set<string>>(
    new Set(
      lazy
        ? initialTree.filter((a) => a.parentId === null).map((a) => a.id)
        : initialTree.map((a) => a.id),
    ),
  );
  const assets = computed(() =>
    complete.value.filter((a) => publishedIds.value.has(a.id)),
  );
  const contents = new Map<string, string | Blob>(Object.entries(initialContent));

  // --- helpers ------------------------------------------------------------

  /**
   * Latency + random failure simulation. Both knobs are unwrapped per-call
   * via `toValue` so the playground simulator can retune them at runtime.
   */
  async function settle<R>(op: string, run: () => R): Promise<R> {
    const lat = toValue(latencyMs);
    if (lat > 0) await new Promise((r) => setTimeout(r, lat));
    const fail = toValue(failureRate);
    if (fail > 0 && Math.random() < fail) {
      throw new Error(`[InMemoryAssetStore] simulated failure in ${op}`);
    }
    return run();
  }

  // Internal helpers operate over the COMPLETE store data (not the visible
  // projection), so move/delete/rename can find anything regardless of
  // current lazy-publish state.
  function findIndex(id: string): number {
    return complete.value.findIndex((a) => a.id === id);
  }
  function findOrThrow(id: string, op: string): Asset<T> {
    const idx = findIndex(id);
    if (idx < 0) throw new Error(`[InMemoryAssetStore] ${op}: asset ${id} not found`);
    return complete.value[idx]!;
  }
  function childrenOf(parentId: string | null): Asset<T>[] {
    return complete.value.filter((a) => a.parentId === parentId);
  }
  function siblingNames(parentId: string | null, exceptId?: string): Set<string> {
    return new Set(
      complete.value
        .filter((a) => a.parentId === parentId && a.id !== exceptId)
        .map((a) => a.name),
    );
  }
  function descendantIds(rootId: string): Set<string> {
    const out = new Set<string>([rootId]);
    let added = true;
    while (added) {
      added = false;
      for (const a of complete.value) {
        if (a.parentId && out.has(a.parentId) && !out.has(a.id)) {
          out.add(a.id);
          added = true;
        }
      }
    }
    return out;
  }
  /** Set `hasChildren` on folders before returning them to the composable. */
  function enrichWithHasChildren(list: readonly Asset<T>[]): Asset<T>[] {
    return list.map((a) =>
      a.kind === 'folder'
        ? { ...a, hasChildren: complete.value.some((c) => c.parentId === a.id) }
        : a,
    );
  }
  /** Add a set of ids to the published-subset ref (cloned so reactivity fires). */
  function publish(ids: Iterable<string>) {
    const next = new Set(publishedIds.value);
    for (const id of ids) next.add(id);
    publishedIds.value = next;
  }
  function unpublish(ids: Iterable<string>) {
    const next = new Set(publishedIds.value);
    for (const id of ids) next.delete(id);
    publishedIds.value = next;
  }

  // ── conflict resolution ───────────────────────────────────────────────
  // `nextAvailableName('foo.txt', siblings)` → 'foo (2).txt'. Extension is
  // the segment after the last dot (no dot → empty ext). Capped at 999
  // iterations to keep it bounded; falls back to a UUID-tagged name.
  function nextAvailableName(parentId: string | null, name: string): string {
    const existing = siblingNames(parentId);
    if (!existing.has(name)) return name;
    const dotIdx = name.lastIndexOf('.');
    const [base, ext] =
      dotIdx > 0 ? [name.slice(0, dotIdx), name.slice(dotIdx)] : [name, ''];
    for (let i = 2; i < 1000; i++) {
      const candidate = `${base} (${i})${ext}`;
      if (!existing.has(candidate)) return candidate;
    }
    return `${base} (${crypto.randomUUID()})${ext}`;
  }

  /**
   * Resolve a sibling-name collision per the configured policy. Returns
   * the name to actually use (possibly different from `name`), or `null`
   * to signal the caller should throw the legacy conflict error.
   *
   * `overwrite` does its own work here — deletes the existing entry and
   * its descendants before the caller proceeds with `name`.
   */
  async function resolveConflict(
    parentId: string | null,
    name: string,
    kind: 'folder' | 'file',
  ): Promise<string | null> {
    if (!siblingNames(parentId).has(name)) return name;

    const policy = toValue(onConflict);
    const existing = complete.value.find(
      (a) => a.parentId === parentId && a.name === name,
    )!;
    const suggested = nextAvailableName(parentId, name);

    let resolution: ConflictResolution;
    if (policy === 'rename') {
      resolution = { action: 'rename', newName: suggested };
    } else if (policy === 'overwrite') {
      resolution = { action: 'overwrite' };
    } else if (policy === 'prompt') {
      const picked = window.prompt(
        `"${name}" already exists. Use a different name?`,
        suggested,
      );
      resolution = picked
        ? { action: 'rename', newName: picked.trim() }
        : { action: 'cancel' };
    } else if (policy === 'error') {
      resolution = { action: 'cancel' };
    } else {
      resolution = await policy({
        existing,
        incoming: { name, kind },
        parentId,
        suggestedRename: suggested,
      });
    }

    if (resolution.action === 'cancel') return null;
    if (resolution.action === 'overwrite') {
      const doomed = descendantIds(existing.id);
      complete.value = complete.value.filter((a) => !doomed.has(a.id));
      unpublish(doomed);
      for (const id of doomed) contents.delete(id);
      return name;
    }
    // rename — guard against the user picking another existing name.
    return resolveConflict(parentId, resolution.newName, kind);
  }

  // --- read ---------------------------------------------------------------

  const store: InMemoryAssetStore<T> = {
    _assets: assets,
    _contents: contents,

    async loadTree() {
      return settle('loadTree', () => {
        if (lazy) {
          const roots = complete.value.filter((a) => a.parentId === null);
          // Make sure the published Set contains the roots (in case the
          // composable re-fetches loadTree after store mutations).
          publish(roots.map((r) => r.id));
          return enrichWithHasChildren(roots);
        }
        return enrichWithHasChildren(complete.value);
      });
    },

    // `loadChildren` is only attached in lazy mode below — the composable
    // probes via `'loadChildren' in store`. Eager mode → the property is
    // absent and the composable runs everything off loadTree().

    async loadContent(id) {
      return settle('loadContent', () => {
        findOrThrow(id, 'loadContent');
        const c = contents.get(id);
        if (c === undefined) throw new Error(`[InMemoryAssetStore] loadContent: no content for ${id}`);
        return c;
      });
    },

    // --- write ------------------------------------------------------------

    async createFolder(parentId, name) {
      // Conflict resolution runs BEFORE the simulated latency so any
      // user prompt isn't blocked behind it. `null` means the policy
      // declined to resolve — fall through to the legacy throw.
      const resolved = await resolveConflict(parentId, name, 'folder');
      if (resolved === null) {
        throw new Error(`[InMemoryAssetStore] createFolder: "${name}" already exists in this folder`);
      }
      return settle('createFolder', () => {
        const node: Asset<T> = { id: idFactory(), name: resolved, kind: 'folder', parentId };
        complete.value.push(node);
        // New entries are published immediately — the user just created them,
        // they should be visible without an explicit loadChildren on the parent.
        publish([node.id]);
        return node;
      });
    },

    async createFile(parentId, name) {
      const resolved = await resolveConflict(parentId, name, 'file');
      if (resolved === null) {
        throw new Error(`[InMemoryAssetStore] createFile: "${name}" already exists in this folder`);
      }
      return settle('createFile', () => {
        const node: Asset<T> = { id: idFactory(), name: resolved, kind: 'file', parentId };
        complete.value.push(node);
        publish([node.id]);
        contents.set(node.id, '');
        return node;
      });
    },

    async uploadFile(parentId, file) {
      const resolved = await resolveConflict(parentId, file.name, 'file');
      if (resolved === null) {
        throw new Error(`[InMemoryAssetStore] uploadFile: "${file.name}" already exists in this folder`);
      }
      return settle('uploadFile', () => {
        const node: Asset<T> = { id: idFactory(), name: resolved, kind: 'file', parentId };
        complete.value.push(node);
        publish([node.id]);
        // The actual byte→string/Blob conversion is the composable's
        // concern (it knows the editor + when to use URL.createObjectURL).
        // The store just records the entry; content seeding happens via
        // a follow-up `save()` call from the composable.
        return node;
      });
    },

    async save(id, content) {
      return settle('save', () => {
        findOrThrow(id, 'save');
        contents.set(id, content);
      });
    },

    async rename(id, newName) {
      return settle('rename', () => {
        const node = findOrThrow(id, 'rename');
        if (node.name === newName) return;
        if (siblingNames(node.parentId, id).has(newName)) {
          throw new Error(`[InMemoryAssetStore] rename: "${newName}" already exists in this folder`);
        }
        // Mutate in place — `complete.value` is reactive, the projection
        // re-runs and sibling reads update.
        node.name = newName;
      });
    },

    async delete(id) {
      return settle('delete', () => {
        findOrThrow(id, 'delete');
        const doomed = descendantIds(id);
        complete.value = complete.value.filter((a) => !doomed.has(a.id));
        unpublish(doomed);
        for (const goneId of doomed) contents.delete(goneId);
      });
    },

    async move(id, newParentId, position) {
      return settle('move', () => {
        const node = findOrThrow(id, 'move');
        // Cycle guard: refuse to move a folder into itself or a descendant.
        if (newParentId !== null) {
          const family = descendantIds(id);
          if (family.has(newParentId)) {
            throw new Error(`[InMemoryAssetStore] move: cannot move ${id} into its own descendant`);
          }
        }
        if (
          node.parentId !== newParentId &&
          siblingNames(newParentId).has(node.name)
        ) {
          throw new Error(`[InMemoryAssetStore] move: "${node.name}" already exists in destination folder`);
        }
        node.parentId = newParentId;

        // Re-position within siblings. The flat `complete` array preserves
        // visual order per parent, so we splice the node out and back in at
        // the target sibling-position.
        const oldIdx = findIndex(id);
        complete.value.splice(oldIdx, 1);
        const siblings = childrenOf(newParentId); // post-removal
        const targetSiblingIdx = position ?? siblings.length;
        if (targetSiblingIdx <= 0) {
          const firstSiblingIdx = siblings.length
            ? complete.value.indexOf(siblings[0]!)
            : complete.value.length;
          complete.value.splice(firstSiblingIdx, 0, node);
        } else if (targetSiblingIdx >= siblings.length) {
          const lastSibling = siblings[siblings.length - 1];
          const lastIdx = lastSibling ? complete.value.indexOf(lastSibling) : -1;
          complete.value.splice(lastIdx + 1, 0, node);
        } else {
          const anchor = siblings[targetSiblingIdx]!;
          complete.value.splice(complete.value.indexOf(anchor), 0, node);
        }
      });
    },
  };

  // Attach `loadChildren` only when lazy — keeps `'loadChildren' in store`
  // as a reliable capability probe for the composable.
  if (lazy) {
    store.loadChildren = async (parentId: string): Promise<Asset<T>[]> => {
      return settle('loadChildren', () => {
        const kids = complete.value.filter((a) => a.parentId === parentId);
        publish(kids.map((k) => k.id));
        return enrichWithHasChildren(kids);
      });
    };
  }

  return store;
}
