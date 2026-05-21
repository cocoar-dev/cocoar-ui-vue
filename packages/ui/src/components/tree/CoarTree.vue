<script setup lang="ts" generic="T">
/**
 * `<CoarTree>` — generic, keyboard-navigable, drag-drop-aware tree.
 *
 * **Flat rendering, both modes.** The tree builds a `visibleRows` list (DFS
 * over expanded folders) and renders rows directly — no `<ul role="group">`
 * nesting. `aria-level` carries the depth so screen readers still announce
 * the hierarchy correctly. This unifies the non-virtualized and virtualized
 * code paths and matches every production tree implementation (VSCode,
 * react-arborist, Blueprint, Vaadin).
 *
 * **Two APIs.**
 * 1. *Props-mode*: `nodes`, `getId`, etc. as props. Wire `<CoarContextMenu>`
 *    externally if you want one. Good for quick uses.
 * 2. *Builder-mode* (recommended): `:builder` from `useTree()`. Fluent setters
 *    for data, handlers, and declarative per-target context menus. Tree
 *    renders the `<CoarContextMenu>` internally — no extra markup.
 *
 * **Desktop-first.** Right-click context menus and hover-revealed UI on rows
 * are part of the intended UX — see `feedback_tree_component_desktop_only`.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  toValue,
  useTemplateRef,
  watch,
  type VNode,
} from 'vue';
import CoarTreeNode from './CoarTreeNode.vue';
import CoarMenu from '../menu/CoarMenu.vue';
import CoarMenuItem from '../menu/CoarMenuItem.vue';
import CoarMenuDivider from '../menu/CoarMenuDivider.vue';
import CoarContextMenu from '../menu/CoarContextMenu.vue';
import { useContextMenu } from '../menu/useContextMenu';
import { useVirtualList } from '../../composables/useVirtualList';
import { computeDropPosition, isFileDrag } from './tree-dnd';
import {
  COAR_TREE_DRAG_MIME,
  COAR_TREE_NODE_SLOT_KEY,
  COAR_TREE_RENAME_KEY,
  type CoarTreeDropPosition,
  type CoarTreeFilesDropEvent,
  type CoarTreeMenuEntry,
  type CoarTreeNodeMoveEvent,
  type CoarTreeNodeSlotProps,
  type CoarTreeRenameContext,
  type CoarTreeRenameEvent,
  type CoarTreeVirtualOptions,
  type CoarTreeVirtualizeProp,
} from './tree-types';
import type { TreeBuilder } from './tree-builder';

const props = withDefaults(
  defineProps<{
    /** Fluent builder from `useTree()`. When set, the other config props are ignored. */
    builder?: TreeBuilder<T>;

    nodes?: readonly T[];
    getId?: (node: T) => string;
    getChildren?: (node: T) => readonly T[] | null | undefined;
    getLabel?: (node: T) => string;
    isExpandable?: (node: T) => boolean;
    draggable?: boolean | ((node: T) => boolean);
    canDrop?: (source: T, target: T | null, position: CoarTreeDropPosition) => boolean;
    acceptsFiles?: boolean;
    autoExpandDelay?: number;
    virtualize?: CoarTreeVirtualizeProp;
    /**
     * Opt into the built-in inline rename UI. With this on, `api.startRename(id)`
     * + `@rename` work and `<CoarTreeNodeLabel>` swaps to an `<input>` while the
     * row is renaming. Without it the rename context isn't provided and the
     * label component stays a plain `<span>` (back-compat for existing consumers).
     */
    renamable?: boolean;
  }>(),
  {
    builder: undefined,
    nodes: () => [],
    getId: undefined,
    getChildren: undefined,
    getLabel: undefined,
    isExpandable: undefined,
    draggable: false,
    canDrop: undefined,
    acceptsFiles: false,
    autoExpandDelay: 700,
    virtualize: false,
    renamable: false,
  },
);

const expandedModel = defineModel<Set<string>>('expanded', { default: () => new Set<string>() });
const selectedModel = defineModel<string | null>('selected', { default: null });

const emit = defineEmits<{
  (e: 'activate', node: T): void;
  (e: 'context-menu', node: T | null, ev: MouseEvent): void;
  (e: 'files-drop', payload: CoarTreeFilesDropEvent<T>): void;
  (e: 'node-move', payload: CoarTreeNodeMoveEvent<T>): void;
  (e: 'rename', payload: CoarTreeRenameEvent<T>): void;
  (e: 'rename-cancel', node: T): void;
}>();

