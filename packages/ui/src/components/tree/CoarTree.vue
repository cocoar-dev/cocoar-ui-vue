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
  type Ref,
  type VNode,
} from 'vue';
import CoarTreeNode from './CoarTreeNode.vue';
import CoarMenu from '../menu/CoarMenu.vue';
import CoarMenuItem from '../menu/CoarMenuItem.vue';
import CoarMenuDivider from '../menu/CoarMenuDivider.vue';
import CoarContextMenu from '../menu/CoarContextMenu.vue';
import { useContextMenu } from '../menu/useContextMenu';
import { useVirtualList } from '../../composables/useVirtualList';
import { setCoarDragImageFromElement, setCoarDragImageFromHtml } from '../../composables/useDragImage';
import { computeDropPosition, isFileDrag } from './tree-dnd';
import {
  COAR_TREE_DRAG_MIME,
  COAR_TREE_NODE_SLOT_KEY,
  COAR_TREE_RENAME_KEY,
  COAR_TREE_ROW_STATE_KEY,
  DEFAULT_TREE_LABELS,
  type CoarTreeDensity,
  type CoarTreeDropPosition,
  type CoarTreeFilesDropEvent,
  type CoarTreeLabels,
  type CoarTreeLoadChildrenContext,
  type CoarTreeLoadErrorEvent,
  type CoarTreeMenuEntry,
  type CoarTreeNodeMoveEvent,
  type CoarTreeNodeSlotProps,
  type CoarTreeRenameContext,
  type CoarTreeRenameEvent,
  type CoarTreeSelectEvent,
  type CoarTreeSelectionMode,
  type CoarTreeVirtualOptions,
  type CoarTreeVirtualizeProp,
} from './tree-types';
import {
  applyCheckToggle,
  computeIndeterminate,
  indexTree,
  reconcileChecked,
} from './internal/selection';
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
    /** Mark nodes non-interactive (no select/activate/check/keyboard-focus; `aria-disabled`). */
    isDisabled?: (node: T) => boolean;
    /**
     * Lazily fetch a node's children on first expand. The 2nd arg carries an
     * `AbortSignal` that fires if the folder collapses / leaves the tree. See
     * the builder's `loadChildren`.
     */
    loadChildren?: (node: T, ctx: CoarTreeLoadChildrenContext) => void | Promise<void>;
    /**
     * Max simultaneous in-flight `loadChildren` calls; extra ones queue. `0`
     * (default) = unlimited. Set a small number (e.g. 6) for rate-limited
     * backends so an expand-all / state-restore can't fan out unbounded.
     */
    maxConcurrentLoads?: number;
    draggable?: boolean | ((node: T) => boolean);
    canDrop?: (source: T, target: T | null, position: CoarTreeDropPosition) => boolean;
    /** Custom drag ghost for a node: return an `HTMLElement` or an HTML string (else the default row image). */
    getDragImage?: (node: T) => HTMLElement | string | null | undefined;
    /** Fire `activate` on a single click too (not only double-click / Enter). Default false. */
    activateOnClick?: boolean;
    acceptsFiles?: boolean;
    autoExpandDelay?: number;
    virtualize?: CoarTreeVirtualizeProp;
    /**
     * Selection behavior: `'single'` (default, `v-model:selected`), `'multiple'`
     * (`v-model:selectedIds`, Ctrl/Shift/Ctrl+A), or `'checkbox'` (per-row
     * tri-state checkbox, `v-model:checkedIds`, independent of the highlight).
     */
    selectionMode?: CoarTreeSelectionMode;
    /**
     * Checkbox mode only: when `true`, checks don't cascade to parent/children and
     * nothing is ever indeterminate. Default `false` (cascade + tri-state).
     */
    checkStrictly?: boolean;
    /** Row density (`xs`/`s`/`m`/`l`, default `m`). Sets the spacing CSS variables. */
    density?: CoarTreeDensity;
    /** Accessible name for the tree (`aria-label` on the `role="tree"` element). */
    ariaLabel?: string;
    /** Id of an external label element (`aria-labelledby` on the `role="tree"` element). */
    ariaLabelledby?: string;
    /** Override built-in UI / screen-reader strings for i18n. Unset fields use English defaults. */
    labels?: Partial<CoarTreeLabels>;
    /**
     * Search-hit ids. The tree exposes `isMatch` / `isMatchAncestor` to the slot
     * (for highlighting) and auto-expands the ancestors of every match so hits
     * are visible.
     */
    matchedIds?: Set<string>;
    /**
     * With `matchedIds` set, hide everything that isn't a match, an ancestor of a
     * match ("virtual parents" — kept for context, flagged `isMatchAncestor`), or
     * a descendant of a match. Off by default (highlight-only).
     */
    filter?: boolean;
    /**
     * Opt into the built-in inline rename UI. With this on, `api.startRename(id)`
     * + `@rename` work and `<CoarTreeNodeLabel>` swaps to an `<input>` while the
     * row is renaming. Without it the rename context isn't provided and the
     * label component stays a plain `<span>` (back-compat for existing consumers).
     */
    renamable?: boolean;
    /**
     * Suppress the built-in spinner the tree shows in the chevron while a node's
     * children lazily load (see `loadChildren`). Set this when you render your
     * own loading indicator from the `isLoading` slot prop — e.g. replacing the
     * row icon with a spinner.
     */
    hideLoadingSpinner?: boolean;
  }>(),
  {
    builder: undefined,
    nodes: () => [],
    getId: undefined,
    getChildren: undefined,
    getLabel: undefined,
    isExpandable: undefined,
    isDisabled: undefined,
    loadChildren: undefined,
    maxConcurrentLoads: 0,
    draggable: false,
    canDrop: undefined,
    getDragImage: undefined,
    activateOnClick: false,
    acceptsFiles: false,
    autoExpandDelay: 700,
    virtualize: false,
    selectionMode: 'single',
    checkStrictly: false,
    density: 'm',
    ariaLabel: undefined,
    ariaLabelledby: undefined,
    labels: undefined,
    matchedIds: undefined,
    filter: false,
    renamable: false,
    hideLoadingSpinner: false,
  },
);

const expandedModel = defineModel<Set<string>>('expanded', { default: () => new Set<string>() });
const selectedModel = defineModel<string | null>('selected', { default: null });
const selectedIdsModel = defineModel<Set<string>>('selectedIds', { default: () => new Set<string>() });
const checkedIdsModel = defineModel<Set<string>>('checkedIds', { default: () => new Set<string>() });

