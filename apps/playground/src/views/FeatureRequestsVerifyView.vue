<script setup lang="ts">
/**
 * Live browser verification harness for the Tellify feedback fixes #2, #3, #5, #6.
 * Each panel runs the actual consumer scenario against a real composable + store
 * and renders a PASS/FAIL the CDP driver (or a human) can read. #1 is verified
 * separately in the File Explorer POC (inline create).
 */
import { computed, ref, onBeforeUnmount } from 'vue';
import { CoarToastContainer, CoarTree, CoarTreeNodeLabel, useTree, useToast } from '@cocoar/vue-ui';
import {
  createAssetStore,
  createInMemoryAssetStore,
  useFileExplorer,
  type Asset,
  type AssetOp,
  type AssetStoreConfig,
} from '@cocoar/vue-file-explorer-core';

// ─────────────────────────────────────────────────────────────────────────
// #2 — CoarToastContainer renders with NO :service (defaults to the singleton)
// and a stalled reactive flush (the old undefined.position crash) would freeze
// this heartbeat. We render <CoarToastContainer /> below with no :service prop.
// ─────────────────────────────────────────────────────────────────────────
const toast = useToast();
const heartbeat = ref(0);
const hb = window.setInterval(() => (heartbeat.value += 1), 250);
const toastShown = ref(false);
function fireToast() {
  toast.success('Saved! (toast via defaulted service)');
  toastShown.value = true;
}
onBeforeUnmount(() => window.clearInterval(hb));

// ─────────────────────────────────────────────────────────────────────────
// #3 — programmatic move(id, newParentId) without a tree drag
// ─────────────────────────────────────────────────────────────────────────
const store3 = createInMemoryAssetStore({
  initialTree: [
    { id: 'src', name: 'src', kind: 'folder', parentId: null },
    { id: 'docs', name: 'docs', kind: 'folder', parentId: null },
    { id: 'utils.ts', name: 'utils.ts', kind: 'file', parentId: 'src' },
  ],
  initialContent: { 'utils.ts': '// hi' },
});
const fe3 = useFileExplorer({ store: store3 });
const utilsParent = computed(
  () => fe3.assets.value.find((a) => a.id === 'utils.ts')?.parentId ?? '(gone)',
);
const move3Pass = computed(() => utilsParent.value === 'docs');

// ─────────────────────────────────────────────────────────────────────────
// #5 — optimistic upload node is stamped with the target parentId even when
// the store's returned asset omits it
// ─────────────────────────────────────────────────────────────────────────
function makeStore(caps: {
  save?: boolean;
  loadContent?: boolean;
  uploadParentId?: string | null;
}) {
  let seq = 0;
  const data: Asset[] = [
    { id: 'sub', name: 'sub', kind: 'folder', parentId: null },
    { id: 'a.txt', name: 'a.txt', kind: 'file', parentId: 'sub' },
  ];
  const config: AssetStoreConfig = {
    loadTree: async () => data.map((a) => ({ ...a })),
    createFolder: async (parentId, name) => {
      const n: Asset = { id: `f${seq++}`, name, kind: 'folder', parentId };
      data.push(n);
      return n;
    },
    uploadFile: async (parentId, file) => {
      const pid = caps.uploadParentId !== undefined ? caps.uploadParentId : parentId;
      const n: Asset = { id: `u${seq++}`, name: file.name, kind: 'file', parentId: pid };
      data.push(n);
      return n;
    },
    rename: async () => {},
    delete: async () => {},
    move: async () => {},
  };
  if (caps.save) config.save = async () => {};
  if (caps.loadContent) config.loadContent = async () => '';
  return createAssetStore(config);
}

const ops5: AssetOp[] = [];
const store5 = makeStore({ uploadParentId: null }); // store "forgets" parentId
const fe5 = useFileExplorer({ store: store5, onError: (op) => ops5.push(op) });
const uploaded5Parent = ref<string | null | '(none)'>('(none)');
async function upload5() {
  await fe5.addFiles('sub', [new File(['x'], 'photo.png', { type: 'image/png' })]);
  uploaded5Parent.value = fe5.assets.value.find((a) => a.name === 'photo.png')?.parentId ?? '(none)';
}
const stamp5Pass = computed(() => uploaded5Parent.value === 'sub');

