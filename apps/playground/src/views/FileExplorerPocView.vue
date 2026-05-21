<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import {
  CoarBreadcrumb,
  CoarBreadcrumbItem,
  CoarContextMenu,
  CoarIcon,
  CoarMenu,
  CoarMenuDivider,
  CoarMenuItem,
  CoarTree,
  CoarTreeNodeLabel,
  useContextMenu,
  vTooltip,
} from '@cocoar/vue-ui';
import { CoarScriptEditor, type CoarScriptEditorLanguage } from '@cocoar/vue-script-editor';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';
import {
  CoarDocumentViewer,
  imageSource,
  type DocumentSource,
} from '@cocoar/vue-document-viewer';
import { pdfSource } from '@cocoar/vue-document-viewer/pdf';
import '@cocoar/vue-document-viewer/styles';

import {
  createInMemoryAssetStore,
  resolveFileMeta,
  useFileExplorer,
  type Asset,
  type AssetOp,
  type AssetOpContext,
  type ConflictPolicy,
  type FileEditor,
  type OpenTab,
  type SortMode,
} from '@cocoar/vue-file-explorer';

// ─── domain ────────────────────────────────────────────────────────────────
// Tree state is now a flat `Asset<unknown>[]` owned by the AssetStore. The
// POC reads it as `store._assets.value`; CoarTree consumes it via the same
// root + getChildren contract as before, but `getChildren` is now a
// parentId-filter instead of an embedded `children` array walk.

const uid = (): string => crypto.randomUUID();

const DEMO_PDF_URL = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';
const DEMO_IMAGE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="#eff6ff"/>
  <text x="400" y="280" text-anchor="middle" font-family="sans-serif" font-size="48" font-weight="700" fill="#1e3a8a">logo.svg</text>
  <text x="400" y="340" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#475569">Rendered via CoarDocumentViewer · imageSource()</text>
</svg>`,
)}`;

/** Build the seed assets + their initial content map for the in-memory store. */
function seed(): { assets: Asset[]; contents: Record<string, string | Blob> } {
  const srcId = uid();
  const docsId = uid();
  const assetsFolderId = uid();
  const utilsId = uid();
  const readmeId = uid();
  const logoId = uid();
  const pdfId = uid();
  return {
    assets: [
      { id: srcId, name: 'src', kind: 'folder', parentId: null },
      { id: utilsId, name: 'utils.ts', kind: 'file', parentId: srcId },
      { id: docsId, name: 'docs', kind: 'folder', parentId: null },
      { id: readmeId, name: 'README.md', kind: 'file', parentId: docsId },
      { id: assetsFolderId, name: 'assets', kind: 'folder', parentId: null },
      { id: logoId, name: 'logo.svg', kind: 'file', parentId: assetsFolderId },
      { id: pdfId, name: 'whitepaper.pdf', kind: 'file', parentId: assetsFolderId },
    ],
    contents: {
      [utilsId]: `export function clamp(n: number, lo: number, hi: number): number {\n  return Math.min(hi, Math.max(lo, n));\n}\n`,
      [readmeId]: `# Document Assets POC\n\nThis tree is now backed by an **AssetStore<T>** — same UX, but every mutation flows through a single async API so a real backend (HTTP, IndexedDB, …) drops in without touching the view.\n\nTry it:\n\n- **Right-click** anywhere — context menu has the same actions as the row \`⋮\` menu\n- **Drag a file onto a folder** to move it; drop a node *between* siblings to reorder\n- **Drag OS files** into a folder or the empty area to upload\n- Click a file to open it in a tab — \`.md\`, code, PDFs and images all dispatch to the right editor\n- Keyboard: arrows / Home / End / Enter / Space / type-to-jump\n`,
      [logoId]: DEMO_IMAGE_URL,
      [pdfId]: DEMO_PDF_URL,
    },
  };
}

// ─── simulator knobs (drive the store + composable knobs at runtime) ─────
// Reactive refs piped into the store + composable so the user can retune
// at runtime via the simulator panel in the tree header. With both knobs
// at 0 the POC behaves like a sync in-memory app — bump latency to see the
// loading states wired further down. `simSortMode` flips the composable's
// child-sort strategy live.
// Simulator settings persist across reloads — Lazy is a construction-time
// switch and survives via localStorage; Latency / Failure / Sort also stick
// so the user can dial in a scenario, reload, and see the lazy initial-load
// flow with the same spinners they had before the reload.
const LAZY_LS_KEY = 'fe-poc-lazy';
const LATENCY_LS_KEY = 'fe-poc-latency';
const FAILURE_LS_KEY = 'fe-poc-failure';
const SORT_LS_KEY = 'fe-poc-sort';
const CONFLICT_LS_KEY = 'fe-poc-conflict';

const simLatencyMs = ref<number>(Number(localStorage.getItem(LATENCY_LS_KEY)) || 0);
const simFailureRate = ref<number>(Number(localStorage.getItem(FAILURE_LS_KEY)) || 0);
const simSortMode = ref<SortMode>(
  (localStorage.getItem(SORT_LS_KEY) as SortMode) || 'folders-first',
);
const simConflict = ref<ConflictPolicy>(
  (localStorage.getItem(CONFLICT_LS_KEY) as ConflictPolicy) || 'rename',
);
const simLazy = ref<boolean>(localStorage.getItem(LAZY_LS_KEY) === '1');
const simulatorOpen = ref(false);

watch(simLatencyMs, (v) => localStorage.setItem(LATENCY_LS_KEY, String(v)));
watch(simFailureRate, (v) => localStorage.setItem(FAILURE_LS_KEY, String(v)));
watch(simSortMode, (v) => {
  if (typeof v === 'string') localStorage.setItem(SORT_LS_KEY, v);
});
watch(simConflict, (v) => {
  if (typeof v === 'string') localStorage.setItem(CONFLICT_LS_KEY, v);
});

function setLazy(next: boolean) {
  localStorage.setItem(LAZY_LS_KEY, next ? '1' : '0');
  window.location.reload();
}

