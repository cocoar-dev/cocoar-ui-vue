# In-memory store

`createInMemoryAssetStore()` is the reference [`AssetStore<T>`](./asset-store) implementation. It's a browser-only, fully-reactive backend backed by a `ref<Asset<T>[]>` plus an `id → content` map. Reach for it for:

- demos + documentation pages
- unit / E2E tests that need a deterministic backend
- prototyping a consumer shell before the real HTTP backend exists
- **exercising your UX under degraded conditions** — the latency / failure / lazy / conflict knobs are reactive, so a toolbar can dial them at runtime

```ts
import { createInMemoryAssetStore } from '@cocoar/vue-file-explorer-core';
```

## Quick start

```ts
const store = createInMemoryAssetStore({
  initialTree: [
    { id: 's', name: 'src', kind: 'folder', parentId: null },
    { id: 'u', name: 'utils.ts', kind: 'file', parentId: 's' },
  ],
  initialContent: { u: 'export const clamp = ...' },
});
```

That's all you need for a working in-memory file system. Hand `store` to [`useFileExplorer({store})`](./use-file-explorer) and the explorer is fully functional — every CRUD op mutates the underlying ref, content is read out of the map.

## Options

```ts
interface InMemoryAssetStoreOptions<T = unknown> {
  initialTree?: readonly Asset<T>[];
  initialContent?: Readonly<Record<string, string | Blob>>;
  latencyMs?: MaybeRefOrGetter<number>;
  failureRate?: MaybeRefOrGetter<number>;
  idFactory?: () => string;
  onConflict?: MaybeRefOrGetter<ConflictPolicy<T>>;
  lazy?: boolean;
}
```

### `initialTree` &middot; `initialContent`

Seed data. `initialTree` is a flat list of `Asset<T>` with `parentId` links; `initialContent` is an `{ [id]: string | Blob }` map keyed by asset id. Both default empty.

### `latencyMs`

Artificial delay (ms) added to every operation. **Reactive** — pass a `Ref<number>` or getter and the simulator picks up changes per call:

```ts
const latency = ref(0);
const store = createInMemoryAssetStore({ latencyMs: latency });
// later: latency.value = 1000  → every subsequent op waits 1s
```

Use it to make loading states visible during development. `loadTree` latency exposes the global `loading` ref; `loadContent` latency exposes the per-tab placeholder + spinner overlay; `loadChildren` latency exposes the row-icon spinner on lazy expand.

Default `0`.

### `failureRate`

Probability (0..1) that any operation rejects with `[InMemoryAssetStore] simulated failure in {op}`. Reactive, like `latencyMs`. Use it to exercise the `onError` path — toast styling, rollback correctness, retry UX.

Default `0`.

::: tip Combine latency + failure
The most useful simulator config is `latencyMs: 800, failureRate: 0.15`. Long enough to see every spinner; failures often enough to verify rollback without making the demo unusable.
:::

### `idFactory`

Override the id generator. Default `crypto.randomUUID()`. Pass a counter for stable ids in tests:

```ts
let n = 0;
const store = createInMemoryAssetStore({ idFactory: () => `asset-${++n}` });
```

### `onConflict`

Conflict policy applied to `createFolder` / `createFile` / `uploadFile` on sibling-name collision. **Reactive** — flip live from a toolbar.

```ts
type ConflictPolicy<T = unknown> =
  | 'rename'                                  // default — auto-suffix
  | 'overwrite'                               // delete existing, then create
  | 'prompt'                                  // window.prompt for a new name
  | 'error'                                   // always throw
  | ((info: ConflictInfo<T>) => ConflictResolution | Promise<ConflictResolution>);
```

`move` and `rename` deliberately bypass the policy — those are explicit user intent. See [conflict policy](./asset-store#conflict-policy) for the full semantics.

Default `'rename'`.

### `lazy`

Opt into lazy mode. When `true`:

- `loadTree()` returns **only root-level** entries (still enriched with `hasChildren: boolean`).
- `loadChildren(parentId)` is exposed on the store. The composable detects the method and switches to lazy behavior automatically.
- The store's published-asset projection is gated by a `_publishedIds` Set — only loaded subtrees are visible to the composable. The complete dataset still lives in the store's internal bookkeeping for move / delete / cycle-guard.

Default `false`.

```ts
const store = createInMemoryAssetStore({
  initialTree: bigSeed,
  lazy: true,
  latencyMs: 600,           // make the lazy spinners visible
});
```

## Inspection escape hatches

`createInMemoryAssetStore` returns an `InMemoryAssetStore<T>` (extends `AssetStore<T>`) with two extra read-only properties for tests and devtools:

```ts
interface InMemoryAssetStore<T = unknown> extends AssetStore<T> {
  readonly _assets: Ref<Asset<T>[]> | ComputedRef<Asset<T>[]>;
  readonly _contents: Map<string, string | Blob>;
}
```

| Property | Notes |
|---|---|
| `_assets` | Reactive projection. Eager: equals the full data set. Lazy: equals only the published subset. The composable reads from this for its tree projection. |
| `_contents` | Raw `id → content` map. Mutate at your own risk — bypasses the async API and ignores subscribers. Useful for test setup / snapshots. |

The underscore prefix marks them as non-portable. A real backend's store won't have these — write your tests against `useFileExplorer`'s public refs (`assets`, `openTabs`, etc.) if you want them to transfer to production code.

## Runtime simulator pattern

The four reactive knobs (`latencyMs`, `failureRate`, `onConflict`, plus `sortMode` on the composable) are designed to be wired to UI controls. The pattern looks like this:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarSelect, CoarSegmentedControl } from '@cocoar/vue-ui';
import {
  createInMemoryAssetStore,
  useFileExplorer,
  type ConflictPolicy,
  type SortMode,
} from '@cocoar/vue-file-explorer-core';

const latency = ref<number>(0);
const failure = ref<number>(0);
const conflict = ref<ConflictPolicy>('rename');
const sortMode = ref<SortMode>('folders-first');

const store = createInMemoryAssetStore({
  initialTree,
  initialContent,
  latencyMs: latency,
  failureRate: failure,
  onConflict: conflict,
});

const fe = useFileExplorer({ store, sortMode });
</script>
```

Every knob flips live — no store recreation, no state loss. The playground POC's simulator panel persists each setting to `localStorage` so a refresh keeps the configured scenario; `lazy` is the only construction-time switch (changing it requires recreating the store, so the POC persists the flag and reloads the page).

## Why ship a reference impl

The composable's contract is non-trivial — placeholder-then-fill open, optimistic rollback, conflict pipeline, blob-URL leases, lazy capability probing. Shipping a fully-working in-memory implementation makes the contract concrete:

- documentation pages get **real, interactive demos** without a backend
- consumers can study `create-asset-store.ts` to see exactly what their HTTP store needs to do
- tests run against the same code paths the demo does — no mock divergence

When the in-memory store and a real HTTP backend behave identically from the composable's perspective, you know the `AssetStore<T>` seam is doing its job.