// ─────────────────────────────────────────────────────────────────────────
// #6 — browse-only store (no save / loadContent): no spurious save error on
// upload, and openFile is a no-op (no editor tabs)
// ─────────────────────────────────────────────────────────────────────────
const ops6: AssetOp[] = [];
const store6 = makeStore({}); // no save, no loadContent
const fe6 = useFileExplorer({ store: store6, onError: (op) => ops6.push(op) });
const ran6 = ref(false);
const sawSaveError = ref(false);
const tabsAfterOpen = ref(-1);
async function run6() {
  await fe6.addFiles('sub', [new File(['x'], 'pic.png', { type: 'image/png' })]);
  const file = fe6.assets.value.find((a) => a.id === 'a.txt')!;
  await fe6.openFile(file, { pinned: true });
  sawSaveError.value = ops6.includes('save');
  tabsAfterOpen.value = fe6.openTabs.value.length;
  ran6.value = true;
}
const browse6Pass = computed(
  () => ran6.value && !sawSaveError.value && tabsAfterOpen.value === 0,
);

// ─────────────────────────────────────────────────────────────────────────
// #1A — async onCreate keep-open / reopen-on-reject (Tellify reply #A)
// A builder onCreate that REJECTS the name "dup" (simulated 409) and resolves
// anything else. On reject the draft must stay open + focused; on success it drops.
// ─────────────────────────────────────────────────────────────────────────
interface FNode {
  id: string;
  name: string;
  children?: FNode[];
}
const fnodes = ref<FNode[]>([{ id: 'root', name: 'root', children: [] }]);
const { builder: treeBuilder, api: treeApi } = useTree<FNode>();
let createSeq = 0;
treeBuilder
  .nodes(fnodes)
  .getId((n) => n.id)
  .getChildren((n) => n.children)
  .getLabel((n) => n.name)
  .expanded(ref(new Set(['root'])))
  .creatable(true)
  .onCreate(async ({ name }) => {
    // Simulate an async backend that 409s on the literal name "dup".
    await new Promise((r) => setTimeout(r, 30));
    if (name === 'dup') throw new Error('duplicate name (simulated 409)');
    fnodes.value = [
      {
        ...fnodes.value[0],
        children: [...(fnodes.value[0].children ?? []), { id: `n${createSeq++}`, name }],
      },
    ];
  });
function start1a() {
  treeApi.startCreate('root', { kind: 'folder' });
}

// ─────────────────────────────────────────────────────────────────────────
// #Drag — app-internal drag (grid card) dropped onto a tree folder (reply Q2b)
// ─────────────────────────────────────────────────────────────────────────
const DRAG_MIME = 'application/x-citydiary-asset';
const dnodes = ref<FNode[]>([
  { id: 'inbox', name: 'Inbox', children: [] },
  { id: 'archive', name: 'Archive', children: [] },
]);
const { builder: dragTree } = useTree<FNode>();
dragTree
  .nodes(dnodes)
  .getId((n) => n.id)
  .getChildren((n) => n.children)
  .getLabel((n) => n.name)
  .isExpandable(() => true)
  .acceptsData([DRAG_MIME])
  .onDataDrop(({ node, dataTransfer }) => {
    dropResult.value = {
      folder: node?.name ?? '(root)',
      asset: dataTransfer.getData(DRAG_MIME) || '(empty)',
    };
  });
const dropResult = ref<{ folder: string; asset: string } | null>(null);
function onCardDragStart(e: DragEvent) {
  e.dataTransfer?.setData(DRAG_MIME, 'photo-123');
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}
const dragPass = computed(() => dropResult.value?.asset === 'photo-123');
</script>