const seeded = seed();
const store = createInMemoryAssetStore({
  initialTree: seeded.assets,
  initialContent: seeded.contents,
  latencyMs: simLatencyMs,
  failureRate: simFailureRate,
  onConflict: simConflict,
  lazy: simLazy.value,
});
/** Reactive flat list — direct read into the store's owned ref. */
const assets = store._assets;

// ─── error toast queue (POC presentation; composable funnels through onError) ─
interface ToastError {
  id: string;
  op: string;
  message: string;
  hint?: string;
}
const toasts = ref<ToastError[]>([]);

function recordError(op: AssetOp, error: unknown, ctx: AssetOpContext = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const hint = ctx.name ?? ctx.file?.name;
  const entry: ToastError = { id: crypto.randomUUID(), op, message, hint };
  toasts.value = [...toasts.value, entry];
  // Auto-dismiss after 4s. Manual dismiss via the X button.
  setTimeout(() => dismissToast(entry.id), 4000);
}
function dismissToast(id: string) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

// ─── composable: owns store wiring, tree state, tabs, async state ────────
const fe = useFileExplorer({ store, onError: recordError, sortMode: simSortMode });
const {
  // tree state
  rootNodes,
  selectedId,
  expanded,
  // CoarTree helpers
  getId,
  getChildren,
  getLabel,
  isExpandable,
  // async state
  loadingNodes,
  savingNodes,
  // tabs
  openTabs,
  activeId,
  activeTab,
  isDirty,
  setContent,
  // tab ops
  activateNode,
  saveActive,
  closeOthers,
  closeToRight,
  closeAll,
  pinTab,
  unpinTab,
  // CRUD (POC wraps `addFolder` + `deleteNode` for prompt/confirm UI)
  addFolder: addFolderViaStore,
  addFiles,
  deleteNode: deleteNodeViaStore,
  rename: renameViaStore,
  moveNode,
  // navigation
  revealInTree: revealInTreeApi,
  breadcrumbPath,
} = fe;

// ─── POC-side wrappers for the few ops that need UI interaction ──────────
function addFolder(parentId: string | null) {
  const name = window.prompt('Folder name?')?.trim();
  if (!name) return;
  void addFolderViaStore(parentId, name);
}

function deleteNode(node: Asset) {
  const what = node.kind === 'folder' ? `folder "${node.name}" and all its contents` : `"${node.name}"`;
  if (!window.confirm(`Delete ${what}?`)) return;
  void deleteNodeViaStore(node);
}

function closeTab(id: string, ev?: MouseEvent) {
  ev?.stopPropagation();
  fe.closeTab(id);
}

// ─── Ctrl+P quick-open (VSCode-style fuzzy file picker) ──────────────────
// Lightweight overlay: input + filtered file-only list. Substring match on
// each file's "/" -joined path so deep matches surface alongside name hits.
// Arrow Up/Down navigates, Enter pins-and-opens, Escape closes. Future
// polish: actual fuzzy ranking (subsequence + score), not just substring.
const quickPickOpen = ref(false);
const quickPickQuery = ref('');
const quickPickFocusedIdx = ref(0);
const quickPickInputRef = ref<HTMLInputElement | null>(null);

interface QuickPickEntry { id: string; path: string; name: string; }

const quickPickResults = computed<QuickPickEntry[]>(() => {
  const q = quickPickQuery.value.trim().toLowerCase();
  const out: QuickPickEntry[] = [];
  for (const asset of fe.assets.value) {
    if (asset.kind !== 'file') continue;
    const path = fe.pathOf(asset.id).join('/');
    if (q && !path.toLowerCase().includes(q)) continue;
    out.push({ id: asset.id, path, name: asset.name });
    if (out.length >= 50) break; // bounded — fuzzy ranking would do better
  }
  return out;
});

function openQuickPick() {
  quickPickOpen.value = true;
  quickPickQuery.value = '';
  quickPickFocusedIdx.value = 0;
  void nextTick(() => quickPickInputRef.value?.focus());
}
function closeQuickPick() {
  quickPickOpen.value = false;
}
function quickPickConfirm(idx?: number) {
  const target = quickPickResults.value[idx ?? quickPickFocusedIdx.value];
  if (!target) return;
  const asset = fe.assets.value.find((a) => a.id === target.id);
  if (asset) void fe.openFile(asset, { pinned: true });
  closeQuickPick();
}
function quickPickKeydown(e: KeyboardEvent) {
  const results = quickPickResults.value;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    quickPickFocusedIdx.value = Math.min(results.length - 1, quickPickFocusedIdx.value + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    quickPickFocusedIdx.value = Math.max(0, quickPickFocusedIdx.value - 1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    quickPickConfirm();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeQuickPick();
  }
}
// Reset focused index when results change (filter narrowed or expanded).
watch(quickPickQuery, () => {
  quickPickFocusedIdx.value = 0;
});

// ─── tab drag-to-reorder ──────────────────────────────────────────────────
// Custom MIME marks the drag as a tab-reorder (not an OS file drag, not a
// tree-node drag). dragover splits the tab's bounding box at the mid-X to
// decide before/after; drop calls `fe.reorderTab` and clears the indicator.
const TAB_DRAG_MIME = 'application/x-cocoar-tab-reorder';
const draggingTabId = ref<string | null>(null);
const tabDropTargetId = ref<string | null>(null);
const tabDropPosition = ref<'before' | 'after' | null>(null);

function onTabDragStart(id: string, ev: DragEvent) {
  if (!ev.dataTransfer) return;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData(TAB_DRAG_MIME, id);
  // Empty fallback so dragover can distinguish this drag without `getData`
  // (which is unavailable during dragover for security reasons).
  ev.dataTransfer.setData('text/plain', id);
  draggingTabId.value = id;
}

function onTabDragEnd() {
  draggingTabId.value = null;
  tabDropTargetId.value = null;
  tabDropPosition.value = null;
}

function onTabDragOver(targetId: string, ev: DragEvent) {
  // Only accept drops we initiated — sniff types[] for our MIME (case-insensitive).
  const types = ev.dataTransfer?.types ?? [];
  const isOurs = Array.from(types).some((t) => t.toLowerCase() === TAB_DRAG_MIME);
  if (!isOurs) return;
  if (targetId === draggingTabId.value) return; // self-drop = no-op
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
  const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
  const position: 'before' | 'after' = ev.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
  tabDropTargetId.value = targetId;
  tabDropPosition.value = position;
}

function onTabDragLeave(targetId: string) {
  if (tabDropTargetId.value === targetId) {
    tabDropTargetId.value = null;
    tabDropPosition.value = null;
  }
}

function onTabDrop(targetId: string, ev: DragEvent) {
  const sourceId = ev.dataTransfer?.getData(TAB_DRAG_MIME);
  const position = tabDropPosition.value;
  tabDropTargetId.value = null;
  tabDropPosition.value = null;
  draggingTabId.value = null;
  if (!sourceId || !position || sourceId === targetId) return;
  ev.preventDefault();
  fe.reorderTab(sourceId, targetId, position);
}

// ─── hidden file input ─────────────────────────────────────────────────────
const fileInput = ref<HTMLInputElement | null>(null);
const uploadTargetId = ref<string | null>(null);

function triggerUpload(parentId: string | null) {
  uploadTargetId.value = parentId;
  fileInput.value?.click();
}
function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) void addFiles(uploadTargetId.value, input.files);
  input.value = '';
}

