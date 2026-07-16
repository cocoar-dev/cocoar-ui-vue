/**
 * Pure tree operations on a PageNode tree. Every builder mutation funnels
 * through these — undo/redo and DnD just swap the root reference.
 *
 * The schema is the root PageNode itself (no wrapper object).
 * Path [] = the root; [0, 1] = root.children[0].children[1].
 */

import type { PageNode, ElementType } from '../schema';

/**
 * Structural container test: a node that CARRIES a children array is treated
 * as a container by the pure tree operations. Registry semantics (which types
 * MAY have children) are the UI layer's concern — structurally, custom
 * containers get `children: []` at creation, so both views agree.
 */
function hasChildren(node: PageNode): node is PageNode & { children: PageNode[] } {
  return Array.isArray((node as { children?: unknown }).children);
}

export type NodePath = readonly number[];

export interface NodeLocation {
  path: NodePath;
  node: PageNode;
  parent: (PageNode & { children: PageNode[] }) | null;
  index: number;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getNodeAt(root: PageNode, path: NodePath): NodeLocation | null {
  let node: PageNode = root;
  let parent: (PageNode & { children: PageNode[] }) | null = null;
  let index = -1;
  for (const i of path) {
    if (!hasChildren(node)) return null;
    if (i < 0 || i >= node.children.length) return null;
    parent = node as PageNode & { children: PageNode[] };
    index = i;
    node = node.children[i];
  }
  return { path, node, parent, index };
}

export function findPath(root: PageNode, target: PageNode): NodePath | null {
  if (root === target) return [];
  function walk(node: PageNode, acc: number[]): number[] | null {
    if (!hasChildren(node)) return null;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child === target) return [...acc, i];
      const found = walk(child, [...acc, i]);
      if (found) return found;
    }
    return null;
  }
  return walk(root, []);
}

export function isAncestor(ancestor: NodePath, path: NodePath): boolean {
  if (ancestor.length > path.length) return false;
  for (let i = 0; i < ancestor.length; i++) {
    if (ancestor[i] !== path[i]) return false;
  }
  return true;
}

// ─── Mutate ───────────────────────────────────────────────────────────────────

export function insertChild(
  root: PageNode,
  parentPath: NodePath,
  index: number,
  newChild: PageNode,
): PageNode {
  const parentLoc = getNodeAt(root, parentPath);
  if (!parentLoc || !hasChildren(parentLoc.node)) {
    warnDev(
      `insertChild: parent path [${parentPath.join(', ')}] does not resolve to a container — insert ignored.`,
    );
    return root;
  }
  return mapNode(root, parentPath, (parent) => {
    if (!hasChildren(parent)) return parent;
    const clamped = Math.max(0, Math.min(index, parent.children.length));
    return {
      ...parent,
      children: [
        ...parent.children.slice(0, clamped),
        newChild,
        ...parent.children.slice(clamped),
      ],
    };
  });
}

export function removeNode(root: PageNode, path: NodePath): PageNode {
  if (path.length === 0) return root;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return mapNode(root, parentPath, (parent) => {
    if (!hasChildren(parent)) return parent;
    return { ...parent, children: parent.children.filter((_, i) => i !== index) };
  });
}

export function replaceNode(root: PageNode, path: NodePath, replacement: PageNode): PageNode {
  if (path.length === 0) return replacement;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return mapNode(root, parentPath, (parent) => {
    if (!hasChildren(parent)) return parent;
    return {
      ...parent,
      children: parent.children.map((c, i) => (i === index ? replacement : c)),
    };
  });
}

