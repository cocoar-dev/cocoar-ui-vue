import { computed, ref, shallowRef, type ComputedRef, type Ref } from 'vue';
import type { PageConfig, PageNode } from '../schema';
import { BUILTIN_ELEMENTS } from '../elements/builtins';
import type { PageElementRegistry } from '../elements/registry';
import { cloneWithFreshIds, collectElementNames, elementNameBase, uniqueElementName, uid } from './nodeDefaults';
import {
  findPath,
  getNodeAt,
  insertChild,
  moveNode,
  moveSibling,
  patchNode,
  rebaseAfterRemoval,
  removeNode,
  replaceNode,
  warnDev,
  type NodePath,
} from './operations';

/** Pre-binding to a contract field, applied by createNode (field-first flow). */
export interface FieldBinding {
  name: string;
  label?: string;
  required?: boolean;
}

export interface UsePageBuilderOptions {
  schema?: Ref<PageNode>;
  initial?: PageNode;
  /**
   * Merged element registry (see `useMergedElements`). Drives what `addChild`
   * can create; defaults to the built-in set for registry-less usage (tests,
   * headless tooling).
   */
  elements?: ComputedRef<PageElementRegistry>;
  /**
   * The builder's config — used for the field-contract minting rule: under a
   * strict contract (fields set, allowCustomFields off), fresh value elements
   * start UNBOUND instead of minting a `field_*` name the lint would flag.
   */
  config?: ComputedRef<PageConfig | undefined>;
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
  // shallowRef: entries are immutable snapshots and the arrays are replaced
  // wholesale on every update — deep reactivity would wrap every snapshot in a
  // proxy, so undo would restore a proxy instead of the original tree.
  const past = shallowRef<PageNode[]>([]);
  const future = shallowRef<PageNode[]>([]);
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

  /**
   * Fresh node for an element type, built from its registry definition: the
   * builder half supplies the props bag, every element gets a public name, a
   * container gets its children array. The host owns the id. A `bind` (from
   * the field-first palette flow) pre-binds the node to a contract field.
   */
  function createNode(type: string, bind?: FieldBinding): PageNode | null {
    const def = (options.elements?.value ?? BUILTIN_ELEMENTS)[type];
    if (!def?.builder) {
      warnDev(`addChild: no registered element (with a builder half) for type "${type}" — ignored.`);
      return null;
    }
    const props = def.builder.defaults() as Record<string, unknown>;
    // The contract label rides along when the element carries one at all.
    if (bind?.label && 'label' in props) props.label = bind.label;
    const name = uniqueElementName(
      bind?.name ?? elementNameBase(type),
      collectElementNames(schema.value),
    );
    return {
      id: uid(),
      type,
      name,
      props,
      ...(def.value && bind?.required ? { validation: { required: true } } : {}),
      ...(def.container ? { children: [] } : {}),
    } as PageNode;
  }

