import { describe, it, expect } from 'vitest';
import { effectScope, nextTick } from 'vue';

import type { Asset, AssetOp, AssetStore, AssetStoreConfig } from './asset-store';
import { createAssetStore, createInMemoryAssetStore } from './create-asset-store';
import { useFileExplorer, type UseFileExplorerOptions } from './use-file-explorer';

/** Root folder + one subfolder + one file under it. */
function seedTree(): Asset[] {
  return [
    { id: 'root', name: 'root', kind: 'folder', parentId: null },
    { id: 'sub', name: 'sub', kind: 'folder', parentId: 'root' },
    { id: 'a.txt', name: 'a.txt', kind: 'file', parentId: 'root' },
  ];
}

/**
 * Minimal HTTP-like store via `createAssetStore` (no `_assets` ref → the
 * composable maintains its own internal projection, exercising the optimistic
 * patch / reconcile / rollback paths). Optional `save` / `loadContent` are
 * attached only when asked, so the same factory drives the browse-only cases.
 */
function makeConfigStore(
  seed: Asset[],
  caps: { save?: boolean; loadContent?: boolean; uploadParentId?: string | null } = {},
): { store: AssetStore; data: () => Asset[] } {
  let data = [...seed];
  let seq = 0;
  const config: AssetStoreConfig = {
    loadTree: async () => data.map((a) => ({ ...a })),
    createFolder: async (parentId, name) => {
      const node: Asset = { id: `new-${seq++}`, name, kind: 'folder', parentId };
      data.push(node);
      return node;
    },
    uploadFile: async (parentId, file) => {
      // `uploadParentId` lets a test force a "store forgot parentId" response
      // to verify the composable stamps the target parentId (#5).
      const pid = caps.uploadParentId !== undefined ? caps.uploadParentId : parentId;
      const node: Asset = { id: `file-${seq++}`, name: file.name, kind: 'file', parentId: pid };
      data.push(node);
      return node;
    },
    rename: async (id, newName) => {
      const a = data.find((x) => x.id === id);
      if (a) a.name = newName;
    },
    delete: async (id) => {
      data = data.filter((x) => x.id !== id);
    },
    move: async (id, newParentId) => {
      const a = data.find((x) => x.id === id);
      if (a) a.parentId = newParentId;
    },
  };
  if (caps.save) config.save = async () => {};
  if (caps.loadContent) config.loadContent = async () => '';
  return { store: createAssetStore(config), data: () => data };
}

/**
 * Run `useFileExplorer` inside an isolated scope so its `onScopeDispose`
 * (window listener + blob-URL) cleanup fires. Awaits the body before stopping
 * the scope so async assertions don't run against a disposed composable.
 */
async function withFe<R>(
  store: AssetStore,
  fn: (fe: ReturnType<typeof useFileExplorer>) => R | Promise<R>,
  extra?: Partial<UseFileExplorerOptions>,
): Promise<R> {
  const scope = effectScope();
  try {
    // `confirm` passed explicitly — happy-dom has no `window.confirm` for the default.
    return await scope.run(() =>
      fn(useFileExplorer({ store, confirm: () => true, ...extra })),
    )!;
  } finally {
    scope.stop();
  }
}

describe('useFileExplorer — CoarTree lazy convergence', () => {
  it('eager: getChildren returns the array immediately and loadChildren is undefined', async () => {
    const store = createInMemoryAssetStore({ initialTree: seedTree(), initialContent: {} });
    await withFe(store, (fe) => {
      const root = fe.assets.value.find((a) => a.id === 'root')!;
      expect(Array.isArray(fe.getChildren(root))).toBe(true);
      expect(fe.loadChildren).toBeUndefined();
    });
  });

  it('lazy: getChildren is undefined for an unloaded folder, then its array after loadChildren', async () => {
    const store = createInMemoryAssetStore({
      initialTree: seedTree(),
      initialContent: {},
      lazy: true,
    });
    await withFe(store, async (fe) => {
      const root = fe.assets.value.find((a) => a.id === 'root')!;
      // Unloaded → undefined, which is what makes CoarTree's `loadChildren` hook fire.
      expect(fe.getChildren(root)).toBeUndefined();
      expect(typeof fe.loadChildren).toBe('function');

      await fe.loadChildren!(root);
      await nextTick();

      const kids = fe.getChildren(root);
      expect(Array.isArray(kids)).toBe(true);
      expect((kids ?? []).map((k) => k.id).sort()).toEqual(['a.txt', 'sub']);

      // Stays loaded → re-querying never reverts to undefined (no re-fetch on re-expand).
      expect(Array.isArray(fe.getChildren(root))).toBe(true);
    });
  });

  it('lazy: deleting a loaded folder clears its loaded marker so a reused id re-fetches', async () => {
    // Fixed idFactory so the second folder REUSES the deleted one's id — the
    // exact case where a stale `loadedFolderIds` marker would make a brand-new
    // folder render as already-loaded (and never fetch its real children).
    const store = createInMemoryAssetStore({
      initialTree: [{ id: 'root', name: 'root', kind: 'folder', parentId: null }],
      initialContent: {},
      lazy: true,
      idFactory: () => 'reused',
    });
    await withFe(store, async (fe) => {
      const root = fe.assets.value.find((a) => a.id === 'root')!;
      await fe.loadChildren!(root);
      await nextTick();

      await fe.addFolder('root', 'temp'); // → id 'reused'
      await nextTick();
      const temp = fe.assets.value.find((a) => a.id === 'reused')!;
      await fe.loadChildren!(temp); // marks 'reused' loaded
      await nextTick();
      await fe.deleteNode(temp); // must drop the 'reused' marker
      await nextTick();

      await fe.addFolder('root', 'temp2'); // reuses id 'reused'
      await nextTick();
      const temp2 = fe.assets.value.find((a) => a.id === 'reused')!;
      // Brand-new folder must read as unloaded — not inherit the deleted one's marker.
      expect(fe.getChildren(temp2)).toBeUndefined();
    });
  });
});