const emit = defineEmits<{
  (e: 'activate', node: T): void;
  (e: 'select', payload: CoarTreeSelectEvent<T>): void;
  (e: 'context-menu', node: T | null, ev: MouseEvent): void;
  (e: 'files-drop', payload: CoarTreeFilesDropEvent<T>): void;
  (e: 'node-move', payload: CoarTreeNodeMoveEvent<T>): void;
  (e: 'rename', payload: CoarTreeRenameEvent<T>): void;
  (e: 'rename-cancel', node: T): void;
  (e: 'load-error', payload: CoarTreeLoadErrorEvent<T>): void;
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
  const idx = idToIndex.value.get(renamingId.value);
  return idx === undefined ? null : (visibleRows.value[idx]?.node ?? null);
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
    props.builder?.state.onRenameCancel?.(node);
    return;
  }
  emit('rename', { node, newName });
  props.builder?.state.onRename?.({ node, newName });
}

function cancelRename() {
  const node = findRenamingNode();
  renamingId.value = null;
  renameBuffer.value = '';
  if (node) {
    emit('rename-cancel', node);
    props.builder?.state.onRenameCancel?.(node);
  }
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
      isDisabled: s.isDisabled,
      loadChildren: s.loadChildren,
      maxConcurrentLoads: toValue(s.maxConcurrentLoads),
      draggable: toValue(s.draggable),
      canDrop: s.canDrop,
      getDragImage: s.getDragImage,
      activateOnClick: toValue(s.activateOnClick),
      acceptsFiles: toValue(s.acceptsFiles),
      autoExpandDelay: toValue(s.autoExpandDelay),
      virtualize: toValue(s.virtualize),
      hideLoadingSpinner: toValue(s.hideLoadingSpinner),
      renamable: toValue(s.renamable),
      selectionMode: toValue(s.selectionMode),
      checkStrictly: toValue(s.checkStrictly),
      density: toValue(s.density),
      ariaLabel: toValue(s.ariaLabel),
      ariaLabelledby: toValue(s.ariaLabelledby),
      labels: toValue(s.labels),
      matchedIds: toValue(s.matchedIds),
      filter: toValue(s.filter),
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
    isDisabled: props.isDisabled,
    loadChildren: props.loadChildren,
    maxConcurrentLoads: props.maxConcurrentLoads,
    draggable: props.draggable,
    canDrop: props.canDrop,
    getDragImage: props.getDragImage,
    activateOnClick: props.activateOnClick,
    acceptsFiles: props.acceptsFiles,
    autoExpandDelay: props.autoExpandDelay,
    virtualize: props.virtualize,
    hideLoadingSpinner: props.hideLoadingSpinner,
    renamable: props.renamable,
    selectionMode: props.selectionMode,
    checkStrictly: props.checkStrictly,
    density: props.density,
    ariaLabel: props.ariaLabel,
    ariaLabelledby: props.ariaLabelledby,
    labels: props.labels,
    matchedIds: props.matchedIds,
    filter: props.filter,
  };
});

/** Effective rename-enabled flag (builder OR prop). */
const renamableOn = computed(() => !!cfg.value.renamable);

/** Default-merged i18n labels (chevron / spinner / announcer strings). */
const resolvedLabels = computed<CoarTreeLabels>(() => ({
  ...DEFAULT_TREE_LABELS,
  ...(cfg.value.labels ?? {}),
}));

// DEV-only nag: rendering a tree with zero rows + no `#empty` slot ships a
// silent blank pane to the user. The 500-ms grace lets async loaders (a
// store's `loadTree()`) populate before the warn fires — only consumers
// that genuinely persist in the empty-with-no-slot state get nagged. Warns
// once per mount. Production builds drop the whole block (Vite statically
// replaces `import.meta.env.DEV`).
if (import.meta.env?.DEV) {
  let warned = false;
  let pendingWarn: ReturnType<typeof setTimeout> | null = null;
  watch(
    () => ({ count: cfg.value.nodes.length, hasEmptySlot: !!slots.empty }),
    ({ count, hasEmptySlot }) => {
      if (warned) return;
      if (count > 0 || hasEmptySlot) {
        if (pendingWarn) {
          clearTimeout(pendingWarn);
          pendingWarn = null;
        }
        return;
      }
      if (pendingWarn) return;
      pendingWarn = setTimeout(() => {
        pendingWarn = null;
        if (warned) return;
        if (cfg.value.nodes.length === 0 && !slots.empty) {
          console.warn(
            '[CoarTree] Rendered with zero nodes and no `#empty` slot. The tree will appear as a blank pane. Provide a `<template #empty>` with an empty-state message, or confirm this is intentional.',
          );
          warned = true;
        }
      }, 500);
    },
    { immediate: true },
  );
  onBeforeUnmount(() => {
    if (pendingWarn) clearTimeout(pendingWarn);
  });
}

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
const selectedIdsStore = computed<Set<string>>({
  get: () => (props.builder ? props.builder.state.selectedIds.value : selectedIdsModel.value),
  set: (v) => {
    const b = props.builder;
    if (b) b.state.selectedIds.value = v;
    else selectedIdsModel.value = v;
  },
});
const checkedStore = computed<Set<string>>({
  get: () => (props.builder ? props.builder.state.checkedIds.value : checkedIdsModel.value),
  set: (v) => {
    const b = props.builder;
    if (b) b.state.checkedIds.value = v;
    else checkedIdsModel.value = v;
  },
});

// ─── selection mode ────────────────────────────────────────────────────────
const EMPTY_SET: ReadonlySet<string> = new Set();
const selMode = computed<CoarTreeSelectionMode>(() => cfg.value.selectionMode ?? 'single');
const checkboxMode = computed(() => selMode.value === 'checkbox');
const multiSelect = computed(
  () => selMode.value === 'multiple' || selMode.value === 'checkbox',
);
const strictCheck = computed(() => !!cfg.value.checkStrictly);

// Unified highlight set: single mirrors `selected`, multiple/checkbox use `selectedIds`.
const highlightedIds = computed<ReadonlySet<string>>(() =>
  selMode.value === 'single'
    ? selectedStore.value
      ? new Set([selectedStore.value])
      : EMPTY_SET
    : selectedIdsStore.value,
);

// Full loaded-tree index — cascade must see collapsed-but-loaded subtrees, so it
// can't reuse `visibleRows`. Built only in checkbox mode; null is pure overhead.
const loadedIndex = computed(() =>
  checkboxMode.value ? indexTree(cfg.value.nodes, cfg.value.getId, getChildrenOf) : null,
);
const indeterminateIds = computed<ReadonlySet<string>>(() =>
  checkboxMode.value && !strictCheck.value && loadedIndex.value
    ? computeIndeterminate(checkedStore.value, loadedIndex.value)
    : EMPTY_SET,
);
// Disabled ids among the visible rows (only visible rows render / take focus).
const disabledIds = computed<ReadonlySet<string>>(() => {
  if (!cfg.value.isDisabled) return EMPTY_SET;
  const s = new Set<string>();
  for (const row of visibleRows.value) if (isDisabledOf(row.node)) s.add(row.id);
  return s;
});