  function addChild(parentPath: NodePath, type: string, atIndex?: number, bind?: FieldBinding) {
    const parent = getNodeAt(schema.value, parentPath);
    if (!parent) return;
    const node = createNode(type, bind);
    if (!node) return;
    const before = schema.value;
    const childCount = parent.node.children?.length ?? 0;
    const index = atIndex ?? childCount;
    schema.value = insertChild(schema.value, parentPath, index, node);
    selectedPath.value = [...parentPath, index];
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  /** Inserts an already materialized subtree (for example a composition instance). */
  function insertNode(parentPath: NodePath, node: PageNode, atIndex?: number) {
    const parent = getNodeAt(schema.value, parentPath);
    const children = parent?.node && 'children' in parent.node && Array.isArray(parent.node.children)
      ? parent.node.children
      : undefined;
    if (!parent || !children) return;
    const before = schema.value;
    const index = atIndex ?? children.length;
    const next = insertChild(before, parentPath, index, node);
    if (next === before) return;
    schema.value = next;
    selectedPath.value = [...parentPath, Math.max(0, Math.min(index, children.length))];
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  /** Replaces one complete subtree while keeping the operation undoable. */
  function replaceAt(path: NodePath, node: PageNode) {
    const before = schema.value;
    const next = replaceNode(before, path, node);
    if (next === before) return;
    schema.value = next;
    selectedPath.value = [...path];
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  function requiredRule(path: NodePath) {
    const node = getNodeAt(schema.value, path)?.node;
    return node && options.config?.value?.requiredNodes?.find(
      (required) => required.id === node.id && required.type === node.type,
    );
  }
  function isRequired(path: NodePath): boolean { return !!requiredRule(path); }
  function isPositionLocked(path: NodePath): boolean {
    const rule = requiredRule(path);
    return !!rule && (rule.parentId !== undefined || rule.maxIndex !== undefined);
  }

  function remove(path: NodePath) {
    if (path.length === 0) return;
    if (isRequired(path)) { warnDev('remove: required node cannot be removed.'); return; }
    const before = schema.value;
    const next = removeNode(schema.value, path);
    schema.value = next;
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    const parent = getNodeAt(next, parentPath);
    const siblings = parent?.node.children;
    if (parent && siblings && siblings.length > 0) {
      const newIdx = Math.max(0, idx - 1);
      selectedPath.value = [...parentPath, Math.min(newIdx, siblings.length - 1)];
    } else {
      selectedPath.value = parentPath;
    }
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  function move(path: NodePath, delta: -1 | 1) {
    if (isPositionLocked(path)) { warnDev('move: required node position is locked.'); return; }
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
    if (isPositionLocked(fromPath)) { warnDev('moveTo: required node position is locked.'); return; }
    const before = schema.value;
    const next = moveNode(before, fromPath, toParentPath, toIndex);
    if (before === next) return;
    schema.value = next;
    // The node's actual parent path may have shifted by the removal — the
    // selection must follow the node, not the caller's pre-removal target.
    selectedPath.value = [...rebaseAfterRemoval(fromPath, toParentPath), toIndex];
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  /**
   * Switch a node's REPRESENTATION: same data, different element. Keeps the
   * id (selection follows), the host vocabulary (name / defaultValue /
   * validation / style) and the label; the rest of the props bag restarts
   * from the target's defaults. Only offered by the UI among elements that
   * can edit the same value type, so the carried value stays type-correct.
   */
  function convertTo(path: NodePath, toType: string) {
    if (path.length === 0) return;
    if (isRequired(path)) { warnDev('convertTo: required node type is locked.'); return; }
    const loc = getNodeAt(schema.value, path);
    if (!loc || loc.node.type === toType) return;
    const def = (options.elements?.value ?? BUILTIN_ELEMENTS)[toType];
    if (!def?.builder) {
      warnDev(`convertTo: no registered element (with a builder half) for type "${toType}" — ignored.`);
      return;
    }
    const existingChildren = (loc.node as { children?: unknown[] }).children;
    if (!def.container && Array.isArray(existingChildren) && existingChildren.length > 0) {
      warnDev(
        `convertTo: "${loc.node.type}" has children but "${toType}" is not a container — ` +
          'the conversion would drop them; ignored.',
      );
      return;
    }
    const before = schema.value;
    const old = loc.node as PageNode & {
      props?: Record<string, unknown>;
      name?: string;
      defaultValue?: unknown;
      validation?: unknown;
      visibleWhen?: unknown;
      bindings?: unknown;
      responsive?: unknown;
      children?: PageNode[];
    };
    const props = def.builder.defaults() as Record<string, unknown>;
    const oldLabel = old.props?.label;
    if (oldLabel !== undefined && 'label' in props) props.label = oldLabel;
    const next: Record<string, unknown> = { id: old.id, type: toType, name: old.name, props };
    if (old.style !== undefined) next.style = old.style;
    if (old.responsive !== undefined) next.responsive = old.responsive;
    if (old.visibleWhen !== undefined) next.visibleWhen = old.visibleWhen;
    if (old.bindings !== undefined) next.bindings = old.bindings;
    if (def.value) {
      if (old.defaultValue !== undefined) next.defaultValue = old.defaultValue;
      if (old.validation !== undefined) next.validation = old.validation;
    }
    if (def.container) next.children = Array.isArray(old.children) ? old.children : [];
    schema.value = replaceNode(schema.value, path, next as unknown as PageNode);
    pushHistory(before, { kind: 'structural' });
    bumpVersion();
  }

  function duplicate(path: NodePath) {
    if (path.length === 0) return;
    const loc = getNodeAt(schema.value, path);
    if (!loc) return;
    const before = schema.value;
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1] + 1;
    schema.value = insertChild(
      schema.value,
      parentPath,
      index,
      cloneWithFreshIds(loc.node, collectElementNames(schema.value)),
    );
    selectedPath.value = [...parentPath, index];
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
    insertNode,
    replaceAt,
    convertTo,
    remove,
    duplicate,
    isRequired,
    isPositionLocked,
    move,
    moveTo,
    patch,
    replaceSchema,
    undo,
    redo,
  };
}

export type UsePageBuilderReturn = ReturnType<typeof usePageBuilder>;
