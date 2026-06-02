/**
 * `@cocoar/vue-file-explorer-core` — VSCode-style file/asset explorer composable
 * over a pluggable `AssetStore<T>` backend.
 *
 * Three layers:
 *
 *   - **`AssetStore<T>` contract** + types — what a backend implements.
 *     The store is the data plane: load, mutate, conflict-resolve. The
 *     composable knows nothing about HTTP / IndexedDB / etc.
 *   - **`createInMemoryAssetStore`** — reference implementation for
 *     browser-only / demo use. Configurable latency, failure simulation,
 *     lazy mode, conflict policy.
 *   - **`useFileExplorer({store, ...})`** — the composable that wires the
 *     store into reactive tree + tab state + async-loading bookkeeping +
 *     keyboard-driven UX. Returns the full surface a file-explorer view
 *     needs: refs to bind to `<CoarTree>`, ops to call on user input,
 *     `revealInTree` / `breadcrumbPath` / `pathOf` for navigation.
 *
 * See the playground POC (apps/playground/src/views/FileExplorerPocView.vue)
 * for a worked end-to-end example.
 */

export type {
  Asset,
  AssetComparator,
  AssetOp,
  AssetOpContext,
  AssetStore,
  AssetStoreConfig,
  ConflictInfo,
  ConflictPolicy,
  ConflictResolution,
  FileEditor,
  FileExplorerApi,
  FileExplorerConfig,
  FileMeta,
  SortMode,
} from './asset-store';

export {
  createAssetStore,
  createInMemoryAssetStore,
  type InMemoryAssetStore,
  type InMemoryAssetStoreOptions,
} from './create-asset-store';

export {
  defaultFileMetaFromName,
  resolveFileMeta,
} from './file-meta';

export {
  buildAssetProperties,
  type AssetProperty,
  type DescribeAssetContext,
} from './describe-asset';

export {
  useFileExplorer,
  type OpenTab,
  type UseFileExplorerOptions,
  type UseFileExplorerReturn,
} from './use-file-explorer';
