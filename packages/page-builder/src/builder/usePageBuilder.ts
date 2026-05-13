import { computed, ref, shallowRef, type Ref } from 'vue';
import type { PageNode } from '../schema';
import {
  defaultNode,
  type ElementType,
} from './nodeDefaults';
import {
  findPath,
  getNodeAt,
  insertChild,
  moveNode,
  moveSibling,
  patchNode,
  removeNode,
  type NodePath,
} from './operations';

export interface UsePageBuilderOptions {
  schema?: Ref<PageNode>;
  initial?: PageNode;
}

const PATCH_COALESCE_MS = 500;

export function usePageBuilder(options: UsePageBuilderOptions = {}) {
  const schema: Ref<PageNode> = options.schema ?? shallowRef(
    options.initial ?? { id: 'root', type: 'page', children: [] },
  );

  const selectedPath = ref<NodePath | null>([]);
  const structuralVersion = ref(0);
  const bumpVersion = () => { structuralVersion.value++; };

  // ── History ────────────────────────────────────────────────────────────────
  const past = ref<PageNode[]>([]);
  const future = ref<PageNode[]>([]);
  let lastOp:
    | { kind: 'structural' }
    | { kind: 'patch'; pathKey: string; time: number }
    | null = null;

  function pushHistory(
    before: PageNode,
    op: { kind: 'structural' } | { kind: 'patch'; path: NodePath },
  ) {
    if (op.kind === 'structural') {
      past.value = [...past.value, before];
      future.value = [];
      lastOp = { kind: 'structural' };
      return;
    }
    const pathKey = op.path.join('/');
    const now = Date.now();
    const coalesce =
      lastOp?.kind === 'patch' &&
      lastOp.pathKey === pathKey &&
      now - lastOp.time < PATCH_COALESCE_MS;
    if (!coalesce) {
      past.value = [...past.value, before];
      future.value = [];
    }
    lastOp = { kind: 'patch', pathKey, time: now };
  }

  function undo() {
    if (past.value.length === 0) return;
    const prev = past.value[past.value.length - 1];
    past.value = past.value.slice(0, -1);
    future.value = [...future.value, schema.value];
    schema.value = prev;
    if (!selectedPath.value || !getNodeAt(prev, selectedPath.value)) {
      selectedPath.value = [];
    }
    lastOp = null;
    bumpVersion();
  }

  function redo() {
    if (future.value.length === 0) return;
    const next = future.value[future.value.length - 1];
    future.value = future.value.slice(0, -1);
    past.value = [...past.value, schema.value];
    schema.value = next;
    if (!selectedPath.value || !getNodeAt(next, selectedPath.value)) {
      selectedPath.value = [];
    }
    lastOp = null;
    bumpVersion();
  }

  const canUndo = computed(() => past.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);

  // ── Selection ──────────────────────────────────────────────────────────────
  const selectedNode = computed<PageNode | null>(() => {
    if (!selectedPath.value) return null;
    return getNodeAt(schema.value, selectedPath.value)?.node ?? null;
  });

  function select(path: NodePath | null) { selectedPath.value = path; }
  function selectNode(node: PageNode) { selectedPath.value = findPath(schema.value, node); }

  // ── Mutations ──────────────────────────────────────────────────────────────
  function addChild(parentPath: NodePath, type: ElementType, atIndex?: number) {
    const parent = getNodeAt(schema.value, parentPath);
    if (!parent) return;
    const before = schema.value;
    const node = defaultNode(type);
    const childCount = 'children' in parent.node ? parent.node.children.length : 0;
    const index = atIndex ?? childCount;
    schema.value = insertChild(schema.value, parentPath, index, node);
    selectedPath.value = [...parentPath, index];
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  function remove(path: NodePath) {
    if (path.length === 0) return;
    const before = schema.value;
    const next = removeNode(schema.value, path);
    schema.value = next;
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    const parent = getNodeAt(next, parentPath);
    if (parent && 'children' in parent.node && parent.node.children.length > 0) {
      const newIdx = Math.max(0, idx - 1);
      selectedPath.value = [...parentPath, Math.min(newIdx, parent.node.children.length - 1)];
    } else {
      selectedPath.value = parentPath;
    }
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  function move(path: NodePath, delta: -1 | 1) {
    const before = schema.value;
    const next = moveSibling(before, path, delta);
    if (before === next) return;
    schema.value = next;
    const parentPath = path.slice(0, -1);
    selectedPath.value = [...parentPath, path[path.length - 1] + delta];
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  function moveTo(fromPath: NodePath, toParentPath: NodePath, toIndex: number) {
    const before = schema.value;
    const next = moveNode(before, fromPath, toParentPath, toIndex);
    if (before === next) return;
    schema.value = next;
    selectedPath.value = [...toParentPath, toIndex];
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  function patch(path: NodePath, update: Partial<PageNode>) {
    const before = schema.value;
    const next = patchNode(schema.value, path, update);
    if (before === next) return;
    schema.value = next;
    pushHistory(before, { kind: 'patch', path });
  }

  function replaceSchema(next: PageNode) {
    const before = schema.value;
    schema.value = next;
    selectedPath.value = [];
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  return {
    schema,
    selectedPath,
    selectedNode,
    structuralVersion,
    canUndo,
    canRedo,
    select,
    selectNode,
    addChild,
    remove,
    move,
    moveTo,
    patch,
    replaceSchema,
    undo,
    redo,
  };
}

export type UsePageBuilderReturn = ReturnType<typeof usePageBuilder>;