// ─── context menu (right-click + ⋮ button share this controller) ──────────
const contextMenu = useContextMenu();
const contextTarget = ref<Asset | null>(null);

function openContextMenu(node: Asset | null, ev: MouseEvent) {
  contextTarget.value = node;
  contextMenu.open(ev);
}

function ctxNewFolder() {
  const parentId = contextTarget.value?.kind === 'folder' ? contextTarget.value.id : null;
  addFolder(parentId);
}
function ctxUpload() {
  const parentId = contextTarget.value?.kind === 'folder' ? contextTarget.value.id : null;
  triggerUpload(parentId);
}
function ctxDelete() {
  if (contextTarget.value) deleteNode(contextTarget.value);
}
function ctxRename() {
  if (contextTarget.value) treeRef.value?.startRename(contextTarget.value.id);
}

// ─── rename ───────────────────────────────────────────────────────────────
// Inline-edit UI now lives in `<CoarTree :renamable>` + `<CoarTreeNodeLabel>`
// (see template). The tree emits `@rename` when the user commits — we
// route it to the composable. F2-on-focused-row is also tree-owned.
function onTreeRename({ node, newName }: { node: Asset; newName: string }) {
  void renameViaStore(node.id, newName);
}

// ─── tab context menu (right-click a tab) ─────────────────────────────────
const tabMenu = useContextMenu();
const tabMenuTargetId = ref<string | null>(null);

function openTabMenu(id: string, ev: MouseEvent) {
  tabMenuTargetId.value = id;
  tabMenu.open(ev);
}

const tabMenuTarget = computed(() =>
  tabMenuTargetId.value ? openTabs.value.find((t) => t.id === tabMenuTargetId.value) ?? null : null,
);

// ─── reveal in tree (composable does the walk; POC plugs in tree's focusNode) ─
const treeRef = useTemplateRef<{
  focusNode: (id: string) => void;
  startRename: (id: string) => void;
}>('treeRef');

function revealInTree(id: string) {
  revealInTreeApi(id, treeRef.value?.focusNode);
}

// ─── splitter (tree pane width) ──────────────────────────────────────────
const SPLITTER_LS_KEY = 'coar-file-explorer-tree-width';
const SPLITTER_MIN = 160;
const SPLITTER_MAX = 600;
const treeWidth = ref<number>(
  Number(localStorage.getItem(SPLITTER_LS_KEY)) || 240,
);

function onSplitterPointerDown(e: PointerEvent) {
  // Pointer events instead of mouse so touch + stylus + mouse all share one
  // code path. Capture so subsequent move/up events fire even when the cursor
  // leaves the thin splitter strip.
  //
  // IMPORTANT: capture the element in a local before attaching listeners.
  // `e.currentTarget` is cleared by the browser after the handler returns —
  // referencing it inside the `onUp` closure would throw (or worse, silently
  // skip the removeEventListener) and the move listener would stick around
  // forever, making the splitter follow the cursor without any active click.
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = treeWidth.value;
  const onMove = (ev: PointerEvent) => {
    const next = Math.max(SPLITTER_MIN, Math.min(SPLITTER_MAX, startWidth + (ev.clientX - startX)));
    treeWidth.value = next;
  };
  const onUp = (ev: PointerEvent) => {
    if (target.hasPointerCapture(ev.pointerId)) target.releasePointerCapture(ev.pointerId);
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onUp);
    target.removeEventListener('pointercancel', onUp);
    localStorage.setItem(SPLITTER_LS_KEY, String(treeWidth.value));
  };
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
  // pointercancel covers cases where the OS interrupts the gesture (window
  // loses focus, touch is cancelled, …) so we don't leak listeners.
  target.addEventListener('pointercancel', onUp);
}
function onSplitterKeydown(e: KeyboardEvent) {
  // Keyboard a11y: arrow keys nudge by 8 px, Shift extends to 32 px,
  // Home/End jump to min/max. Persisted on each change.
  let delta = 0;
  if (e.key === 'ArrowLeft') delta = e.shiftKey ? -32 : -8;
  else if (e.key === 'ArrowRight') delta = e.shiftKey ? 32 : 8;
  else if (e.key === 'Home') delta = SPLITTER_MIN - treeWidth.value;
  else if (e.key === 'End') delta = SPLITTER_MAX - treeWidth.value;
  else return;
  e.preventDefault();
  treeWidth.value = Math.max(SPLITTER_MIN, Math.min(SPLITTER_MAX, treeWidth.value + delta));
  localStorage.setItem(SPLITTER_LS_KEY, String(treeWidth.value));
}