const slots = defineSlots<{
  default(props: CoarTreeNodeSlotProps<T>): unknown;
  empty(): unknown;
}>();

provide(COAR_TREE_NODE_SLOT_KEY, (slotProps) => (slots.default?.(slotProps) ?? []) as VNode[]);

// ─── rename (inline edit) — owned by the tree, opt-in via `:renamable` ───
/**
 * `renamingId` is the row currently in edit mode; the `<CoarTreeNodeLabel>`
 * sub-component swaps its `<span>` for an `<input>` bound to `renameBuffer`
 * when its row id matches. Commit on Enter / blur, cancel on Escape.
 *
 * Conflict / validation is the CONSUMER's job — the tree emits `@rename`,
 * the consumer applies it (sync or async), and decides if the new name
 * sticks or the toast shows. Tree always closes its rename state on Enter
 * so a failure path is "consumer can call `api.startRename(id)` again to
 * retry" — keeps the tree event-driven and stateless re: conflicts.
 *
 * The 200-ms blur grace timer ignores the spurious blur that fires when a
 * context-menu overlay closes and restores focus to its trigger — without
 * it the menu-driven rename path would close the input before the user
 * can type a single character.
 */
const renamingId = ref<string | null>(null);
const renameBuffer = ref<string>('');
let renameFocusTime = 0;

function findRenamingNode(): T | null {
  if (!renamingId.value) return null;
  const row = visibleRows.value.find((r) => cfg.value.getId(r.node) === renamingId.value);
  return row?.node ?? null;
}

function commitRename() {
  const node = findRenamingNode();
  const newName = renameBuffer.value.trim();
  // Always clear state — let the consumer decide whether to re-open on
  // failure (via `api.startRename(id)`).
  renamingId.value = null;
  renameBuffer.value = '';
  if (!node) return;
  if (!newName) {
    emit('rename-cancel', node);
    return;
  }
  emit('rename', { node, newName });
}

function cancelRename() {
  const node = findRenamingNode();
  renamingId.value = null;
  renameBuffer.value = '';
  if (node) emit('rename-cancel', node);
}

const renameContext: CoarTreeRenameContext = {
  renamingId,
  buffer: renameBuffer,
  commit: commitRename,
  cancel: cancelRename,
  onFocus: () => {
    renameFocusTime = Date.now();
  },
  onBlur: () => {
    // Spurious blur from menu-overlay focus-restore — re-grab focus + ignore.
    if (Date.now() - renameFocusTime < 200) {
      const id = renamingId.value;
      if (!id) return;
      void nextTick(() => {
        const root = scrollEl.value ?? rootEl.value;
        const input = root?.querySelector<HTMLInputElement>(
          `[data-rename-id="${CSS.escape(id)}"]`,
        );
        input?.focus();
        input?.select();
      });
      return;
    }
    commitRename();
  },
};

provide(COAR_TREE_RENAME_KEY, renameContext);

// ─── effective config (dispatch between props and builder) ─────────────────
const cfg = computed(() => {
  if (props.builder) {
    const s = props.builder.state;
    return {
      nodes: toValue(s.nodes),
      getId: s.getId,
      getChildren: s.getChildren,
      getLabel: s.getLabel,
      isExpandable: s.isExpandable,
      draggable: toValue(s.draggable),
      canDrop: s.canDrop,
      acceptsFiles: toValue(s.acceptsFiles),
      autoExpandDelay: toValue(s.autoExpandDelay),
      virtualize: toValue(s.virtualize),
    };
  }
  return {
    nodes: props.nodes,
    getId: props.getId ?? (() => {
      throw new Error('<CoarTree> requires either :builder or :get-id.');
    }),
    getChildren: props.getChildren,
    getLabel: props.getLabel,
    isExpandable: props.isExpandable,
    draggable: props.draggable,
    canDrop: props.canDrop,
    acceptsFiles: props.acceptsFiles,
    autoExpandDelay: props.autoExpandDelay,
    virtualize: props.virtualize,
  };
});

// The builder is a typed handle to *refs* that are intended to be written
// through. `vue/no-mutating-props` sees `props.builder.state.x.value = v` and
// flags it as prop mutation, but the prop itself isn't being mutated — only
// the ref it points to. Pulling the builder into a local first satisfies the
// rule without changing semantics.
const expandedStore = computed<Set<string>>({
  get: () => (props.builder ? props.builder.state.expanded.value : expandedModel.value),
  set: (v) => {
    const b = props.builder;
    if (b) b.state.expanded.value = v;
    else expandedModel.value = v;
  },
});
const selectedStore = computed<string | null>({
  get: () => (props.builder ? props.builder.state.selected.value : selectedModel.value),
  set: (v) => {
    const b = props.builder;
    if (b) b.state.selected.value = v;
    else selectedModel.value = v;
  },
});

