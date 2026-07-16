import type { ElementType, PageNode } from '../schema';
export type { ElementType };

let counter = 0;
/**
 * Node ids must stay unique across editing sessions: schemas get saved and
 * re-loaded, so a fresh session must never mint an id a stored schema already
 * contains. A session-local counter did exactly that (duplicate ids after
 * load → broken keys/selection/field names). The counter now only backs the
 * non-secure-context fallback, where the timestamp keeps it out of the old
 * `node_N` namespace.
 */
export function uid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  counter += 1;
  return `node_${Date.now().toString(36)}_${counter}`;
}

/** Short unique-enough field key — readable in the props panel and in ActionValues. */
export function fieldName(): string {
  return `field_${uid().replace(/-/g, '').slice(0, 8)}`;
}

/**
 * Deep copy of a subtree with fresh ids on every node — the duplicate
 * operation's core. Field `name`s are kept on purpose: renaming silently would
 * surprise, and the duplicate-name validation flags the collision loudly.
 */
export function cloneWithFreshIds(node: PageNode): PageNode {
  const clone = { ...node, id: uid() } as PageNode;
  if ('children' in clone && Array.isArray(clone.children)) {
    (clone as { children: PageNode[] }).children = clone.children.map(cloneWithFreshIds);
  }
  return clone;
}

// The per-type default nodes moved onto the element definitions
// (`builder.defaults()` in src/elements/<type>/index.ts); fresh nodes are
// assembled by `usePageBuilder`'s createNode from the registry.