// ─── search / filter ──────────────────────────────────────────────────────
const matchedIdsSet = computed<ReadonlySet<string>>(() => cfg.value.matchedIds ?? EMPTY_SET);
// Ancestors-of-matches = not-matched nodes with a matched descendant — same shape
// as the indeterminate computation, reused here over the loaded tree.
const matchAncestorIds = computed<ReadonlySet<string>>(() =>
  matchedIdsSet.value.size
    ? computeIndeterminate(
        matchedIdsSet.value,
        indexTree(cfg.value.nodes, cfg.value.getId, getChildrenOf),
      )
    : EMPTY_SET,
);
// Filter mode (opt-in): hide everything that isn't a match, an ancestor of a
// match (the "virtual parents" / path), or a descendant of a match.
const filterActive = computed(() => !!cfg.value.filter && matchedIdsSet.value.size > 0);
/** match ∪ ancestors-of-match ∪ descendants-of-match — the rows to keep when filtering. */
function buildKeepSet(matched: ReadonlySet<string>): Set<string> {
  const keep = new Set<string>();
  // returns whether this node or a descendant matched
  const visit = (node: T, ancestorMatched: boolean): boolean => {
    const id = cfg.value.getId(node);
    const selfMatch = matched.has(id);
    let descMatch = false;
    const kids = getChildrenOf(node);
    if (kids && kids.length) {
      for (const k of kids) if (visit(k, ancestorMatched || selfMatch)) descMatch = true;
    }
    if (selfMatch || descMatch || ancestorMatched) keep.add(id);
    return selfMatch || descMatch;
  };
  for (const n of cfg.value.nodes) visit(n, false);
  return keep;
}
const keepSet = computed<Set<string> | null>(() =>
  filterActive.value ? buildKeepSet(matchedIdsSet.value) : null,
);

// Reveal matches: highlight mode expands ancestors of matches; filter mode expands
// the whole kept structure. Add-only (never collapses), so manual collapses survive.
watch([matchedIdsSet, filterActive], () => {
  const matched = matchedIdsSet.value;
  if (!matched.size) return;
  const next = new Set(expandedStore.value);
  let changed = false;
  const add = (id: string) => {
    if (!next.has(id)) {
      next.add(id);
      changed = true;
    }
  };
  if (filterActive.value && keepSet.value) {
    for (const id of keepSet.value) add(id); // kept folders → fully revealed (leaves are no-ops)
  } else {
    for (const id of matched) for (const a of ancestorPath(id)) add(a);
  }
  if (changed) expandedStore.value = next;
}, { immediate: true });

