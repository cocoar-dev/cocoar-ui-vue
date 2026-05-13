/**
 * Pure tree operations on a PageNode tree. Every builder mutation funnels
 * through these — undo/redo and DnD just swap the root reference.
 *
 * The schema is the root PageNode itself (no wrapper object).
 * Path [] = the root; [0, 1] = root.children[0].children[1].
 */

import { isContainerNode, type PageNode, type ElementType } from '../schema';

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
    if (!isContainerNode(node)) return null;
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
    if (!isContainerNode(node)) return null;
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
  return mapNode(root, parentPath, (parent) => {
    if (!isContainerNode(parent)) return parent;
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
    if (!isContainerNode(parent)) return parent;
    return { ...parent, children: parent.children.filter((_, i) => i !== index) };
  });
}

export function replaceNode(root: PageNode, path: NodePath, replacement: PageNode): PageNode {
  if (path.length === 0) return replacement;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return mapNode(root, parentPath, (parent) => {
    if (!isContainerNode(parent)) return parent;
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
  return insertChild(removed, toParentPath, toIndex, source.node);
}

export function moveSibling(root: PageNode, path: NodePath, delta: -1 | 1): PageNode {
  if (path.length === 0) return root;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  const parent = getNodeAt(root, parentPath);
  if (!parent || !isContainerNode(parent.node)) return root;
  const target = index + delta;
  if (target < 0 || target >= parent.node.children.length) return root;
  return moveNode(root, path, parentPath, target);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function samePath(a: NodePath, b: NodePath): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function mapNode(root: PageNode, path: NodePath, mapper: (node: PageNode) => PageNode): PageNode {
  function walk(node: PageNode, depth: number): PageNode {
    if (depth === path.length) return mapper(node);
    if (!isContainerNode(node)) return node;
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
