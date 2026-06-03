import { describe, it, expect } from 'vitest';
import { effectScope, nextTick } from 'vue';

import type { Asset } from './asset-store';
import { createInMemoryAssetStore } from './create-asset-store';
import { useFileExplorer } from './use-file-explorer';

/** Root folder + one subfolder + one file under it. */
function seedTree(): Asset[] {
  return [
    { id: 'root', name: 'root', kind: 'folder', parentId: null },
    { id: 'sub', name: 'sub', kind: 'folder', parentId: 'root' },
    { id: 'a.txt', name: 'a.txt', kind: 'file', parentId: 'root' },
  ];
}

/**
 * Run `useFileExplorer` inside an isolated scope so its `onScopeDispose`
 * (window listener + blob-URL) cleanup fires. Awaits the body before stopping
 * the scope so async assertions don't run against a disposed composable.
 */
async function withFe<R>(
  store: ReturnType<typeof createInMemoryAssetStore>,
  fn: (fe: ReturnType<typeof useFileExplorer>) => R | Promise<R>,
): Promise<R> {
  const scope = effectScope();
  try {
    // `confirm` passed explicitly — happy-dom has no `window.confirm` for the default.
    return await scope.run(() => fn(useFileExplorer({ store, confirm: () => true })))!;
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