export function patchNode(root: PageNode, path: NodePath, patch: Partial<PageNode>): PageNode {
  const loc = getNodeAt(root, path);
  if (!loc) return root;
  const current = loc.node as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...loc.node };
  let hasChange = false;
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'type' || k === 'id') continue;
    // `props` merges one level deep with the same delete-on-empty semantics
    // per bag key — panels patch individual element props, never the whole bag.
    if (k === 'props' && v !== null && typeof v === 'object') {
      const currentBag = (current.props ?? {}) as Record<string, unknown>;
      const nextBag: Record<string, unknown> = { ...currentBag };
      let bagChanged = false;
      for (const [pk, pv] of Object.entries(v)) {
        const isClear = pv === '' || pv === null || pv === undefined;
        if (isClear) {
          if (currentBag[pk] !== undefined) { delete nextBag[pk]; bagChanged = true; }
        } else if (currentBag[pk] !== pv) {
          nextBag[pk] = pv; bagChanged = true;
        }
      }
      if (bagChanged) { merged.props = nextBag; hasChange = true; }
      continue;
    }
    const isClear = v === '' || v === null || v === undefined;
    if (isClear) {
      if (current[k] !== undefined) { delete merged[k]; hasChange = true; }
    } else if (current[k] !== v) {
      merged[k] = v; hasChange = true;
    }
  }
  if (!hasChange) return root;
  return replaceNode(root, path, merged as unknown as PageNode);
}

/**
 * Where `targetParentPath` lives once the node at `fromPath` is removed:
 * removing a node shifts its later siblings down by one, so a target path that
 * passes the removed node's parent at a later index needs that segment
 * decremented. Paths that don't cross the removal point are returned as-is.
 */
export function rebaseAfterRemoval(fromPath: NodePath, targetParentPath: NodePath): NodePath {
  if (fromPath.length === 0) return targetParentPath;
  const fromParent = fromPath.slice(0, -1);
  const fromIndex = fromPath[fromPath.length - 1];
  if (
    targetParentPath.length > fromParent.length &&
    isAncestor(fromParent, targetParentPath) &&
    targetParentPath[fromParent.length] > fromIndex
  ) {
    const adjusted = [...targetParentPath];
    adjusted[fromParent.length] -= 1;
    return adjusted;
  }
  return targetParentPath;
}

export function moveNode(
  root: PageNode,
  fromPath: NodePath,
  toParentPath: NodePath,
  toIndex: number,
): PageNode {
  if (fromPath.length === 0) return root;
  if (isAncestor(fromPath, toParentPath)) return root;
  const source = getNodeAt(root, fromPath);
  if (!source) return root;
  const fromParent = fromPath.slice(0, -1);
  const fromIndex = fromPath[fromPath.length - 1];
  if (samePath(fromParent, toParentPath) && toIndex === fromIndex) return root;
  const removed = removeNode(root, fromPath);
  // The caller's target path is expressed in the PRE-removal tree; inserting
  // there directly can land in the wrong container — or nowhere, silently
  // losing the node — whenever the target sits after the removed node.
  const target = rebaseAfterRemoval(fromPath, toParentPath);
  const targetLoc = getNodeAt(removed, target);
  if (!targetLoc || !hasChildren(targetLoc.node)) {
    warnDev(
      `moveNode: target path [${target.join(', ')}] does not resolve to a container after removal — move ignored.`,
    );
    return root;
  }
  return insertChild(removed, target, toIndex, source.node);
}

export function moveSibling(root: PageNode, path: NodePath, delta: -1 | 1): PageNode {
  if (path.length === 0) return root;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  const parent = getNodeAt(root, parentPath);
  if (!parent || !hasChildren(parent.node)) return root;
  const target = index + delta;
  if (target < 0 || target >= parent.node.children.length) return root;
  return moveNode(root, path, parentPath, target);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/** Dev-only warning (statically stripped in production builds). */
export function warnDev(message: string): void {
  if (typeof import.meta !== 'undefined' && import.meta.env && !import.meta.env.DEV) return;
  console.warn(`[page-builder] ${message}`);
}

function samePath(a: NodePath, b: NodePath): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function mapNode(root: PageNode, path: NodePath, mapper: (node: PageNode) => PageNode): PageNode {
  function walk(node: PageNode, depth: number): PageNode {
    if (depth === path.length) return mapper(node);
    if (!hasChildren(node)) return node;
    const idx = path[depth];
    if (idx < 0 || idx >= node.children.length) return node;
    return {
      ...node,
      children: node.children.map((c, i) => (i === idx ? walk(c, depth + 1) : c)),
    };
  }
  return walk(root, 0);
}

export type { PageNode, ElementType };