// ─── identity helpers ─────────────────────────────────────────────────────
function isExpandableOf(node: T): boolean {
  const fn = cfg.value.isExpandable;
  if (fn) return fn(node);
  const getChildren = cfg.value.getChildren;
  if (!getChildren) return false;
  return Array.isArray(getChildren(node));
}
function isDraggableOf(node: T): boolean {
  const d = cfg.value.draggable;
  if (typeof d === 'function') return d(node);
  return !!d;
}
function getChildrenOf(node: T): readonly T[] | null | undefined {
  return cfg.value.getChildren ? cfg.value.getChildren(node) : undefined;
}

// ─── flat visible-row list ─────────────────────────────────────────────────
/**
 * Each entry is one row that should be on screen given the current `expanded`
 * set. Pre-computed metadata (depth, parentId, posInSet/setSize) feeds both
 * rendering and keyboard nav, so neither has to walk the DOM at runtime.
 */
interface VisibleRow {
  node: T;
  depth: number;
  parentId: string | null;
  posInSet: number;
  setSize: number;
}
const visibleRows = computed<VisibleRow[]>(() => {
  const out: VisibleRow[] = [];
  const walk = (list: readonly T[], depth: number, parentId: string | null) => {
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      out.push({ node: n, depth, parentId, posInSet: i + 1, setSize: list.length });
      if (!isExpandableOf(n)) continue;
      if (!expandedStore.value.has(cfg.value.getId(n))) continue;
      const kids = getChildrenOf(n);
      if (kids && kids.length) walk(kids, depth + 1, cfg.value.getId(n));
    }
  };
  walk(cfg.value.nodes, 0, null);
  return out;
});

const focusedId = ref<string | null>(null);

watch(
  visibleRows,
  (list) => {
    if (!list.length) {
      focusedId.value = null;
      return;
    }
    const ids = new Set(list.map((r) => cfg.value.getId(r.node)));
    if (focusedId.value && ids.has(focusedId.value)) return;
    if (selectedStore.value && ids.has(selectedStore.value)) {
      focusedId.value = selectedStore.value;
      return;
    }
    focusedId.value = cfg.value.getId(list[0].node);
  },
  { immediate: true, flush: 'post' },
);

// ─── virtualization setup ────────────────────────────────────────────────
/**
 * Normalize the `virtualize` prop into a concrete config. `null` means
 * non-virtualized; an object means active. Defaults — `itemSize: 28`,
 * `overscan: 5` — match the row's natural pixel height (13px text + 6px
 * vertical padding + chevron). Consumers with richer slots should declare
 * an explicit `itemSize` to match what they actually render.
 */
const virtualOpts = computed<Required<CoarTreeVirtualOptions> | null>(() => {
  const v = cfg.value.virtualize;
  if (!v) return null;
  const opts = v === true ? {} : v;
  return {
    itemSize: opts.itemSize ?? 28,
    overscan: opts.overscan ?? 5,
  };
});
const isVirtual = computed(() => virtualOpts.value !== null);

const scrollEl = useTemplateRef<HTMLElement>('scrollEl');
const rootEl = useTemplateRef<HTMLDivElement>('rootEl');

// `useVirtualList` doesn't measure DOM — it works off `count` + `itemSize`
// and tracks the scroll element. When non-virtualized, the returned refs
// stay at safe defaults (count: 0 → empty virtualRows, totalSize: 0).
const virtualizer = useVirtualList({
  count: () => (isVirtual.value ? visibleRows.value.length : 0),
  itemSize: (index: number) => {
    const opts = virtualOpts.value;
    if (!opts) return 0;
    const size = opts.itemSize;
    return typeof size === 'function' ? size(index) : size;
  },
  overscan: () => virtualOpts.value?.overscan ?? 5,
  scrollElement: scrollEl,
});

/**
 * Visible-row slice the virtualizer is asking us to render, joined with the
 * underlying row metadata. Falls back to the full list in non-virtualized
 * mode — keeps a single template.
 */