<template>
  <div class="frv">
    <h2>Feature-request verification (#2, #3, #5, #6)</h2>
    <p class="frv__hint">#1 (inline create) is verified in the File Explorer POC.</p>

    <!-- #2 -->
    <section class="frv__panel" data-testid="panel-2">
      <h3>#2 · CoarToastContainer with no <code>:service</code></h3>
      <p>
        Reactive heartbeat (would freeze if the old <code>undefined.position</code> crash
        stalled the flush): <strong data-testid="heartbeat">{{ heartbeat }}</strong>
      </p>
      <button data-testid="fire-toast" @click="fireToast">Show toast</button>
      <span data-testid="result-2" :class="['frv__badge', heartbeat > 0 ? 'pass' : 'fail']">
        {{ heartbeat > 0 ? 'PASS — mounted, flush alive' : 'pending' }}
      </span>
    </section>

    <!-- #3 -->
    <section class="frv__panel" data-testid="panel-3">
      <h3>#3 · programmatic <code>move(id, newParentId)</code></h3>
      <p>utils.ts parentId: <strong data-testid="utils-parent">{{ utilsParent }}</strong></p>
      <button data-testid="move-to-docs" @click="fe3.move('utils.ts', 'docs')">Move utils.ts → docs</button>
      <button data-testid="move-to-root" @click="fe3.move('utils.ts', null)">Move → root</button>
      <span data-testid="result-3" :class="['frv__badge', move3Pass ? 'pass' : 'fail']">
        {{ move3Pass ? 'PASS — reparented to docs' : 'click “Move → docs”' }}
      </span>
    </section>

    <!-- #5 -->
    <section class="frv__panel" data-testid="panel-5">
      <h3>#5 · upload node stamped with target parentId</h3>
      <p>(store deliberately returns <code>parentId: null</code> on upload)</p>
      <p>uploaded photo.png parentId: <strong data-testid="uploaded-parent">{{ uploaded5Parent }}</strong></p>
      <button data-testid="upload-5" @click="upload5">Upload photo.png → /sub</button>
      <span data-testid="result-5" :class="['frv__badge', stamp5Pass ? 'pass' : 'fail']">
        {{ stamp5Pass ? 'PASS — stamped /sub' : 'click “Upload”' }}
      </span>
    </section>

    <!-- #6 -->
    <section class="frv__panel" data-testid="panel-6">
      <h3>#6 · browse-only store (no save / loadContent)</h3>
      <button data-testid="run-6" @click="run6">Upload + open file</button>
      <p>save error fired: <strong data-testid="saw-save-error">{{ ran6 ? sawSaveError : '—' }}</strong></p>
      <p>open tabs after openFile: <strong data-testid="tabs-after">{{ ran6 ? tabsAfterOpen : '—' }}</strong></p>
      <span data-testid="result-6" :class="['frv__badge', browse6Pass ? 'pass' : 'fail']">
        {{ browse6Pass ? 'PASS — no save error, no tab' : 'click “Upload + open file”' }}
      </span>
    </section>

    <!-- #1A -->
    <section class="frv__panel" data-testid="panel-1a">
      <h3>#1A · async onCreate keep-open / reopen-on-reject</h3>
      <p>
        Type <code>dup</code> + Enter → simulated 409 → draft stays open (retry).
        Any other name → draft drops + node added.
      </p>
      <button data-testid="start-1a" @click="start1a">New folder under root</button>
      <div class="frv__tree" data-testid="tree-1a">
        <CoarTree :builder="treeBuilder">
          <template #default="{ node }">
            <CoarTreeNodeLabel :label="node.name" />
          </template>
        </CoarTree>
      </div>
    </section>

    <!-- #Drag -->
    <section class="frv__panel" data-testid="panel-drag">
      <h3>#Drag · app-internal drag (grid card) → tree folder</h3>
      <p>Drag the card onto Inbox or Archive → <code>@data-drop</code> with the asset id.</p>
      <div
        class="frv__card"
        draggable="true"
        data-testid="drag-card"
        @dragstart="onCardDragStart"
      >
        📷 photo-123 (drag me)
      </div>
      <div class="frv__tree" data-testid="tree-drag">
        <CoarTree :builder="dragTree">
          <template #default="{ node }">
            <CoarTreeNodeLabel :label="node.name" />
          </template>
        </CoarTree>
      </div>
      <p>
        last drop →
        <strong data-testid="drop-result">{{ dropResult ? `${dropResult.asset} onto ${dropResult.folder}` : '—' }}</strong>
      </p>
      <span data-testid="result-drag" :class="['frv__badge', dragPass ? 'pass' : 'fail']">
        {{ dragPass ? 'PASS — data-drop fired' : 'drop the card onto a folder' }}
      </span>
    </section>

    <!-- The component under test for #2: rendered WITHOUT :service on purpose. -->
    <CoarToastContainer />
  </div>
</template>

<style scoped>
.frv {
  padding: 16px;
  font-family: system-ui, sans-serif;
  max-width: 760px;
}
.frv__hint {
  color: #64748b;
  font-size: 13px;
}
.frv__panel {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 12px 0;
}
.frv__panel h3 {
  margin: 0 0 8px;
  font-size: 15px;
}
.frv__panel button {
  margin-right: 8px;
  margin-bottom: 4px;
  padding: 4px 10px;
  cursor: pointer;
}
.frv__badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}
.frv__badge.pass {
  background: #dcfce7;
  color: #166534;
}
.frv__badge.fail {
  background: #fef9c3;
  color: #854d0e;
}
.frv__tree {
  height: 160px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-top: 8px;
  overflow: auto;
}
.frv__card {
  display: inline-block;
  padding: 10px 14px;
  margin: 4px 0;
  border: 1px dashed #94a3b8;
  border-radius: 6px;
  background: #f8fafc;
  cursor: grab;
  user-select: none;
}
</style>