// Lazy inheritance: when children load under a checked folder, propagate the check
// down to them. `reconcileChecked` only ADDS inherited descendants, so it's safe to
// run on any tree change. Checkbox + cascade only.
watch(loadedIndex, (ix) => {
  if (!ix || strictCheck.value) return;
  const next = reconcileChecked(checkedStore.value, ix);
  if (next !== checkedStore.value) checkedStore.value = next;
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
  if (isDisabledOf(node)) return false;
  const d = cfg.value.draggable;
  if (typeof d === 'function') return d(node);
  return !!d;
}
function getChildrenOf(node: T): readonly T[] | null | undefined {
  return cfg.value.getChildren ? cfg.value.getChildren(node) : undefined;
}
function isDisabledOf(node: T): boolean {
  return cfg.value.isDisabled ? cfg.value.isDisabled(node) : false;
}

// ─── flat visible-row list ─────────────────────────────────────────────────
/**
 * Each entry is one row that should be on screen given the current `expanded`
 * set. Pre-computed metadata (depth, parentId, posInSet/setSize) feeds both
 * rendering and keyboard nav, so neither has to walk the DOM at runtime.
 */
interface VisibleRow {
  node: T;
  /** `getId(node)`, resolved once here so render + lookups never re-call it. */
  id: string;
  depth: number;
  parentId: string | null;
  posInSet: number;
  setSize: number;
  /** Resolved once during the walk — used by the template and to skip re-derivation per render. */
  isExpandable: boolean;
  draggable: boolean;
}
const visibleRows = computed<VisibleRow[]>(() => {
  const out: VisibleRow[] = [];
  const keep = keepSet.value; // non-null only in filter mode
  const walk = (list: readonly T[], depth: number, parentId: string | null) => {
    // When filtering, only kept siblings are visible — so posInSet / setSize
    // (ARIA) must count the kept siblings, not the full list.
    const rows = keep ? list.filter((n) => keep.has(cfg.value.getId(n))) : list;
    for (let i = 0; i < rows.length; i++) {
      const n = rows[i];
      const id = cfg.value.getId(n);
      const expandable = isExpandableOf(n);
      out.push({
        node: n,
        id,
        depth,
        parentId,
        posInSet: i + 1,
        setSize: rows.length,
        isExpandable: expandable,
        draggable: isDraggableOf(n),
      });
      if (!expandable) continue;
      if (!expandedStore.value.has(id)) continue;
      const kids = getChildrenOf(n);
      if (kids && kids.length) walk(kids, depth + 1, id);
    }
  };
  walk(cfg.value.nodes, 0, null);
  return out;
});

/**
 * `id → index into visibleRows`, rebuilt only when the visible-row list
 * changes (same trigger as the structural DFS). Turns every "where is this id?"
 * lookup — keyboard nav, type-ahead start, focusRow's scroll target, rename
 * lookup, focus validation — from an O(n) `findIndex`/`find` into an O(1) Map
 * read. At 100k visible rows that's millions of comparisons per keystroke vs.
 * a single hash lookup.
 */
const idToIndex = computed(() => {
  const m = new Map<string, number>();
  const list = visibleRows.value;
  // First-wins on duplicate ids, matching the old find/findIndex semantics
  // (duplicate ids are unsupported anyway — they break Vue's `:key` uniqueness).
  for (let i = 0; i < list.length; i++) {
    const id = list[i].id;
    if (!m.has(id)) m.set(id, i);
  }
  return m;
});

const focusedId = ref<string | null>(null);

watch(
  visibleRows,
  (list, prev) => {
    if (!list.length) {
      focusedId.value = null;
      return;
    }
    const ids = idToIndex.value;
    if (focusedId.value && ids.has(focusedId.value)) return;
    // Focused row was removed (e.g. delete): move to the row now occupying its
    // old slot (its next sibling), else the previous one, else a parent — NOT
    // back to the top, which is jarring when deleting deep in a long tree.
    if (focusedId.value && prev) {
      const oldIdx = prev.findIndex((r) => r.id === focusedId.value);
      if (oldIdx >= 0) {
        const oldParent = prev[oldIdx].parentId;
        const at = list[Math.min(oldIdx, list.length - 1)];
        if (at && !isDisabledOf(at.node)) {
          focusedId.value = at.id;
          return;
        }
        if (oldParent && ids.has(oldParent)) {
          focusedId.value = oldParent;
          return;
        }
      }
    }
    if (selectedStore.value && ids.has(selectedStore.value)) {
      focusedId.value = selectedStore.value;
      return;
    }
    focusedId.value = list[0].id;
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

// DEV-only: warn when a large tree renders WITHOUT virtualization. The naive
// path mounts one full component per visible row, so an un-virtualized tree
// past a few hundred rows janks or freezes on render and on expand.
// Virtualization is opt-in (it needs a bounded-height scroll container), so we
// nudge rather than auto-enable. Warns once per mount; stripped from prod.
if (import.meta.env?.DEV) {
  let warnedVirtual = false;
  watch(
    () => (isVirtual.value ? 0 : visibleRows.value.length),
    (count) => {
      if (warnedVirtual || isVirtual.value || count <= 300) return;
      warnedVirtual = true;
      console.warn(
        `[CoarTree] Rendering ${count} rows without virtualization. Each row mounts a full component, so large trees jank or freeze on render and expand. Enable it — \`builder.virtualize({ itemSize: 28 })\` or \`:virtualize="{ itemSize: 28 }"\` — inside a bounded-height container. (Shown once; DEV only.)`,
      );
    },
    { immediate: true },
  );
}

const scrollEl = useTemplateRef<HTMLElement>('scrollEl');
const rootEl = useTemplateRef<HTMLDivElement>('rootEl');

// `useVirtualList` doesn't measure DOM — it works off `count` + `itemSize`
// and tracks the scroll element. When non-virtualized, the returned refs
// stay at safe defaults (count: 0 → empty virtualRows, totalSize: 0).
const virtualizer = useVirtualList({
  count: () => (isVirtual.value ? visibleRows.value.length : 0),
  // Pass the raw size THROUGH as a getter: a number takes useVirtualList's O(1)
  // constant fastpath; a per-index `(i) => number` takes its offset-table path.
  // Returning the value (not calling it per-index here) is what lets the
  // per-index form actually reach the table path instead of being read once
  // with no index — which would collapse it to a single (wrong) size.
  itemSize: () => virtualOpts.value?.itemSize ?? 28,
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
      const idx = idToIndex.value.get(id) ?? -1;
      if (idx >= 0) virtualizer.scrollToIndex(idx, 'auto');
      nextTick(() => rowElById(id)?.focus());
    } else {
      rowElById(id)?.focus();
    }
  });
}

// ─── lazy children loading ────────────────────────────────────────────────
/**
 * When `loadChildren` is set, an expanded node with no loaded children
 * (`getChildren` returns null/undefined) triggers a fetch ONCE. We track which
 * nodes are loading / errored / already-attempted so each row can show a spinner
 * or a retry and so a node is never auto-loaded twice. The consumer attaches the
 * fetched children to its own `nodes` (a NEW root reference, or a deeply-reactive
 * `nodes`); the tree stops asking once `getChildren` returns an array
 * (`[]` counts as loaded-but-empty).
 */
const loadingIds = ref<Set<string>>(new Set());
const erroredIds = ref<Set<string>>(new Set());
// Nodes a load has been *started* for since they were last expanded. Gates the
// structural watcher so an unrelated `nodes` change can't auto-retry a node that
// already attempted-and-settled — retry stays explicit (`reloadChildren`) or via
// collapse → re-expand (which drops the marker in `pruneTracking`).
const attemptedIds = ref<Set<string>>(new Set());

function childrenLoaded(node: T): boolean {
  return Array.isArray(getChildrenOf(node));
}
function removeFromSet(set: Ref<Set<string>>, id: string) {
  if (!set.value.has(id)) return;
  const next = new Set(set.value);
  next.delete(id);
  set.value = next;
}
function fireLoadError(payload: CoarTreeLoadErrorEvent<T>) {
  emit('load-error', payload);
  props.builder?.state.onLoadError?.(payload);
}
// Concurrency-bounded loader with cancellation. Each in-flight load owns an
// AbortController; collapsing a folder or removing it from the tree aborts the
// signal (so a consumer's fetch can bail) and suppresses the settle so a
// no-longer-relevant load can't flip the row to loaded/errored.
const loadControllers = new Map<string, AbortController>();
const loadQueue: { node: T; force: boolean }[] = [];
const maxConcurrent = computed(() => {
  const n = cfg.value.maxConcurrentLoads;
  return n && n > 0 ? n : Infinity;
});

function pumpQueue() {
  while (loadQueue.length && loadControllers.size < maxConcurrent.value) {
    const next = loadQueue.shift() as { node: T; force: boolean };
    startLoad(next.node, next.force);
  }
}
function settleLoad(id: string, error: unknown, controller: AbortController) {
  loadControllers.delete(id);
  // Aborted (folder collapsed / node gone) → leave tracking to abortLoad, stay silent.
  if (!controller.signal.aborted) {
    removeFromSet(loadingIds, id);
    if (error !== undefined) {
      erroredIds.value = new Set(erroredIds.value).add(id);
      const node = findNodeById(id);
      if (node) {
        fireLoadError({ node, error });
        announce(resolvedLabels.value.loadError(labelOf(node)));
      }
    }
  }
  pumpQueue();
}
function startLoad(node: T, force = false) {
  const loader = cfg.value.loadChildren;
  if (!loader) return;
  const id = cfg.value.getId(node);
  if (loadingIds.value.has(id) || loadControllers.has(id)) return; // in flight
  if (!force && childrenLoaded(node)) return; // already have data
  if (loadQueue.some((q) => cfg.value.getId(q.node) === id)) return; // already queued
  if (loadControllers.size >= maxConcurrent.value) {
    loadQueue.push({ node, force }); // over the concurrency cap — wait our turn
    return;
  }
  const controller = new AbortController();
  loadControllers.set(id, controller);
  loadingIds.value = new Set(loadingIds.value).add(id);
  attemptedIds.value = new Set(attemptedIds.value).add(id);
  removeFromSet(erroredIds, id);
  // `Promise.resolve().then(...)` so a synchronous throw in `loader` is caught too.
  Promise.resolve()
    .then(() => loader(node, { signal: controller.signal }))
    .then(
      () => settleLoad(id, undefined, controller),
      (error) => settleLoad(id, error ?? new Error('loadChildren rejected'), controller),
    );
}
function abortLoad(id: string) {
  const c = loadControllers.get(id);
  if (c) {
    c.abort();
    loadControllers.delete(id);
  }
  removeFromSet(loadingIds, id);
  const qi = loadQueue.findIndex((q) => cfg.value.getId(q.node) === id);
  if (qi >= 0) loadQueue.splice(qi, 1);
  pumpQueue();
}
function reloadChildren(id: string) {
  const node = findNodeById(id);
  if (node) startLoad(node, true);
}

/**
 * Housekeeping run before each load scan: drop `attempted` markers for collapsed
 * nodes (so collapse → re-expand retries) and loading/errored ids for nodes that
 * have left the tree (prevents an unbounded Set leak + a phantom spinner/error if
 * the same id is later re-added). O(tracked); the gone-check only walks when a
 * set is non-empty, which it usually isn't.
 */
function pruneTracking() {
  if (attemptedIds.value.size) {
    let changed = false;
    const next = new Set(attemptedIds.value);
    for (const id of next) {
      if (!expandedStore.value.has(id)) {
        next.delete(id);
        changed = true;
      }
    }
    if (changed) attemptedIds.value = next;
  }
  for (const set of [loadingIds, erroredIds]) {
    if (!set.value.size) continue;
    let changed = false;
    const next = new Set(set.value);
    for (const id of next) {
      if (!findNodeById(id)) {
        next.delete(id);
        changed = true;
      }
    }
    if (changed) set.value = next;
  }
}

// Trigger loads for every expanded-but-unloaded-and-not-yet-attempted expandable
// row — one path covers chevron, keyboard, auto-expand-on-drag, the api, and
// initial `expanded`. O(visible) per expand / data change; free when unused.
watch(
  [expandedStore, () => cfg.value.nodes],
  () => {
    // Abort loads whose folder collapsed or left the tree (before scanning for new ones).
    if (loadControllers.size) {
      for (const id of [...loadControllers.keys()]) {
        if (!expandedStore.value.has(id) || !findNodeById(id)) abortLoad(id);
      }
    }
    if (!cfg.value.loadChildren) return;
    pruneTracking();
    for (const row of visibleRows.value) {
      if (
        row.isExpandable &&
        expandedStore.value.has(row.id) &&
        !loadingIds.value.has(row.id) &&
        !attemptedIds.value.has(row.id) &&
        !childrenLoaded(row.node)
      ) {
        startLoad(row.node);
      }
    }
  },
  { immediate: true },
);

// Cancel everything still in flight when the tree unmounts.
onBeforeUnmount(() => {
  for (const c of loadControllers.values()) c.abort();
  loadControllers.clear();
  loadQueue.length = 0;
});

// ─── builder ↔ component wiring ───────────────────────────────────────────
onMounted(() => {
  props.builder?._bindImpls({
    focusNode: (id) => focusRow(id),
    selectNode: (id) => selectNode(findNodeById(id), 'api'),
    reloadChildren,
    startRename,
    expandAll,
    collapseAll,
    expandTo,
    revealNode,
    getNode: (id) => findNodeById(id),
    moveNode,
  });
});
onBeforeUnmount(() => {
  props.builder?._bindImpls(null);
});

// ─── selection / activation ───────────────────────────────────────────────
// Anchor for Shift-range selection — the last row clicked/selected without Shift.
const selectionAnchorId = ref<string | null>(null);

/**
 * Emit `select` + builder `onSelect`. `ids` is the just-computed selection set —
 * passed in rather than re-read, since the v-model round-trip hasn't flushed yet.
 */
function fireSelect(primaryId: string | null, ids: Iterable<string>, via: 'user' | 'api') {
  const node = primaryId ? findNodeById(primaryId) : null;
  const payload: CoarTreeSelectEvent<T> = { node, ids: [...ids], via };
  emit('select', payload);
  props.builder?.state.onSelect?.(payload);
}

/**
 * Replace the highlight selection with a single node (Enter, programmatic
 * `selectNode`, plain click in single mode). Mode-aware: writes `selected` in
 * single mode, `selectedIds` otherwise.
 */
function selectNode(node: T | null, via: 'user' | 'api' = 'user') {
  if (!node || isDisabledOf(node)) return;
  const id = cfg.value.getId(node);
  if (selMode.value === 'single') selectedStore.value = id;
  else selectedIdsStore.value = new Set([id]);
  selectionAnchorId.value = id;
  focusRow(id);
  fireSelect(id, [id], via);
}

/** Click-driven selection honoring Ctrl/Cmd-toggle and Shift-range in multi modes. */
function handleRowSelect(node: T, ev: MouseEvent) {
  if (isDisabledOf(node)) return;
  const id = cfg.value.getId(node);
  if (!multiSelect.value) {
    selectNode(node);
    return;
  }
  const additive = ev.ctrlKey || ev.metaKey;
  const map = idToIndex.value;
  const list = visibleRows.value;
  if (ev.shiftKey && selectionAnchorId.value && map.has(selectionAnchorId.value)) {
    const from = map.get(selectionAnchorId.value) as number;
    const to = map.get(id) ?? from;
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    const range = new Set<string>(additive ? selectedIdsStore.value : []);
    for (let i = lo; i <= hi; i++) range.add(list[i].id);
    selectedIdsStore.value = range;
    focusRow(id); // anchor unchanged across a Shift-range
    fireSelect(id, range, 'user');
    return;
  }
  if (additive) {
    const next = new Set(selectedIdsStore.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIdsStore.value = next;
    selectionAnchorId.value = id;
    focusRow(id);
    fireSelect(id, next, 'user');
    return;
  }
  const single = new Set([id]);
  selectedIdsStore.value = single;
  selectionAnchorId.value = id;
  focusRow(id);
  fireSelect(id, single, 'user');
}

/** Extend the highlight selection to `id` (Shift+Arrow). Keeps the anchor. */
function extendSelectionTo(id: string) {
  const next = new Set(selectedIdsStore.value);
  if (focusedId.value) next.add(focusedId.value);
  next.add(id);
  selectedIdsStore.value = next;
  fireSelect(id, next, 'user');
}

/** Toggle a row's checkbox (checkbox mode). Cascades unless `checkStrictly`. */
function toggleCheck(node: T, value?: boolean) {
  if (!checkboxMode.value || isDisabledOf(node)) return;
  const id = cfg.value.getId(node);
  const target = value ?? !checkedStore.value.has(id);
  if (strictCheck.value) {
    const next = new Set(checkedStore.value);
    if (target) next.add(id);
    else next.delete(id);
    checkedStore.value = next;
    return;
  }
  const ix = loadedIndex.value;
  if (!ix) return;
  checkedStore.value = applyCheckToggle(checkedStore.value, id, target, ix);
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

// ─── imperative convenience (api + template ref) ──────────────────────────
/** Expand every expandable, currently-loaded node. Lazy folders not yet loaded stay collapsed. */
function expandAll() {
  const next = new Set(expandedStore.value);
  const walk = (list: readonly T[]) => {
    for (const n of list) {
      if (isExpandableOf(n)) next.add(cfg.value.getId(n));
      const kids = getChildrenOf(n);
      if (kids && kids.length) walk(kids);
    }
  };
  walk(cfg.value.nodes);
  expandedStore.value = next;
}
function collapseAll() {
  expandedStore.value = new Set();
}
/** Root→parent ancestor ids of `id` from the loaded tree (empty if root or not found). */
function ancestorPath(id: string): string[] {
  const path: string[] = [];
  const search = (list: readonly T[], acc: string[]): boolean => {
    for (const n of list) {
      const nid = cfg.value.getId(n);
      if (nid === id) {
        path.push(...acc);
        return true;
      }
      const kids = getChildrenOf(n);
      if (kids && kids.length && search(kids, [...acc, nid])) return true;
    }
    return false;
  };
  search(cfg.value.nodes, []);
  return path;
}
/** Expand all loaded ancestors of `id` so its row becomes visible. */
function expandTo(id: string) {
  const anc = ancestorPath(id);
  if (!anc.length) return;
  const next = new Set(expandedStore.value);
  for (const a of anc) next.add(a);
  expandedStore.value = next;
}
/** Scroll a node into view without touching focus or selection. */
function revealNode(id: string) {
  expandTo(id);
  void nextTick(() => {
    if (isVirtual.value) {
      const idx = idToIndex.value.get(id) ?? -1;
      if (idx >= 0) virtualizer.scrollToIndex(idx, 'auto');
    } else {
      rowElById(id)?.scrollIntoView({ block: 'nearest' });
    }
  });
}

function onRowClick(node: T, ev: MouseEvent) {
  if (ev.button !== 0) return;
  handleRowSelect(node, ev);
  // Opt-in single-click activation (no modifier — Ctrl/Shift are multi-select gestures).
  if (cfg.value.activateOnClick && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) fireActivate(node);
}
function onRowCheckToggle(node: T) {
  toggleCheck(node);
}
function onRowRetry(node: T) {
  reloadChildren(cfg.value.getId(node));
}
function onRowDblClick(node: T) {
  fireActivate(node);
}
function onChevron(node: T) {
  toggleExpand(node);
}
function fireActivate(node: T) {
  if (isDisabledOf(node)) return;
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
  const startIdx = focusedId.value ? (idToIndex.value.get(focusedId.value) ?? -1) : -1;
  for (let i = 1; i <= list.length; i++) {
    const candidate = list[(startIdx + i) % list.length].node;
    if (isDisabledOf(candidate)) continue;
    const label = getLabel(candidate).toLowerCase();
    if (label.startsWith(typeBuffer.value)) return candidate;
  }
  return null;
}

/** Nearest enabled row index from `from` walking in `dir`, or `from` if none. */
function nextEnabledIndex(from: number, dir: 1 | -1): number {
  const list = visibleRows.value;
  for (let i = from + dir; i >= 0 && i < list.length; i += dir) {
    if (!isDisabledOf(list[i].node)) return i;
  }
  return from;
}
/** First (dir 1) or last (dir -1) enabled row index, or -1 if all disabled. */
function edgeEnabledIndex(dir: 1 | -1): number {
  const list = visibleRows.value;
  for (let i = dir === 1 ? 0 : list.length - 1; i >= 0 && i < list.length; i += dir) {
    if (!isDisabledOf(list[i].node)) return i;
  }
  return -1;
}
/** True when the tree renders right-to-left (inverts the expand/collapse arrows). */
function isRtl(): boolean {
  const el = rootEl.value;
  return !!el && typeof getComputedStyle === 'function' && getComputedStyle(el).direction === 'rtl';
}
/** Rows per PageUp/PageDown step — from the viewport height, or a fixed fallback. */
function pageSize(): number {
  const el = scrollEl.value;
  const rowH = (typeof virtualOpts.value?.itemSize === 'number' ? virtualOpts.value.itemSize : 28) || 28;
  if (el && el.clientHeight) return Math.max(1, Math.floor(el.clientHeight / rowH));
  return 10;
}
/** ArrowRight (LTR): expand a collapsed folder, else descend to the first child. */
function arrowExpandOrInto(cur: VisibleRow) {
  if (cur.isExpandable && !expandedStore.value.has(cur.id)) {
    expandNode(cur.node);
  } else {
    const kids = getChildrenOf(cur.node);
    if (kids && kids.length) focusRow(cfg.value.getId(kids[0]));
  }
}
/** ArrowLeft (LTR): collapse an expanded folder, else move focus to the parent. */
function arrowCollapseOrOut(cur: VisibleRow) {
  if (cur.isExpandable && expandedStore.value.has(cur.id)) {
    toggleExpand(cur.node);
  } else if (cur.parentId) {
    focusRow(cur.parentId);
  }
}

function onRootKeydown(ev: KeyboardEvent) {
  const list = visibleRows.value;
  if (!list.length) return;
  const currentIdx = focusedId.value ? (idToIndex.value.get(focusedId.value) ?? -1) : -1;
  const current = currentIdx >= 0 ? list[currentIdx] : null;

  // F2 starts rename on the focused row — but only when the focus is on a
  // tree row (not inside the rename input itself, which gets its own Enter /
  // Escape handlers). `props.renamable` gates the whole feature.
  if (ev.key === 'F2' && renamableOn.value && current && !renamingId.value) {
    const tgt = ev.target as HTMLElement | null;
    if (tgt && tgt.tagName !== 'INPUT' && tgt.tagName !== 'TEXTAREA') {
      ev.preventDefault();
      startRename(current.id);
      return;
    }
  }

  // Ctrl/Cmd+A → select every visible row (multiple / checkbox highlight).
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'a' || ev.key === 'A') && multiSelect.value) {
    ev.preventDefault();
    const all = new Set(list.filter((r) => !isDisabledOf(r.node)).map((r) => r.id));
    selectedIdsStore.value = all;
    fireSelect(focusedId.value, all, 'user');
    return;
  }

  // Accessible keyboard move: Ctrl/Cmd+X grab, Ctrl/Cmd+V drop, Escape cancel.
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'x' || ev.key === 'X') && current && isDraggableOf(current.node)) {
    ev.preventDefault();
    grabbedId.value = current.id;
    announce(resolvedLabels.value.pickedUp(labelOf(current.node)));
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'v' || ev.key === 'V') && grabbedId.value && current) {
    ev.preventDefault();
    const grabbed = findNodeById(grabbedId.value);
    const movedLabel = grabbed ? labelOf(grabbed) : 'item';
    const pos: CoarTreeDropPosition = current.isExpandable ? 'inside' : 'after';
    const ok = moveNode(grabbedId.value, current.id, pos);
    announce(
      ok
        ? resolvedLabels.value.moved(movedLabel, labelOf(current.node), pos)
        : resolvedLabels.value.moveBlocked(movedLabel),
    );
    grabbedId.value = null;
    return;
  }
  if (ev.key === 'Escape' && grabbedId.value) {
    ev.preventDefault();
    grabbedId.value = null;
    announce(resolvedLabels.value.moveCancelled);
    return;
  }

  switch (ev.key) {
    case 'ArrowDown': {
      ev.preventDefault();
      const next = list[nextEnabledIndex(currentIdx, 1)] ?? list[currentIdx] ?? list[0];
      if (ev.shiftKey && multiSelect.value) extendSelectionTo(next.id);
      focusRow(next.id);
      return;
    }
    case 'ArrowUp': {
      ev.preventDefault();
      const from = currentIdx < 0 ? list.length : currentIdx;
      const next = list[nextEnabledIndex(from, -1)] ?? list[currentIdx] ?? list[0];
      if (ev.shiftKey && multiSelect.value) extendSelectionTo(next.id);
      focusRow(next.id);
      return;
    }
    case 'ArrowRight': {
      if (!current) return;
      ev.preventDefault();
      // RTL inverts: ArrowRight collapses / moves out. Data-model walk, so it
      // works identically in flat and virtualized mode.
      (isRtl() ? arrowCollapseOrOut : arrowExpandOrInto)(current);
      return;
    }
    case 'ArrowLeft': {
      if (!current) return;
      ev.preventDefault();
      (isRtl() ? arrowExpandOrInto : arrowCollapseOrOut)(current);
      return;
    }
    case 'PageDown': {
      ev.preventDefault();
      let idx = Math.min(list.length - 1, (currentIdx < 0 ? 0 : currentIdx) + pageSize());
      if (isDisabledOf(list[idx].node)) idx = nextEnabledIndex(idx, -1);
      if (idx >= 0 && list[idx]) focusRow(list[idx].id);
      return;
    }
    case 'PageUp': {
      ev.preventDefault();
      let idx = Math.max(0, (currentIdx < 0 ? 0 : currentIdx) - pageSize());
      if (isDisabledOf(list[idx].node)) idx = nextEnabledIndex(idx, 1);
      if (idx >= 0 && list[idx]) focusRow(list[idx].id);
      return;
    }
    case '*': {
      // Expand every expandable sibling at the focused row's level (APG).
      ev.preventDefault();
      if (current) {
        const next = new Set(expandedStore.value);
        for (const row of list) {
          if (row.parentId === current.parentId && row.isExpandable) next.add(row.id);
        }
        expandedStore.value = next;
      }
      return;
    }
    case 'Home': {
      ev.preventDefault();
      const i = edgeEnabledIndex(1);
      if (i >= 0) focusRow(list[i].id);
      return;
    }
    case 'End': {
      ev.preventDefault();
      const i = edgeEnabledIndex(-1);
      if (i >= 0) focusRow(list[i].id);
      return;
    }
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
        if (checkboxMode.value) toggleCheck(current.node);
        else if (isExpandableOf(current.node)) toggleExpand(current.node);
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
// The dragged node, snapshotted at dragstart. Used only for the advisory
// `canDrop` gate during `dragover` (keeps it O(1) — no per-event tree walk).
// The authoritative source emitted on drop is re-resolved live via `findNodeById`.
const dragSourceNode = shallowRef<T | null>(null);
const dropTargetId = ref<string | null>(null);
const dropPosition = ref<CoarTreeDropPosition | null>(null);
const fileDropTargetId = ref<string | null>(null);
const rootFileDragDepth = ref(0);

// Per-row reactive state, provided to every <CoarTreeNode> so each derives its
// own selected/focused/expanded/renaming/drop flags from its id. The parent
// template therefore never reads these refs, so a selection / focus / drag-over
// change re-renders only the rows whose flag actually flips — not the whole list.
const hideLoadingSpinnerRef = computed(() => !!cfg.value.hideLoadingSpinner);
provide(COAR_TREE_ROW_STATE_KEY, {
  selectedIds: highlightedIds,
  checkedIds: checkedStore,
  indeterminateIds,
  checkboxMode,
  matchedIds: matchedIdsSet,
  matchAncestorIds,
  disabledIds,
  focusedId,
  expandedIds: expandedStore,
  renamingId,
  dropTargetId,
  dropPosition,
  fileDropTargetId,
  loadingIds,
  erroredIds,
  hideLoadingSpinner: hideLoadingSpinnerRef,
  labels: resolvedLabels,
});

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

// Would dropping the dragged source onto `targetId` create a cycle — i.e. is
// `targetId` the source itself or somewhere inside its subtree? Walks UP the
// precomputed `parentId` chain from the target: O(depth) (≤ the tree's nesting
// depth), read from the LIVE `visibleRows`, so it stays correct even if `nodes`
// mutates mid-drag. Cheaper and fresher than the old walk-DOWN `isInSubtree`
// (O(subtree), and it needed the source node resolved via an O(n) `findNodeById`
// on every `dragover`).
function isDescendantOfSource(targetId: string, sourceId: string): boolean {
  const map = idToIndex.value;
  const rows = visibleRows.value;
  let cur: string | null = targetId;
  while (cur !== null) {
    if (cur === sourceId) return true;
    const idx = map.get(cur);
    if (idx === undefined) return false;
    cur = rows[idx].parentId;
  }
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
  dragSourceNode.value = null;
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

// ─── accessible move (keyboard + imperative) ──────────────────────────────
/** Node "grabbed" for a keyboard cut/paste move (Ctrl+X … Ctrl+V). */
const grabbedId = ref<string | null>(null);
/** Polite screen-reader announcer for drag/move state — kept off-screen in the template. */
const liveMessage = ref('');
function announce(msg: string) {
  // Clear then set on the next tick so re-announcing the same text still fires.
  liveMessage.value = '';
  void nextTick(() => {
    liveMessage.value = msg;
  });
}
function labelOf(node: T): string {
  return cfg.value.getLabel ? cfg.value.getLabel(node) : cfg.value.getId(node);
}

/**
 * Programmatic / keyboard move. Resolves the source live, runs the SAME cycle +
 * `canDrop` guards as a drop, and fires `node-move`. Returns whether it emitted.
 */
function moveNode(
  sourceId: string,
  targetId: string | null,
  position: CoarTreeDropPosition,
): boolean {
  const source = findNodeById(sourceId);
  if (!source) return false;
  if (targetId !== null) {
    if (sourceId === targetId) return false;
    if (isDescendantOfSource(targetId, sourceId)) return false; // cycle
  }
  const target = targetId !== null ? findNodeById(targetId) : null;
  if (targetId !== null && !target) return false;
  if (cfg.value.canDrop && !cfg.value.canDrop(source, target, position)) return false;
  fireNodeMove({ source, target, position });
  return true;
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
  const id = cfg.value.getId(node);
  dragSourceId.value = id;
  dragSourceNode.value = node;
  ev.dataTransfer?.setData(COAR_TREE_DRAG_MIME, id);
  ev.dataTransfer?.setData('text/plain', cfg.value.getLabel?.(node) ?? id);
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
  const ghost = cfg.value.getDragImage?.(node);
  if (ghost instanceof HTMLElement) setCoarDragImageFromElement(ev, ghost);
  else if (typeof ghost === 'string') setCoarDragImageFromHtml(ev, ghost);
  announce(resolvedLabels.value.pickedUp(labelOf(node)));
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
  // Cursor over the dragged node's own subtree → not a valid drop target.
  // Live O(depth) walk up the parent chain — no per-event tree walk.
  if (isDescendantOfSource(cfg.value.getId(node), dragSourceId.value)) return;

  const rect = el.getBoundingClientRect();
  const pos = computeDropPosition(ev, rect, { expandable: isExpandableOf(node) });
  const source = dragSourceNode.value;
  if (cfg.value.canDrop && source && !cfg.value.canDrop(source, node, pos)) return;

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
    // Drop is one-shot, so re-resolve the source from the LIVE tree and re-run
    // the cycle check here — the O(depth) dragover guard can't see mutations
    // that landed between the last dragover and the drop. Suppresses phantom
    // moves when the source was deleted mid-drag.
    const source = findNodeById(dragSourceId.value);
    if (source && !isDescendantOfSource(cfg.value.getId(node), dragSourceId.value)) {
      ev.preventDefault();
      ev.stopPropagation();
      fireNodeMove({ source, target: node, position: dropPosition.value });
      announce(resolvedLabels.value.moved(labelOf(source), labelOf(node), dropPosition.value));
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
  if (!renamableOn.value) return;
  const idx = idToIndex.value.get(id);
  const row = idx === undefined ? undefined : visibleRows.value[idx];
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
  /** Move keyboard focus to a node WITHOUT changing selection. */
  focusNode(id: string) {
    focusRow(id);
  },
  /** Highlight-select AND focus a node (the "reveal & select" action). */
  selectNode(id: string) {
    selectNode(findNodeById(id), 'api');
  },
  /**
   * Force `loadChildren` to (re)run for `id` — retry after an error or refresh
   * an already-loaded folder. No-op if `loadChildren` isn't set or `id` isn't
   * in the tree.
   */
  reloadChildren,
  /**
   * Enter inline-rename mode on `id`. No-op if `:renamable` isn't set or
   * the id isn't in the visible-row list. Use from context menu items,
   * keyboard shortcuts, etc. The rename input mounts + auto-focuses on
   * the next frame.
   */
  startRename,
  /** Expand every expandable, currently-loaded node. */
  expandAll,
  /** Collapse everything. */
  collapseAll,
  /** Expand all loaded ancestors of `id` so its row becomes visible. */
  expandTo,
  /** Scroll a node into view without changing focus or selection. */
  revealNode,
  /** Resolve a node by id from the loaded tree, or `null`. */
  getNode: (id: string) => findNodeById(id),
  /** Move a node (keyboard / a11y equivalent of drag-drop); runs cycle + canDrop guards. */
  moveNode,
});
</script>

<template>
  <!--
    The root reads `fileDropTargetId` for the whole-tree file-drop outline — the
    one row-state ref the parent still depends on. It changes only on OS
    file-drag folder hover (rare, pointer-throttled), so the parent re-render it
    triggers is acceptable; selection / focus / internal-drag never dirty the
    parent (each row derives those from injected state). Don't "optimize" this
    read away without moving the outline off the root, or the drop hint breaks.
  -->
  <div
    ref="rootEl"
    class="coar-tree"
    :class="[
      `coar-tree--density-${cfg.density ?? 'm'}`,
      {
        'coar-tree--file-drop': rootFileDragDepth > 0 && !fileDropTargetId,
        'coar-tree--virtual': isVirtual,
      },
    ]"
    tabindex="-1"
    @keydown="onRootKeydown"
    @contextmenu="onBackgroundContextMenu"
    @dragenter="onRootDragEnter"
    @dragover="onRootDragOver"
    @dragleave="onRootDragLeave"
    @drop="onRootDrop"
  >
    <!-- Polite SR announcer for drag / keyboard-move state (pick-up, dropped, cancelled). -->
    <div class="coar-tree__sr-live" role="status" aria-live="polite">{{ liveMessage }}</div>
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
        :aria-label="cfg.ariaLabel"
        :aria-labelledby="cfg.ariaLabelledby"
        :aria-multiselectable="multiSelect ? 'true' : undefined"
        :style="isVirtual ? { height: `${virtualizer.totalSize.value}px`, position: 'relative' } : undefined"
      >
        <CoarTreeNode
          v-for="entry in renderRows"
          :key="entry.row.id"
          :node="entry.row.node"
          :node-id="entry.row.id"
          :depth="entry.row.depth"
          :is-expandable="entry.row.isExpandable"
          :draggable="entry.row.draggable"
          :pos-in-set="entry.row.posInSet"
          :set-size="entry.row.setSize"
          :style="
            entry.virtual
              ? { position: 'absolute', top: `${entry.virtual.start}px`, left: 0, right: 0, height: `${entry.virtual.size}px` }
              : undefined
          "
          @row-click="onRowClick"
          @row-dblclick="onRowDblClick"
          @row-context-menu="onRowContextMenu"
          @row-check-toggle="onRowCheckToggle"
          @row-retry="onRowRetry"
          @chevron-click="onChevron"
          @row-dragstart="onRowDragStart"
          @row-dragend="onRowDragEnd"
          @row-dragover="onRowDragOver"
          @row-dragleave="onRowDragLeave"
          @row-drop="onRowDrop"
        />
      </div>
    </div>
    <div
      v-else
      class="coar-tree__empty"
      tabindex="0"
      role="status"
      :aria-label="cfg.ariaLabel"
    >
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
  /* Sizing tokens — override these to retheme density without forking.
     `density` presets just set them; consumers can set them inline too. */
  --coar-tree-indent: 14px;
  --coar-tree-indent-base: 8px;
  --coar-tree-row-pad-y: 3px;
  --coar-tree-row-pad-x: 4px;
  /* Built-in controls (chevron + checkbox box) and the glyph inside them.
     `--coar-tree-icon-size` also cascades into the row slot, so a consumer can
     size their own icons with it: `<CoarIcon size="var(--coar-tree-icon-size)">`. */
  --coar-tree-control-size: 16px;
  --coar-tree-icon-size: 12px;
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

/* Density presets — set the sizing vars; `m` keeps the historical ~28px row.
   Each preset scales font, padding, indent AND the built-in chevron/checkbox. */
.coar-tree--density-xs {
  --coar-tree-indent: 12px;
  --coar-tree-row-pad-y: 1px;
  --coar-tree-row-font: 12px;
  --coar-tree-control-size: 14px;
  --coar-tree-icon-size: 10px;
}
.coar-tree--density-s {
  --coar-tree-indent: 12px;
  --coar-tree-row-pad-y: 2px;
  --coar-tree-row-font: 12px;
  --coar-tree-control-size: 15px;
  --coar-tree-icon-size: 11px;
}
.coar-tree--density-l {
  --coar-tree-indent: 16px;
  --coar-tree-row-pad-y: 6px;
  --coar-tree-row-font: 14px;
  --coar-tree-control-size: 20px;
  --coar-tree-icon-size: 15px;
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

/* Visually hidden, still announced by screen readers. */
.coar-tree__sr-live {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