// ─── keyboard shortcuts (Ctrl/Cmd+S = save active) ───────────────────────
function onKeydown(e: KeyboardEvent) {
  // Ignore when typing in inputs — IME composition, contenteditable spaces,
  // and form inputs all get the keystroke first. The active Monaco / Milkdown
  // editor catches Ctrl+S inside their own keybindings normally, but in case
  // focus is on a row / button we still want Ctrl+S to save the active tab.
  const tgt = e.target as HTMLElement | null;
  const isEditable =
    tgt?.tagName === 'INPUT' ||
    tgt?.tagName === 'TEXTAREA' ||
    tgt?.isContentEditable;
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    if (isEditable && tgt && !tgt.closest('.fe-editor')) return;
    e.preventDefault();
    saveActive();
    return;
  }
  // Ctrl/Cmd+P → quick-open. Always intercepts (the browser's default
  // Cmd+P print dialog is undesirable in this view).
  if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
    e.preventDefault();
    openQuickPick();
    return;
  }
  // F2-on-focused-row is owned by `<CoarTree :renamable>` via its root
  // keydown — no POC-side handler needed any more.
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

// `beforeunload` (warns on unsaved) + blob-URL cleanup live inside the
// composable via onScopeDispose.

// DocumentSource cache — keyed by tab id so PDF/image viewers don't re-fetch
// on every render. Pruned by a watcher when tabs close.
const sourceCache = new Map<string, DocumentSource>();
function sourceFor(tab: OpenTab): DocumentSource {
  const cached = sourceCache.get(tab.id);
  if (cached) return cached;
  const built: DocumentSource =
    tab.editor === 'pdf'
      ? pdfSource({ url: tab.content, withCredentials: false })
      : imageSource({ url: tab.content });
  sourceCache.set(tab.id, built);
  return built;
}
watch(openTabs, (tabs) => {
  const liveIds = new Set(tabs.map((t) => t.id));
  for (const id of sourceCache.keys()) if (!liveIds.has(id)) sourceCache.delete(id);
});

/**
 * Icon for a file row or tab. Resolves the editor/language fresh via
 * `resolveFileMeta` so renaming a file (which changes the resolved meta)
 * automatically updates the icon without anyone having to mirror state.
 */
function fileIcon(
  input: Asset | { editor: FileEditor; language?: CoarScriptEditorLanguage },
): string {
  const editor = 'kind' in input ? resolveFileMeta(input)?.editor : input.editor;
  const language = 'kind' in input ? resolveFileMeta(input)?.language : input.language;
  if (editor === 'markdown') return 'file-text';
  if (editor === 'script' && language === 'plaintext') return 'file-text';
  return 'file';
}

</script>