describe('useFileExplorer — programmatic move (#3)', () => {
  it('move(id, newParentId) reparents optimistically without a tree drag event', async () => {
    const { store } = makeConfigStore(seedTree(), { save: true, loadContent: true });
    await withFe(store, async (fe) => {
      await nextTick(); // initial loadTree resolves
      await fe.move('a.txt', 'sub');
      expect(fe.assets.value.find((a) => a.id === 'a.txt')!.parentId).toBe('sub');
      // Destination folder auto-expands so the moved node is visible.
      expect(fe.expanded.value.has('sub')).toBe(true);
    });
  });

  it('move(id, null) moves a node to the root', async () => {
    const { store } = makeConfigStore(seedTree(), { save: true, loadContent: true });
    await withFe(store, async (fe) => {
      await nextTick();
      await fe.move('sub', null);
      expect(fe.assets.value.find((a) => a.id === 'sub')!.parentId).toBeNull();
    });
  });
});

describe('useFileExplorer — optimistic create (#4)', () => {
  it('inserts a temp folder immediately, then reconciles to the backend id', async () => {
    let resolveCreate: ((a: Asset) => void) | undefined;
    const { store } = makeConfigStore(seedTree());
    // Wrap createFolder so we can observe the in-flight (pre-resolve) state.
    const realCreate = store.createFolder;
    store.createFolder = (parentId, name) =>
      new Promise<Asset>((res) => {
        resolveCreate = async () => res(await realCreate(parentId, name));
      });

    await withFe(store, async (fe) => {
      await nextTick();
      const before = fe.assets.value.length;
      const p = fe.addFolder('root', 'New folder');
      await nextTick();
      // Temp node is visible BEFORE the backend resolves.
      expect(fe.assets.value.length).toBe(before + 1);
      const temp = fe.assets.value.find((a) => a.name === 'New folder')!;
      expect(temp.id).toMatch(/^__coar-optimistic-/);

      resolveCreate!();
      const created = await p;
      await nextTick();
      // Temp id is swapped for the real backend id; count is unchanged.
      expect(created!.id).not.toMatch(/^__coar-optimistic-/);
      expect(fe.assets.value.filter((a) => a.name === 'New folder')).toHaveLength(1);
      expect(fe.assets.value.find((a) => a.id === created!.id)).toBeTruthy();
    });
  });

  it('rolls the temp node back when the backend create rejects', async () => {
    const { store } = makeConfigStore(seedTree());
    store.createFolder = async () => {
      throw new Error('boom');
    };
    const ops: AssetOp[] = [];
    await withFe(
      store,
      async (fe) => {
        await nextTick();
        const before = fe.assets.value.length;
        const result = await fe.addFolder('root', 'Doomed');
        await nextTick();
        expect(result).toBeNull();
        expect(fe.assets.value.length).toBe(before); // rolled back
        expect(fe.assets.value.find((a) => a.name === 'Doomed')).toBeUndefined();
        expect(ops).toContain('createFolder');
      },
      { onError: (op) => ops.push(op) },
    );
  });
});

describe('useFileExplorer — browse-only store (#5, #6)', () => {
  it('stamps the target parentId on upload even when the store omits it (#5)', async () => {
    // Store deliberately returns parentId:null for every upload.
    const { store } = makeConfigStore(seedTree(), { uploadParentId: null });
    await withFe(store, async (fe) => {
      await nextTick();
      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      await fe.addFiles('sub', [file]);
      await nextTick();
      const uploaded = fe.assets.value.find((a) => a.name === 'photo.png')!;
      expect(uploaded.parentId).toBe('sub');
    });
  });

  it('upload on a save-less store does not fire a spurious save error (#6)', async () => {
    const { store } = makeConfigStore(seedTree()); // no save, no loadContent
    const ops: AssetOp[] = [];
    await withFe(
      store,
      async (fe) => {
        await nextTick();
        const file = new File(['x'], 'photo.png', { type: 'image/png' });
        await fe.addFiles('root', [file]);
        await nextTick();
        expect(fe.assets.value.find((a) => a.name === 'photo.png')).toBeTruthy();
        expect(ops).not.toContain('save');
      },
      { onError: (op) => ops.push(op) },
    );
  });

  it('openFile is a no-op without loadContent — no editor tab opens (#6)', async () => {
    const { store } = makeConfigStore(seedTree()); // browse-only
    await withFe(store, async (fe) => {
      await nextTick();
      const file = fe.assets.value.find((a) => a.id === 'a.txt')!;
      await fe.openFile(file, { pinned: true });
      // Single-click preview watcher also routes through openFile → still no tabs.
      fe.selectedId.value = 'a.txt';
      await nextTick();
      expect(fe.openTabs.value).toHaveLength(0);
    });
  });
});