const renderRows = computed(() => {
  if (!isVirtual.value) {
    return visibleRows.value.map((row) => ({ row, virtual: null as null | { start: number; size: number } }));
  }
  const rows = virtualizer.virtualRows.value;
  const flat = visibleRows.value;
  const out: { row: VisibleRow; virtual: { start: number; size: number } }[] = [];
  for (const v of rows) {
    const row = flat[v.index];
    if (row) out.push({ row, virtual: { start: v.start, size: v.size } });
  }
  return out;
});

// ─── DOM + state lookup helpers ──────────────────────────────────────────
function rowElById(id: string): HTMLElement | null {
  const root = scrollEl.value ?? rootEl.value;
  if (!root) return null;
  return root.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`);
}

function focusRow(id: string | null) {
  focusedId.value = id;
  if (!id) return;
  nextTick(() => {
    // In virtual mode the row might be outside the rendered window — scroll
    // it into view first, THEN focus after the next tick.
    if (isVirtual.value) {
      const idx = visibleRows.value.findIndex((r) => cfg.value.getId(r.node) === id);
      if (idx >= 0) virtualizer.scrollToIndex(idx, 'auto');
      nextTick(() => rowElById(id)?.focus());
    } else {
      rowElById(id)?.focus();
    }
  });
}

const isExpandedOf = (id: string) => expandedStore.value.has(id);
const isSelectedOf = (id: string) => selectedStore.value === id;
const isFocusedOf = (id: string) => focusedId.value === id;

// ─── builder ↔ component wiring ───────────────────────────────────────────
onMounted(() => {
  props.builder?._setFocusNodeImpl((id) => {
    const node = findNodeById(id);
    if (node) selectNode(node);
  });
});
onBeforeUnmount(() => {
  props.builder?._setFocusNodeImpl(null);
});

// ─── selection / activation ───────────────────────────────────────────────
function selectNode(node: T | null) {
  if (!node) return;
  const id = cfg.value.getId(node);
  selectedStore.value = id;
  focusRow(id);
}
function toggleExpand(node: T) {
  if (!isExpandableOf(node)) return;
  const id = cfg.value.getId(node);
  const next = new Set(expandedStore.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedStore.value = next;
}
function expandNode(node: T) {
  if (!isExpandableOf(node)) return;
  const id = cfg.value.getId(node);
  if (expandedStore.value.has(id)) return;
  const next = new Set(expandedStore.value);
  next.add(id);
  expandedStore.value = next;
}

function onRowClick(node: T, ev: MouseEvent) {
  if (ev.button === 0) selectNode(node);
}
function onRowDblClick(node: T) {
  fireActivate(node);
}
function onChevron(node: T) {
  toggleExpand(node);
}
function fireActivate(node: T) {
  emit('activate', node);
  props.builder?.state.onActivate?.(node);
}

// ─── context menu ─────────────────────────────────────────────────────────
const internalMenu = useContextMenu();
type ContextTarget = { kind: 'folder'; node: T } | { kind: 'leaf'; node: T } | { kind: 'viewport' };
const contextTarget = shallowRef<ContextTarget | null>(null);

const menuEntries = computed<readonly CoarTreeMenuEntry[]>(() => {
  const s = props.builder?.state;
  if (!s || !contextTarget.value) return [];
  switch (contextTarget.value.kind) {
    case 'folder':
      return s.folderMenu ? s.folderMenu(contextTarget.value.node) : [];
    case 'leaf':
      return s.leafMenu ? s.leafMenu(contextTarget.value.node) : [];
    case 'viewport':
      return s.viewportMenu ? s.viewportMenu() : [];
  }
  return [];
});

function handleContextMenu(node: T | null, ev: MouseEvent) {
  emit('context-menu', node, ev);
  const s = props.builder?.state;
  if (!s) return;

  if (node) {
    const isFolder = isExpandableOf(node);
    const eventHandler = isFolder ? s.onFolderContextMenu : s.onLeafContextMenu;
    if (eventHandler) {
      ev.preventDefault();
      eventHandler(node, ev);
      return;
    }
    const declarative = isFolder ? s.folderMenu : s.leafMenu;
    if (declarative) {
      contextTarget.value = isFolder ? { kind: 'folder', node } : { kind: 'leaf', node };
      internalMenu.open(ev);
    }
    return;
  }

  if (s.onViewportContextMenu) {
    ev.preventDefault();
    s.onViewportContextMenu(ev);
    return;
  }
  if (s.viewportMenu) {
    contextTarget.value = { kind: 'viewport' };
    internalMenu.open(ev);
  }
}

function onRowContextMenu(node: T, ev: MouseEvent) {
  // Deliberately do NOT call `selectNode` here. Right-clicking should open
  // the context menu without disturbing selection — otherwise consumers that
  // watch `selectedId` to drive side-effects (e.g. "open preview on click")
  // would mis-fire on every right-click and open a file the user only meant
  // to inspect via the menu. The node + event are forwarded via the emit /
  // builder handler, so consumers still know which row was right-clicked.
  handleContextMenu(node, ev);
}
function onBackgroundContextMenu(ev: MouseEvent) {
  if ((ev.target as HTMLElement).closest('.coar-tree-node__row')) return;
  handleContextMenu(null, ev);
}

function onMenuItemClick(entry: CoarTreeMenuEntry) {
  if (entry === 'divider') return;
  internalMenu.close();
  entry.onClick();
}

// ─── keyboard nav ─────────────────────────────────────────────────────────
const typeBuffer = ref('');
let typeBufferTimer: number | null = null;
function bumpTypeBuffer(ch: string) {
  typeBuffer.value = typeBuffer.value + ch.toLowerCase();
  if (typeBufferTimer) window.clearTimeout(typeBufferTimer);
  typeBufferTimer = window.setTimeout(() => {
    typeBuffer.value = '';
  }, 500);
}
function findByTypeAhead(): T | null {
  const getLabel = cfg.value.getLabel;
  if (!getLabel || !typeBuffer.value) return null;
  const list = visibleRows.value;
  const startIdx = focusedId.value
    ? list.findIndex((r) => cfg.value.getId(r.node) === focusedId.value)
    : -1;
  for (let i = 1; i <= list.length; i++) {
    const candidate = list[(startIdx + i) % list.length].node;
    const label = getLabel(candidate).toLowerCase();
    if (label.startsWith(typeBuffer.value)) return candidate;
  }
  return null;
}

function onRootKeydown(ev: KeyboardEvent) {
  const list = visibleRows.value;
  if (!list.length) return;
  const currentIdx = focusedId.value
    ? list.findIndex((r) => cfg.value.getId(r.node) === focusedId.value)
    : -1;
  const current = currentIdx >= 0 ? list[currentIdx] : null;

  // F2 starts rename on the focused row — but only when the focus is on a
  // tree row (not inside the rename input itself, which gets its own Enter /
  // Escape handlers). `props.renamable` gates the whole feature.
  if (ev.key === 'F2' && props.renamable && current && !renamingId.value) {
    const tgt = ev.target as HTMLElement | null;
    if (tgt && tgt.tagName !== 'INPUT' && tgt.tagName !== 'TEXTAREA') {
      ev.preventDefault();
      startRename(cfg.value.getId(current.node));
      return;
    }
  }

  switch (ev.key) {
    case 'ArrowDown': {
      ev.preventDefault();
      const next = list[Math.min(list.length - 1, currentIdx + 1)] ?? list[0];
      focusRow(cfg.value.getId(next.node));
      return;
    }
    case 'ArrowUp': {
      ev.preventDefault();
      const next = list[Math.max(0, currentIdx - 1)] ?? list[0];
      focusRow(cfg.value.getId(next.node));
      return;
    }
    case 'ArrowRight': {
      if (!current) return;
      ev.preventDefault();
      if (isExpandableOf(current.node) && !expandedStore.value.has(cfg.value.getId(current.node))) {
        expandNode(current.node);
      } else {
        const kids = getChildrenOf(current.node);
        if (kids && kids.length) focusRow(cfg.value.getId(kids[0]));
      }
      return;
    }
    case 'ArrowLeft': {
      if (!current) return;
      ev.preventDefault();
      if (isExpandableOf(current.node) && expandedStore.value.has(cfg.value.getId(current.node))) {
        toggleExpand(current.node);
      } else if (current.parentId) {
        // Data-model lookup, not DOM walk — works identically in flat and
        // virtualized mode.
        focusRow(current.parentId);
      }
      return;
    }
    case 'Home':
      ev.preventDefault();
      focusRow(cfg.value.getId(list[0].node));
      return;
    case 'End':
      ev.preventDefault();
      focusRow(cfg.value.getId(list[list.length - 1].node));
      return;
    case 'Enter':
      if (current) {
        ev.preventDefault();
        selectNode(current.node);
        fireActivate(current.node);
      }
      return;
    case ' ':
      if (current) {
        ev.preventDefault();
        if (isExpandableOf(current.node)) toggleExpand(current.node);
        else selectNode(current.node);
      }
      return;
    default:
      if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        bumpTypeBuffer(ev.key);
        const match = findByTypeAhead();
        if (match) focusRow(cfg.value.getId(match));
      }
  }
}

// ─── DnD state ────────────────────────────────────────────────────────────
const dragSourceId = ref<string | null>(null);
const dropTargetId = ref<string | null>(null);
const dropPosition = ref<CoarTreeDropPosition | null>(null);
const fileDropTargetId = ref<string | null>(null);
const rootFileDragDepth = ref(0);

let autoExpandTimer: number | null = null;
let autoExpandFor: string | null = null;
function clearAutoExpand() {
  if (autoExpandTimer) window.clearTimeout(autoExpandTimer);
  autoExpandTimer = null;
  autoExpandFor = null;
}
function scheduleAutoExpand(node: T) {
  const id = cfg.value.getId(node);
  if (autoExpandFor === id) return;
  clearAutoExpand();
  autoExpandFor = id;
  autoExpandTimer = window.setTimeout(() => {
    if (autoExpandFor === id) expandNode(node);
  }, cfg.value.autoExpandDelay);
}

function isInSubtree(root: T, targetId: string): boolean {
  if (cfg.value.getId(root) === targetId) return true;
  const kids = getChildrenOf(root);
  if (!kids) return false;
  for (const k of kids) if (isInSubtree(k, targetId)) return true;
  return false;
}
function findNodeById(id: string, list: readonly T[] = cfg.value.nodes): T | null {
  for (const n of list) {
    if (cfg.value.getId(n) === id) return n;
    const kids = getChildrenOf(n);
    if (kids) {
      const found = findNodeById(id, kids);
      if (found) return found;
    }
  }
  return null;
}

function clearDragState() {
  dragSourceId.value = null;
  dropTargetId.value = null;
  dropPosition.value = null;
  fileDropTargetId.value = null;
  rootFileDragDepth.value = 0;
  clearAutoExpand();
}

function fireNodeMove(payload: CoarTreeNodeMoveEvent<T>) {
  emit('node-move', payload);
  props.builder?.state.onNodeMove?.(payload);
}
function fireFilesDrop(payload: CoarTreeFilesDropEvent<T>) {
  emit('files-drop', payload);
  props.builder?.state.onFilesDrop?.(payload);
}

function onRowDragStart(node: T, ev: DragEvent) {
  if (!isDraggableOf(node)) {
    ev.preventDefault();
    return;
  }
  dragSourceId.value = cfg.value.getId(node);
  ev.dataTransfer?.setData(COAR_TREE_DRAG_MIME, cfg.value.getId(node));
  ev.dataTransfer?.setData('text/plain', cfg.value.getLabel?.(node) ?? cfg.value.getId(node));
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
}
function onRowDragEnd() {
  clearDragState();
}
function onRowDragOver(node: T, el: HTMLElement, ev: DragEvent) {
  const dt = ev.dataTransfer;
  if (!dt) return;

  if (isFileDrag(dt)) {
    if (cfg.value.acceptsFiles && isExpandableOf(node)) {
      ev.preventDefault();
      dt.dropEffect = 'copy';
      fileDropTargetId.value = cfg.value.getId(node);
      dropTargetId.value = null;
      dropPosition.value = null;
      scheduleAutoExpand(node);
    }
    return;
  }
  if (!dt.types.includes(COAR_TREE_DRAG_MIME)) return;
  if (!dragSourceId.value || dragSourceId.value === cfg.value.getId(node)) return;
  const source = findNodeById(dragSourceId.value);
  if (!source) return;
  if (isInSubtree(source, cfg.value.getId(node))) return;

  const rect = el.getBoundingClientRect();
  const pos = computeDropPosition(ev, rect, { expandable: isExpandableOf(node) });
  if (cfg.value.canDrop && !cfg.value.canDrop(source, node, pos)) return;

  ev.preventDefault();
  dt.dropEffect = 'move';
  dropTargetId.value = cfg.value.getId(node);
  dropPosition.value = pos;
  fileDropTargetId.value = null;
  if (pos === 'inside') scheduleAutoExpand(node);
  else clearAutoExpand();
}
function onRowDragLeave(node: T, ev: DragEvent) {
  const next = ev.relatedTarget as Node | null;
  const rowSel = `[data-node-id="${CSS.escape(cfg.value.getId(node))}"]`;
  if (next && (ev.currentTarget as HTMLElement).closest(rowSel)?.contains(next)) return;
  if (dropTargetId.value === cfg.value.getId(node)) {
    dropTargetId.value = null;
    dropPosition.value = null;
  }
  if (fileDropTargetId.value === cfg.value.getId(node)) {
    fileDropTargetId.value = null;
  }
  clearAutoExpand();
}
function onRowDrop(node: T, _el: HTMLElement, ev: DragEvent) {
  const dt = ev.dataTransfer;
  if (!dt) return;
  if (isFileDrag(dt)) {
    if (!cfg.value.acceptsFiles || !isExpandableOf(node)) return;
    if (!dt.files.length) return;
    ev.preventDefault();
    ev.stopPropagation();
    fireFilesDrop({ files: dt.files, target: node });
    clearDragState();
    return;
  }
  if (dragSourceId.value && dropTargetId.value === cfg.value.getId(node) && dropPosition.value) {
    const source = findNodeById(dragSourceId.value);
    if (source) {
      ev.preventDefault();
      ev.stopPropagation();
      fireNodeMove({ source, target: node, position: dropPosition.value });
    }
  }
  clearDragState();
}

// ─── root background drag ─────────────────────────────────────────────────
function onRootDragEnter(ev: DragEvent) {
  if (!isFileDrag(ev.dataTransfer) || !cfg.value.acceptsFiles) return;
  ev.preventDefault();
  rootFileDragDepth.value++;
}
function onRootDragOver(ev: DragEvent) {
  const dt = ev.dataTransfer;
  if (!dt) return;
  if (isFileDrag(dt) && cfg.value.acceptsFiles) {
    ev.preventDefault();
    dt.dropEffect = 'copy';
    return;
  }
  if (dt.types.includes(COAR_TREE_DRAG_MIME) && dragSourceId.value) {
    ev.preventDefault();
    dt.dropEffect = 'move';
  }
}
function onRootDragLeave(ev: DragEvent) {
  if (!isFileDrag(ev.dataTransfer)) return;
  rootFileDragDepth.value = Math.max(0, rootFileDragDepth.value - 1);
}
function onRootDrop(ev: DragEvent) {
  const dt = ev.dataTransfer;
  if (!dt) return;
  if (isFileDrag(dt) && cfg.value.acceptsFiles && dt.files.length) {
    ev.preventDefault();
    fireFilesDrop({ files: dt.files, target: null });
    clearDragState();
    return;
  }
  if (dt.types.includes(COAR_TREE_DRAG_MIME) && dragSourceId.value) {
    const source = findNodeById(dragSourceId.value);
    if (source) {
      ev.preventDefault();
      fireNodeMove({ source, target: null, position: 'inside' });
    }
    clearDragState();
  }
}

onBeforeUnmount(() => {
  if (typeBufferTimer) window.clearTimeout(typeBufferTimer);
  clearAutoExpand();
});

function startRename(id: string) {
  if (!props.renamable) return;
  const row = visibleRows.value.find((r) => cfg.value.getId(r.node) === id);
  if (!row) return;
  const initialName = cfg.value.getLabel ? cfg.value.getLabel(row.node) : '';
  // rAF so the input renders + focuses AFTER any open context-menu overlay
  // has finished its close + focus-restore animation. Setting renamingId
  // synchronously races with the overlay teardown and the input gets blur'd
  // out from under us before the user notices it.
  requestAnimationFrame(() => {
    renamingId.value = id;
    renameBuffer.value = initialName;
  });
}

defineExpose({
  focusNode(id: string) {
    focusRow(id);
  },
  /**
   * Enter inline-rename mode on `id`. No-op if `:renamable` isn't set or
   * the id isn't in the visible-row list. Use from context menu items,
   * keyboard shortcuts, etc. The rename input mounts + auto-focuses on
   * the next frame.
   */
  startRename,
});
</script>

<template>
  <div
    ref="rootEl"
    class="coar-tree"
    :class="{
      'coar-tree--file-drop': rootFileDragDepth > 0 && !fileDropTargetId,
      'coar-tree--virtual': isVirtual,
    }"
    tabindex="-1"
    @keydown="onRootKeydown"
    @contextmenu="onBackgroundContextMenu"
    @dragenter="onRootDragEnter"
    @dragover="onRootDragOver"
    @dragleave="onRootDragLeave"
    @drop="onRootDrop"
  >
    <!-- The role="tree" container holds the rows; in virtualized mode the
         spacer is the tree container, otherwise the outer scroll-or-static
         div carries it. Either way the children are role="treeitem". -->
    <div
      v-if="cfg.nodes.length"
      ref="scrollEl"
      class="coar-tree__scroll"
      :class="{ 'coar-tree__scroll--virtual': isVirtual }"
    >
      <div
        class="coar-tree__inner"
        role="tree"
        :style="isVirtual ? { height: `${virtualizer.totalSize.value}px`, position: 'relative' } : undefined"
      >
        <CoarTreeNode
          v-for="entry in renderRows"
          :key="cfg.getId(entry.row.node)"
          :node="entry.row.node"
          :node-id="cfg.getId(entry.row.node)"
          :depth="entry.row.depth"
          :is-expandable="isExpandableOf(entry.row.node)"
          :is-expanded="isExpandedOf(cfg.getId(entry.row.node))"
          :is-selected="isSelectedOf(cfg.getId(entry.row.node))"
          :is-focused="isFocusedOf(cfg.getId(entry.row.node))"
          :is-renaming="renamingId === cfg.getId(entry.row.node)"
          :draggable="isDraggableOf(entry.row.node)"
          :pos-in-set="entry.row.posInSet"
          :set-size="entry.row.setSize"
          :drop-indicator="dropTargetId === cfg.getId(entry.row.node) ? dropPosition : null"
          :file-drop-active="fileDropTargetId === cfg.getId(entry.row.node)"
          :style="
            entry.virtual
              ? { position: 'absolute', top: `${entry.virtual.start}px`, left: 0, right: 0, height: `${entry.virtual.size}px` }
              : undefined
          "
          @row-click="onRowClick"
          @row-dblclick="onRowDblClick"
          @row-context-menu="onRowContextMenu"
          @chevron-click="onChevron"
          @row-dragstart="onRowDragStart"
          @row-dragend="onRowDragEnd"
          @row-dragover="onRowDragOver"
          @row-dragleave="onRowDragLeave"
          @row-drop="onRowDrop"
        />
      </div>
    </div>
    <div v-else class="coar-tree__empty">
      <slot name="empty" />
    </div>

    <!-- Builder-driven internal context menu. -->
    <CoarContextMenu v-if="builder" :menu="internalMenu">
      <CoarMenu>
        <template v-for="(entry, i) in menuEntries" :key="i">
          <CoarMenuDivider v-if="entry === 'divider'" />
          <CoarMenuItem
            v-else
            :label="entry.label"
            :icon="entry.icon"
            :disabled="entry.disabled"
            :class="{ 'coar-tree__menu-item--danger': entry.danger }"
            @clicked="onMenuItemClick(entry)"
          />
        </template>
      </CoarMenu>
    </CoarContextMenu>
  </div>
</template>

<style scoped>
.coar-tree {
  position: relative;
  outline: none;
  display: flex;
  flex-direction: column;
  /* Fill the container in both block and flex layouts. Without `width: 100%`,
     as a flex-row child the tree would shrink to its intrinsic content width
     — which is 0 in virtualized mode because rows are absolutely positioned
     and contribute nothing to layout. `box-sizing` keeps any future padding
     consistent with the container's box. */
  width: 100%;
  /* `min-height: 100%` makes the tree fill the available vertical space when
     its content is shorter than its container. Without this, the empty area
     below the last row would not belong to the tree — drop listeners on
     `.coar-tree` wouldn't fire there, so dropping OS files in the gap would
     silently miss. Content taller than the container still scrolls normally;
     the min-height clamp doesn't fight `overflow: auto` on the inner scroll
     wrapper. */
  min-height: 100%;
  box-sizing: border-box;
}

.coar-tree__scroll {
  flex: 1;
  min-height: 0;
}
/* Virtualized mode owns its scroll viewport — pure overhead otherwise. */
.coar-tree__scroll--virtual {
  overflow: auto;
}

/* The inner element is `role="tree"` and holds the rows directly. In virtual
   mode this element receives an explicit `height` + `position: relative` so
   absolutely-positioned children stack correctly inside the spacer. */
.coar-tree__inner {
  padding: var(--coar-spacing-xs, 4px) 0;
}

.coar-tree__empty {
  padding: 12px;
  color: var(--coar-text-neutral-tertiary);
  font-size: var(--coar-body-small-base-size, 13px);
  text-align: center;
}

.coar-tree--file-drop::after {
  content: '';
  position: absolute;
  inset: var(--coar-spacing-xs, 4px);
  border: 2px dashed var(--coar-border-accent-primary, #2563eb);
  border-radius: var(--coar-radius-xl, 6px);
  pointer-events: none;
}

:deep(.coar-tree__menu-item--danger > button),
:deep(.coar-tree__menu-item--danger > .coar-menu-item) {
  color: var(--coar-text-semantic-error-bold, #dc2626);
}
</style>