<template>
  <div
    class="fe-root"
    :style="{ '--fe-tree-width': treeWidth + 'px' }"
  >
    <!-- Left: tree -->
    <aside class="fe-tree-pane">
      <header class="fe-tree-header">
        <span class="fe-tree-header__title">Explorer</span>
        <span class="fe-tree-header__actions">
          <button
            type="button"
            class="fe-tree-header__action"
            title="Upload files to root"
            @click="triggerUpload(null)"
          >
            <CoarIcon name="upload" size="xs" />
          </button>
          <button
            type="button"
            class="fe-tree-header__action"
            title="New folder at root"
            @click="addFolder(null)"
          >
            <CoarIcon name="plus" size="xs" />
          </button>
          <button
            type="button"
            class="fe-tree-header__action"
            :class="{ 'fe-tree-header__action--active': simulatorOpen }"
            title="Async simulator (latency + failure rate)"
            @click="simulatorOpen = !simulatorOpen"
          >
            <CoarIcon name="settings" size="xs" />
          </button>
        </span>
      </header>

      <!-- Simulator panel — toggles store.latencyMs + failureRate at runtime
           so the loading-spinner + error-toast wiring is actually visible
           during regular interaction. Knobs are reactive refs piped into
           the InMemoryAssetStore. -->
      <div v-if="simulatorOpen" class="fe-simulator">
        <label class="fe-simulator__row">
          <span class="fe-simulator__label">Latency</span>
          <select v-model.number="simLatencyMs" class="fe-simulator__select">
            <option :value="0">off</option>
            <option :value="250">250 ms</option>
            <option :value="1000">1000 ms</option>
          </select>
        </label>
        <label class="fe-simulator__row">
          <span class="fe-simulator__label">Failure</span>
          <select v-model.number="simFailureRate" class="fe-simulator__select">
            <option :value="0">0 %</option>
            <option :value="0.1">10 %</option>
            <option :value="0.5">50 %</option>
          </select>
        </label>
        <label class="fe-simulator__row">
          <span class="fe-simulator__label">Sort</span>
          <select v-model="simSortMode" class="fe-simulator__select">
            <option value="folders-first">Folders first</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="manual">Manual (drag-reorder)</option>
          </select>
        </label>
        <label class="fe-simulator__row">
          <span class="fe-simulator__label">Conflict</span>
          <select v-model="simConflict" class="fe-simulator__select">
            <option value="rename">Rename (foo → foo (2))</option>
            <option value="overwrite">Overwrite existing</option>
            <option value="prompt">Prompt for name</option>
            <option value="error">Error (throw)</option>
          </select>
        </label>
        <!-- Lazy mode is a construction-time option in the InMemoryAssetStore
             — flipping it triggers a reload so the new store reflects the
             setting. Persisted via localStorage so the choice survives. -->
        <label class="fe-simulator__row">
          <span class="fe-simulator__label">Lazy</span>
          <label class="fe-simulator__toggle">
            <input
              type="checkbox"
              :checked="simLazy"
              @change="setLazy(($event.target as HTMLInputElement).checked)"
            />
            <span class="fe-simulator__hint">reload</span>
          </label>
        </label>
      </div>

      <div class="fe-tree-scroll">
        <CoarTree
          ref="treeRef"
          :nodes="rootNodes"
          :get-id="getId"
          :get-children="getChildren"
          :get-label="getLabel"
          :is-expandable="isExpandable"
          v-model:expanded="expanded"
          v-model:selected="selectedId"
          draggable
          accepts-files
          renamable
          @activate="activateNode"
          @context-menu="openContextMenu"
          @files-drop="({ files, target }) => addFiles(target?.id ?? null, files)"
          @node-move="moveNode"
          @rename="onTreeRename"
        >
          <template #default="{ node }">
            <!--
              Tooltip lives on the icon+name wrapper, NOT the name span alone.
              When the row gets so narrow that the name collapses to 0 px (e.g.
              deep nesting in a slim sidebar), the icon still has a hit area —
              hovering it shows the tooltip. The `.fe-row__name` selector tells
              the tooltip to gate on the label's overflow, not the wrapper's.
            -->
            <span
              v-tooltip="{ content: node.name, onlyOnOverflow: '.coar-tree-node-label__text' }"
              class="fe-row__main"
            >
              <span
                v-if="loadingNodes.has(node.id) || savingNodes.has(node.id)"
                class="fe-spinner fe-row__icon"
                aria-hidden="true"
              />
              <CoarIcon
                v-else
                :name="node.kind === 'folder' ? 'folder' : fileIcon(node)"
                size="xs"
                class="fe-row__icon"
              />
              <CoarTreeNodeLabel :label="node.name" class="fe-row__label" />
            </span>
            <span class="fe-row__actions">
              <button
                type="button"
                class="fe-row__action"
                title="More actions"
                @click.stop="openContextMenu(node, $event)"
              >
                <CoarIcon name="ellipsis-vertical" size="xs" />
              </button>
            </span>
          </template>
          <template #empty>
            No files yet. Drop files here or use the buttons above.
          </template>
        </CoarTree>
      </div>

      <input
        ref="fileInput"
        type="file"
        multiple
        class="fe-hidden-input"
        @change="onFilePicked"
      />
    </aside>

    <!--
      Resizable splitter between tree and editor. Pointer events handle
      mouse/touch/stylus; keyboard nudges via Arrow/Home/End when focused.
      The 6-px hit area is wider than the visible 1-px line so users don't
      have to pixel-hunt.
    -->
    <div
      class="fe-splitter"
      role="separator"
      aria-orientation="vertical"
      :aria-valuenow="treeWidth"
      :aria-valuemin="160"
      :aria-valuemax="600"
      tabindex="0"
      title="Drag to resize · arrow keys also work"
      @pointerdown="onSplitterPointerDown"
      @keydown="onSplitterKeydown"
    />

    <!-- Tab-bar context menu: right-clicking a tab opens this. The target
         is tracked separately from the tree context menu so the two don't
         step on each other. -->
    <CoarContextMenu :menu="tabMenu">
      <CoarMenu v-if="tabMenuTarget">
        <CoarMenuItem
          :label="tabMenuTarget.pinned ? 'Unpin tab' : 'Pin tab'"
          icon="bookmark"
          @clicked="tabMenuTarget.pinned ? unpinTab(tabMenuTarget.id) : pinTab(tabMenuTarget.id)"
        />
        <CoarMenuItem
          label="Reveal in tree"
          icon="folder"
          @clicked="revealInTree(tabMenuTarget.id)"
        />
        <CoarMenuDivider />
        <CoarMenuItem label="Close" icon="x" @clicked="closeTab(tabMenuTarget.id)" />
        <CoarMenuItem label="Close others" @clicked="closeOthers(tabMenuTarget.id)" />
        <CoarMenuItem label="Close to the right" @clicked="closeToRight(tabMenuTarget.id)" />
        <CoarMenuItem label="Close all" @clicked="closeAll" />
      </CoarMenu>
    </CoarContextMenu>

    <!-- Context menu — shared by right-click and the ⋮ row button -->
    <CoarContextMenu :menu="contextMenu">
      <CoarMenu>
        <template v-if="contextTarget?.kind === 'folder'">
          <CoarMenuItem label="Upload files here…" icon="upload" @clicked="ctxUpload" />
          <CoarMenuItem label="New folder…" icon="plus" @clicked="ctxNewFolder" />
          <CoarMenuDivider />
          <CoarMenuItem label="Rename…" icon="pencil" @clicked="ctxRename" />
          <CoarMenuItem label="Delete folder" icon="trash-2" @clicked="ctxDelete" />
        </template>
        <template v-else-if="contextTarget?.kind === 'file'">
          <CoarMenuItem label="Open" icon="file" @clicked="activateNode(contextTarget!)" />
          <CoarMenuDivider />
          <CoarMenuItem label="Rename…" icon="pencil" @clicked="ctxRename" />
          <CoarMenuItem label="Delete file" icon="trash-2" @clicked="ctxDelete" />
        </template>
        <template v-else>
          <CoarMenuItem label="Upload files…" icon="upload" @clicked="ctxUpload" />
          <CoarMenuItem label="New folder…" icon="plus" @clicked="ctxNewFolder" />
        </template>
      </CoarMenu>
    </CoarContextMenu>

    <!-- Right: tabs + content -->
    <section class="fe-main">
      <div class="fe-tabs" role="tablist">
        <button
          v-for="tab in openTabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeId === tab.id"
          class="fe-tab"
          :class="{
            'fe-tab--active': activeId === tab.id,
            'fe-tab--dirty': isDirty(tab),
            'fe-tab--preview': !tab.pinned,
            'fe-tab--drop-before': tabDropTargetId === tab.id && tabDropPosition === 'before',
            'fe-tab--drop-after': tabDropTargetId === tab.id && tabDropPosition === 'after',
          }"
          :title="tab.pinned ? undefined : 'Preview · double-click to keep open'"
          draggable="true"
          @click="activeId = tab.id"
          @dblclick="pinTab(tab.id)"
          @contextmenu.prevent="openTabMenu(tab.id, $event)"
          @auxclick.middle.prevent="closeTab(tab.id)"
          @dragstart="onTabDragStart(tab.id, $event)"
          @dragend="onTabDragEnd"
          @dragover="onTabDragOver(tab.id, $event)"
          @dragleave="onTabDragLeave(tab.id)"
          @drop="onTabDrop(tab.id, $event)"
        >
          <span v-if="loadingNodes.has(tab.id)" class="fe-spinner fe-tab__icon" aria-hidden="true" />
          <CoarIcon v-else :name="fileIcon(tab)" size="xs" class="fe-tab__icon" />
          <span class="fe-tab__name">{{ tab.name }}</span>
          <!--
            Close affordance has three states:
              - in-flight save → spinner, close action blocked
              - unsaved buffer → dirty-dot, hover swaps to X (VSCode pattern)
              - clean tab     → plain X
          -->
          <span
            class="fe-tab__close"
            role="button"
            :class="{ 'fe-tab__close--busy': savingNodes.has(tab.id) }"
            :aria-label="
              savingNodes.has(tab.id)
                ? `Saving ${tab.name}…`
                : isDirty(tab) ? `Close ${tab.name} (unsaved)` : `Close ${tab.name}`
            "
            @click="closeTab(tab.id, $event)"
          >
            <span v-if="savingNodes.has(tab.id)" class="fe-spinner fe-spinner--small" aria-hidden="true" />
            <template v-else>
              <span v-if="isDirty(tab)" class="fe-tab__dirty-dot" aria-hidden="true" />
              <CoarIcon name="x" size="xs" class="fe-tab__close-icon" />
            </template>
          </span>
        </button>
      </div>

      <!-- Breadcrumb of the active file's path. Hidden when no tab open.
           CoarBreadcrumb with size="s" gives us the slim secondary-chrome
           font and the `›` separator out of the design system; the dirty
           indicator sits beside as a sibling so we don't pollute the
           breadcrumb's list semantic with a non-crumb entry. -->
      <div v-if="breadcrumbPath.length" class="fe-breadcrumb">
        <CoarBreadcrumb separator="›" size="s" aria-label="File path">
          <CoarBreadcrumbItem
            v-for="(name, i) in breadcrumbPath"
            :key="i"
            :active="i === breadcrumbPath.length - 1"
          >
            {{ name }}
          </CoarBreadcrumbItem>
        </CoarBreadcrumb>
        <span v-if="activeTab && isDirty(activeTab)" class="fe-breadcrumb__dirty">
          · unsaved (Ctrl+S to save)
        </span>
        <button
          v-if="activeTab"
          type="button"
          class="fe-breadcrumb__reveal"
          title="Reveal in tree"
          aria-label="Reveal in tree"
          @click="revealInTree(activeTab.id)"
        >
          <CoarIcon name="folder" size="xs" />
        </button>
      </div>

      <div class="fe-editor-area">
        <div class="fe-editor">
          <!-- Editors only mount once content has arrived. Otherwise an
               image/PDF viewer with content='' renders its own "could not
               load" error before our loading overlay can take over. The
               overlay below covers this empty pane while loadingNodes has
               the active id. -->
          <template v-if="activeTab && !loadingNodes.has(activeTab.id)">
            <CoarScriptEditor
              v-if="activeTab.editor === 'script' && activeTab.language"
              :key="activeTab.id"
              :model-value="activeTab.content"
              :language="activeTab.language"
              @update:model-value="(v) => setContent(activeTab!.id, v)"
            />
            <CoarMarkdownEditor
              v-else-if="activeTab.editor === 'markdown'"
              :key="activeTab.id"
              :model-value="activeTab.content"
              @update:model-value="(v) => setContent(activeTab!.id, v)"
            />
            <CoarDocumentViewer
              v-else
              :key="activeTab.id"
              :source="sourceFor(activeTab)"
              show-thumbnails
            />
          </template>
          <div v-else-if="!activeTab" class="fe-empty">Pick a file from the tree to open it.</div>
        </div>
        <!-- Loading overlay sits OUTSIDE .fe-editor so Monaco's internal
             ResizeObserver / layout never sees a re-positioned parent.
             Earlier `position: relative` + `backdrop-filter` on .fe-editor
             pushed Monaco into a layout-feedback loop. -->
        <div
          v-if="activeTab && loadingNodes.has(activeTab.id)"
          class="fe-loading-overlay"
        >
          <span class="fe-spinner fe-spinner--large" aria-hidden="true" />
          <span class="fe-loading-overlay__label">Loading {{ activeTab.name }}…</span>
        </div>
      </div>

      <!-- Quick-open (Ctrl/Cmd+P) — fixed overlay near the top of the
           explorer card. Click outside or Escape to close. -->
      <div
        v-if="quickPickOpen"
        class="fe-quickpick-scrim"
        @click="closeQuickPick"
      >
        <div class="fe-quickpick" role="dialog" aria-label="Quick open" @click.stop>
          <input
            ref="quickPickInputRef"
            v-model="quickPickQuery"
            class="fe-quickpick__input"
            type="text"
            placeholder="Type a filename or path…"
            @keydown="quickPickKeydown"
          />
          <ul v-if="quickPickResults.length" class="fe-quickpick__list" role="listbox">
            <li
              v-for="(entry, idx) in quickPickResults"
              :key="entry.id"
              class="fe-quickpick__item"
              :class="{ 'fe-quickpick__item--focused': idx === quickPickFocusedIdx }"
              role="option"
              :aria-selected="idx === quickPickFocusedIdx"
              @mouseenter="quickPickFocusedIdx = idx"
              @click="quickPickConfirm(idx)"
            >
              <span class="fe-quickpick__name">{{ entry.name }}</span>
              <span class="fe-quickpick__path">{{ entry.path }}</span>
            </li>
          </ul>
          <div v-else class="fe-quickpick__empty">No files match.</div>
        </div>
      </div>

      <!-- Toast stack: bottom-right of the explorer, anchored inside the
           file-explorer card so it doesn't escape the demo container.
           recordError() pushes here; auto-dismiss after 4 s. -->
      <div v-if="toasts.length" class="fe-toasts" role="alert" aria-live="polite">
        <div v-for="toast in toasts" :key="toast.id" class="fe-toast">
          <CoarIcon name="circle-alert" size="xs" class="fe-toast__icon" />
          <div class="fe-toast__body">
            <div class="fe-toast__title">{{ toast.op }} failed</div>
            <div class="fe-toast__message">
              {{ toast.message }}<template v-if="toast.hint"> · {{ toast.hint }}</template>
            </div>
          </div>
          <button
            type="button"
            class="fe-toast__close"
            :aria-label="`Dismiss ${toast.op} error`"
            @click="dismissToast(toast.id)"
          >
            <CoarIcon name="x" size="xs" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.fe-root {
  display: grid;
  /* Three columns: tree pane | splitter (6 px hit area) | editor pane.
     `--fe-tree-width` is set inline from the resize state + persisted to
     localStorage so the layout survives reloads. */
  grid-template-columns: var(--fe-tree-width, 240px) 6px 1fr;
  height: 100%;
  min-height: 0;
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: 8px;
  overflow: hidden;
}

.fe-splitter {
  cursor: col-resize;
  background: transparent;
  position: relative;
  /* Center a 1-px visible line inside the wider hit area so the divider
     stays slim while the drag target is still comfortable. */
  display: flex;
  justify-content: center;
  align-items: stretch;
  outline: none;
  user-select: none;
  touch-action: none;
}
.fe-splitter::before {
  content: '';
  width: 1px;
  background: var(--coar-border-neutral-tertiary);
  transition: background var(--coar-duration-fast, 100ms) var(--coar-ease-out, ease);
}
.fe-splitter:hover::before,
.fe-splitter:active::before,
.fe-splitter:focus-visible::before {
  background: var(--coar-border-accent-primary);
}
.fe-splitter:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

.fe-tree-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-secondary, #fafafa);
  position: relative;
}

.fe-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 6px 0 12px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  flex-shrink: 0;
}
.fe-tree-header__title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--coar-text-neutral-tertiary);
}
.fe-tree-header__actions {
  display: inline-flex;
  gap: 2px;
}
.fe-tree-header__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 3px;
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
  padding: 0;
}
.fe-tree-header__action:hover {
  background: var(--coar-background-neutral-tertiary, #e2e8f0);
  color: var(--coar-text-neutral-primary);
}

.fe-tree-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* Per-row styling — these classes are applied INSIDE the CoarTree default slot
   so they don't conflict with the tree's own scoped CSS for the row container. */

/* The icon+name wrapper. Holds the tooltip trigger so the hover area covers
   both even when the name collapses to 0 px. */
.fe-row__main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.fe-row__icon {
  flex-shrink: 0;
  color: var(--coar-text-neutral-secondary);
}
/* Label + rename input come from `<CoarTreeNodeLabel>` (.coar-tree-node-label__*) */
.fe-row__label {
  flex: 1;
  min-width: 0;
  display: contents;
}
.fe-row__actions {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  opacity: 0;
  transition: opacity var(--coar-duration-fast, 120ms) var(--coar-ease-out, ease);
}
.fe-row__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 3px;
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
  padding: 0;
}
.fe-row__action:hover {
  background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-neutral-primary);
}

/* :deep into CoarTree's row so the actions-strip becomes visible on row hover.
   `>>>` / `::v-deep` would also work; we use `:deep` for Vue 3 SFC convention. */
:deep(.coar-tree-node__row:hover) .fe-row__actions,
:deep(.coar-tree-node__row:focus-within) .fe-row__actions {
  opacity: 1;
}

.fe-hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* Preview-mode tabs (unpinned) render their name in italic to signal that
   they'll be replaced when another file is single-clicked. Editing the
   buffer auto-promotes them to pinned, so this style never combines with
   the dirty-dot for very long. */
.fe-tab--preview .fe-tab__name {
  font-style: italic;
}

/* Drop-line indicator while a tab is being drag-reordered. The 2px accent
   bar marks where the dragged tab will land (left edge for `before`, right
   edge for `after`). Mirrors CoarTree's drop-line styling. */
.fe-tab--drop-before::before,
.fe-tab--drop-after::after {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--coar-border-accent-primary, #2563eb);
  pointer-events: none;
  z-index: 2;
}
.fe-tab--drop-before::before { left: -1px; }
.fe-tab--drop-after::after { right: -1px; }

/* Right pane */
.fe-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.fe-tabs {
  display: flex;
  flex-shrink: 0;
  height: 36px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-secondary, #fafafa);
  overflow-x: auto;
  overflow-y: hidden;
}

.fe-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding: 0 8px 0 12px;
  background: transparent;
  border: none;
  border-right: 1px solid var(--coar-border-neutral-tertiary);
  cursor: pointer;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
  font-family: inherit;
  white-space: nowrap;
  position: relative;
}
.fe-tab:hover {
  background: var(--coar-background-neutral-tertiary, #f1f5f9);
}
.fe-tab--active {
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
}
.fe-tab--active::after {
  content: '';
  position: absolute;
  inset: auto 0 -1px 0;
  height: 2px;
  background: var(--coar-border-accent-primary);
}

.fe-tab__icon {
  color: var(--coar-text-neutral-tertiary);
}
.fe-tab__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 18px;
  height: 18px;
  margin-left: 4px;
  border-radius: var(--coar-radius-s, 3px);
  color: var(--coar-text-neutral-tertiary);
  opacity: 0.6;
}
.fe-tab__close:hover {
  background: var(--coar-background-neutral-tertiary, #e2e8f0);
  opacity: 1;
}

/* Dirty-state: the close-X is replaced by a filled dot while the tab has
   unsaved changes. On hover the dot fades out and the X fades in so the
   close action stays one click away (same pattern as VSCode). */
.fe-tab__dirty-dot {
  position: absolute;
  inset: 50% auto auto 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: var(--coar-text-accent-primary);
  transition: opacity var(--coar-duration-fast, 100ms) var(--coar-ease-out, ease);
}
.fe-tab--dirty .fe-tab__close-icon {
  opacity: 0;
  transition: opacity var(--coar-duration-fast, 100ms) var(--coar-ease-out, ease);
}
.fe-tab--dirty .fe-tab__close:hover .fe-tab__dirty-dot {
  opacity: 0;
}
.fe-tab--dirty .fe-tab__close:hover .fe-tab__close-icon {
  opacity: 1;
}

/* Breadcrumb strip — slim, secondary chrome between the tabs and the editor.
   Wraps a CoarBreadcrumb (with size="s") + the dirty indicator. */
.fe-breadcrumb {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--coar-spacing-s, 8px);
  padding: var(--coar-spacing-xs, 4px) 12px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-primary);
  min-height: 24px;
}
.fe-breadcrumb__dirty {
  color: var(--coar-text-accent-primary);
  font-size: var(--coar-component-s-font-size, 13px);
  flex-shrink: 0;
}

/* Small icon button at the right end of the breadcrumb strip — scrolls
   the active file into view in the tree and selects it. Mirrors VSCode's
   "Show Active File In Explorer". */
.fe-breadcrumb__reveal {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  border-radius: var(--coar-radius-xs, 2px);
  color: var(--coar-text-neutral-tertiary);
  cursor: pointer;
}
.fe-breadcrumb__reveal:hover {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}

.fe-editor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.fe-editor > * {
  flex: 1;
  min-height: 0;
}

.fe-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}

/* Generic spinner glyph used in row icons, tab icons, save indicator, and
   the editor-area overlay. CSS-only ring + rotation. Sizes via modifier. */
.fe-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid var(--coar-border-neutral-tertiary);
  border-top-color: var(--coar-text-accent-primary);
  animation: fe-spin 700ms linear infinite;
  flex-shrink: 0;
}
.fe-spinner--small { width: 8px; height: 8px; border-width: 1.5px; }
.fe-spinner--large { width: 24px; height: 24px; border-width: 2px; }
@keyframes fe-spin {
  to { transform: rotate(360deg); }
}

/* Editor-area wrapper provides the positioning context for the loading
   overlay. The actual .fe-editor stays untouched so Monaco's layout
   observer never sees its parent shift. No backdrop-filter — too heavy
   over Monaco's text canvas and caused a layout-feedback loop. */
.fe-editor-area {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.fe-editor-area > .fe-editor { flex: 1; min-height: 0; }
.fe-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--coar-spacing-s, 8px);
  background: color-mix(in srgb, var(--coar-background-neutral-primary) 88%, transparent);
  z-index: 1;
  pointer-events: none;
}
.fe-loading-overlay__label {
  font-size: var(--coar-component-s-font-size, 13px);
  color: var(--coar-text-neutral-secondary);
}

/* Save-in-flight close affordance: tab__close--busy hides the X glyph and
   ignores clicks so the spinner inside is the only visible thing.
   closeTab() also bails on `savingNodes.has(id)` so the keyboard path is
   blocked too. */
.fe-tab__close--busy {
  pointer-events: none;
  opacity: 1;
}

/* Simulator panel — toggles into the tree pane between header and tree.
   Tight rows, native selects so we don't pull a heavy primitive into the
   POC just for two dropdowns. */
.fe-tree-header__action--active {
  background: var(--coar-background-neutral-tertiary, #e2e8f0);
  color: var(--coar-text-neutral-primary);
}
.fe-simulator {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-tertiary, #f1f5f9);
  flex-shrink: 0;
}
.fe-simulator__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--coar-text-neutral-secondary);
}
.fe-simulator__label {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  font-size: 10px;
  color: var(--coar-text-neutral-tertiary);
}
.fe-simulator__select {
  font: inherit;
  font-size: 12px;
  padding: 1px 4px;
  border-radius: var(--coar-radius-xs, 2px);
  border: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
}
.fe-simulator__toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.fe-simulator__hint {
  font-size: 10px;
  color: var(--coar-text-neutral-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Toast stack — bottom-right of the explorer card. Toasts slide up + in. */
.fe-toasts {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  z-index: 10;
}
.fe-toast {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--coar-radius-m, 4px);
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-error-primary, #ef4444);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: fe-toast-in 200ms var(--coar-ease-out, ease);
}
@keyframes fe-toast-in {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.fe-toast__icon { color: var(--coar-text-error-primary, #ef4444); flex-shrink: 0; margin-top: 2px; }
.fe-toast__body { flex: 1; min-width: 0; }
.fe-toast__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--coar-text-neutral-primary);
}
.fe-toast__message {
  font-size: 12px;
  color: var(--coar-text-neutral-secondary);
  margin-top: 2px;
  word-break: break-word;
}
.fe-toast__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  border-radius: var(--coar-radius-xs, 2px);
  color: var(--coar-text-neutral-tertiary);
  cursor: pointer;
  flex-shrink: 0;
}
.fe-toast__close:hover {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}

/* fe-root needs relative positioning for the toast stack anchor */
.fe-root { position: relative; }

/* Quick-open overlay (Ctrl/Cmd+P). Scrim is just for the click-outside
   trap — the visible overlay is a fixed-width card anchored near the top
   of the explorer card. */
.fe-quickpick-scrim {
  position: absolute;
  inset: 0;
  background: transparent;
  z-index: 20;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 56px;
}
.fe-quickpick {
  width: min(560px, 90%);
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-m, 6px);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  max-height: min(60vh, 480px);
  overflow: hidden;
}
.fe-quickpick__input {
  font: inherit;
  font-size: 14px;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  background: transparent;
  color: var(--coar-text-neutral-primary);
  outline: none;
}
.fe-quickpick__list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.fe-quickpick__item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 5px 12px;
  cursor: pointer;
  font-size: 13px;
}
.fe-quickpick__item--focused {
  background: var(--coar-background-accent-tertiary, #dbeafe);
}
.fe-quickpick__name {
  font-weight: 500;
  color: var(--coar-text-neutral-primary);
  flex-shrink: 0;
}
.fe-quickpick__path {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fe-quickpick__empty {
  padding: 16px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}
</style>
